/**
 * Wiring for Ready… Go!: keyboard in, canvas and audio out.
 *
 * The child's input is any keyboard key. Clicks are the parent-only gate:
 * a click starts the first session (which also unlocks audio and requests
 * fullscreen), and a click on the ended night scene starts a new one.
 */

import { createGame, DEFAULT_CONFIG, type Game, type GameEvent } from './core/game';
import { createAudio } from './audio';
import { createRenderer, type Renderer } from './render';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const startOverlay = document.getElementById('start')!;
const audio = createAudio();

let game: Game | null = null;
let renderer: Renderer | null = null;

function dispatch(events: GameEvent[], now: number): void {
  for (const event of events) {
    audio.onEvent(event);
    renderer?.onEvent(event, now);
  }
}

function startSession(): void {
  const seed = Date.now() >>> 0;
  renderer = createRenderer(canvas, seed, DEFAULT_CONFIG.rounds);
  game = createGame(performance.now(), Math.random, DEFAULT_CONFIG);
}

startOverlay.addEventListener('click', () => {
  audio.unlock();
  startOverlay.hidden = true;
  // Fullscreen keeps stray presses away from the browser UI. Best-effort:
  // the game works fine without it.
  void document.documentElement.requestFullscreen?.().catch(() => {});
  startSession();
});

canvas.addEventListener('click', () => {
  if (game?.state().phase === 'done') startSession();
});

window.addEventListener('keydown', (event) => {
  if (!game || event.repeat) return;
  event.preventDefault();
  dispatch(game.press(performance.now()), performance.now());
});

function frame(now: number): void {
  if (game && renderer) {
    dispatch(game.tick(now), now);
    renderer.draw(game.state(), game.driveProgress(now), now);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
