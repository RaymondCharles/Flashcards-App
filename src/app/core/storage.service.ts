import { Injectable, signal } from '@angular/core';
import { get, set } from 'idb-keyval';
import { Deck, Card } from './models';

const K = { DECKS: 'decks', CARDS: 'cards' };

@Injectable({ providedIn: 'root' })
export class StorageService {
  decks = signal<Deck[]>([]);
  cards = signal<Card[]>([]);

  async init() {
    const decks = (await get<Deck[]>(K.DECKS)) ?? [];
    const cards = (await get<Card[]>(K.CARDS)) ?? [];

    // seed if empty
    if (decks.length === 0) {
      const now = Date.now();
      const deck: Deck = { id: 'seed-deck', name: 'Sample Deck', createdAt: now, updatedAt: now };
      const seedCards: Card[] = [
        { id: crypto.randomUUID(), deckId: deck.id, front: 'What is Angular?', back: 'A frontend framework.', createdAt: now, updatedAt: now },
        { id: crypto.randomUUID(), deckId: deck.id, front: 'What is a Component?', back: 'A view + logic unit.', createdAt: now, updatedAt: now },
      ];
      this.decks.set([deck]);
      this.cards.set(seedCards);
      await set(K.DECKS, this.decks());
      await set(K.CARDS, this.cards());
    } else {
      this.decks.set(decks);
      this.cards.set(cards);
    }
  }

  async createDeck(name: string) {
    const now = Date.now();
    const d: Deck = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
    this.decks.update(arr => [...arr, d]);
    await set(K.DECKS, this.decks());
    return d.id;
  }
}
