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
import { roundScenery, type Scenery, type Vehicle } from './core/scenery';
import { mulberry32 } from '../shared/rng';

export interface Renderer {
  onEvent(event: GameEvent, now: number): void;
  draw(state: GameState, driveProgress: number, now: number): void;
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
  let roundStartedAt = -Infinity;
  let endedAt = -Infinity;

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
      else if (event === 'roundStarted') roundStartedAt = now;
      else if (event === 'sessionEnded') endedAt = now;
    },

    draw(state, driveProgress, now) {
      const dpr = window.devicePixelRatio || 1;
      const W = canvas.clientWidth;
      const H = canvas.clientHeight;
      if (canvas.width !== W * dpr || canvas.height !== H * dpr) {
        canvas.width = W * dpr;
        canvas.height = H * dpr;
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const ended = state.phase === 'done';
      const round = ended ? totalRounds - 1 : state.round;
      const world = scenery(round);
      const u = H * 0.05; // vehicle unit size
      const horizonY = 0.66 * H;
      const roadTopY = 0.78 * H;
      const roadBottomY = 0.9 * H;
      const vehicleY = 0.87 * H;
      const idleX = 0.15 * W;
      const lightX = 0.31 * W;

      drawSky(ctx, W, horizonY, world.daylight, now);
      drawClouds(ctx, W, H, world, now);
      drawHills(ctx, W, H, horizonY, world);
      // Grass, then the road cut into it.
      ctx.fillStyle = rampColor(GRASS_TOPS, world.daylight);
      ctx.fillRect(0, horizonY, W, H - horizonY);
      drawRoad(ctx, W, roadTopY, roadBottomY);
      drawTrees(ctx, W, H, roadTopY, world);

      const vehicleX =
        idleX + drivenDistance(driveProgress) * (W + 6 * u - idleX);
      if (world.sheep) {
        const hopping =
          state.phase === 'driving' &&
          Math.abs(vehicleX - world.sheep.x * W) < 0.1 * W;
        drawSheep(ctx, world.sheep.x * W, roadTopY - 0.2 * u, u, hopping, now);
      }

      drawTrafficLight(ctx, lightX, roadTopY, u, state.phase, greenAt, now);

      if (!ended) {
        const popIn = Math.min(1, (now - roundStartedAt) / 350);
        const idle = state.phase === 'red' || state.phase === 'green';
        const bob = idle ? Math.sin(now / 280) * 0.06 * u : 0;
        const sinceRock = now - rockedAt;
        const tilt =
          sinceRock < 400
            ? Math.sin(sinceRock / 45) * 0.05 * (1 - sinceRock / 400)
            : 0;
        const wheelAngle = (drivenDistance(driveProgress) * (W - idleX)) / (0.5 * u);
        drawVehicle(ctx, world.vehicle, vehicleX, vehicleY + bob, u * popIn, {
          wheelAngle,
          tilt,
          headlights: world.daylight > 0.7,
        });
      }

      if (ended) {
        drawNight(ctx, W, H, horizonY, stars, Math.min(1, (now - endedAt) / 3000), now);
      }
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

function drawSheep(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  u: number,
  hopping: boolean,
  now: number,
): void {
  const hop = hopping ? Math.abs(Math.sin(now / 90)) * 0.5 * u : 0;
  const y = groundY - hop;
  ctx.strokeStyle = '#494539';
  ctx.lineWidth = u * 0.08;
  for (const leg of [-0.3, 0.1, 0.35]) {
    ctx.beginPath();
    ctx.moveTo(x + leg * u, y - 0.3 * u);
    ctx.lineTo(x + leg * u, y);
    ctx.stroke();
  }
  ctx.fillStyle = '#f4f1e8';
  ctx.beginPath();
  ctx.arc(x, y - 0.55 * u, 0.4 * u, 0, Math.PI * 2);
  ctx.arc(x - 0.3 * u, y - 0.5 * u, 0.3 * u, 0, Math.PI * 2);
  ctx.arc(x + 0.3 * u, y - 0.5 * u, 0.3 * u, 0, Math.PI * 2);
  ctx.arc(x + 0.1 * u, y - 0.75 * u, 0.28 * u, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#494539';
  ctx.beginPath();
  ctx.arc(x + 0.55 * u, y - 0.65 * u, 0.18 * u, 0, Math.PI * 2);
  ctx.fill();
}

function drawTrafficLight(
  ctx: CanvasRenderingContext2D,
  x: number,
  groundY: number,
  u: number,
  phase: GameState['phase'],
  greenAt: number,
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
  // is unmissable.
  const pulse = greenOn ? Math.max(0, 1 - (now - greenAt) / 600) : 0;

  drawLamp(ctx, x, redY, lampR, '#e74c3c', '#57302c', !greenOn, 0);
  drawLamp(ctx, x, greenY, lampR, '#2ecc71', '#2a4a38', greenOn, pulse);
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

  // Crescent moon: a bright disc with a sky-colored bite.
  const moonX = 0.75 * W;
  const moonY = 0.2 * H;
  const moonR = 0.045 * H;
  ctx.fillStyle = `rgba(245, 240, 210, ${t})`;
  ctx.beginPath();
  ctx.arc(moonX, moonY, moonR, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = `rgba(11, 21, 51, ${t})`;
  ctx.beginPath();
  ctx.arc(moonX - moonR * 0.45, moonY - moonR * 0.2, moonR * 0.85, 0, Math.PI * 2);
  ctx.fill();

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
