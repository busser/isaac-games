/**
 * What each round of Ready… Go! looks like: the vehicle and the landscape.
 * Purely descriptive data, deterministic for a given (seed, round), so the
 * renderer can regenerate it at any time. Novelty across a session comes
 * from here, not from the game rules getting harder.
 *
 * All positions are fractions of the canvas: x in [0, 1] of the width,
 * y (for clouds and birds) in [0, 1] of the height.
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

/** An animal standing in the grass. It hops as the vehicle passes. */
export interface Animal {
  kind: AnimalKind;
  x: number;
}

/**
 * At most one feature per round, and none on many rounds, so features stay
 * a small surprise rather than the norm. A river flows under a bridge in
 * the road; a puddle sits on the road and splashes. `halfWidth` is the
 * feature's half-extent along the road.
 */
export type Feature =
  | { kind: 'river'; x: number; halfWidth: number }
  | { kind: 'puddle'; x: number; halfWidth: number };

/** A rare, purely decorative sky event. */
export type SkyEvent =
  | { kind: 'bird'; y: number; drift: number }
  | { kind: 'rainbow'; x: number };

export interface Scenery {
  vehicle: Vehicle;
  hills: Hill[];
  trees: Tree[];
  clouds: Cloud[];
  /** 1–2 animals; when there is a river, one of them is a duck beside it. */
  animals: Animal[];
  feature: Feature | null;
  skyEvent: SkyEvent | null;
  /** 0 = first round (morning) … 1 = last round (dusk). */
  daylight: number;
}

/** Half-extent of an animal along the grass, in width fractions. */
export const ANIMAL_HALF_WIDTH = 0.03;

