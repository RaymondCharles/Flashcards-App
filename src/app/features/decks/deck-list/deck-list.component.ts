import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { StorageService } from '../../../core/storage.service';

@Component({
  selector: 'app-deck-list',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <h1>Decks</h1>

    <button (click)="addDeck()">+ New Deck</button>

    <ul *ngIf="storage.decks().length; else empty">
      <li *ngFor="let d of storage.decks()">
        <a [routerLink]="['/decks', d.id]">{{ d.name }}</a>
      </li>
    </ul>

    <ng-template #empty>
      <p>No decks yet. A sample deck was seeded for you.</p>
    </ng-template>
  `,
})
export class DeckListComponent {
  constructor(public storage: StorageService) {}

  async addDeck() {
    const name = prompt('Deck name?');
    if (!name) return;
    await this.storage.createDeck(name);
  }
}
