import { expect, test } from 'vitest';
import { roundScenery } from './scenery';

test('scenery is deterministic for a given seed and round', () => {
  expect(roundScenery(42, 3, 8)).toEqual(roundScenery(42, 3, 8));
});

test('consecutive rounds get different vehicle kinds', () => {
  const a = roundScenery(42, 0, 8).vehicle.kind;
  const b = roundScenery(42, 1, 8).vehicle.kind;
  expect(a).not.toBe(b);
});

test('daylight goes from morning on the first round to dusk on the last', () => {
  expect(roundScenery(42, 0, 8).daylight).toBe(0);
  expect(roundScenery(42, 7, 8).daylight).toBe(1);
});

test('every round has an animal, and it never overlaps a tree', () => {
  for (let seed = 0; seed < 50; seed++) {
    for (let round = 0; round < 8; round++) {
      const { animal, trees } = roundScenery(seed, round, 8);
      expect(animal).toBeDefined();
      for (const tree of trees) {
        expect(Math.abs(animal.x - tree.x)).toBeGreaterThanOrEqual(
          0.03 + 0.3 * tree.height,
        );
      }
    }
  }
});
