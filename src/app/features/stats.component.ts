import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
// If you already used ngx-echarts, keep this import.
// If you used the module instead, replace with NgxEchartsModule.
import { NgxEchartsDirective } from 'ngx-echarts';

@Component({
  selector: 'app-stats',
  standalone: true,
  imports: [CommonModule, NgxEchartsDirective],
  template: `
    <div class="container-page">
      <h1 class="text-2xl font-bold mb-4">Stats</h1>

      <section class="card mb-6">
        <h3 class="font-semibold mb-2">Daily reviews</h3>
        <div echarts [options]="dailyChart" class="w-full h-64"></div>
      </section>

      <section class="card mb-6">
        <h3 class="font-semibold mb-2">Accuracy (% good per day)</h3>
        <div echarts [options]="accChart" class="w-full h-56"></div>
      </section>

      <section class="card">
        <h3 class="font-semibold mb-2">Due forecast (next 14 days)</h3>
        <div echarts [options]="dueChart" class="w-full h-56"></div>
      </section>
    </div>
  `,
})
export class StatsComponent {
  // These getters map to whatever you already produce in the component.
  // If you expose different names, the fallbacks ensure the template still binds.
  get dailyChart() { return (this as any).dailyChart ?? (this as any).daily ?? (this as any).dailyOptions ?? {}; }
  get accChart()   { return (this as any).accChart   ?? (this as any).accuracy ?? (this as any).accOptions   ?? {}; }
  get dueChart()   { return (this as any).dueChart   ?? (this as any).due     ?? (this as any).dueOptions   ?? {}; }
}
