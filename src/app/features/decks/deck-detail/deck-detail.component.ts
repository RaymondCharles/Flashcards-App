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
    <a routerLink="/decks">← Back</a>
    <h1>Deck Detail</h1>
    <p>Deck ID: <strong>{{ id }}</strong></p>

    <button (click)="deleteDeck()" style="margin:.5rem 0">Delete deck</button>

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
}
