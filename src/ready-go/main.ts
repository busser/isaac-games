/**
 * Wiring for Ready… Go!: keyboard in, canvas and audio out.
 *
 * The child's input is any keyboard key. Parent-only gates: a click on the
 * overlay starts the first session (which also unlocks audio and requests
 * fullscreen), and holding the space bar for 3 seconds on the ended night
 * scene starts a new one. A click was rejected as the restart gesture:
 * an accidental trackpad tap is too easy.
 */

import { createGame, DEFAULT_CONFIG, type Game, type GameEvent } from './core/game';
import { createAudio } from './audio';
import { createRenderer, type Renderer } from './render';

const canvas = document.getElementById('scene') as HTMLCanvasElement;
const startOverlay = document.getElementById('start')!;
const audio = createAudio();

const RESTART_HOLD_MS = 3000;

let game: Game | null = null;
let renderer: Renderer | null = null;
// When the space bar went down, or -1 while it is up. Only holds that start
// after the session ended count toward a restart.
let spaceHeldSince = -1;

function dispatch(events: GameEvent[], now: number): void {
  for (const event of events) {
    audio.onEvent(event);
    renderer?.onEvent(event, now);
    if (event === 'sessionEnded') spaceHeldSince = -1;
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

window.addEventListener('keydown', (event) => {
  if (!game || event.repeat) return;
  event.preventDefault();
  if (event.code === 'Space') spaceHeldSince = performance.now();
  dispatch(game.press(performance.now()), performance.now());
});

window.addEventListener('keyup', (event) => {
  if (event.code === 'Space') spaceHeldSince = -1;
});

function frame(now: number): void {
  if (game && renderer) {
    dispatch(game.tick(now), now);
    let restartHold = 0;
    if (game.state().phase === 'done' && spaceHeldSince >= 0) {
      restartHold = Math.min(1, (now - spaceHeldSince) / RESTART_HOLD_MS);
      if (restartHold >= 1) {
        spaceHeldSince = -1;
        startSession();
        restartHold = 0;
      }
    }
    renderer.draw(game.state(), game.driveProgress(now), now, restartHold);
  }
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
