import type { Card, Grade } from './models';

export function scheduleNext(card: Card, grade: Grade, now = Date.now()): Card {
  let { ef, repetitions, interval } = card;

  if (grade < 3) {
    repetitions = 0;
    interval = 1; // show soon again (tomorrow)
  } else {
    repetitions += 1;
    if (repetitions === 1) interval = 1;
    else if (repetitions === 2) interval = 6;
    else interval = Math.round(interval * ef);

    const newEf = ef + (-0.8 + 0.28 * grade - 0.02 * grade * grade);
    ef = Math.max(1.3, newEf);
  }

  return {
    ...card,
    ef,
    repetitions,
    interval,
    due: now + interval * 24 * 60 * 60 * 1000,
    updatedAt: now,
  };
}
