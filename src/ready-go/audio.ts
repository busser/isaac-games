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
import type { AnimalKind } from './core/scenery';
import type { SceneCue } from './render';

export interface Audio {
  unlock(): void;
  onEvent(event: GameEvent): void;
  /** A scene moment reported by the renderer (see SceneCue). */
  onCue(cue: SceneCue): void;
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
    vibrato?: { hz: number; depth: number }; // pitch wobble, depth in Hz
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
    if (tone.vibrato !== undefined) {
      const lfo = ctx.createOscillator();
      lfo.frequency.value = tone.vibrato.hz;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = tone.vibrato.depth;
      lfo.connect(lfoGain);
      lfoGain.connect(osc.frequency);
      lfo.start(t0);
      lfo.stop(t0 + tone.duration + 0.05);
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

  /** A short filtered noise burst (splashes and other wet sounds). */
  function playNoise(duration: number, gain: number, bandHz: number): void {
    if (!ctx || !master) return;
    const t0 = ctx.currentTime;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = bandHz;
    filter.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0, t0);
    env.gain.linearRampToValueAtTime(gain, t0 + 0.02);
    env.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(env);
    env.connect(master);
    src.start(t0);
  }

  function bup(): void {
    play({ type: 'sine', from: 160, to: 110, duration: 0.09, gain: 0.18 });
  }

  function ding(): void {
    play({ type: 'triangle', from: 880, duration: 0.18, gain: 0.14 });
    play({ type: 'triangle', from: 1320, duration: 0.22, gain: 0.07, delay: 0.03 });
  }

  // A richer double-rev engine was tried and rejected: the simple version
  // below sounded better to the parent.
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

  // Soft caricatures of each animal's call, played as the vehicle passes.
  function animalCall(kind: AnimalKind): void {
    switch (kind) {
      case 'sheep':
        play({ type: 'sawtooth', from: 260, to: 200, duration: 0.45, gain: 0.1, lowpass: 1000, vibrato: { hz: 8, depth: 22 } });
        break;
      case 'cow':
        play({ type: 'sawtooth', from: 140, to: 95, duration: 0.8, gain: 0.12, lowpass: 350, vibrato: { hz: 5, depth: 8 } });
        break;
      case 'pig':
        play({ type: 'sawtooth', from: 150, to: 90, duration: 0.1, gain: 0.13, lowpass: 500 });
        play({ type: 'sawtooth', from: 165, to: 95, duration: 0.1, gain: 0.13, lowpass: 500, delay: 0.16 });
        break;
      case 'dog':
        play({ type: 'square', from: 220, to: 110, duration: 0.1, gain: 0.09, lowpass: 800 });
        play({ type: 'square', from: 240, to: 120, duration: 0.1, gain: 0.09, lowpass: 800, delay: 0.18 });
        break;
      case 'rabbit':
        // Rabbits are quiet; a springy boing matches the hop instead.
        play({ type: 'sine', from: 300, to: 650, duration: 0.18, gain: 0.09 });
        break;
      case 'duck':
        play({ type: 'sawtooth', from: 320, to: 240, duration: 0.16, gain: 0.1, lowpass: 1300 });
        play({ type: 'sawtooth', from: 300, to: 230, duration: 0.14, gain: 0.07, lowpass: 1300, delay: 0.2 });
        break;
    }
  }

  function bridgeClonks(): void {
    // Wheels on wooden planks: a few alternating clonks.
    for (const [i, delay] of [0, 0.14, 0.32, 0.46].entries()) {
      play({ type: 'triangle', from: i % 2 === 0 ? 190 : 155, duration: 0.09, gain: 0.14, lowpass: 700, delay });
    }
  }

  function puddleSplash(): void {
    playNoise(0.3, 0.12, 1400);
    play({ type: 'sine', from: 220, to: 80, duration: 0.14, gain: 0.1 });
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
    onCue(cue) {
      if (cue.kind === 'animalHop') animalCall(cue.animal);
      else if (cue.kind === 'bridge') bridgeClonks();
      else if (cue.kind === 'puddle') puddleSplash();
    },
  };
}
