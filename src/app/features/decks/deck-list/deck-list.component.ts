// src/app/features/decks/deck-list/deck-list.component.ts
import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StorageService, Deck } from '../../../core/storage.service';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <h1 class="text-2xl font-semibold mb-4">Decks</h1>

    <button class="btn mb-4" (click)="onAdd()">+ New Deck</button>

    <ul class="divide-y">
      <li *ngFor="let d of decks(); trackBy: trackId" class="py-3 flex items-center justify-between">
        <a [routerLink]="['/decks', d.id]" class="text-indigo-700 hover:underline">{{ d.name }}</a>
        <button class="btn-ghost text-red-600 hover:text-red-700" (click)="onDelete(d.id)">Delete</button>
      </li>
    </ul>

    <p *ngIf="!decks().length" class="text-slate-500">No decks yet.</p>
  `,
})
export class DeckListComponent {
  private storage = inject(StorageService);
  decks = () => this.storage.decks();
  trackId = (_: number, d: Deck) => d.id;

  onAdd() {
    const d = this.storage.addDeck('New Deck');
    // optional: navigate to it; keep simple for now
  }
  onDelete(id: string) {
    this.storage.deleteDeck(id);
  }
}
