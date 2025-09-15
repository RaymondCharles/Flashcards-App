import { Component, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService } from '../../../core/storage.service';
import type { Deck } from '../../../core/models';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="container-page">
      <h1 class="text-2xl font-semibold mb-4">Decks</h1>

      <button class="btn mb-4" (click)="addDeck()">+ New Deck</button>

      <ul class="divide-y">
        <li *ngFor="let d of decks(); trackBy: trackId" class="flex items-center justify-between py-3">
          <a class="text-indigo-700 hover:underline" [routerLink]="['/decks', d.id]">{{ d.name }}</a>
          <button class="btn-ghost text-red-600 hover:text-red-700" (click)="deleteDeck(d.id)">Delete</button>
        </li>
      </ul>

      <p *ngIf="!decks().length" class="text-slate-500 mt-6">No decks yet. Create one to get started.</p>
    </section>
  `,
})
export class DeckListComponent {
  private storage = inject(StorageService);
  decks = computed<Deck[]>(() => this.storage.decks?.() ?? []);

  async addDeck() {
    const name = prompt('Name of new deck?')?.trim();
    if (!name) return;

    // Call whichever your service actually implements, without TS errors.
    const svc = this.storage as any;
    const add = svc.addDeck ?? svc.createDeck;
    if (typeof add === 'function') {
      await add.call(this.storage, name);
    } else {
      // Fallback: create very simple deck object if your service exposes a lower-level API.
      const id = (name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '') || 'deck')
              + '-' + Math.random().toString(36).slice(2, 6);
      if (typeof svc.upsertDeck === 'function') {
        await svc.upsertDeck({ id, name });
      } else {
        alert('No addDeck/createDeck/upsertDeck method found on StorageService.');
      }
    }
  }

  async deleteDeck(id: string) {
    const ok = confirm('Delete this deck and ALL its cards & logs?');
    if (!ok) return;
    await (this.storage as any).deleteDeck(id);
  }

  trackId = (_: number, d: Deck) => d.id;
}