/** Half-extent of a tree's foliage, in width fractions, for its height. */
export function treeHalfWidth(height: number): number {
  // Foliage spreads to roughly 0.46 × height sideways; 0.3 × height in
  // width fractions is a conservative bound for typical aspect ratios.
  return 0.3 * height;
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

// Trees and animals stand on the strip of grass to the right of the
// traffic light.
const STRIP_LO = 0.42;
const STRIP_HI = 0.96;

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

  const roll = rng();
  let feature: Feature | null = null;
  if (roll < 0.25) {
    feature = { kind: 'river', x: 0.52 + rng() * 0.32, halfWidth: 0.04 + rng() * 0.02 };
  } else if (roll < 0.4) {
    feature = { kind: 'puddle', x: 0.5 + rng() * 0.34, halfWidth: 0.035 };
  }

  // Like vehicle kinds, animal kinds rotate with the round so one session
  // shows many different animals. Some rounds add a second, different kind.
  const firstKind =
    ANIMAL_KINDS[(round + Math.floor(seed % ANIMAL_KINDS.length)) % ANIMAL_KINDS.length];
  const animals: Animal[] = [];

  // A river always comes with a duck at the water's edge; it takes the
  // place of the round's optional second animal.
  if (feature?.kind === 'river') {
    const rightEdge = feature.x + feature.halfWidth + ANIMAL_HALF_WIDTH + 0.005;
    const leftEdge = feature.x - feature.halfWidth - ANIMAL_HALF_WIDTH - 0.005;
    animals.push({
      kind: 'duck',
      x: rightEdge + ANIMAL_HALF_WIDTH <= STRIP_HI ? rightEdge : leftEdge,
    });
  }

  const slotKinds: AnimalKind[] = [];
  if (feature?.kind !== 'river' || firstKind !== 'duck') slotKinds.push(firstKind);
  if (feature?.kind !== 'river' && rng() < 0.35) {
    const offset = 1 + Math.floor(rng() * (ANIMAL_KINDS.length - 1));
    slotKinds.push(
      ANIMAL_KINDS[(ANIMAL_KINDS.indexOf(firstKind) + offset) % ANIMAL_KINDS.length],
    );
  }

  // A river (plus its riverside duck) blocks a stretch of the grass strip;
  // puddles sit on the road and block nothing.
  let blockedLo = Infinity;
  let blockedHi = -Infinity;
  if (feature?.kind === 'river') {
    blockedLo = feature.x - feature.halfWidth - 0.01;
    blockedHi = feature.x + feature.halfWidth + 0.01;
    for (const a of animals) {
      blockedLo = Math.min(blockedLo, a.x - ANIMAL_HALF_WIDTH - 0.01);
      blockedHi = Math.max(blockedHi, a.x + ANIMAL_HALF_WIDTH + 0.01);
    }
  }

  // The usable grass: the strip minus the blocked stretch, as segments.
  // Segments too short to hold anything are dropped.
  const segments: Array<{ lo: number; hi: number }> = [];
  const candidates =
    blockedLo < blockedHi
      ? [
          { lo: STRIP_LO, hi: Math.min(STRIP_HI, blockedLo) },
          { lo: Math.max(STRIP_LO, blockedHi), hi: STRIP_HI },
        ]
      : [{ lo: STRIP_LO, hi: STRIP_HI }];
  for (const seg of candidates) {
    if (seg.hi - seg.lo >= 0.07) segments.push(seg);
  }
  const usable = segments.reduce((sum, s) => sum + (s.hi - s.lo), 0);

  // Slot placement: the usable grass is cut into one slot per occupant,
  // slots are dealt out shuffled, and each occupant jitters inside its slot
  // only as far as its own width allows — so nothing can spawn on top of
  // anything else. Crowded rounds (a feature eating grass) get fewer trees.
  let treeCount = feature?.kind === 'river' ? 2 : 2 + Math.floor(rng() * 2);
  while (treeCount > 1 && usable / (treeCount + slotKinds.length) < 0.075) {
    treeCount--;
  }
  const occupantCount = treeCount + slotKinds.length;

  // Deal each segment a share of the slots, always splitting where slots
  // are currently widest, so no slot straddles the blocked stretch and the
  // narrowest slot stays as wide as possible.
  const slotCounts = segments.map(() => 0);
  for (let s = 0; s < occupantCount; s++) {
    let best = 0;
    for (let i = 1; i < segments.length; i++) {
      const width = (segments[i].hi - segments[i].lo) / (slotCounts[i] + 1);
      if (width > (segments[best].hi - segments[best].lo) / (slotCounts[best] + 1)) {
        best = i;
      }
    }
    slotCounts[best]++;
  }
  const slots: Array<{ lo: number; hi: number }> = [];
  for (const [i, seg] of segments.entries()) {
    const width = (seg.hi - seg.lo) / slotCounts[i];
    for (let k = 0; k < slotCounts[i]; k++) {
      slots.push({ lo: seg.lo + k * width, hi: seg.lo + (k + 1) * width });
    }
  }
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [slots[i], slots[j]] = [slots[j], slots[i]];
  }

  let slotCursor = 0;
  const placeInSlot = (slot: { lo: number; hi: number }, halfWidth: number): number => {
    const center = (slot.lo + slot.hi) / 2;
    const jitter = Math.max(0, (slot.hi - slot.lo) / 2 - halfWidth - 0.005);
    return center + (rng() * 2 - 1) * jitter;
  };

  for (const animalKind of slotKinds) {
    animals.push({ kind: animalKind, x: placeInSlot(slots[slotCursor++], ANIMAL_HALF_WIDTH) });
  }

  const trees: Tree[] = [];
  for (let i = 0; i < treeCount; i++) {
    const slot = slots[slotCursor++];
    const maxHeight = ((slot.hi - slot.lo) / 2 - 0.006) / 0.3;
    const height = Math.min(0.1 + rng() * 0.08, maxHeight);
    trees.push({
      x: placeInSlot(slot, treeHalfWidth(height)),
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

  const skyRoll = rng();
  let skyEvent: SkyEvent | null = null;
  if (skyRoll < 0.16) {
    skyEvent = { kind: 'bird', y: 0.1 + rng() * 0.15, drift: rng() };
  } else if (skyRoll < 0.25) {
    skyEvent = { kind: 'rainbow', x: 0.3 + rng() * 0.4 };
  }

  return {
    vehicle: { kind, bodyColor, accentColor },
    hills,
    trees,
    clouds,
    animals,
    feature,
    skyEvent,
    daylight: totalRounds <= 1 ? 1 : round / (totalRounds - 1),
  };
}
