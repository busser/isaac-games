import { describe, expect, test } from 'vitest';
import { createGame, type Game, type GameConfig } from './game';

const CONFIG: GameConfig = {
  rounds: 3,
  arriveMs: 2000,
  minRedMs: 500,
  maxRedMs: 3000,
  quietMs: 1000,
  driveMs: 5000,
};

// rng always returns 0.5, so every red delay is exactly (500 + 3000) / 2,
// counted from the moment the vehicle stops at the light.
const RED_DELAY = 1750;
const GREEN_AT = CONFIG.arriveMs + RED_DELAY;
const rng = () => 0.5;

function newGame(now = 0): Game {
  return createGame(now, rng, CONFIG);
}

/** Complete the current round: wait for green, press, wait out the drive. */
function playRound(game: Game, now: number): number {
  while (game.state().phase === 'arriving' || game.state().phase === 'red') {
    now += 100;
    game.tick(now);
  }
  game.press(now);
  now += CONFIG.driveMs;
  game.tick(now);
  return now;
}

describe('drive-in', () => {
  test('the round starts with the vehicle arriving, light red', () => {
    const game = newGame();
    expect(game.state().phase).toBe('arriving');
    expect(game.tick(CONFIG.arriveMs - 1)).toEqual([]);
    expect(game.state().phase).toBe('arriving');
    expect(game.tick(CONFIG.arriveMs)).toEqual([]);
    expect(game.state().phase).toBe('red');
  });

  test('arrive progress goes from 0 to 1 over the drive-in, then stays 1', () => {
    const game = newGame();
    expect(game.arriveProgress(0)).toBe(0);
    expect(game.arriveProgress(CONFIG.arriveMs / 2)).toBe(0.5);
    game.tick(CONFIG.arriveMs);
    expect(game.arriveProgress(CONFIG.arriveMs + 500)).toBe(1);
  });

  test('a press during the drive-in is premature', () => {
    const game = newGame();
    expect(game.press(100)).toEqual(['premature']);
    expect(game.state().phase).toBe('arriving');
  });

  test('a press late in the drive-in postpones a green that would come too soon', () => {
    // A red delay shorter than the quiet period, so a press just before
    // the stop must push green back.
    const game = createGame(0, rng, { ...CONFIG, minRedMs: 100, maxRedMs: 100 });
    game.press(1900); // arriving; scheduled green was 2100
    expect(game.tick(2100)).toEqual([]);
    expect(game.tick(2899)).toEqual([]);
    expect(game.tick(2900)).toEqual(['green']);
  });
});

describe('red light', () => {
  test('turns green after the scheduled delay counted from the stop', () => {
    const game = newGame();
    expect(game.tick(GREEN_AT - 1)).toEqual([]);
    expect(game.state().phase).toBe('red');
    expect(game.tick(GREEN_AT)).toEqual(['green']);
    expect(game.state().phase).toBe('green');
  });

  test('a press during red is acknowledged as premature', () => {
    const game = newGame();
    game.tick(CONFIG.arriveMs);
    expect(game.press(CONFIG.arriveMs + 100)).toEqual(['premature']);
    expect(game.state().phase).toBe('red');
  });

  test('a press during red postpones green to a quiet period after it', () => {
    const game = newGame();
    game.press(GREEN_AT - 300);
    expect(game.tick(GREEN_AT)).toEqual([]);
    expect(game.tick(GREEN_AT + CONFIG.quietMs - 301)).toEqual([]);
    expect(game.tick(GREEN_AT + CONFIG.quietMs - 300)).toEqual(['green']);
  });

  test('an early press does not postpone a green already scheduled later', () => {
    const game = newGame();
    game.press(100); // 100 + quietMs = 1100, before the scheduled 3750
    expect(game.tick(GREEN_AT - 1)).toEqual([]);
    expect(game.tick(GREEN_AT)).toEqual(['green']);
  });

  test('mashing keeps the light red until the mashing stops', () => {
    const game = newGame();
    let lastPress = 0;
    for (let t = 300; t <= 8000; t += 300) {
      game.press(t);
      lastPress = t;
      expect(game.tick(t)).toEqual([]);
    }
    expect(game.tick(lastPress + CONFIG.quietMs - 1)).toEqual([]);
    expect(game.tick(lastPress + CONFIG.quietMs)).toEqual(['green']);
  });
});

describe('green light and drive', () => {
  test('a press during green launches the vehicle', () => {
    const game = newGame();
    game.tick(GREEN_AT);
    expect(game.press(GREEN_AT + 200)).toEqual(['launch']);
    expect(game.state().phase).toBe('driving');
  });

  test('presses during the drive are ignored', () => {
    const game = newGame();
    game.tick(GREEN_AT);
    game.press(GREEN_AT + 200);
    expect(game.press(GREEN_AT + 1200)).toEqual([]);
    expect(game.state().phase).toBe('driving');
  });

  test('drive progress goes from 0 to 1 over the drive duration', () => {
    const game = newGame();
    expect(game.driveProgress(1000)).toBe(0);
    game.tick(GREEN_AT);
    game.press(4000);
    expect(game.driveProgress(4000)).toBe(0);
    expect(game.driveProgress(6500)).toBe(0.5);
    expect(game.driveProgress(99999)).toBe(1);
  });

  test('the next round starts with a fresh drive-in when the drive completes', () => {
    const game = newGame();
    game.tick(GREEN_AT);
    game.press(4000);
    expect(game.tick(4000 + CONFIG.driveMs)).toEqual(['arrived', 'roundStarted']);
    expect(game.state()).toEqual({ phase: 'arriving', round: 1 });
    expect(game.arriveProgress(4000 + CONFIG.driveMs)).toBe(0);
  });
});

describe('session end', () => {
  test('the session ends after the configured number of rounds', () => {
    const game = newGame();
    let now = 0;
    for (let i = 0; i < CONFIG.rounds - 1; i++) {
      now = playRound(game, now);
      expect(game.state().phase).toBe('arriving');
    }
    while (game.state().phase === 'arriving' || game.state().phase === 'red') {
      now += 100;
      game.tick(now);
    }
    game.press(now);
    expect(game.tick(now + CONFIG.driveMs)).toEqual(['arrived', 'sessionEnded']);
    expect(game.state()).toEqual({ phase: 'done', round: CONFIG.rounds });
  });

  test('presses and ticks after the session ended do nothing', () => {
    const game = newGame();
    let now = 0;
    for (let i = 0; i < CONFIG.rounds; i++) now = playRound(game, now);
    expect(game.state().phase).toBe('done');
    expect(game.press(now + 100)).toEqual([]);
    expect(game.tick(now + 200)).toEqual([]);
    expect(game.driveProgress(now + 300)).toBe(0);
  });
});
