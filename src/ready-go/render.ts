/**
 * Canvas renderer for Ready… Go! Draws the whole scene every frame from the
 * game state plus its own short-lived visual effects (rocking, pop-in,
 * green pulse), which are triggered by game events. Owns all visual
 * knowledge — layout, colors, animation; the game core never sees any of it.
 *
 * The session moves visually from morning to dusk (scenery `daylight`), and
 * the ended session fades into a calm starry night: the wind-down is part
 * of the scene, not a message.
 */

import type { GameEvent, GameState } from './core/game';
import {
  roundScenery,
  type AnimalKind,
  type Scenery,
  type Vehicle,
} from './core/scenery';
import { mulberry32 } from '../shared/rng';

/**
 * A moment in the scene that deserves a sound: the vehicle passing an
 * animal (it hops), rolling onto the bridge, or hitting the puddle. Only
 * the renderer knows where things are on screen, so it reports these from
 * draw(); the caller forwards them to the audio layer. Each fires at most
 * once per round.
 */
export type SceneCue =
  | { kind: 'animalHop'; animal: AnimalKind }
  | { kind: 'bridge' }
  | { kind: 'puddle' };

export interface Renderer {
  onEvent(event: GameEvent, now: number): void;
  /**
   * Draw one frame and report the frame's scene cues. `restartHold` is the
   * parent's restart gesture progress in [0, 1]; nonzero values show a
   * small progress ring on the night scene.
   */
  draw(
    state: GameState,
    arriveProgress: number,
    driveProgress: number,
    now: number,
    restartHold?: number,
  ): SceneCue[];
}

type Rgb = [number, number, number];

// Sky keyframes across the session: morning → midday → dusk.
const SKY_TOPS: Rgb[] = [
  [142, 201, 240],
  [95, 168, 221],
  [122, 95, 174],
];
const SKY_BOTTOMS: Rgb[] = [
  [238, 248, 255],
  [223, 241, 255],
  [247, 178, 107],
];
const SUN_COLORS: Rgb[] = [
  [255, 243, 176],
  [255, 233, 140],
  [255, 157, 92],
];
const GRASS_TOPS: Rgb[] = [
  [158, 212, 134],
  [149, 205, 125],
  [111, 156, 99],
];

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Interpolate through evenly spaced color keyframes, t in [0, 1]. */
function rampColor(stops: Rgb[], t: number, alpha = 1): string {
  const scaled = Math.min(0.9999, Math.max(0, t)) * (stops.length - 1);
  const i = Math.floor(scaled);
  const f = scaled - i;
  const [a, b] = [stops[i], stops[i + 1]];
  const c = [0, 1, 2].map((k) => Math.round(lerp(a[k], b[k], f)));
  return `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${alpha})`;
}

/**
 * Distance covered at drive progress p, in [0, 1]: the vehicle accelerates
 * over the first 30% of the drive, then cruises at constant speed.
 */
function drivenDistance(p: number): number {
  const a = 0.3;
  const k = 1 / (1 - a / 2);
  return p <= a ? (k * p * p) / (2 * a) : k * (a / 2 + (p - a));
}

/**
 * Distance covered at arrival progress p, in [0, 1]: the vehicle enters at
 * speed and decelerates steadily to a stop at the light.
 */
function arrivedDistance(p: number): number {
  return 1 - (1 - p) * (1 - p);
}

