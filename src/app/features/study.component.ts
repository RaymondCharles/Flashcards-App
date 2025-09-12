// src/app/features/study.component.ts
import { Component, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-study',
  standalone: true,
  template: `
    <h1>Study</h1>
    <p>Deck ID: {{ deckId }}</p>
  `,
})
export class StudyComponent {
  private route = inject(ActivatedRoute);
  deckId = this.route.snapshot.paramMap.get('deckId');
}
