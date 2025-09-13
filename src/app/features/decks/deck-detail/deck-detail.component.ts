import { Component, computed, inject, ViewChild, ElementRef } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { StorageService } from '../../../core/storage.service';
import type { Card } from '../../../core/models';

@Component({
  selector: 'app-deck-detail',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <a routerLink="/decks">← Back</a>
    <h1>Deck Detail</h1>
    <p>Deck ID: <strong>{{ id }}</strong></p>

    <div style="display:flex; gap:.5rem; flex-wrap:wrap; margin:.5rem 0">
      <button (click)="deleteDeck()">Delete deck</button>
      <button (click)="exportCsv()">Export CSV</button>

      <!-- hidden file input for CSV import -->
      <input #fileInput type="file" accept=".csv,text/csv" (change)="importCsv($event)" hidden />
      <button type="button" (click)="fileInput.click()">Import CSV</button>
    </div>

    <form [formGroup]="form" (ngSubmit)="addCard()" style="margin:1rem 0; display:grid; gap:.5rem; max-width:600px">
      <label>Front <textarea formControlName="front" rows="2"></textarea></label>
      <label>Back  <textarea formControlName="back" rows="2"></textarea></label>
      <button type="submit" [disabled]="form.invalid">+ Add card</button>
    </form>

    <h3>Cards ({{ cards().length }})</h3>
    <ul *ngIf="cards().length; else empty">
      <li *ngFor="let c of cards(); trackBy: trackId" style="margin:.5rem 0">
        <div><strong>Q:</strong> {{ c.front }}</div>
        <div><strong>A:</strong> {{ c.back }}</div>
        <small>reps: {{c.repetitions}} | interval: {{c.interval}}d | due: {{ c.due | date:'yyyy-MM-dd' }}</small><br />
        <button (click)="delCard(c)">Delete</button>
        <a [routerLink]="['/study', id]">Study this deck</a>
      </li>
    </ul>

    <ng-template #empty>
      <p>No cards yet. Add one above.</p>
    </ng-template>
  `,
})
export class DeckDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  storage = inject(StorageService);
  
  id = this.route.snapshot.paramMap.get('id')!;
  cards = computed<Card[]>(() => this.storage.cardsByDeck(this.id));

  form = this.fb.nonNullable.group({
    front: ['', Validators.required],
    back: ['', Validators.required],
  });

  async addCard() {
    const { front, back } = this.form.getRawValue();
    await this.storage.addCard(this.id, front, back);
    this.form.reset({ front: '', back: '' });
  }

  async delCard(c: Card) { await this.storage.deleteCard(c.id); }

  async deleteDeck() {
    const ok = confirm('Delete this deck and ALL its cards & logs?');
    if (!ok) return;
    await this.storage.deleteDeck(this.id);
    this.router.navigate(['/decks']);
  }

  trackId = (_: number, c: Card) => c.id;

  // ------------ CSV Export ------------
  exportCsv() {
    const rows = [
      ['front', 'back'], // header
      ...this.cards().map(c => [c.front, c.back]),
    ];
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deck-${this.id}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  // ------------ CSV Import ------------
  async importCsv(evt: Event) {
    const input = evt.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    const items = parseCsv(text)
      .filter(r => r.length >= 2)
      .map(([front, back]) => ({ front, back }));

    if (!items.length) {
      alert('No rows found. Expecting CSV with "front,back" columns.');
      input.value = '';
      return;
    }

    const mode = confirm('OK = Replace existing cards\nCancel = Append to deck')
      ? 'replace'
      : 'append';

    if (mode === 'replace') {
      await this.storage.replaceDeckCards(this.id, items);
    } else {
      await this.storage.addCardsBulk(this.id, items);
    }

    input.value = '';
  }
}

/* --- CSV helpers --- */
// escape a value for CSV (handles quotes/newlines/commas)
function escapeCsv(v: string): string {
  const s = (v ?? '').toString();
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

// parse CSV into array of string arrays (very small, RFC-4180-ish)
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [];
  let field = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') { field += '"'; i++; } // escaped quote
        else { inQuotes = false; }
      } else {
        field += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        cur.push(field);
        field = '';
      } else if (ch === '\n') {
        cur.push(field);
        rows.push(trimRow(cur));
        cur = [];
        field = '';
      } else if (ch === '\r') {
        // ignore \r (CRLF handled when \n arrives)
      } else {
        field += ch;
      }
    }
  }
  // flush last field/row
  cur.push(field);
  if (cur.length > 1 || cur[0] !== '') rows.push(trimRow(cur));

  // drop header if it looks like one
  if (rows.length && rows[0].length >= 2) {
    const [h1, h2] = rows[0].slice(0, 2).map(s => s.toLowerCase().trim());
    if (h1 === 'front' && h2 === 'back') rows.shift();
  }

  return rows;
}
function trimRow(r: string[]): string[] {
  return r.map(s => s.replace(/\uFEFF/g, '').trim()); // remove BOM + trim
}
