import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterOutlet],
  template: `
    <header class="sticky top-0 z-40 backdrop-blur bg-white/70 border-b">
      <div class="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        <a routerLink="/" class="flex items-center gap-2">
          <span class="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-600 text-white text-sm font-bold">S</span>
          <span class="font-semibold">SrsCards</span>
        </a>

        <nav class="flex items-center gap-4 text-sm">
          <a routerLink="/" class="link">Dashboard</a>
          <a routerLink="/decks" class="link">Decks</a>
          <a routerLink="/stats" class="link">Stats</a>
          <a routerLink="/study/seed-deck" class="link">Study (demo)</a>
        </nav>
      </div>
    </header>

    <main class="max-w-5xl mx-auto px-4 py-6">
      <router-outlet></router-outlet>
    </main>

    <footer class="py-8 text-center text-xs text-slate-500">
      Built with Angular · Tailwind · SRS
    </footer>
  `,
})
export class AppComponent {}
