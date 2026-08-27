# Working notes

This file tracks progress, decisions, and open questions across work sessions.
Read it at the start of each session to get up to speed. Update it before the
session ends. Design context and research grounding live in
`docs/initial-discussion.md`; read that too before making design decisions.

## Current state (2026-08-24)

Ready… Go! is playable and survived its first child playtest (Isaac loved
it). The project is scaffolded (TypeScript + Vite + Vitest + ESLint,
mirroring `busser/naturalchimie`), tested, and deploys to GitHub Pages
(`busser/isaac-games`, `games.f4t.dev`) on push to main. The core state
machine is unit-tested, and the game was verified end to end in headless
Chromium after each batch of changes.

Waiting on: the next playtest with the child, now that the post-playtest
improvement batch (drive-in rounds, scene features, animal calls, sleeping
animals) is in.

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
- **Red delay range: 0.5–2 s, counted from the stop** (2026-08-24, after
  the child playtest). Each round now opens with the vehicle driving in
  from the left and stopping at the red light (~2.3 s); the random red
  delay starts when the car stops, not when the round begins. The drive-in
  carries most of the wait and acts out the causal story (the car stops
  *because* of the light), so the delay on top is short. History: the
  initial discussion said 0.5–3 s; Arthur found that too short and
  proposed 5–10 s; we compromised on 2–6 s; the drive-in replaced most of
  that.
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
- **Kiosk wrapper (2026-08-27):** Isaac's accidental trackpad touches
  triggered OS gestures (three-finger swipes → Spaces/Mission Control) that
  no browser can block. `mac-app/` holds a native macOS wrapper: a fullscreen
  `WKWebView` on `games.f4t.dev` with `NSApplication.presentationOptions`
  kiosk mode (Cmd-Tab, Spaces/Mission Control gestures, force quit, and log
  out are suppressed while frontmost). Parent exit: hold Escape 3 s (progress
  bar shows; was Cmd-Q at first). Known accepted risk: a toddler leaning on
  Escape for 3 s quits the app, same tradeoff as the space-bar restart. Cursor auto-hides after 3 s idle. URL only, no bundled/offline
  build — a deliberate decision. Build with `mac-app/build.sh`, install by
  copying `IsaacGames.app` to /Applications.

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
- Tuning after playtests: drive-in duration (2.3 s), red-delay range
  (0.5–2 s from the stop), quiet period (1 s), drive duration (5 s), round
  count (8), feature/sky-event frequencies.

## Next steps

1. Playtest the improvement batch with the child; feed observations back
   into this file.
2. When Ready… Go! is validated, start Where Did He Hide? (game 2).

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
- **2026-08-24 (Arthur's second feedback):** Reverted the launch sound to
  the original simple vroom — Arthur preferred it (noted in `audio.ts` so it
  doesn't get "improved" again). Every round now has exactly one animal, and
  trees and the animal are dealt shuffled slots of the grass strip (jitter
  bounded by each occupant's width) so they can no longer overlap; a test
  checks 400 generated rounds for animal–tree clearance.
- **2026-08-24 (after the first child playtest):** Big improvement batch,
  all Arthur-approved. (1) Rounds now open with the vehicle driving in from
  the left and decelerating to a stop at the red light; the red timer
  starts at the stop (see the red-delay decision above). A press during the
  drive-in counts as premature. (2) On a premature press the red lamp
  flares (mirror of the green pulse) so the light visibly answers the
  press; the car rock and "bup" stay. (3) Per-round scene features, at most
  one per round and none on ~45%: a river under a plank bridge (wheels
  clonk; a duck always sits at the water's edge), a tunnel hill the vehicle
  disappears into, or a road puddle it splashes through. (4) Some rounds
  get a second animal; each hops in turn as the vehicle passes. (5) Soft
  synthesized animal calls when the vehicle passes an animal (rabbit gets a
  boing — rabbits are quiet). (6) Rare sky events: a gliding bird or a
  faint rainbow. (7) On the night scene, the animals visibly sleep: lying
  down, closed eyes, breathing, drifting z's — it is not just night, it is
  bedtime. Mechanics: the renderer returns per-frame "scene cues" that main
  forwards to audio (only the renderer knows screen positions; audio stays
  decoupled); grass placement now subtracts feature-blocked stretches and
  deals whole slots per remaining segment. A `?seed=` URL parameter pins
  the scenery for reproducing a scene. Verified with headless-Chromium
  screenshots of every feature, the flare, and the sleeping-animal night.
- **2026-08-25:** Removed the tunnel feature. It looked off on screen and
  there was no easy way to make it look good. Features are now river or
  puddle; the tunnel's probability share went to feature-less rounds (~60%
  of rounds now have no feature).
- **2026-08-27:** Smooth day reset. Holding space on the night scene used to
  cut straight to the new morning. Now the last night frame is snapshotted
  to an offscreen canvas and drawn over the fresh scene with decaying alpha
  (2 s, eased so the night lingers before the morning brightens through).
  The cross-fade lives in `main.ts` because the renderer is per-session;
  the fade is the only thing that spans two sessions.
- **2026-08-27 (later):** Built the macOS kiosk wrapper (`mac-app/`, see the
  Environment section) after Isaac's trackpad touches kept triggering OS
  gestures. Compiles clean; not yet launched — the first real launch is
  Arthur's, since the app takes over the screen.
