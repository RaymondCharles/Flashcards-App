import { Component, computed, inject } from '@angular/core';
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
    <a routerLink="/decks" class="text-sm text-indigo-700 hover:underline">← Back</a>
    <div class="flex items-center justify-between mt-2">
      <h1 class="text-2xl font-semibold">Deck Detail</h1>
      <div class="flex gap-4 text-sm">
        <button class="text-red-600 hover:text-red-700" (click)="deleteDeck()">Delete deck</button>
        <button class="hover:underline" (click)="exportCsv()">Export CSV</button>
        <label class="hover:underline cursor-pointer">
          Import CSV
          <input type="file" accept=".csv,text/csv" hidden (change)="importCsv($event)">
        </label>
      </div>
    </div>
    <p class="text-slate-500 mb-4">Deck ID: <span class="badge">{{ id }}</span></p>

    <form [formGroup]="form" (ngSubmit)="addCard()" class="grid gap-3 max-w-4xl">
      <label>Front <textarea rows="3" formControlName="front"></textarea></label>
      <label>Back <textarea rows="3" formControlName="back"></textarea></label>
      <button type="submit" class="btn w-fit" [disabled]="form.invalid">+ Add card</button>
    </form>

    <h3 class="text-xl font-semibold mt-8 mb-3">Cards ({{ cards().length }})</h3>

    <div class="grid gap-4">
      <article *ngFor="let c of cards(); trackBy: trackId" class="card">
        <div class="text-slate-600 text-sm mb-1">Q:</div>
        <div class="text-lg">{{ c.front }}</div>
        <div class="text-slate-600 text-sm mt-4 mb-1">A:</div>
        <div class="text-lg">{{ c.back }}</div>

        <div class="text-xs text-slate-500 mt-3">
          reps: {{c.repetitions}} · interval: {{c.interval}}d · due: {{ c.due | date:'yyyy-MM-dd' }}
        </div>

        <div class="mt-3 flex gap-4">
          <button class="btn-ghost text-red-600 hover:text-red-700" (click)="delCard(c)">Delete</button>
          <a class="btn-ghost hover:underline" [routerLink]="['/study', id]">Study this deck</a>
        </div>
      </article>
    </div>
  `,
})
export class DeckDetailComponent {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  storage = inject(StorageService);

  id = this.route.snapshot.paramMap.get('id')!;
  cards = computed<Card[]>(() => (this.storage as any).cardsByDeck(this.id));

  form = this.fb.nonNullable.group({
    front: ['', Validators.required],
    back: ['', Validators.required],
  });

  async addCard() {
    const { front, back } = this.form.getRawValue();
    await (this.storage as any).addCard(this.id, front, back);
    this.form.reset({ front: '', back: '' });
  }

  async delCard(c: Card) {
    await (this.storage as any).deleteCard(c.id);
  }

  async deleteDeck() {
    const ok = confirm('Delete this deck and ALL its cards & logs?');
    if (!ok) return;
    await (this.storage as any).deleteDeck(this.id);
    this.router.navigate(['/decks']);
  }

  exportCsv() {
    const rows = [['front', 'back'], ...this.cards().map(c => [c.front, c.back])];
    const csv = rows.map(r => r.map(escapeCsv).join(',')).join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `deck-${this.id}.csv`; a.click();
    URL.revokeObjectURL(url);
    function escapeCsv(s: string) {
      return (s.includes('"') || s.includes(',') || s.includes('\n')) ? `"${s.replace(/"/g, '""')}"` : s;
    }
  }

  async importCsv(evt: Event) {
    const file = (evt.target as HTMLInputElement).files?.[0];
    if (!file) return;
    const text = await file.text();
    const rows = parseCsv(text);
    for (const [front, back] of rows) {
      if (!front?.trim() && !back?.trim()) continue;
      await (this.storage as any).addCard(this.id, front ?? '', back ?? '');
    }
  }

  trackId = (_: number, c: Card) => c.id;
}

/** tiny csv parser for "front,back" (optional header) */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let cur: string[] = [], field = '', q = false;
  const pushField = () => { cur.push(field); field=''; };
  const pushRow = () => { rows.push(cur.map(s => s.replace(/\uFEFF/g,'').trim())); cur=[]; };
  for (let i=0;i<text.length;i++){
    const ch=text[i];
    if(q){
      if(ch==='"' && text[i+1]==='"'){ field+='"'; i++; }
      else if(ch==='"'){ q=false; }
      else field+=ch;
    }else{
      if(ch==='"') q=true;
      else if(ch===','){ pushField(); }
      else if(ch==='\n'){ pushField(); pushRow(); }
      else if(ch!=='\r'){ field+=ch; }
    }
  }
  pushField(); if(cur.length) pushRow();
  if(rows.length && rows[0].length>=2){
    const [h1,h2]=rows[0].slice(0,2).map(s=>s.toLowerCase().trim());
    if(h1==='front' && h2==='back') rows.shift();
  }
  return rows;
}
