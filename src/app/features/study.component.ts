// src/app/features/study.component.ts
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService, Card } from '../core/storage.service';

type Grade = 1 | 2 | 3 | 5;

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <a routerLink="/decks" class="text-indigo-600">&larr; Back to Decks</a>
    <div class="text-sm text-slate-500 mt-2">Deck: <span class="badge">{{ id }}</span></div>

    <section *ngIf="!showRecap()" class="container-page">
      <div class="card">
        <div class="text-xs text-slate-500 mb-2">
          Remaining: {{ remaining() }} · Time on card: {{ elapsed() }}s
        </div>
        <div class="w-full h-2 bg-slate-200 rounded">
          <div class="h-2 bg-indigo-300 rounded" [style.width.%]="progressPct()"></div>
        </div>

        <ng-container *ngIf="!revealed(); else backTpl">
          <div class="mt-4" *ngIf="card() as c">
            <div class="font-semibold text-slate-700 mb-2">Front</div>
            <div class="text-lg">{{ c.front }}</div>
          </div>
          <button class="btn mt-4" (click)="reveal()" accesskey=" ">
            Reveal (Space)
          </button>
        </ng-container>

        <ng-template #backTpl>
          <div class="mt-4" *ngIf="card() as c">
            <div class="font-semibold text-slate-700 mb-2">Back</div>
            <div class="text-lg mb-3">{{ c.back }}</div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button class="btn-ghost" [disabled]="!canUndo()" (click)="undo()">Undo (Z)</button>
            <button class="btn" (click)="grade(1)">Again (1)</button>
            <button class="btn" (click)="grade(2)">Hard (2)</button>
            <button class="btn" (click)="grade(3)">Good (3)</button>
            <button class="btn" (click)="grade(5)">Easy (5)</button>
          </div>
        </ng-template>
      </div>
    </section>

    <section *ngIf="showRecap()" class="container-page">
      <div class="card max-w-xl">
        <h3 class="font-semibold mb-2">Session recap</h3>
        <div class="text-sm text-slate-600 mb-3">
          Reviewed {{ reviewed() }} | Correct {{ correct() }} | Incorrect {{ incorrect() }} |
          Accuracy {{ accuracy() }}% | Avg time {{ avgTime() }}s
        </div>
        <table class="text-sm border">
          <thead class="bg-slate-50">
            <tr><th class="px-2 py-1 border">Grade</th><th class="px-2 py-1 border">Count</th></tr>
          </thead>
          <tbody>
            <tr *ngFor="let g of [1,2,3,5]">
              <td class="px-2 py-1 border">{{ g }}</td>
              <td class="px-2 py-1 border">{{ gradeCounts()[g] || 0 }}</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-3 flex gap-3">
          <button class="btn" (click)="studyMore()">Study more (new queue)</button>
          <a class="btn-ghost" routerLink="/stats">Open Stats</a>
          <a class="btn-ghost" [routerLink]="['/decks', id]">Back to deck</a>
        </div>
      </div>
    </section>
  `,
})
export class StudyComponent {
  private route = inject(ActivatedRoute);
  storage = inject(StorageService);
  id = this.route.snapshot.paramMap.get('id')!;

  private all = signal<Card[]>([]);
  private idx = signal(0);
  private showBack = signal(false);

  private lastAnswer: { card: Card; grade: Grade; ms: number } | null = null;

  private tId: any = null;
  elapsed = signal(0);

  constructor() { this.resetQueue(); }

  private resetQueue() {
    const now = Date.now();
    const all = this.storage.cardsByDeck(this.id);
    const due = all.filter(c => c.due <= now);
    const fresh = all.filter(c => c.repetitions === 0 && c.due > now);
    const rest = all.filter(c => !due.includes(c) && !fresh.includes(c));
    this.all.set([...due, ...fresh, ...rest]);
    this.idx.set(0);
    this.showBack.set(false);
    this.elapsed.set(0);
    this.startTimer();
  }

  card = computed(() => this.all()[this.idx()]);
  remaining = computed(() => Math.max(0, this.all().length - this.idx() - (this.card() ? 1 : 0)));
  revealed = computed(() => this.showBack());
  showRecap = computed(() => !this.card());

  reviewed = signal(0);
  correct = signal(0);
  incorrect = signal(0);
  totalTimeMs = signal(0);
  gradeCounts = signal<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 5: 0 });

  progressPct = computed(() => {
    const total = this.all().length || 1;
    return Math.round((this.idx() / total) * 100);
  });

  accuracy = computed(() => this.reviewed() ? Math.round((this.correct() / this.reviewed()) * 100) : 0);
  avgTime  = computed(() => this.reviewed() ? Math.round(this.totalTimeMs() / this.reviewed() / 1000) : 0);

  reveal() { this.showBack.set(true); }

  grade(g: Grade) {
    const c = this.card();
    if (!c) return;
    const ms = this.elapsed() * 1000;

    this.storage.applyReview(c, g);
    this.storage.logReview(this.id, c.id, g, ms);

    this.reviewed.update(x => x + 1);
    if (g >= 3) this.correct.update(x => x + 1);
    else this.incorrect.update(x => x + 1);
    this.totalTimeMs.update(x => x + ms);
    this.gradeCounts.update(m => ({ ...m, [g]: (m[g] || 0) + 1 }));

    this.lastAnswer = { card: c, grade: g, ms };
    this.nextCard();
  }

  canUndo() { return !!this.lastAnswer; }
  undo() {
    if (!this.lastAnswer) return;
    const g = this.lastAnswer.grade;
    this.reviewed.update(x => Math.max(0, x - 1));
    if (g >= 3) this.correct.update(x => Math.max(0, x - 1));
    else this.incorrect.update(x => Math.max(0, x - 1));
    this.totalTimeMs.update(x => Math.max(0, x - this.lastAnswer!.ms));
    this.gradeCounts.update(m => ({ ...m, [g]: Math.max(0, (m[g] || 1) - 1) }));
    this.idx.update(i => Math.max(0, i - 1));
    this.showBack.set(true);
    this.lastAnswer = null;
    this.restartTimer();
  }

  studyMore() { this.resetQueue(); }

  private startTimer() {
    this.stopTimer();
    this.elapsed.set(0);
    this.tId = setInterval(() => this.elapsed.update(s => s + 1), 1000);
  }
  private stopTimer() { if (this.tId) clearInterval(this.tId); this.tId = null; }
  private restartTimer() { this.stopTimer(); this.elapsed.set(0); this.startTimer(); }
  private nextCard() { this.idx.update(i => i + 1); this.showBack.set(false); this.restartTimer(); }
}
