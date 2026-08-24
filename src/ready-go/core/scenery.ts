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
  /** An animal standing in the grass. It hops as the vehicle passes. */
  animal: { kind: AnimalKind; x: number };
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

  // Trees and the animal stand on the same strip of grass (x in
  // [0.42, 0.96]), to the right of the traffic light. The strip is cut into
  // one slot per occupant, slots are dealt out shuffled, and each occupant
  // jitters inside its slot only as far as its own width allows — so nothing
  // can spawn on top of anything else.
  const treeCount = 2 + Math.floor(rng() * 2);
  const slotWidth = 0.54 / (treeCount + 1);
  const slots = [...Array(treeCount + 1).keys()];
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }
  const placeInSlot = (slot: number, halfWidth: number): number => {
    const center = 0.42 + (slot + 0.5) * slotWidth;
    const jitter = Math.max(0, slotWidth / 2 - halfWidth - 0.005);
    return center + (rng() * 2 - 1) * jitter;
  };

  // Like vehicle kinds, animal kinds rotate with the round so one session
  // shows many different animals.
  const animal = {
    kind: ANIMAL_KINDS[
      (round + Math.floor(seed % ANIMAL_KINDS.length)) % ANIMAL_KINDS.length
    ],
    x: placeInSlot(slots[0], 0.03),
  };

  const trees: Tree[] = [];
  for (let i = 0; i < treeCount; i++) {
    const height = 0.1 + rng() * 0.08;
    // Foliage spreads to roughly 0.46 × height sideways; 0.3 × height in
    // width fractions is a conservative bound for typical aspect ratios.
    trees.push({
      x: placeInSlot(slots[i + 1], 0.3 * height),
      height,
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
    animal,
    daylight: totalRounds <= 1 ? 1 : round / (totalRounds - 1),
  };
}
