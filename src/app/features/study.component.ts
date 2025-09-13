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

    <!-- Active session -->
    <ng-container *ngIf="!finished(); else recap">
      <ng-container *ngIf="current(); else doneEmpty">
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

        <div style="display:flex; gap:1rem; margin-top:.5rem; opacity:.75">
          <span>Remaining: {{ queue().length - 1 }}</span>
          <span>Time on card: {{ elapsed() }}s</span>
        </div>
      </ng-container>

      <ng-template #doneEmpty>
        <p>No cards queued right now.</p>
        <button (click)="restart()">Build a new queue</button>
      </ng-template>
    </ng-container>

    <!-- Recap -->
    <ng-template #recap>
      <div style="padding:1rem; border:1px solid #ddd; max-width:800px">
        <h2>Session recap</h2>
        <p style="margin:.5rem 0 1rem 0">
          Reviewed <strong>{{ reviewed() }}</strong> |
          Correct <strong>{{ correct() }}</strong> |
          Incorrect <strong>{{ incorrect() }}</strong> |
          Accuracy <strong>{{ accuracy() }}%</strong> |
          Avg time <strong>{{ avgTime() }}s</strong>
        </p>

        <table style="border-collapse:collapse; margin:.5rem 0">
          <tr><th style="border:1px solid #ddd; padding:.25rem .5rem">Grade</th>
              <th style="border:1px solid #ddd; padding:.25rem .5rem">Count</th></tr>
          <tr *ngFor="let g of [1,2,3,5]">
            <td style="border:1px solid #ddd; padding:.25rem .5rem">{{ g }}</td>
            <td style="border:1px solid #ddd; padding:.25rem .5rem">{{ gradeCounts()[g] ?? 0 }}</td>
          </tr>
        </table>

        <div style="display:flex; gap:.5rem; flex-wrap:wrap">
          <button (click)="restart()">Study more (new queue)</button>
          <a routerLink="/stats">Open Stats</a>
          <a [routerLink]="['/decks', deckId]">Back to deck</a>
        </div>
      </div>
    </ng-template>
  `,
})
export class StudyComponent {
  private route = inject(ActivatedRoute);
  storage = inject(StorageService);

  deckId = this.route.snapshot.paramMap.get('deckId')!;

  // session queue
  queue = signal<Card[]>([]);
  current = computed<Card | null>(() => this.queue()[0] ?? null);
  revealed = signal(false);

  // per-card timer
  elapsed = signal(0);
  private startAt = 0;
  private tId: any = null;

  // recap stats
  reviewed = signal(0);
  correct  = signal(0);
  incorrect = signal(0);
  totalTimeMs = signal(0);
  gradeCounts = signal<Partial<Record<number, number>>>({});
  finished = signal(false);

  constructor() {
    this.restart(); // build the initial queue and start timer
  }

  // keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    if (this.finished()) return;
    if (e.key === ' ') { e.preventDefault(); this.reveal(); return; }
    if (!this.revealed()) return;
    if (e.key === '1') this.grade(1);
    if (e.key === '2') this.grade(2);
    if (e.key === '3') this.grade(3);
    if (e.key === '5') this.grade(5);
  }

  // UI actions
  reveal() { if (this.current()) this.revealed.set(true); }

  async grade(g: Grade) {
    const card = this.current();
    if (!card) return;

    const timeMs = Date.now() - this.startAt;
    await this.storage.review(card, g, timeMs);

    // update recap stats
    this.reviewed.update(n => n + 1);
    if (g >= 3) this.correct.update(n => n + 1);
    else this.incorrect.update(n => n + 1);
    this.totalTimeMs.update(ms => ms + timeMs);
    this.gradeCounts.update(map => ({ ...map, [g]: (map[g] ?? 0) + 1 }));

    // move on
    const rest = this.queue().slice(1);
    if (rest.length === 0) {
      this.stopTimer();
      this.finished.set(true);
      return;
    }
    this.queue.set(rest);
    this.revealed.set(false);
    this.startTimer();
  }

  restart() {
    this.queue.set(this.storage.dueCards(this.deckId));
    this.revealed.set(false);
    this.finished.set(false);
    this.reviewed.set(0);
    this.correct.set(0);
    this.incorrect.set(0);
    this.totalTimeMs.set(0);
    this.gradeCounts.set({});
    this.startTimer();
  }

  // computed metrics
  accuracy = computed(() => {
    const r = this.reviewed();
    return r ? Math.round((this.correct() / r) * 100) : 0;
    });
  avgTime = computed(() => {
    const r = this.reviewed();
    return r ? Math.round(this.totalTimeMs() / r / 1000) : 0;
    });

  // timer helpers
  private startTimer() {
    this.stopTimer();
    this.elapsed.set(0);
    this.startAt = Date.now();
    this.tId = setInterval(() => this.elapsed.update(s => s + 1), 1000);
  }
  private stopTimer() {
    if (this.tId) { clearInterval(this.tId); this.tId = null; }
  }
}
