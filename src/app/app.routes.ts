import { Routes } from '@angular/router';

import { DashboardComponent } from './features/dashboard.component';
import { DeckListComponent } from './features/decks/deck-list/deck-list.component';
import { DeckDetailComponent } from './features/decks/deck-detail/deck-detail.component';
import { StudyComponent } from './features/study.component';
import { StatsComponent } from './features/stats.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'decks', component: DeckListComponent },
  { path: 'decks/:id', component: DeckDetailComponent },
  { path: 'study/:id', component: StudyComponent },
  { path: 'stats', component: StatsComponent },
  { path: '**', redirectTo: '' },
];
