import { expect, test } from 'vitest';
import {
  ANIMAL_HALF_WIDTH,
  roundScenery,
  treeHalfWidth,
  type Scenery,
} from './scenery';

function allSceneries(seeds: number, rounds = 8): Scenery[] {
  const sceneries: Scenery[] = [];
  for (let seed = 0; seed < seeds; seed++) {
    for (let round = 0; round < rounds; round++) {
      sceneries.push(roundScenery(seed, round, rounds));
    }
  }
  return sceneries;
}

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

test('every round has one or two animals, of different kinds', () => {
  let twoSeen = false;
  for (const { animals } of allSceneries(50)) {
    expect(animals.length).toBeGreaterThanOrEqual(1);
    expect(animals.length).toBeLessThanOrEqual(2);
    if (animals.length === 2) {
      twoSeen = true;
      expect(animals[0].kind).not.toBe(animals[1].kind);
    }
  }
  expect(twoSeen).toBe(true);
});

test('animals and trees never overlap each other', () => {
  for (const { animals, trees } of allSceneries(50)) {
    const occupants = [
      ...animals.map((a) => ({ x: a.x, halfWidth: ANIMAL_HALF_WIDTH })),
      ...trees.map((t) => ({ x: t.x, halfWidth: treeHalfWidth(t.height) })),
    ];
    for (let i = 0; i < occupants.length; i++) {
      for (let j = i + 1; j < occupants.length; j++) {
        expect(Math.abs(occupants[i].x - occupants[j].x)).toBeGreaterThanOrEqual(
          occupants[i].halfWidth + occupants[j].halfWidth,
        );
      }
    }
  }
});

test('nothing stands in the river, except the riverside duck', () => {
  for (const scenery of allSceneries(50)) {
    const { feature, animals, trees } = scenery;
    if (feature?.kind !== 'river') continue;
    const duck = animals.find((a) => a.kind === 'duck');
    for (const occupant of [
      ...animals
        .filter((a) => a !== duck)
        .map((a) => ({ x: a.x, halfWidth: ANIMAL_HALF_WIDTH })),
      ...trees.map((t) => ({ x: t.x, halfWidth: treeHalfWidth(t.height) })),
    ]) {
      expect(Math.abs(occupant.x - feature.x)).toBeGreaterThanOrEqual(
        feature.halfWidth + occupant.halfWidth - 0.005,
      );
    }
  }
});

test('a river always brings a duck to its edge, out of the water', () => {
  const rivers = allSceneries(50).filter((s) => s.feature?.kind === 'river');
  expect(rivers.length).toBeGreaterThan(0);
  for (const { feature, animals } of rivers) {
    const duck = animals.find((a) => a.kind === 'duck');
    expect(duck).toBeDefined();
    const gap = Math.abs(duck!.x - feature!.x);
    expect(gap).toBeGreaterThanOrEqual(feature!.halfWidth + ANIMAL_HALF_WIDTH);
    expect(gap).toBeLessThanOrEqual(feature!.halfWidth + 3 * ANIMAL_HALF_WIDTH);
  }
});

test('features and sky events all occur, and many rounds have none', () => {
  const sceneries = allSceneries(80);
  const featureKinds = new Set(sceneries.map((s) => s.feature?.kind ?? 'none'));
  expect(featureKinds).toEqual(new Set(['none', 'river', 'puddle']));
  const skyKinds = new Set(sceneries.map((s) => s.skyEvent?.kind ?? 'none'));
  expect(skyKinds).toEqual(new Set(['none', 'bird', 'rainbow']));
  const plain = sceneries.filter((s) => !s.feature).length;
  expect(plain / sceneries.length).toBeGreaterThan(0.3);
});
