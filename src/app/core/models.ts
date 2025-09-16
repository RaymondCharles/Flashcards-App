export type Grade = 0|1|2|3|4|5;


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

  // scheduling fields (SM-2)
  interval: number;     // days
  repetitions: number;  // consecutive correct reviews
  ef: number;           // easiness factor
  due: number;          // next due time (epoch ms)

  createdAt: number;
  updatedAt: number;
}

export interface ReviewLog {
  id: string;
  cardId: string;
  deckId: string;
  ts: number;      // when answered
  grade: Grade;
  timeMs: number;  // answering time (we’ll fill later; set 0 for now)
  wasDue: boolean;
}
