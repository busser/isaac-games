/**
 * What each round of Ready… Go! looks like: the vehicle and the landscape.
 * Purely descriptive data, deterministic for a given (seed, round), so the
 * renderer can regenerate it at any time. Novelty across a session comes
 * from here, not from the game rules getting harder.
 *
 * All positions are fractions of the canvas: x in [0, 1] of the width,
 * y (for clouds) in [0, 1] of the height.
 */

import { mulberry32 } from '../../shared/rng';

export type VehicleKind = 'car' | 'bus' | 'truck' | 'tractor';

export interface Vehicle {
  kind: VehicleKind;
  bodyColor: string;
  accentColor: string;
}

export interface Hill {
  x: number;
  width: number;
  height: number; // fraction of canvas height
  color: string;
}

export interface Tree {
  x: number;
  height: number; // fraction of canvas height
  foliage: string;
}

export interface Cloud {
  x: number;
  y: number;
  scale: number;
}

export type AnimalKind = 'sheep' | 'cow' | 'pig' | 'dog' | 'rabbit' | 'duck';

export interface Scenery {
  vehicle: Vehicle;
  hills: Hill[];
  trees: Tree[];
  clouds: Cloud[];
  /** An animal standing in the grass, or null. It hops as the vehicle passes. */
  animal: { kind: AnimalKind; x: number } | null;
  /** 0 = first round (morning) … 1 = last round (dusk). */
  daylight: number;
}

const ANIMAL_KINDS: AnimalKind[] = ['sheep', 'cow', 'pig', 'dog', 'rabbit', 'duck'];

const VEHICLE_KINDS: VehicleKind[] = ['car', 'bus', 'truck', 'tractor'];

// Cheerful, saturated body colors with a lighter accent for cabins and trim.
const VEHICLE_PALETTES: Array<[string, string]> = [
  ['#e4572e', '#ffb59e'],
  ['#3d7dd8', '#a8c9f2'],
  ['#f2b705', '#ffe28a'],
  ['#4caf50', '#b0e3b2'],
  ['#9b59b6', '#d7b8e8'],
  ['#e91e8c', '#f9b8dc'],
  ['#00a6a6', '#9fe0e0'],
];

const HILL_COLORS = ['#8fce7e', '#7bbf6a', '#a3d98f'];
const FOLIAGE_COLORS = ['#4e9a51', '#6ab04c', '#3e8948', '#7fb069'];

export function roundScenery(
  seed: number,
  round: number,
  totalRounds: number,
): Scenery {
  const rng = mulberry32(seed + round * 7919);
  const pick = <T>(items: T[]): T => items[Math.floor(rng() * items.length)];

  // Consecutive rounds get different vehicle kinds so each launch feels new.
  const kind = VEHICLE_KINDS[(round + Math.floor(seed % 4)) % VEHICLE_KINDS.length];
  const [bodyColor, accentColor] = pick(VEHICLE_PALETTES);

  const hills: Hill[] = [];
  const hillCount = 2 + Math.floor(rng() * 2);
  for (let i = 0; i < hillCount; i++) {
    hills.push({
      x: (i + rng()) / hillCount,
      width: 0.3 + rng() * 0.3,
      height: 0.08 + rng() * 0.1,
      color: pick(HILL_COLORS),
    });
  }

  const trees: Tree[] = [];
  const treeCount = 2 + Math.floor(rng() * 3);
  for (let i = 0; i < treeCount; i++) {
    trees.push({
      // Keep trees to the right of the traffic light so they read as the
      // countryside the vehicle drives through.
      x: 0.45 + ((i + rng()) / treeCount) * 0.5,
      height: 0.1 + rng() * 0.08,
      foliage: pick(FOLIAGE_COLORS),
    });
  }

  const clouds: Cloud[] = [];
  const cloudCount = 1 + Math.floor(rng() * 3);
  for (let i = 0; i < cloudCount; i++) {
    clouds.push({
      x: rng(),
      y: 0.08 + rng() * 0.18,
      scale: 0.6 + rng() * 0.8,
    });
  }

  return {
    vehicle: { kind, bodyColor, accentColor },
    hills,
    trees,
    clouds,
    // Like vehicle kinds, animal kinds rotate with the round so one session
    // shows many different animals.
    animal:
      rng() < 0.75
        ? {
            kind: ANIMAL_KINDS[
              (round + Math.floor(seed % ANIMAL_KINDS.length)) %
                ANIMAL_KINDS.length
            ],
            x: 0.55 + rng() * 0.3,
          }
        : null,
    daylight: totalRounds <= 1 ? 1 : round / (totalRounds - 1),
  };
}
