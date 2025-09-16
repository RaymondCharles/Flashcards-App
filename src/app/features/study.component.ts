// src/app/features/study.component.ts
import { Component, HostListener, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService, Card } from '../core/storage.service';

type Grade = 1 | 2 | 3 | 5;
const isGrade = (n: number): n is Grade => n === 1 || n === 2 || n === 3 || n === 5;

@Component({
  selector: 'app-study',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
  <a class="btn-ghost mb-3 inline-flex items-center gap-2" [routerLink]="['/decks', id]">← Back to Decks</a>
  <div class="mb-2 text-sm">
    Deck: <span class="badge">{{ id }}</span>
  </div>

  <!-- Recap -->
  <section *ngIf="showRecap()" class="card max-w-2xl">
    <h2 class="mb-3 text-xl font-semibold">Session recap</h2>
    <div class="mb-2 text-sm">
      Reviewed {{ reviewed() }} · Correct {{ correct() }} · Incorrect {{ reviewed() - correct() }} ·
      Accuracy {{ accuracy() }}% · Avg time {{ avgTime() }}s
    </div>

    <table class="mb-4 w-40 text-sm">
      <thead class="text-slate-500 dark:text-slate-400">
        <tr><th class="px-2 py-1 text-left">Grade</th><th class="px-2 py-1 text-left">Count</th></tr>
      </thead>
      <tbody>
        <tr *ngFor="let g of grades">
          <td class="px-2 py-1">{{ g }}</td>
          <td class="px-2 py-1 border">{{ countFor(g) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="flex flex-wrap gap-3">
      <button class="btn" (click)="studyMore()">Study more (new queue)</button>
      <a class="btn-ghost" routerLink="/stats">Open Stats</a>
      <a class="btn-ghost" [routerLink]="['/decks', id]">Back to deck</a>
    </div>
  </section>

  <!-- Study -->
  <section *ngIf="!showRecap()" class="study-wrap">
    <div class="card study-card">

      <!-- progress -->
      <div class="mb-4">
        <div class="mb-2 text-sm text-slate-500 dark:text-slate-400">
          Remaining: {{ remaining() }} · Time on card: {{ elapsed() }}s
        </div>
        <div class="progress-track">
          <div class="progress-fill" [style.width.%]="barPct(remaining())"></div>
        </div>
      </div>

      <!-- flip card -->
      <div class="flip" [class.is-flipped]="revealed()">
        <div class="flip-inner">
          <!-- front -->
          <div class="flip-face">
            <div class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Front</div>
            <div class="text-2xl leading-relaxed mt-2">{{ card().front }}</div>

            <div class="pt-4">
              <button class="btn" (click)="reveal()">Reveal (Space)</button>
            </div>
          </div>

          <!-- back -->
          <div class="flip-face flip-back">
            <div class="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Back</div>
            <div class="text-2xl leading-relaxed mt-2 mb-3">{{ card().back }}</div>

            <div class="flex flex-wrap gap-2">
              <button class="btn-ghost" [disabled]="!canUndo()" (click)="undo()">Undo (Z)</button>
              <button class="btn bg-slate-600 hover:bg-slate-700" (click)="grade(1)">Again (1)</button>
              <button class="btn bg-amber-600 hover:bg-amber-700" (click)="grade(2)">Hard (2)</button>
              <button class="btn bg-emerald-600 hover:bg-emerald-700" (click)="grade(3)">Good (3)</button>
              <button class="btn bg-indigo-600 hover:bg-indigo-700" (click)="grade(5)">Easy (5)</button>
            </div>
          </div>
        </div>
      </div>

    </div>
  </section>
  `
})
export class StudyComponent {
  private route = inject(ActivatedRoute);
  storage = inject(StorageService);
  id = this.route.snapshot.paramMap.get('id')!;

  grades = [1, 2, 3, 5]; // used by template

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
  correct  = signal(0);
  incorrect = signal(0);
  totalTimeMs = signal(0);
  gradeCounts = signal<Record<number, number>>({ 1: 0, 2: 0, 3: 0, 5: 0 });

  accuracy = computed(() => this.reviewed() ? Math.round((this.correct() / this.reviewed()) * 100) : 0);
  avgTime  = computed(() => this.reviewed() ? Math.round(this.totalTimeMs() / this.reviewed() / 1000) : 0);

  reveal() { this.showBack.set(true); }

  // Accept number from templates/keyboard, narrow to Grade
  grade(g: number) {
    if (!isGrade(g)) return;
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

  // % filled for the progress bar
  barPct(n: number) {
    const total = Math.max(1, n + this.reviewed());
    return Math.round(((total - n) / total) * 100);
  }

  // Count for grade table (accept number to avoid template casting)
  countFor(g: number): number {
    const m = this.gradeCounts();
    return m[g] ?? 0;
  }

  // Keyboard shortcuts
  @HostListener('window:keydown', ['$event'])
  onKey(e: KeyboardEvent) {
    // Space to reveal
    if (e.key === ' ' && !this.revealed()) {
      e.preventDefault();
      this.reveal();
      return;
    }
    if (!this.revealed()) return;

    // Z to undo
    if (e.key.toLowerCase() === 'z') {
      e.preventDefault();
      this.undo();
      return;
    }

    // 1/2/3/5 to grade
    const g = Number(e.key);
    if (isGrade(g)) {
      e.preventDefault();
      this.grade(g);
    }
  }
}
