import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { StorageService } from '../core/storage.service';

// ngx-echarts v19+ way (works great on recent Angular)
import { NgxEchartsDirective, provideEchartsCore } from 'ngx-echarts';
import * as echarts from 'echarts/core';
import { BarChart, LineChart } from 'echarts/charts';
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([BarChart, LineChart, GridComponent, TooltipComponent, LegendComponent, CanvasRenderer]);

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  providers: [provideEchartsCore({ echarts })],
  template: `
    <h1>Stats</h1>

    <!-- Daily reviews -->
    <section style="margin: 1rem 0">
      <h3 style="margin:.25rem 0">Daily reviews</h3>
      <ng-container *ngIf="hasLogs(); else noLogs">
        <div echarts [options]="dailyOptions()" style="height:320px"></div>
      </ng-container>
      <ng-template #noLogs>
        <p>No reviews yet. Do a study session and come back.</p>
      </ng-template>
    </section>

    <!-- Daily accuracy -->
    <section style="margin: 1rem 0">
      <h3 style="margin:.25rem 0">Accuracy (% good per day)</h3>
      <ng-container *ngIf="hasLogs(); else noAccuracy">
        <div echarts [options]="accOptions()" style="height:320px"></div>
      </ng-container>
      <ng-template #noAccuracy>
        <p>No accuracy data yet.</p>
      </ng-template>
    </section>

    <!-- Due forecast -->
    <section style="margin: 1rem 0">
      <h3 style="margin:.25rem 0">Due forecast (next 14 days)</h3>
      <div echarts [options]="forecastOptions()" style="height:320px"></div>
    </section>
  `,
})
export class StatsComponent {
  storage = inject(StorageService);

  hasLogs = computed(() => this.storage.logs().length > 0);

  // --- computed datasets ---
  private groupByDay = computed(() => {
    const m = new Map<string, { total: number; good: number }>();
    for (const l of this.storage.logs()) {
      const day = isoDay(l.ts);
      const cur = m.get(day) ?? { total: 0, good: 0 };
      cur.total++;
      if (l.grade >= 3) cur.good++;
      m.set(day, cur);
    }
    const dates = Array.from(m.keys()).sort();
    const totals = dates.map(d => m.get(d)!.total);
    const accuracy = dates.map(d => Math.round((m.get(d)!.good / m.get(d)!.total) * 100));
    return { dates, totals, accuracy };
  });

  private forecast = computed(() => {
    const N = 14;
    const counts = Array(N).fill(0);
    const labels: string[] = [];
    const start = startOfDay(Date.now());
    for (let i = 0; i < N; i++) {
      const d = new Date(start + i * DAY);
      labels.push(d.toISOString().slice(5, 10)); // 'MM-DD'
    }
    for (const c of this.storage.cards()) {
      const idx = Math.floor((startOfDay(c.due) - start) / DAY);
      if (idx >= 0 && idx < N) counts[idx]++;
    }
    return { labels, counts };
  });

  // --- chart options (recompute when signals change) ---
  dailyOptions = computed(() => {
    const { dates, totals } = this.groupByDay();
    return {
      tooltip: {},
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', name: 'Reviews', data: totals }],
      legend: { show: false },
    };
  });

  accOptions = computed(() => {
    const { dates, accuracy } = this.groupByDay();
    return {
      tooltip: {},
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: dates },
      yAxis: { type: 'value', min: 0, max: 100 },
      series: [{ type: 'line', name: 'Accuracy', data: accuracy, smooth: true }],
      legend: { show: false },
    };
  });

  forecastOptions = computed(() => {
    const { labels, counts } = this.forecast();
    return {
      tooltip: {},
      grid: { left: 40, right: 20, top: 20, bottom: 40 },
      xAxis: { type: 'category', data: labels },
      yAxis: { type: 'value' },
      series: [{ type: 'bar', name: 'Due', data: counts }],
      legend: { show: false },
    };
  });
}

// ---- helpers ----
const DAY = 24 * 60 * 60 * 1000;
function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0,0,0,0); return d.getTime(); }
function isoDay(ts: number) { return new Date(startOfDay(ts)).toISOString().slice(0,10); }
