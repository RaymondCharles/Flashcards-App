import { Routes } from '@angular/router';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./features/dashboard.component').then(m => m.DashboardComponent) },
  { path: 'decks', loadChildren: () => import('./features/decks/decks.routes').then(m => m.DECK_ROUTES) },
  { path: 'study/:deckId', loadComponent: () => import('./features/study.component').then(m => m.StudyComponent) },
  { path: 'stats', loadComponent: () => import('./features/stats.component').then(m => m.StatsComponent) },
  { path: '**', redirectTo: '' },
];
