import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../core/storage.service';

// Local "Grade" type so the template loop is strongly typed.
type Grade = 1 | 2 | 3 | 5;

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule],
  template: `
    <h1 class="mb-4 text-2xl font-semibold">Stats</h1>

    <div class="grid gap-6 lg:grid-cols-2">
      <!-- Daily reviews -->
      <section class="card">
        <h2 class="mb-3 font-medium">Daily reviews (last 14 days)</h2>
        <div class="space-y-2">
          <div *ngFor="let d of daily()"
               class="grid grid-cols-[60px_1fr_24px] items-center gap-3">
            <div class="text-sm text-slate-500 dark:text-slate-400">{{ d.label }}</div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="barPct(d.count)"></div>
            </div>
            <div class="text-right text-sm tabular-nums text-slate-500">{{ d.count }}</div>
          </div>
        </div>
      </section>

      <!-- Accuracy by grade -->
      <section class="card">
        <h2 class="mb-3 font-medium">Accuracy by grade</h2>

        <table class="w-56 text-sm">
          <thead class="text-slate-500">
            <tr>
              <th class="px-2 py-1 text-left">Grade</th>
              <th class="px-2 py-1 text-left">Count</th>
              <th class="px-2 py-1 text-left">Share</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let g of grades">
              <td class="px-2 py-1">{{ g }}</td>
              <td class="border px-2 py-1">{{ gradeCounts()[g] || 0 }}</td>
              <td class="border px-2 py-1">{{ share(g) }}%</td>
            </tr>
          </tbody>
        </table>

        <div class="mt-3 text-sm text-slate-500">
          Total: {{ total() }} · Correct: {{ correct() }} · Accuracy: {{ acc() }}%
        </div>
      </section>

      <!-- Upcoming due -->
      <section class="card lg:col-span-2">
        <h2 class="mb-3 font-medium">Due cards (next 7 days)</h2>
        <div class="space-y-2">
          <div *ngFor="let d of dueNext()" class="grid grid-cols-[60px_1fr_24px] items-center gap-3">
            <div class="text-sm text-slate-500 dark:text-slate-400">{{ d.label }}</div>
            <div class="progress-track">
              <div class="progress-fill" [style.width.%]="barPct(d.count)"></div>
            </div>
            <div class="text-right text-sm tabular-nums text-slate-500">{{ d.count }}</div>
          </div>
        </div>
      </section>
    </div>
  `,
})
export class StatsComponent {
  private storage = inject(StorageService);

  // Strongly-typed list fixes: “Argument of type 'number' is not assignable…”
  readonly grades: Grade[] = [1, 2, 3, 5];

  // ----- Daily reviews (last 14 days)
  readonly daily = computed(() => {
    const arr: { label: string; count: number }[] = [];
    const today = new Date();

    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
      const cnt = this.storage.reviewsOnDate(d); // helper we add below
      arr.push({ label, count: cnt });
    }
    return arr;
  });

  // ----- Accuracy / totals
  readonly gradeCounts = computed(() => this.storage.gradeCounts()); // helper we add below
  readonly total = computed(() => this.storage.totalReviews());     // helper
  readonly correct = computed(() => this.storage.correctReviews()); // helper
  readonly acc = computed(() => (this.total() ? Math.round((this.correct() / this.total()) * 100) : 0));

  // ----- Due over next 7 days
  readonly dueNext = computed(() => {
    const arr: { label: string; count: number }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const label = d.toLocaleDateString(undefined, { month: '2-digit', day: '2-digit' });
      const cnt = this.storage.dueCountOnDate(d); // helper we add below
      arr.push({ label, count: cnt });
    }
    return arr;
  });

  share(g: Grade) {
    const t = this.total() || 1;
    return Math.round(((this.gradeCounts()[g] || 0) / t) * 100);
  }

  barPct(count: number) {
    const max = Math.max(
      1,
      ...this.daily().map(d => d.count),
      ...this.dueNext().map(d => d.count),
    );
    return Math.round((count / max) * 100);
  }
}
