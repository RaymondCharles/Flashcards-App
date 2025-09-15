import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="card container-page">
      <h1 class="text-2xl font-semibold mb-2">Dashboard</h1>
      <p class="mb-4">Welcome to SRS Cards.</p>

      <div class="flex gap-3">
        <a class="btn" routerLink="/decks">Go to Decks</a>
        <!-- Change "seed-deck" to any real deck id to use Quick Study -->
        <a class="btn-ghost" [routerLink]="['/study', 'seed-deck']">Quick Study</a>
      </div>
    </section>
  `,
})
export class DashboardComponent {}
