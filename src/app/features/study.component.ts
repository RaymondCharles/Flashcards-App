import { Component, computed, inject, signal, HostListener } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../core/storage.service';
import type { Card, Grade } from '../core/models';

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/decks">← Back to Decks</a>
    <h1>Study</h1>
    <p>Deck: <strong>{{ deckId }}</strong></p>

    <ng-container *ngIf="current(); else done">
      <div style="padding:1rem; border:1px solid #ddd; max-width:700px">
        <div *ngIf="!revealed(); else back">
          <h3>Front</h3>
          <p style="font-size:1.2rem">{{ current()!.front }}</p>
          <button (click)="reveal()">Reveal (Space)</button>
        </div>

        <ng-template #back>
          <h3>Back</h3>
          <p style="font-size:1.2rem">{{ current()!.back }}</p>
          <div style="display:flex; gap:.5rem; flex-wrap:wrap">
            <button (click)="grade(1)">Again (1)</button>
            <button (click)="grade(2)">Hard (2)</button>
            <button (click)="grade(3)">Good (3)</button>
            <button (click)="grade(5)">Easy (5)</button>
          </div>
        </ng-template>
      </div>

      <div style="display:flex; gap:1.25rem; margin-top:.5rem; opacity:.75">
        <span>Remaining: {{ queue().length - 1 }}</span>
        <span>Time on card: {{ elapsed() }}s</span>
      </div>
    </ng-container>

    <ng-template #done>
      <p>All done for now 🎉</p>
      <a [routerLink]="['/decks', deckId]">Back to deck</a>
    </ng-template>
  `,
})
export class StudyComponent {
  private route = inject(ActivatedRoute);
  storage = inject(StorageService);

  deckId = this.route.snapshot.paramMap.get('deckId')!;

  // session state
  queue = signal<Card[]>([]);
  current = computed<Card | null>(() => this.queue()[0] ?? null);
  revealed = signal(false);

  // timer state
  elapsed = signal(0);
  private startAt = 0;
  private tId: any = null;

  constructor() {
    // initial queue + start timer
    this.queue.set(this.storage.dueCards(this.deckId));
    this.startTimer();
  }

  // ——— keyboard shortcuts ———
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (e.key === ' ') { e.preventDefault(); this.reveal(); return; }
    if (!this.revealed()) return;               // only grade after reveal
    if (e.key === '1') this.grade(1);
    if (e.key === '2') this.grade(2);
    if (e.key === '3') this.grade(3);
    if (e.key === '5') this.grade(5);
  }

  // ——— UI actions ———
  reveal() { if (this.current()) this.revealed.set(true); }

  async grade(g: Grade) {
    const card = this.current();
    if (!card) return;
    const timeMs = Date.now() - this.startAt;

    await this.storage.review(card, g, timeMs);

    // move to next card
    const rest = this.queue().slice(1);
    this.queue.set(rest);
    this.revealed.set(false);

    // reset timer for next card
    this.startTimer();
  }

  // ——— timer helpers ———
  private startTimer() {
    this.stopTimer();
    this.elapsed.set(0);
    this.startAt = Date.now();
    this.tId = setInterval(() => this.elapsed.update(s => s + 1), 1000);
  }
  private stopTimer() { if (this.tId) { clearInterval(this.tId); this.tId = null; } }
}
