import { Routes } from '@angular/router';

export const DECK_ROUTES: Routes = [
  { path: '', loadComponent: () => import('./deck-list/deck-list.component').then(m => m.DeckListComponent) },
  { path: ':id', loadComponent: () => import('./deck-detail/deck-detail.component').then(m => m.DeckDetailComponent) },
];
