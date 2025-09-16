import { Component, inject, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './app.component.html',
})
export class AppComponent {
  theme = signal<'light' | 'dark'>(this.readTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  toggleTheme() {
    const next: 'light' | 'dark' = this.theme() === 'dark' ? 'light' : 'dark';
    this.theme.set(next);
    this.applyTheme(next);
    localStorage.setItem('srs-theme', next);
  }

  // ---- helpers
  private readTheme(): 'light' | 'dark' {
    const stored = localStorage.getItem('srs-theme') as 'light' | 'dark' | null;
    if (stored) return stored;
    const prefersDark =
      window.matchMedia &&
      window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  private applyTheme(theme: 'light' | 'dark') {
    const root = document.documentElement; // <html>
    root.classList.toggle('dark', theme === 'dark');
  }
}
