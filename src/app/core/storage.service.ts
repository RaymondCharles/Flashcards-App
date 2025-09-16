// src/app/core/storage.service.ts
import { Injectable, signal, computed } from '@angular/core';

export interface Deck {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
}

export interface Card {
  id: string;
  deckId: string;
  front: string;
  back: string;
  repetitions: number;
  interval: number;  // days
  due: number;       // epoch ms
}

export interface ReviewLog {
  id: string;
  deckId: string;
  cardId: string;
  grade: 1 | 2 | 3 | 5;
  ms: number;  // time spent on card (ms)
  ts: number;  // when the review happened (epoch ms)
}

type Persisted = { decks: Deck[]; cards: Card[]; logs: ReviewLog[] };

function uid() {
  return crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

const LS_KEY = 'srs-data-v1';

@Injectable({ providedIn: 'root' })
export class StorageService {
  decks = signal<Deck[]>([]);
  cards = signal<Card[]>([]);
  logs  = signal<ReviewLog[]>([]);

  constructor() { this.load(); }

  // ---- persist ----
  private load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const data = JSON.parse(raw) as Persisted;
      this.decks.set(data.decks ?? []);
      this.cards.set(data.cards ?? []);
      this.logs.set(data.logs ?? []);
    } catch (e) { console.warn('Failed to load; starting fresh', e); }
  }
  private save() {
    const blob: Persisted = { decks: this.decks(), cards: this.cards(), logs: this.logs() };
    localStorage.setItem(LS_KEY, JSON.stringify(blob));
  }
  private touchDeck(deckId: string) {
    const now = Date.now();
    this.decks.update(arr => arr.map(d => d.id === deckId ? { ...d, updatedAt: now } : d));
  }

  // ---- decks ----
  addDeck(name: string) {
    const now = Date.now();
    const d: Deck = { id: uid(), name: (name || 'Untitled').trim(), createdAt: now, updatedAt: now };
    this.decks.update(a => [d, ...a]);
    this.save();
    return d;
  }
  deleteDeck(deckId: string) {
    this.decks.update(a => a.filter(d => d.id !== deckId));
    this.cards.update(a => a.filter(c => c.deckId !== deckId));
    this.logs.update(a => a.filter(l => l.deckId !== deckId));
    this.save();
  }

  // ---- cards ----
  addCard(deckId: string, front: string, back: string) {
    const c: Card = {
      id: uid(), deckId,
      front: front.trim(), back: back.trim(),
      repetitions: 0, interval: 0, due: Date.now()
    };
    this.cards.update(a => [c, ...a]);
    this.touchDeck(deckId);
    this.save();
    return c;
  }
  updateCard(card: Card) {
    this.cards.update(a => a.map(c => c.id === card.id ? card : c));
    this.touchDeck(card.deckId);
    this.save();
  }
  deleteCard(cardId: string) {
    const card = this.cards().find(c => c.id === cardId);
    this.cards.update(a => a.filter(c => c.id !== cardId));
    this.logs.update(a => a.filter(l => l.cardId !== cardId));
    if (card) this.touchDeck(card.deckId);
    this.save();
  }

  // ---- SRS update ----
  applyReview(card: Card, grade: 1 | 2 | 3 | 5, now = Date.now()) {
    const next = { ...card };
    next.repetitions = Math.max(0, next.repetitions + (grade >= 3 ? 1 : -1));
    if (grade < 3) {
      next.interval = 0;
    } else {
      next.interval = Math.max(1, next.interval || 1);
      next.interval = Math.round(next.interval * (grade === 3 ? 2 : 2.75));
    }
    const dayMs = 24 * 60 * 60 * 1000;
    next.due = now + next.interval * dayMs;
    this.updateCard(next);
    return next;
  }

  // ---- logs ----
  logReview(deckId: string, cardId: string, grade: 1 | 2 | 3 | 5, ms: number, ts = Date.now()) {
    const log: ReviewLog = { id: uid(), deckId, cardId, grade, ms, ts };
    this.logs.update(a => [...a, log]);
    this.touchDeck(deckId);
    this.save();
    return log;
  }

  // convenience
  cardsByDeck = (deckId: string) => this.cards().filter(c => c.deckId === deckId);
  logsByDeck  = (deckId: string)  => this.logs().filter(l => l.deckId === deckId);
  allLogs     = computed(() => this.logs());
  allDecks    = computed(() => this.decks());
  allCards    = computed(() => this.cards());
}
