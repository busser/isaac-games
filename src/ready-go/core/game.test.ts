import { describe, expect, test } from 'vitest';
import { createGame, type Game, type GameConfig } from './game';

const CONFIG: GameConfig = {
  rounds: 3,
  minRedMs: 500,
  maxRedMs: 3000,
  quietMs: 1000,
  driveMs: 5000,
};

// rng always returns 0.5, so every red delay is exactly (500 + 3000) / 2.
const RED_DELAY = 1750;
const rng = () => 0.5;

function newGame(now = 0): Game {
  return createGame(now, rng, CONFIG);
}

/** Complete the current round: wait for green, press, wait out the drive. */
function playRound(game: Game, now: number): number {
  while (game.state().phase === 'red') {
    now += 100;
    game.tick(now);
  }
  game.press(now);
  now += CONFIG.driveMs;
  game.tick(now);
  return now;
}

describe('red light', () => {
  test('turns green after the scheduled delay when nothing is pressed', () => {
    const game = newGame();
    expect(game.tick(RED_DELAY - 1)).toEqual([]);
    expect(game.state().phase).toBe('red');
    expect(game.tick(RED_DELAY)).toEqual(['green']);
    expect(game.state().phase).toBe('green');
  });

  test('a press during red is acknowledged as premature', () => {
    const game = newGame();
    expect(game.press(100)).toEqual(['premature']);
    expect(game.state().phase).toBe('red');
  });

  test('a press during red postpones green to a quiet period after it', () => {
    const game = newGame();
    game.press(1500);
    expect(game.tick(RED_DELAY)).toEqual([]);
    expect(game.tick(2499)).toEqual([]);
    expect(game.tick(2500)).toEqual(['green']);
  });

  test('an early press does not postpone a green already scheduled later', () => {
    const game = newGame();
    game.press(100); // 100 + quietMs = 1100, before the scheduled 1750
    expect(game.tick(1749)).toEqual([]);
    expect(game.tick(RED_DELAY)).toEqual(['green']);
  });

  test('mashing keeps the light red until the mashing stops', () => {
    const game = newGame();
    let lastPress = 0;
    for (let t = 300; t <= 6000; t += 300) {
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
    game.tick(RED_DELAY);
    expect(game.press(2000)).toEqual(['launch']);
    expect(game.state().phase).toBe('driving');
  });

  test('presses during the drive are ignored', () => {
    const game = newGame();
    game.tick(RED_DELAY);
    game.press(2000);
    expect(game.press(3000)).toEqual([]);
    expect(game.state().phase).toBe('driving');
  });

  test('drive progress goes from 0 to 1 over the drive duration', () => {
    const game = newGame();
    expect(game.driveProgress(1000)).toBe(0);
    game.tick(RED_DELAY);
    game.press(2000);
    expect(game.driveProgress(2000)).toBe(0);
    expect(game.driveProgress(4500)).toBe(0.5);
    expect(game.driveProgress(99999)).toBe(1);
  });

  test('the next round starts when the drive completes', () => {
    const game = newGame();
    game.tick(RED_DELAY);
    game.press(2000);
    expect(game.tick(2000 + CONFIG.driveMs)).toEqual(['arrived', 'roundStarted']);
    expect(game.state()).toEqual({ phase: 'red', round: 1 });
  });
});

describe('session end', () => {
  test('the session ends after the configured number of rounds', () => {
    const game = newGame();
    let now = 0;
    for (let i = 0; i < CONFIG.rounds - 1; i++) {
      now = playRound(game, now);
      expect(game.state().phase).toBe('red');
    }
    while (game.state().phase === 'red') {
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
