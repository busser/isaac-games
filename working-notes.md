# Working notes

This file tracks progress, decisions, and open questions across work sessions.
Read it at the start of each session to get up to speed. Update it before the
session ends. Design context and research grounding live in
`docs/initial-discussion.md`; read that too before making design decisions.

## Current state (2026-08-24)

Ready… Go! is playable. The project is scaffolded (TypeScript + Vite + Vitest
+ ESLint, mirroring `busser/naturalchimie`), tested, and deploys to GitHub
Pages (`busser/isaac-games`, `games.f4t.dev`) on push to main. The core state
machine is unit-tested, and the game was verified end to end in headless
Chromium: red wait, premature-press rock, green, drive, eight rounds, night
wind-down, parent-click restart.

Waiting on: the `games.f4t.dev` DNS record (Arthur), and a real playtest with
the child.

## Scope

Build order:

1. **Ready… Go!** (inhibitory control) — build first, learn from real use.
2. **Where Did He Hide?** (working memory for location) — build second.

**The Strange Machine** (causal reasoning) is shelved. Two reasons: its
press/don't-press mechanic rewards indiscriminate pressing as much as genuine
rule inference, and it costs much more to implement than the other two.

## Decisions

### Game design

- **Game 1 anti-mashing rule:** pressing during red invisibly postpones green.
  Green appears only after a short quiet period with no presses (on the order
  of 1 second) on top of the scheduled random delay. This makes waiting
  load-bearing: mashing can no longer launch the vehicle at green onset.
- **Red delay range: 2–6 s** (2026-08-24). The initial discussion said
  0.5–3 s; Arthur found that too short after trying the game and proposed
  5–10 s. Claude pushed back (the research framing wants a small inhibition
  demand, not endurance) and we compromised on 2–6 s pending a playtest with
  the child.
- **No visible countdown or refill bar during red.** Three reasons: a bar that
  refills on press makes the error salient and could itself become a fun toy
  (press → bar moves is a contingent effect, which rewards pressing during
  red); a progress-bar abstraction is likely unreadable at 27 months; a
  visible countdown makes green predictable, which turns the task from
  inhibition into anticipatory timing. The steady red light is the only
  signal. Revisit if testing shows confusion about why green is "slow."
- **Game 2 selector timing:** each bush glows for a generous window
  (~1.5–2.5 s, tune with the child) and the scan loops indefinitely, so there
  is no failure state, only eventual success.
- **Session shape:** each game has a natural soft ending (for example, after
  ~8–10 successes the scene winds down calmly). Starting a new session
  requires a parent-only keyboard combination. This timeboxes play naturally.
- All other design constraints are in `docs/initial-discussion.md` section 16
  (keyboard-only input, calm tone, asymmetric feedback, no scores, no
  difficulty progression).

### Technical

- **Stack:** TypeScript + Vite, Canvas rendering, Web Audio API for
  synthesized sounds. No game framework. Vitest for tests, ESLint for linting.
- **Sound:** no spoken words. Synthesized sounds first; free-to-use sound
  bites are a fallback.
- **Art:** procedural/geometric, drawn in code. No asset pipeline.
- **Build + CI + hosting:** mirror `busser/naturalchimie` (GitHub repo). That
  repo has: `package.json` scripts (`dev`, `build` = `tsc --noEmit && vite
  build`, `test`, `test:ci`, `typecheck`, `lint`), a
  `.github/workflows/deploy.yml` that runs typecheck + lint + tests + build
  and deploys `dist/` to GitHub Pages on push to main, Renovate config, and a
  `version.json` emit plugin in `vite.config.ts`. Hosted on a subdomain of
  `f4t.dev` (naturalchimie is at `alchimie.f4t.dev`).

### Environment (from initial discussion)

- Games run in a browser on the wife's MacBook, in a dedicated standard macOS
  account for the child. That account is the real security boundary.
- Known accepted risk: hardware keys (function row volume/brightness, Touch
  ID/power key) cannot be captured by the browser. Nothing to do about it.

### Resolved (2026-08-24)

- Repo: `busser/isaac-games`, public. Domain: `games.f4t.dev`.
- App structure: multi-page Vite app; `index.html` launcher + one
  `<game>.html` per game; per-game `src/<game>/` with a pure `core/` layer
  (unit-tested, no DOM) and render/audio layers reacting to core events.
- Parent gate: a click on the start overlay begins the first session (also
  unlocks audio and requests fullscreen). Restarting from the night scene
  requires holding the space bar for 3 seconds (a subtle progress ring shows
  bottom-right); a click was rejected as too easy to trigger with an
  accidental trackpad tap. Known caveat: a toddler leaning on the space bar
  for 3 s restarts too — accepted, since the consequence is just a new
  session.
- Soft ending: 8 rounds; the sky moves morning → dusk across the session,
  then fades into a starry night with moon and fireflies. The wind-down is
  scenery, not a message.

## Open questions

- Keyboard Lock API (capture Escape and system combos in fullscreen): not
  implemented yet; decide after the first real playtests.
- Tuning after playtests: red-delay range (0.5–3 s), quiet period (1 s),
  drive duration (5 s), round count (8).

## Next steps

1. Arthur adds the DNS record: CNAME `games.f4t.dev` → `busser.github.io`.
2. Playtest with the child; feed observations back into this file.
3. When Ready… Go! is validated, start Where Did He Hide? (game 2).

## Session log

- **2026-08-24:** Aligned on design doc. Shelved The Strange Machine. Decided
  anti-mashing rule (invisible green postponement, no countdown bar), stack,
  hosting approach, and session shape. Wrote this file.
- **2026-08-24 (later):** Scaffolded the project, built Ready… Go! (core
  state machine + canvas renderer + synthesized audio), 15 unit tests,
  verified end to end in headless Chromium including the night scene and
  restart. Created `busser/isaac-games`, enabled GitHub Pages with the
  custom domain.
- **2026-08-24 (Arthur's first feedback):** DNS is live. Fixed the moon (a
  real crescent sprite instead of a dark disc over the bright one), raised
  the red delay to 2–6 s, added five more animals (cow, pig, dog, rabbit,
  duck — kinds rotate per round like vehicles), replaced the click restart
  with the 3 s space-bar hold, and gave the launch sound a proper double-rev
  engine (detuned saws + lowpass + noise rumble).
