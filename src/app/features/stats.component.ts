// src/app/features/stats.component.ts
import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../core/storage.service';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Stats</h1>

    <div *ngIf="!hasData(); else charts" class="card max-w-xl">
      <h3 class="font-medium mb-1">No data yet</h3>
      <p class="text-slate-600 text-sm">Do a study session, then come back here to see your graphs.</p>
      <a class="btn mt-3 w-fit" routerLink="/decks">Go to Decks</a>
    </div>

    <ng-template #charts>
      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">

        <div class="card">
          <h3 class="font-semibold mb-3">Daily reviews (last 14 days)</h3>
          <div class="space-y-2">
            <div *ngFor="let d of daily()" class="flex items-center gap-2 text-sm">
              <div class="w-28 text-slate-600">{{ d.label }}</div>
              <div class="flex-1 h-3 bg-slate-200 rounded">
                <div class="h-3 bg-indigo-400 rounded" [style.width.%]="barPct(d.count)"></div>
              </div>
              <div class="w-10 text-right">{{ d.count }}</div>
            </div>
          </div>
        </div>

        <div class="card">
          <h3 class="font-semibold mb-3">Accuracy by grade</h3>
          <table class="text-sm border">
            <thead class="bg-slate-50">
              <tr>
                <th class="px-2 py-1 border">Grade</th>
                <th class="px-2 py-1 border">Count</th>
                <th class="px-2 py-1 border">Share</th>
              </tr>
            </thead>
            <tbody>
              <tr *ngFor="let g of [1,2,3,5]">
                <td class="px-2 py-1 border">{{ g }}</td>
                <td class="px-2 py-1 border">{{ counts()[g] || 0 }}</td>
                <td class="px-2 py-1 border">{{ share(g) }}%</td>
              </tr>
            </tbody>
          </table>
          <div class="text-sm text-slate-600 mt-2">
            Total: {{ total() }} · Correct: {{ correct() }} · Accuracy: {{ accuracy() }}%
          </div>
        </div>

        <div class="card lg:col-span-2">
          <h3 class="font-semibold mb-3">Due cards (next 7 days)</h3>
          <div class="space-y-2">
            <div *ngFor="let d of dueNext7()" class="flex items-center gap-2 text-sm">
              <div class="w-28 text-slate-600">{{ d.label }}</div>
              <div class="flex-1 h-3 bg-slate-200 rounded">
                <div class="h-3 bg-emerald-400 rounded" [style.width.%]="barPct(d.count)"></div>
              </div>
              <div class="w-10 text-right">{{ d.count }}</div>
            </div>
          </div>
        </div>

      </div>
    </ng-template>
  `,
})
export class StatsComponent {
  private storage = inject(StorageService);
  private logs = computed(() => this.storage.allLogs());
  private cards = computed(() => this.storage.allCards());

  hasData = computed(() => this.logs().length > 0);

  counts = computed<Record<number, number>>(() => {
    const m: Record<number, number> = { 1: 0, 2: 0, 3: 0, 5: 0 };
    for (const l of this.logs()) m[l.grade] = (m[l.grade] || 0) + 1;
    return m;
  });
  total = computed(() => this.logs().length);
  correct = computed(() => (this.counts()[3] || 0) + (this.counts()[5] || 0));
  accuracy = computed(() => this.total() ? Math.round((this.correct() / this.total()) * 100) : 0);
  share = (g: number) => this.total() ? Math.round(((this.counts()[g] || 0) / this.total()) * 100) : 0;

  daily = computed(() => {
    const today = startOfDay(Date.now());
    const dayMs = 24 * 60 * 60 * 1000;
    const arr: { ts: number; label: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d0 = today - i * dayMs;
      const d1 = d0 + dayMs;
      const cnt = this.logs().filter(l => l.ts >= d0 && l.ts < d1).length;
      arr.push({ ts: d0, label: fmtDay(d0), count: cnt });
    }
    return arr;
  });

  dueNext7 = computed(() => {
    const today = startOfDay(Date.now());
    const dayMs = 24 * 60 * 60 * 1000;
    const arr: { label: string; count: number }[] = [];
    const all = this.cards();
    for (let offset = 0; offset < 7; offset++) {
      const d0 = today + offset * dayMs;
      const d1 = d0 + dayMs;
      const cnt = all.filter(c => c.due >= d0 && c.due < d1).length;
      arr.push({ label: fmtDay(d0), count: cnt });
    }
    return arr;
  });

  barPct(count: number) {
    const max = Math.max(1,
      ...this.daily().map(d => d.count),
      ...this.dueNext7().map(d => d.count),
    );
    return Math.round((count / max) * 100);
  }
}

function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
function fmtDay(ts: number) { const d = new Date(ts); const m=(d.getMonth()+1).toString().padStart(2,'0'); const day=d.getDate().toString().padStart(2,'0'); return `${m}/${day}`; }
