/**
 * Synthesized sound effects for Ready… Go! — Web Audio only, no samples.
 * Everything is quiet and soft by design: the premature-press "bup" is a
 * small neutral acknowledgement, never startling (see initial-discussion.md
 * on asymmetric feedback).
 *
 * Call unlock() from a user gesture before the first sound; browsers refuse
 * to start audio otherwise.
 */

import type { GameEvent } from './core/game';

export interface Audio {
  unlock(): void;
  onEvent(event: GameEvent): void;
}

export function createAudio(): Audio {
  let ctx: AudioContext | null = null;
  let master: GainNode | null = null;

  function unlock(): void {
    if (!ctx) {
      ctx = new AudioContext();
      master = ctx.createGain();
      master.gain.value = 0.5;
      master.connect(ctx.destination);
    }
    void ctx.resume();
  }

  interface Tone {
    type: OscillatorType;
    from: number; // Hz
    to?: number; // Hz, glide target
    duration: number; // seconds
    gain: number;
    delay?: number; // seconds
    lowpass?: number; // Hz
  }

  function play(tone: Tone): void {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime + (tone.delay ?? 0);
    const osc = ctx.createOscillator();
    osc.type = tone.type;
    osc.frequency.setValueAtTime(tone.from, t0);
    if (tone.to !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(tone.to, t0 + tone.duration);
    }
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(tone.gain, t0 + 0.015);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + tone.duration);
    let head: AudioNode = osc;
    if (tone.lowpass !== undefined) {
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = tone.lowpass;
      head.connect(filter);
      head = filter;
    }
    head.connect(env);
    env.connect(master);
    osc.start(t0);
    osc.stop(t0 + tone.duration + 0.05);
  }

  function bup(): void {
    play({ type: 'sine', from: 160, to: 110, duration: 0.09, gain: 0.18 });
  }

  function ding(): void {
    play({ type: 'triangle', from: 880, duration: 0.18, gain: 0.14 });
    play({ type: 'triangle', from: 1320, duration: 0.22, gain: 0.07, delay: 0.03 });
  }

  function vroom(): void {
    play({ type: 'sawtooth', from: 65, to: 190, duration: 0.8, gain: 0.3, lowpass: 420 });
    play({ type: 'square', from: 55, to: 120, duration: 0.6, gain: 0.1, lowpass: 260 });
  }

  // C major pentatonic around C5; a short random rising phrase per arrival.
  const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0];

  function arrivalChime(): void {
    const start = Math.floor(Math.random() * 2);
    for (let i = 0; i < 3; i++) {
      const note = PENTATONIC[Math.min(start + i, PENTATONIC.length - 1)];
      play({ type: 'triangle', from: note, duration: 0.3, gain: 0.12, delay: i * 0.13 });
    }
  }

  function lullaby(): void {
    // A slow descending phrase: the day is over.
    const notes = [783.99, 659.25, 587.33, 523.25];
    for (const [i, note] of notes.entries()) {
      play({ type: 'sine', from: note / 2, duration: 1.1, gain: 0.1, delay: i * 0.55 });
    }
  }

  return {
    unlock,
    onEvent(event) {
      if (event === 'premature') bup();
      else if (event === 'green') ding();
      else if (event === 'launch') vroom();
      else if (event === 'arrived') arrivalChime();
      else if (event === 'sessionEnded') lullaby();
    },
  };
}
