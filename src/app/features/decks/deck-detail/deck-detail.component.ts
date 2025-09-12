import { Component, inject } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

@Component({
  selector: 'app-deck-detail',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Deck Detail</h1>
    <p>Deck ID: {{ id }}</p>
    <a [routerLink]="['/study', id]">Study this deck</a>
  `,
})
export class DeckDetailComponent {
  private route = inject(ActivatedRoute);
  id = this.route.snapshot.paramMap.get('id');
}