export function createRenderer(
  canvas: HTMLCanvasElement,
  seed: number,
  totalRounds: number,
): Renderer {
  const ctx = canvas.getContext('2d')!;
  const sceneryCache = new Map<number, Scenery>();
  const stars = makeStars(seed);

  // Timestamps of the last event of each kind; -Infinity means never.
  let rockedAt = -Infinity;
  let greenAt = -Infinity;
  let endedAt = -Infinity;

  // Scene cues already reported this round (see SceneCue).
  const hopCued = new Set<number>();
  let featureCued = false;

  function scenery(round: number): Scenery {
    let s = sceneryCache.get(round);
    if (!s) {
      s = roundScenery(seed, round, totalRounds);
      sceneryCache.set(round, s);
    }
    return s;
  }

  return {
    onEvent(event, now) {
      if (event === 'premature') rockedAt = now;
      else if (event === 'green') greenAt = now;
      else if (event === 'sessionEnded') endedAt = now;
      else if (event === 'roundStarted') {
        hopCued.clear();
        featureCued = false;
      }
    },

    draw(state, arriveProgress, driveProgress, now, restartHold = 0) {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const cues: SceneCue[] = [];
      const ended = state.phase === 'done';
      const round = ended ? totalRounds - 1 : state.round;
      const world = scenery(round);
      const feature = world.feature;
      const u = H * 0.05; // vehicle unit size
      const horizonY = 0.66 * H;
      const roadTopY = 0.78 * H;
      const roadBottomY = 0.9 * H;
      const vehicleY = 0.87 * H;
      const idleX = 0.15 * W;
      const lightX = 0.31 * W;
      const enterX = -4 * u; // fully off screen, whatever the vehicle kind

      drawSky(ctx, W, horizonY, world.daylight, now);
      if (world.skyEvent?.kind === 'rainbow' && !ended) {
        drawRainbow(ctx, world.skyEvent.x * W, horizonY, H);
      }
      drawClouds(ctx, W, H, world, now);
      if (world.skyEvent?.kind === 'bird' && !ended) {
        drawBird(ctx, W, H, world.skyEvent.y, world.skyEvent.drift, now);
      }
      drawHills(ctx, W, H, horizonY, world);
      // Grass, then the river through it, then the road cut over both.
      ctx.fillStyle = rampColor(GRASS_TOPS, world.daylight);
      ctx.fillRect(0, horizonY, W, H - horizonY);
      if (feature?.kind === 'river') {
        drawRiver(ctx, W, H, horizonY, feature.x, feature.halfWidth, now);
      }
      drawRoad(ctx, W, roadTopY, roadBottomY);
      if (feature?.kind === 'river') {
        drawBridge(ctx, W, roadTopY, roadBottomY, u, feature.x, feature.halfWidth);
      }
      if (feature?.kind === 'puddle') {
        drawPuddle(ctx, W, roadTopY, roadBottomY, feature.x, feature.halfWidth);
      }
      drawTrees(ctx, W, H, roadTopY, world);

      const vehicleX =
        state.phase === 'arriving'
          ? enterX + arrivedDistance(arriveProgress) * (idleX - enterX)
          : idleX + drivenDistance(driveProgress) * (W + 6 * u - idleX);

      if (!ended) {
        for (const [i, animal] of world.animals.entries()) {
          const hopping =
            state.phase === 'driving' &&
            Math.abs(vehicleX - animal.x * W) < 0.1 * W;
          if (hopping && !hopCued.has(i)) {
            hopCued.add(i);
            cues.push({ kind: 'animalHop', animal: animal.kind });
          }
          drawAnimal(
            ctx,
            animal.kind,
            animal.x * W,
            roadTopY - 0.2 * u,
            u,
            hopping ? 'hop' : 'idle',
            now,
          );
        }
      }

      drawTrafficLight(ctx, lightX, roadTopY, u, state.phase, greenAt, rockedAt, now);

      if (!ended) {
        const idle = state.phase === 'red' || state.phase === 'green';
        const bob = idle ? Math.sin(now / 280) * 0.06 * u : 0;
        const sinceRock = now - rockedAt;
        const tilt =
          sinceRock < 400
            ? Math.sin(sinceRock / 45) * 0.05 * (1 - sinceRock / 400)
            : 0;
        const wheelAngle = (vehicleX - enterX) / (0.5 * u);
        drawVehicle(ctx, world.vehicle, vehicleX, vehicleY + bob, u, {
          wheelAngle,
          tilt,
          headlights: world.daylight > 0.7,
        });

        if (state.phase === 'driving' && feature) {
          const entered = vehicleX >= (feature.x - feature.halfWidth) * W;
          if (feature.kind === 'puddle') {
            const splashing =
              entered && vehicleX <= (feature.x + feature.halfWidth) * W + 2 * u;
            if (splashing) drawSplash(ctx, feature.x * W, vehicleY, u, now);
          }
          if (entered && !featureCued) {
            featureCued = true;
            cues.push({ kind: feature.kind === 'river' ? 'bridge' : 'puddle' });
          }
        }
      }

      if (ended) {
        const nightT = Math.min(1, (now - endedAt) / 3000);
        drawNight(ctx, W, H, horizonY, stars, nightT, now);
        // The animals stay out under the stars, asleep: it is bedtime.
        ctx.globalAlpha = 0.75 * nightT;
        for (const animal of world.animals) {
          drawAnimal(ctx, animal.kind, animal.x * W, roadTopY - 0.2 * u, u, 'asleep', now);
        }
        ctx.globalAlpha = 1;
        if (restartHold > 0) {
          ctx.strokeStyle = 'rgba(255, 250, 220, 0.6)';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(W - 44, H - 44, 15, -Math.PI / 2, -Math.PI / 2 + restartHold * Math.PI * 2);
          ctx.stroke();
        }
      }

      return cues;
    },
  };
}

