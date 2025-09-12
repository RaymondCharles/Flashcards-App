import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { StorageService } from './core/storage.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink],
  template: `
    <nav style="display:flex; gap:1rem; padding:1rem; border-bottom:1px solid #ddd">
      <a routerLink="">Dashboard</a>
      <a routerLink="decks">Decks</a>
      <a routerLink="stats">Stats</a>
      <a routerLink="study/seed-deck">Study (demo)</a>
    </nav>
    <main style="padding:1rem">
      <router-outlet></router-outlet>
    </main>
  `,
})
export class AppComponent {
  constructor(private storage: StorageService) {
    this.storage.init();
  }
}
