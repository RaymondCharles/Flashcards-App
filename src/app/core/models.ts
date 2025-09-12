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
  createdAt: number;
  updatedAt: number;
}