function drawSky(
  ctx: CanvasRenderingContext2D,
  W: number,
  horizonY: number,
  daylight: number,
  now: number,
): void {
  const sky = ctx.createLinearGradient(0, 0, 0, horizonY);
  sky.addColorStop(0, rampColor(SKY_TOPS, daylight));
  sky.addColorStop(1, rampColor(SKY_BOTTOMS, daylight));
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, horizonY);

  const sunX = lerp(0.2, 0.85, daylight) * W;
  const sunY = lerp(0.16, 0.4, daylight) * horizonY;
  const sunR = 0.06 * horizonY * (1 + 0.02 * Math.sin(now / 800));
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.3, sunX, sunY, sunR * 2.6);
  glow.addColorStop(0, rampColor(SUN_COLORS, daylight, 0.9));
  glow.addColorStop(1, rampColor(SUN_COLORS, daylight, 0));
  ctx.fillStyle = glow;
  ctx.fillRect(sunX - sunR * 3, sunY - sunR * 3, sunR * 6, sunR * 6);
  ctx.fillStyle = rampColor(SUN_COLORS, daylight);
  ctx.beginPath();
  ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2);
  ctx.fill();
}

function drawClouds(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  world: Scenery,
  now: number,
): void {
  ctx.fillStyle = `rgba(255, 255, 255, ${0.9 - world.daylight * 0.3})`;
  for (const cloud of world.clouds) {
    const x = (((cloud.x + now * 0.000006) % 1.15) - 0.075) * W;
    const y = cloud.y * H;
    const r = 0.028 * H * cloud.scale;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.arc(x + r * 1.1, y + r * 0.25, r * 0.8, 0, Math.PI * 2);
    ctx.arc(x - r * 1.1, y + r * 0.3, r * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  horizonY: number,
  world: Scenery,
): void {
  for (const hill of world.hills) {
    ctx.fillStyle = hill.color;
    ctx.beginPath();
    ctx.ellipse(hill.x * W, horizonY, hill.width * W, hill.height * H, 0, Math.PI, 0);
    ctx.fill();
  }
}

function drawRoad(
  ctx: CanvasRenderingContext2D,
  W: number,
  topY: number,
  bottomY: number,
): void {
  ctx.fillStyle = '#4a4d57';
  ctx.fillRect(0, topY, W, bottomY - topY);
  ctx.fillStyle = '#e8e6da';
  const dashY = (topY + bottomY) / 2 - 2;
  for (let x = 0; x < W; x += 60) {
    ctx.fillRect(x, dashY, 28, 4);
  }
}

function drawTrees(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  roadTopY: number,
  world: Scenery,
): void {
  for (const tree of world.trees) {
    const x = tree.x * W;
    const h = tree.height * H;
    const baseY = roadTopY - 2;
    ctx.fillStyle = '#8b5a2b';
    ctx.fillRect(x - h * 0.06, baseY - h * 0.45, h * 0.12, h * 0.45);
    ctx.fillStyle = tree.foliage;
    ctx.beginPath();
    ctx.arc(x, baseY - h * 0.65, h * 0.32, 0, Math.PI * 2);
    ctx.arc(x - h * 0.22, baseY - h * 0.48, h * 0.24, 0, Math.PI * 2);
    ctx.arc(x + h * 0.22, baseY - h * 0.48, h * 0.24, 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A river flowing toward the viewer, drawn over the grass. */
function drawRiver(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  horizonY: number,
  x: number,
  halfWidth: number,
  now: number,
): void {
  const cx = x * W;
  const topHw = halfWidth * W * 0.75;
  const bottomHw = halfWidth * W * 1.2;
  ctx.fillStyle = '#4f97c7';
  ctx.beginPath();
  ctx.moveTo(cx - topHw, horizonY);
  ctx.lineTo(cx + topHw, horizonY);
  ctx.lineTo(cx + bottomHw, H);
  ctx.lineTo(cx - bottomHw, H);
  ctx.fill();
  // Ripples drifting downstream, toward the viewer.
  ctx.strokeStyle = 'rgba(230, 245, 255, 0.5)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const c = (now * 0.00008 + i / 5) % 1;
    const y = horizonY + c * (H - horizonY);
    const hw = topHw + (bottomHw - topHw) * c;
    const rx = cx + Math.sin(i * 2.7) * hw * 0.35;
    ctx.beginPath();
    ctx.moveTo(rx - hw * 0.25, y);
    ctx.quadraticCurveTo(rx, y + 3, rx + hw * 0.25, y);
    ctx.stroke();
  }
}

/** A plank bridge carrying the road over the river. */
function drawBridge(
  ctx: CanvasRenderingContext2D,
  W: number,
  roadTopY: number,
  roadBottomY: number,
  u: number,
  x: number,
  halfWidth: number,
): void {
  const lo = (x - halfWidth) * W - 0.4 * u;
  const hi = (x + halfWidth) * W + 0.4 * u;
  ctx.fillStyle = '#9a6b3f';
  ctx.fillRect(lo, roadTopY, hi - lo, roadBottomY - roadTopY);
  ctx.strokeStyle = 'rgba(90, 58, 32, 0.6)';
  ctx.lineWidth = 2;
  for (let px = lo + 8; px < hi; px += 14) {
    ctx.beginPath();
    ctx.moveTo(px, roadTopY);
    ctx.lineTo(px, roadBottomY);
    ctx.stroke();
  }
  ctx.fillStyle = '#7c5230';
  const railY = roadTopY - 0.7 * u;
  ctx.fillRect(lo, railY, hi - lo, 0.14 * u);
  for (const px of [lo, (lo + hi) / 2 - 0.07 * u, hi - 0.14 * u]) {
    ctx.fillRect(px, railY, 0.14 * u, roadTopY - railY);
  }
  // A shadowed lip under the deck, over the water.
  ctx.fillStyle = 'rgba(60, 40, 22, 0.85)';
  ctx.fillRect(lo, roadBottomY, hi - lo, 0.25 * u);
}

/** A puddle lying on the road. */
function drawPuddle(
  ctx: CanvasRenderingContext2D,
  W: number,
  roadTopY: number,
  roadBottomY: number,
  x: number,
  halfWidth: number,
): void {
  const roadH = roadBottomY - roadTopY;
  const y = roadTopY + roadH * 0.68;
  ctx.fillStyle = '#6d87a8';
  ctx.beginPath();
  ctx.ellipse(x * W, y, halfWidth * W, roadH * 0.26, 0, 0, Math.PI * 2);
  ctx.fill();
  // A glint of sky on the water.
  ctx.fillStyle = 'rgba(220, 235, 250, 0.45)';
  ctx.beginPath();
  ctx.ellipse(x * W - halfWidth * W * 0.25, y - roadH * 0.07, halfWidth * W * 0.4, roadH * 0.09, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Droplets flying up while the vehicle crosses the puddle. */
function drawSplash(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  now: number,
): void {
  ctx.fillStyle = 'rgba(170, 205, 235, 0.85)';
  for (let i = 0; i < 7; i++) {
    const c = (now / 300 + i / 7) % 1;
    const angle = Math.PI * (0.2 + 0.6 * (i / 6));
    const dist = (0.4 + 1.2 * c) * u;
    const dx = Math.cos(angle) * dist * 1.6;
    const dy = -Math.sin(angle) * dist + c * c * 0.9 * u;
    ctx.beginPath();
    ctx.arc(x + dx, y - 0.3 * u + dy, 0.08 * u * (1 - 0.6 * c), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A soft translucent rainbow rising from behind the hills. */
function drawRainbow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  horizonY: number,
  H: number,
): void {
  const colors = [
    'rgba(228, 87, 86, 0.30)',
    'rgba(240, 150, 62, 0.30)',
    'rgba(240, 205, 80, 0.30)',
    'rgba(110, 190, 110, 0.30)',
    'rgba(95, 140, 220, 0.30)',
    'rgba(150, 110, 200, 0.30)',
  ];
  const band = 0.016 * H;
  ctx.lineWidth = band;
  for (const [i, color] of colors.entries()) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(cx, horizonY + 0.04 * H, 0.34 * H - i * band, Math.PI, Math.PI * 2);
    ctx.stroke();
  }
}

/** A little bird crossing the sky with slow wingbeats. */
function drawBird(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  y: number,
  drift: number,
  now: number,
): void {
  const c = (now * 0.00003 + drift) % 1.2;
  const x = (c - 0.1) * W;
  const yy = y * H + Math.sin(now / 900) * 0.01 * H;
  const s = 0.014 * H;
  const wingDy = -s * 0.6 * Math.sin(now / 180);
  ctx.strokeStyle = '#4a4a55';
  ctx.lineWidth = Math.max(1.5, 0.16 * s);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x - s, yy + wingDy);
  ctx.quadraticCurveTo(x - s * 0.3, yy, x, yy);
  ctx.quadraticCurveTo(x + s * 0.3, yy, x + s, yy + wingDy);
  ctx.stroke();
}

// How high each animal hops as the vehicle passes, in vehicle units.
const HOP_HEIGHTS: Record<AnimalKind, number> = {
  sheep: 0.5,
  cow: 0.35,
  pig: 0.45,
  dog: 0.6,
  rabbit: 0.9,
  duck: 0.4,
};

// How far each animal's body rides above the ground on its legs, in vehicle
// units. Asleep, the legs are tucked in and the body settles by this much.
const LEG_LIFT: Record<AnimalKind, number> = {
  sheep: 0.3,
  cow: 0.35,
  pig: 0.3,
  dog: 0.35,
  rabbit: 0,
  duck: 0.14,
};

type AnimalMode = 'idle' | 'hop' | 'asleep';

/** Draw an animal on the grass at (x, groundY), facing the road. */
function drawAnimal(
  ctx: CanvasRenderingContext2D,
  kind: AnimalKind,
  x: number,
  groundY: number,
  u: number,
  mode: AnimalMode,
  now: number,
): void {
  const asleep = mode === 'asleep';
  const hop =
    mode === 'hop' ? Math.abs(Math.sin(now / 90)) * HOP_HEIGHTS[kind] * u : 0;
  // Asleep, the body rests on the grass and lifts a little with each slow
  // breath.
  const settle = asleep
    ? LEG_LIFT[kind] * u - 0.025 * u * (1 + Math.sin(now / 1100))
    : 0;
  const y = groundY - hop + settle;

  const legs = (color: string, xs: number[], top: number): void => {
    if (asleep) return;
    ctx.strokeStyle = color;
    ctx.lineWidth = u * 0.08;
    for (const lx of xs) {
      ctx.beginPath();
      ctx.moveTo(x + lx * u, y - top * u);
      ctx.lineTo(x + lx * u, y);
      ctx.stroke();
    }
  };
  const dot = (dx: number, dy: number, r: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x + dx * u, y + dy * u, r * u, 0, Math.PI * 2);
    ctx.fill();
  };
  const blob = (dx: number, dy: number, rx: number, ry: number, color: string): void => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.ellipse(x + dx * u, y + dy * u, rx * u, ry * u, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  // Awake, a dot; asleep, a small closed lid drawn as a downward arc.
  const eye = (dx: number, dy: number, r: number, color: string): void => {
    if (!asleep) {
      dot(dx, dy, r, color);
      return;
    }
    ctx.strokeStyle = color;
    ctx.lineWidth = u * 0.045;
    ctx.beginPath();
    ctx.arc(x + dx * u, y + (dy - 0.04) * u, 0.08 * u, 0.25 * Math.PI, 0.75 * Math.PI);
    ctx.stroke();
  };

  switch (kind) {
    case 'sheep': {
      legs('#494539', [-0.3, 0.1, 0.35], 0.3);
      ctx.fillStyle = '#f4f1e8';
      ctx.beginPath();
      ctx.arc(x, y - 0.55 * u, 0.4 * u, 0, Math.PI * 2);
      ctx.arc(x - 0.3 * u, y - 0.5 * u, 0.3 * u, 0, Math.PI * 2);
      ctx.arc(x + 0.3 * u, y - 0.5 * u, 0.3 * u, 0, Math.PI * 2);
      ctx.arc(x + 0.1 * u, y - 0.75 * u, 0.28 * u, 0, Math.PI * 2);
      ctx.fill();
      dot(0.55, -0.65, 0.18, '#494539');
      if (asleep) eye(0.58, -0.66, 0, '#f4f1e8');
      break;
    }
    case 'cow': {
      legs('#8c7362', [-0.45, -0.2, 0.2, 0.45], 0.35);
      ctx.fillStyle = '#f4f1e8';
      ctx.beginPath();
      ctx.roundRect(x - 0.62 * u, y - 1.05 * u, 1.24 * u, 0.75 * u, 0.3 * u);
      ctx.fill();
      blob(-0.2, -0.72, 0.22, 0.16, '#5b4a3f');
      blob(0.28, -0.92, 0.16, 0.11, '#5b4a3f');
      dot(0.68, -1.05, 0.24, '#f4f1e8');
      blob(0.5, -1.22, 0.1, 0.06, '#5b4a3f'); // ear
      blob(0.78, -0.96, 0.14, 0.1, '#f0b7ba'); // muzzle
      eye(0.62, -1.12, 0.05, '#3b332c');
      break;
    }
    case 'pig': {
      legs('#d98aa3', [-0.32, -0.05, 0.28], 0.3);
      blob(0, -0.58, 0.55, 0.38, '#eda3b5');
      dot(0.5, -0.65, 0.26, '#eda3b5');
      ctx.beginPath(); // curly tail
      ctx.strokeStyle = '#d98aa3';
      ctx.lineWidth = u * 0.07;
      ctx.arc(x - 0.58 * u, y - 0.65 * u, 0.09 * u, 0.5, 4.5);
      ctx.stroke();
      blob(0.55, -0.92, 0.08, 0.11, '#d98aa3'); // ear
      blob(0.72, -0.62, 0.11, 0.08, '#f5c1cf'); // snout
      eye(0.58, -0.72, 0.05, '#3b332c');
      break;
    }
    case 'dog': {
      legs('#8a5f3c', [-0.35, 0.25], 0.35);
      ctx.strokeStyle = '#a67447'; // tail
      ctx.lineWidth = u * 0.1;
      ctx.beginPath();
      ctx.moveTo(x - 0.5 * u, y - 0.75 * u);
      ctx.lineTo(x - 0.75 * u, y - 1.05 * u);
      ctx.stroke();
      ctx.fillStyle = '#a67447';
      ctx.beginPath();
      ctx.roundRect(x - 0.5 * u, y - 0.85 * u, 1.0 * u, 0.55 * u, 0.25 * u);
      ctx.fill();
      dot(0.55, -0.95, 0.24, '#a67447');
      blob(0.42, -1.1, 0.09, 0.16, '#8a5f3c'); // floppy ear
      dot(0.78, -0.92, 0.07, '#3b332c'); // nose
      eye(0.6, -1.02, 0.05, '#3b332c');
      break;
    }
    case 'rabbit': {
      blob(0.16, -0.92, 0.06, 0.22, '#c9c2b2'); // ears
      blob(0.32, -0.9, 0.06, 0.22, '#c9c2b2');
      dot(0, -0.35, 0.3, '#dcd6c9');
      dot(0.24, -0.6, 0.18, '#dcd6c9');
      dot(-0.28, -0.32, 0.1, '#f4f1e8'); // tail
      eye(0.32, -0.64, 0.04, '#3b332c');
      break;
    }
    case 'duck': {
      legs('#e8862e', [-0.05, 0.14], 0.14);
      blob(0, -0.35, 0.36, 0.24, '#f2d24b');
      blob(-0.08, -0.35, 0.18, 0.12, '#e3bd35'); // wing
      dot(0.3, -0.62, 0.15, '#f2d24b');
      ctx.fillStyle = '#e8862e'; // beak
      ctx.beginPath();
      ctx.moveTo(x + 0.42 * u, y - 0.68 * u);
      ctx.lineTo(x + 0.6 * u, y - 0.62 * u);
      ctx.lineTo(x + 0.42 * u, y - 0.56 * u);
      ctx.fill();
      eye(0.32, -0.66, 0.04, '#3b332c');
      break;
    }
  }

  if (asleep) {
    // Little z's drifting up from the sleeper.
    for (const k of [0, 1]) {
      const c = (now / 2600 + k * 0.5) % 1;
      const zx = x + (0.5 + 0.3 * c + 0.12 * k) * u;
      const zy = y - (1.15 + 0.9 * c) * u;
      ctx.fillStyle = `rgba(245, 240, 210, ${(0.9 * (1 - c)).toFixed(3)})`;
      ctx.font = `${(0.34 + 0.1 * c) * u}px sans-serif`;
      ctx.fillText('z', zx, zy);
    }
  }
}

function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  u: number,
  phase: GameState['phase'],
  greenAt: number,
  rockedAt: number,
  now: number,
): void {
  const housingW = 1.5 * u;
  const housingH = 2.7 * u;
  const topY = groundY - 5.2 * u;

  ctx.fillStyle = '#3a3f4a';
  ctx.fillRect(x - 0.12 * u, topY + housingH - 0.2 * u, 0.24 * u, groundY - topY - housingH + 0.2 * u);
  ctx.beginPath();
  ctx.roundRect(x - housingW / 2, topY, housingW, housingH, 0.4 * u);
  ctx.fill();

  const greenOn = phase === 'green' || phase === 'driving';
  const lampR = 0.48 * u;
  const redY = topY + 0.75 * u;
  const greenY = topY + housingH - 0.75 * u;

  // A brief extra glow when the light has just turned green, so the change
  // is unmissable — and the mirror image on a premature press: the red
  // lamp flares to point at why the vehicle stays put.
  const greenPulse = greenOn ? Math.max(0, 1 - (now - greenAt) / 600) : 0;
  const redPulse = greenOn ? 0 : Math.max(0, 1 - (now - rockedAt) / 500);

  drawLamp(ctx, x, redY, lampR, '#e74c3c', '#57302c', !greenOn, redPulse);
  drawLamp(ctx, x, greenY, lampR, '#2ecc71', '#2a4a38', greenOn, greenPulse);
}

function drawLamp(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  onColor: string,
  offColor: string,
  on: boolean,
  pulse: number,
): void {
  if (on) {
    const glowR = r * (2.2 + pulse * 2);
    const glow = ctx.createRadialGradient(x, y, r * 0.5, x, y, glowR);
    glow.addColorStop(0, onColor);
    glow.addColorStop(1, `${onColor}00`);
    ctx.fillStyle = glow;
    ctx.fillRect(x - glowR, y - glowR, glowR * 2, glowR * 2);
  }
  ctx.fillStyle = on ? onColor : offColor;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

interface VehicleEffects {
  wheelAngle: number;
  tilt: number;
  headlights: boolean;
}

/** Draw a vehicle with its rear-axle ground point at (x, groundY). */
function drawVehicle(
  ctx: CanvasRenderingContext2D,
  vehicle: Vehicle,
  x: number,
  groundY: number,
  u: number,
  fx: VehicleEffects,
): void {
  if (u <= 0) return;
  ctx.save();
  ctx.translate(x, groundY);
  ctx.rotate(fx.tilt);

  const body = vehicle.bodyColor;
  const accent = vehicle.accentColor;
  const window = '#cfe9f7';

  switch (vehicle.kind) {
    case 'car': {
      drawWheel(ctx, -u, 0, 0.5 * u, fx.wheelAngle);
      drawWheel(ctx, u, 0, 0.5 * u, fx.wheelAngle);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-1.7 * u, -1.4 * u, 3.4 * u, u, 0.3 * u);
      ctx.fill();
      ctx.beginPath();
      ctx.roundRect(-0.9 * u, -2.1 * u, 1.6 * u, u, 0.35 * u);
      ctx.fill();
      ctx.fillStyle = window;
      ctx.beginPath();
      ctx.roundRect(-0.65 * u, -1.95 * u, 1.1 * u, 0.6 * u, 0.15 * u);
      ctx.fill();
      drawHeadlight(ctx, 1.6 * u, -1.05 * u, u, accent, fx.headlights);
      break;
    }
    case 'bus': {
      drawWheel(ctx, -1.4 * u, 0, 0.5 * u, fx.wheelAngle);
      drawWheel(ctx, 1.4 * u, 0, 0.5 * u, fx.wheelAngle);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-2.2 * u, -2.3 * u, 4.4 * u, 1.9 * u, 0.35 * u);
      ctx.fill();
      ctx.fillStyle = window;
      for (const wx of [-1.6, -0.6, 0.4, 1.4]) {
        ctx.beginPath();
        ctx.roundRect(wx * u, -2.05 * u, 0.7 * u, 0.65 * u, 0.12 * u);
        ctx.fill();
      }
      ctx.fillStyle = accent;
      ctx.fillRect(-2.2 * u, -1.15 * u, 4.4 * u, 0.25 * u);
      drawHeadlight(ctx, 2.1 * u, -0.8 * u, u, accent, fx.headlights);
      break;
    }
    case 'truck': {
      drawWheel(ctx, -1.5 * u, 0, 0.5 * u, fx.wheelAngle);
      drawWheel(ctx, 0.3 * u, 0, 0.5 * u, fx.wheelAngle);
      drawWheel(ctx, 1.6 * u, 0, 0.5 * u, fx.wheelAngle);
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(-2.4 * u, -2.4 * u, 3.3 * u, 2 * u, 0.25 * u);
      ctx.fill();
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(1.0 * u, -1.9 * u, 1.3 * u, 1.5 * u, 0.25 * u);
      ctx.fill();
      ctx.fillStyle = window;
      ctx.beginPath();
      ctx.roundRect(1.55 * u, -1.75 * u, 0.6 * u, 0.6 * u, 0.12 * u);
      ctx.fill();
      drawHeadlight(ctx, 2.25 * u, -0.7 * u, u, body, fx.headlights);
      break;
    }
    case 'tractor': {
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.roundRect(-1.5 * u, -1.9 * u, 3.2 * u, 1.2 * u, 0.25 * u);
      ctx.fill();
      // Chimney.
      ctx.fillRect(1.0 * u, -2.7 * u, 0.28 * u, 0.9 * u);
      // Cabin frame.
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.roundRect(-1.2 * u, -2.9 * u, 1.3 * u, 1.1 * u, 0.2 * u);
      ctx.fill();
      ctx.fillStyle = window;
      ctx.beginPath();
      ctx.roundRect(-1.0 * u, -2.7 * u, 0.9 * u, 0.7 * u, 0.12 * u);
      ctx.fill();
      // Unlike the other vehicles, the big rear wheel overlaps the body, so
      // the wheels go on top.
      drawWheel(ctx, -0.9 * u, 0, 0.9 * u, fx.wheelAngle * 0.55);
      drawWheel(ctx, 1.3 * u, 0, 0.45 * u, fx.wheelAngle);
      drawHeadlight(ctx, 1.65 * u, -1.55 * u, u, accent, fx.headlights);
      break;
    }
  }
  ctx.restore();
}

function drawWheel(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  angle: number,
): void {
  ctx.save();
  ctx.translate(x, y - r);
  ctx.fillStyle = '#33363d';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#8f939c';
  ctx.beginPath();
  ctx.arc(0, 0, r * 0.45, 0, Math.PI * 2);
  ctx.fill();
  ctx.rotate(angle);
  ctx.strokeStyle = '#33363d';
  ctx.lineWidth = r * 0.16;
  ctx.beginPath();
  ctx.moveTo(-r * 0.4, 0);
  ctx.lineTo(r * 0.4, 0);
  ctx.moveTo(0, -r * 0.4);
  ctx.lineTo(0, r * 0.4);
  ctx.stroke();
  ctx.restore();
}

function drawHeadlight(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  u: number,
  color: string,
  beamOn: boolean,
): void {
  if (beamOn) {
    const beam = ctx.createLinearGradient(x, y, x + 3.5 * u, y);
    beam.addColorStop(0, 'rgba(255, 240, 170, 0.5)');
    beam.addColorStop(1, 'rgba(255, 240, 170, 0)');
    ctx.fillStyle = beam;
    ctx.beginPath();
    ctx.moveTo(x, y - 0.15 * u);
    ctx.lineTo(x + 3.5 * u, y - 0.7 * u);
    ctx.lineTo(x + 3.5 * u, y + 0.7 * u);
    ctx.lineTo(x, y + 0.15 * u);
    ctx.fill();
  }
  ctx.fillStyle = beamOn ? '#fff0aa' : color;
  ctx.beginPath();
  ctx.arc(x, y, 0.16 * u, 0, Math.PI * 2);
  ctx.fill();
}

interface Star {
  x: number;
  y: number;
  phase: number;
}

function makeStars(seed: number): Star[] {
  const rng = mulberry32(seed * 13 + 7);
  const stars: Star[] = [];
  for (let i = 0; i < 70; i++) {
    stars.push({ x: rng(), y: rng() * 0.6, phase: rng() * Math.PI * 2 });
  }
  return stars;
}

const moonSprites = new Map<number, HTMLCanvasElement>();

/**
 * A crescent moon on its own small canvas. Carving the bite out there (with
 * destination-out) keeps the night sky behind the moon untouched, instead of
 * papering over it with a nearly-matching dark disc.
 */
function crescentSprite(radius: number): HTMLCanvasElement {
  const r = Math.ceil(radius);
  let sprite = moonSprites.get(r);
  if (sprite) return sprite;
  sprite = document.createElement('canvas');
  sprite.width = sprite.height = r * 2 + 2;
  const g = sprite.getContext('2d')!;
  const c = r + 1;
  g.fillStyle = '#f5f0d2';
  g.beginPath();
  g.arc(c, c, r, 0, Math.PI * 2);
  g.fill();
  g.globalCompositeOperation = 'destination-out';
  g.beginPath();
  g.arc(c - r * 0.45, c - r * 0.2, r * 0.85, 0, Math.PI * 2);
  g.fill();
  moonSprites.set(r, sprite);
  return sprite;
}

/** The ended session's night: fades in over the dusk scene, then breathes. */
function drawNight(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  horizonY: number,
  stars: Star[],
  t: number,
  now: number,
): void {
  ctx.fillStyle = `rgba(11, 21, 51, ${0.88 * t})`;
  ctx.fillRect(0, 0, W, H);

  for (const [i, star] of stars.entries()) {
    const twinkle = 0.5 + 0.4 * Math.sin(now / 600 + star.phase + i);
    ctx.fillStyle = `rgba(255, 250, 220, ${t * twinkle})`;
    ctx.beginPath();
    ctx.arc(star.x * W, star.y * H, 1.6, 0, Math.PI * 2);
    ctx.fill();
  }

  const moon = crescentSprite(0.045 * H);
  ctx.globalAlpha = t;
  ctx.drawImage(moon, 0.75 * W - moon.width / 2, 0.2 * H - moon.height / 2);
  ctx.globalAlpha = 1;

  // A few fireflies drifting over the dark grass.
  for (let i = 0; i < 3; i++) {
    const x = (0.28 + 0.2 * i + 0.04 * Math.sin(now / 1400 + i * 2.6)) * W;
    const y = horizonY + (0.12 + 0.05 * Math.sin(now / 900 + i * 1.9)) * (H - horizonY);
    const a = t * (0.5 + 0.5 * Math.sin(now / 500 + i * 2.1));
    const glow = ctx.createRadialGradient(x, y, 0, x, y, 10);
    glow.addColorStop(0, `rgba(220, 255, 150, ${a})`);
    glow.addColorStop(1, 'rgba(220, 255, 150, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 10, y - 10, 20, 20);
  }
}
