import { Injectable, signal } from '@angular/core';
import { get, set } from 'idb-keyval';
import type { Deck, Card, ReviewLog, Grade } from './models';
import { scheduleNext } from './scheduler';

const K = { DECKS: 'decks', CARDS: 'cards', LOGS: 'logs' };
const DAY = 24 * 60 * 60 * 1000;

// ---------- helpers ----------
function startOfDay(ts: number) { const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime(); }
function shuffle<T>(a: T[]): T[] { return a.map(v => [Math.random(), v] as const).sort((x, y) => x[0] - y[0]).map(x => x[1]); }

function makeCard(deckId: string, front: string, back: string, now = Date.now()): Card {
  return {
    id: crypto.randomUUID(),
    deckId,
    front,
    back,
    interval: 0,
    repetitions: 0,
    ef: 2.5,
    due: now,
    createdAt: now,
    updatedAt: now,
  };
}
function ensureScheduleFields(c: any, now: number): Card {
  return {
    id: c.id,
    deckId: c.deckId,
    front: c.front,
    back: c.back,
    interval: c.interval ?? 0,
    repetitions: c.repetitions ?? 0,
    ef: c.ef ?? 2.5,
    due: c.due ?? now,
    createdAt: c.createdAt ?? now,
    updatedAt: c.updatedAt ?? now,
  };
}

@Injectable({ providedIn: 'root' })
export class StorageService {
  decks = signal<Deck[]>([]);
  cards = signal<Card[]>([]);
  logs  = signal<ReviewLog[]>([]);

  // ---------- init & persistence ----------
  async init() {
    const decks = (await get<Deck[]>(K.DECKS)) ?? [];
    let cards   = (await get<Card[]>(K.CARDS)) ?? [];
    const logs  = (await get<ReviewLog[]>(K.LOGS)) ?? [];

    if (decks.length === 0) {
      const now = Date.now();
      const deck: Deck = { id: 'seed-deck', name: 'Sample Deck', createdAt: now, updatedAt: now };
      const seedCards: Card[] = [
        makeCard(deck.id, 'What is Angular?', 'A frontend framework.', now),
        makeCard(deck.id, 'What is a Component?', 'A view + logic unit.', now),
      ];
      this.decks.set([deck]);
      this.cards.set(seedCards);
      this.logs.set([]);
      await this.saveAll();
      return;
    }

    const now = Date.now();
    cards = cards.map(c => ensureScheduleFields(c, now));

    this.decks.set(decks);
    this.cards.set(cards);
    this.logs.set(logs);
    await this.saveAll();
  }

  private async saveAll() {
    await Promise.all([
      set(K.DECKS, this.decks()),
      set(K.CARDS, this.cards()),
      set(K.LOGS,  this.logs()),
    ]);
  }

  // ---------- decks ----------
  async createDeck(name: string) {
    const now = Date.now();
    const d: Deck = { id: crypto.randomUUID(), name, createdAt: now, updatedAt: now };
    this.decks.update(arr => [...arr, d]);
    await this.saveAll();
    return d.id;
  }

  async deleteDeck(deckId: string) {
    this.decks.update(arr => arr.filter(d => d.id !== deckId));
    this.cards.update(arr => arr.filter(c => c.deckId !== deckId));
    this.logs.update(arr => arr.filter(l => l.deckId !== deckId));
    await this.saveAll();
  }

  // ---------- cards ----------
  cardsByDeck(deckId: string) {
    return this.cards().filter(c => c.deckId === deckId);
  }

  async addCard(deckId: string, front: string, back: string) {
    const now = Date.now();
    const c = makeCard(deckId, front, back, now);
    this.cards.update(arr => [...arr, c]);
    await this.saveAll();
  }

  async updateCard(card: Card) {
    this.cards.update(arr => arr.map(c => (c.id === card.id ? card : c)));
    await this.saveAll();
  }

  async deleteCard(cardId: string) {
    this.cards.update(arr => arr.filter(c => c.id !== cardId));
    this.logs.update(arr => arr.filter(l => l.cardId !== cardId));
    await this.saveAll();
  }

  async addCardsBulk(deckId: string, items: { front: string; back: string }[]) {
    const now = Date.now();
    const newCards = items.map(it => ({
      id: crypto.randomUUID(),
      deckId,
      front: (it.front ?? '').trim(),
      back: (it.back ?? '').trim(),
      interval: 0,
      repetitions: 0,
      ef: 2.5,
      due: now,
      createdAt: now,
      updatedAt: now,
    }));
    this.cards.update(arr => [...arr, ...newCards]);
    await this.saveAll();
  }

  async replaceDeckCards(deckId: string, items: { front: string; back: string }[]) {
    const now = Date.now();
    const newCards = items.map(it => ({
      id: crypto.randomUUID(),
      deckId,
      front: (it.front ?? '').trim(),
      back: (it.back ?? '').trim(),
      interval: 0,
      repetitions: 0,
      ef: 2.5,
      due: now,
      createdAt: now,
      updatedAt: now,
    }));
    this.cards.update(arr => [...arr.filter(c => c.deckId !== deckId), ...newCards]);
    await this.saveAll();
  }


  // ---------- reviews ----------
  dueCards(deckId: string, now = Date.now()) {
    const all = this.cardsByDeck(deckId);
    const due = all.filter(c => c.due <= now);
    const newOnes = all.filter(c => c.repetitions === 0);
    return due.length ? shuffle(due) : shuffle(newOnes).slice(0, 10);
  }

  async review(card: Card, grade: Grade, timeMs = 0) {
    const next = scheduleNext(card, grade);
    this.cards.update(arr => arr.map(c => (c.id === card.id ? next : c)));
    this.logs.update(a => [
      ...a,
      {
        id: crypto.randomUUID(),
        cardId: card.id,
        deckId: card.deckId,
        ts: Date.now(),
        grade,
        timeMs,
        wasDue: card.due <= Date.now(),
      },
    ]);
    await this.saveAll();
    return next;
  }
}
