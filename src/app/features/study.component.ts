import { Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { StorageService } from '../core/storage.service';
import type { Card, Grade } from '../core/models';
import * as scheduler from '../core/scheduler';

type Action = { cardBefore: Card; cardAfter: Card; grade: Grade; timeMs: number };

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/decks" class="text-sm text-indigo-700 hover:underline">← Back to Decks</a>
    <div class="text-slate-500 mb-3">Deck: <span class="badge">{{ id }}</span></div>

    <!-- Recap -->
    <section *ngIf="showRecap()" class="card max-w-3xl">
      <h2 class="text-xl font-semibold mb-2">Session recap</h2>
      <div class="text-sm mb-3">
        Reviewed {{ reviewed() }} | Correct {{ correct() }} | Incorrect {{ reviewed() - correct() }} |
        Accuracy {{ accuracy() }}% | Avg time {{ avgTime() }}s
      </div>

      <table class="text-sm border w-fit">
        <thead><tr><th class="px-2 py-1 border">Grade</th><th class="px-2 py-1 border">Count</th></tr></thead>
        <tbody>
          <tr *ngFor="let g of [1,2,3,5]">
            <td class="px-2 py-1 border">{{ g }}</td>
            <td class="px-2 py-1 border">{{ gradeCounts()[g] ?? 0 }}</td>
          </tr>
        </tbody>
      </table>

      <div class="mt-4 flex gap-3">
        <button class="btn" (click)="studyMore()">Study more (new queue)</button>
        <a class="btn-ghost" [routerLink]="['/stats']">Open Stats</a>
        <a class="btn-ghost" [routerLink]="['/decks', id]">Back to deck</a>
      </div>
    </section>

    <!-- Active Study -->
    <section *ngIf="!showRecap()" class="card max-w-3xl">
      <div class="text-sm text-slate-600 mb-2">
        Remaining: {{ remaining() }} · Time on card: {{ elapsed() }}s
      </div>

      <div class="w-full bg-slate-200 h-2 rounded mb-4">
        <div class="h-2 bg-indigo-600 rounded" [style.width.%]="progressPct()"></div>
      </div>

      <div *ngIf="!revealed(); else backTpl">
        <div class="font-semibold mb-1">Front</div>
        <div class="text-lg mb-4">{{ card()?.front }}</div>
        <button class="btn" (click)="reveal()">Reveal (Space)</button>
      </div>

      <ng-template #backTpl>
        <div class="font-semibold mb-1">Back</div>
        <div class="text-lg mb-3">{{ card()?.back }}</div>
        <div class="flex gap-2">
          <button class="btn-ghost" [disabled]="!canUndo()" (click)="undo()">Undo (Z)</button>
          <button class="btn" (click)="grade(1)">Again (1)</button>
          <button class="btn" (click)="grade(2)">Hard (2)</button>
          <button class="btn" (click)="grade(3)">Good (3)</button>
          <button class="btn" (click)="grade(5)">Easy (5)</button>
        </div>
      </ng-template>
    </section>
  `,
})
export class StudyComponent {
  private route = inject(ActivatedRoute);
  private storage = inject(StorageService);

  id = this.route.snapshot.paramMap.get('id')!;

  queue = signal<Card[]>([]);
  index = signal(0);
  revealed = signal(false);

  private t0 = signal<number>(Date.now());
  elapsed = signal(0);
  private tick?: any;

  reviewed = signal(0);
  correct = signal(0);
  totalTimeMs = signal(0);
  gradeCounts = signal<Record<number, number>>({});

  history = signal<Action[]>([]);

  constructor() {
    this.buildQueue();
    this.startTimer();

    effect(() => {
      if (this.tick) clearInterval(this.tick);
      this.tick = setInterval(() => this.elapsed.update(s => s + 1), 1000);
    });

    window.addEventListener('keydown', this.onKey);
  }

  ngOnDestroy() {
    if (this.tick) clearInterval(this.tick);
    window.removeEventListener('keydown', this.onKey);
  }

  onKey = (e: KeyboardEvent) => {
    if (this.showRecap()) return;
    if (e.key === ' ' && !this.revealed()) { e.preventDefault(); this.reveal(); }
    if (this.revealed()) {
      if (e.key === '1') this.grade(1);
      if (e.key === '2') this.grade(2);
      if (e.key === '3') this.grade(3);
      if (e.key.toLowerCase() === 'e' || e.key === '5') this.grade(5);
      if (e.key.toLowerCase() === 'z') this.undo();
    }
  };

  card = computed(() => this.queue()[this.index()] ?? null);
  remaining = computed(() => Math.max(this.queue().length - this.index(), 0));
  showRecap = computed(() => !this.card());
  accuracy = computed(() => {
    const r = this.reviewed();
    return r ? Math.round((this.correct() / r) * 100) : 0;
  });
  avgTime = computed(() => {
    const r = this.reviewed();
    return r ? Math.round(this.totalTimeMs() / r / 1000) : 0;
  });
  progressPct = computed(() => {
    const q = this.queue().length;
    return q ? Math.round((this.index() / q) * 100) : 100;
  });

  private startTimer() { this.t0.set(Date.now()); this.elapsed.set(0); }
  private stopTimer(): number { const ms = Date.now() - this.t0(); this.elapsed.set(0); return ms; }

  private buildQueue() {
    const svc = this.storage as any;
    const due = typeof svc.dueCards === 'function' ? svc.dueCards(this.id) : [];
    const all = typeof svc.cardsByDeck === 'function' ? svc.cardsByDeck(this.id) : [];
    this.queue.set(due.length ? due : all);
    this.index.set(0);
    this.revealed.set(false);
    this.startTimer();
  }

  reveal() { this.revealed.set(true); }

  async grade(g: Grade) {
    const c = this.card();
    if (!c) return;

    const before = { ...c };
    const timeMs = this.stopTimer();

    const after = { ...c };

    // Call whichever scheduler function your app actually exports
    const sched: any = scheduler as any;
    const fn = sched.grade ?? sched.review ?? sched.rate ?? sched.schedule;
    if (typeof fn === 'function') {
      fn(after, g, timeMs);
    } else {
      // very naive fallback if no scheduler provided
      after.repetitions = (after.repetitions ?? 0) + (g >= 3 ? 1 : 0);
      after.interval = Math.max(1, Math.round((after.interval ?? 0) * (g >= 5 ? 2.5 : g >= 3 ? 1.6 : 0.5)));
      after.due = Date.now() + after.interval * 24 * 60 * 60 * 1000;
    }

    await (this.storage as any).updateCard(after);

    this.reviewed.update(n => n + 1);
    if (g >= 3) this.correct.update(n => n + 1);
    this.totalTimeMs.update(ms => ms + timeMs);
    this.gradeCounts.update(m => ({ ...m, [g]: (m[g] ?? 0) + 1 }));

    this.history.update(h => [{ cardBefore: before, cardAfter: after, grade: g, timeMs }, ...h].slice(0, 20));

    this.index.update(i => i + 1);
    this.revealed.set(false);
    this.startTimer();
  }

  canUndo = computed(() => this.history().length > 0);

  async undo() {
    const last = this.history()[0];
    if (!last) return;
    await (this.storage as any).updateCard(last.cardBefore);

    this.reviewed.update(n => Math.max(0, n - 1));
    if (last.grade >= 3) this.correct.update(n => Math.max(0, n - 1));
    this.totalTimeMs.update(ms => Math.max(0, ms - last.timeMs));
    this.gradeCounts.update(m => ({ ...m, [last.grade]: Math.max(0, (m[last.grade] ?? 1) - 1) }));

    this.index.update(i => Math.max(0, i - 1));
    this.revealed.set(true);
    this.history.update(h => h.slice(1));
    this.startTimer();
  }

  studyMore() { this.buildQueue(); }
}
