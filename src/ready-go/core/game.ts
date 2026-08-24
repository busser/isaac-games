/**
 * Session logic for Ready… Go!
 *
 * A session is a fixed number of rounds. In each round the light is red for
 * a random delay, then turns green; the first key press during green
 * launches the vehicle, which drives for a fixed time, and the next round
 * starts. After the last round the session ends and stays ended; starting a
 * new session is a parent-only gesture handled outside this module.
 *
 * The inhibition rule: a press while the light is red postpones green so
 * that it never comes sooner than `quietMs` after the last press. Waiting
 * is therefore load-bearing; mashing keeps the light red. The postponement
 * is deliberately invisible (see working-notes.md).
 *
 * This module is pure: time enters through the `now` arguments (ms on any
 * monotonic clock), randomness through the injected `rng`. Rendering and
 * sound react to the returned events; they never drive the state.
 */

export type Phase = 'red' | 'green' | 'driving' | 'done';

export type GameEvent =
  | 'roundStarted' // a new round began; the light is red again
  | 'premature' // key pressed during red; green was postponed
  | 'green' // the light turned green
  | 'launch' // key pressed during green; the vehicle starts driving
  | 'arrived' // the drive finished
  | 'sessionEnded'; // the last round finished

export interface GameConfig {
  /** Number of successful launches before the session winds down. */
  rounds: number;
  /** Bounds of the random red-light delay, in ms. */
  minRedMs: number;
  maxRedMs: number;
  /** Green never comes sooner than this after a press during red, in ms. */
  quietMs: number;
  /** Duration of the drive animation, in ms. */
  driveMs: number;
}

export const DEFAULT_CONFIG: GameConfig = {
  rounds: 8,
  minRedMs: 500,
  maxRedMs: 3000,
  quietMs: 1000,
  driveMs: 5000,
};

export interface GameState {
  phase: Phase;
  /** 0-based round index; equals config.rounds once the phase is 'done'. */
  round: number;
}

export interface Game {
  state(): GameState;
  /** Fraction of the drive completed, in [0, 1]. 0 unless driving. */
  driveProgress(now: number): number;
  /** A key was pressed (any key: the whole keyboard is one button). */
  press(now: number): GameEvent[];
  /** Advance time. Call every frame. */
  tick(now: number): GameEvent[];
}

export function createGame(
  now: number,
  rng: () => number,
  config: GameConfig = DEFAULT_CONFIG,
): Game {
  let phase: Phase = 'red';
  let round = 0;
  let greenAt = now + redDelay();
  let driveStartedAt = 0;

  function redDelay(): number {
    return config.minRedMs + rng() * (config.maxRedMs - config.minRedMs);
  }

  return {
    state: () => ({ phase, round }),

    driveProgress(t) {
      if (phase !== 'driving') return 0;
      return Math.min(1, (t - driveStartedAt) / config.driveMs);
    },

    press(t) {
      if (phase === 'red') {
        greenAt = Math.max(greenAt, t + config.quietMs);
        return ['premature'];
      }
      if (phase === 'green') {
        phase = 'driving';
        driveStartedAt = t;
        return ['launch'];
      }
      return [];
    },

    tick(t) {
      if (phase === 'red' && t >= greenAt) {
        phase = 'green';
        return ['green'];
      }
      if (phase === 'driving' && t - driveStartedAt >= config.driveMs) {
        round += 1;
        if (round >= config.rounds) {
          phase = 'done';
          return ['arrived', 'sessionEnded'];
        }
        phase = 'red';
        greenAt = t + redDelay();
        return ['arrived', 'roundStarted'];
      }
      return [];
    },
  };
}
