# Isaac's games

Small, calm, keyboard-driven web games for a toddler (27 months at project
start). Before making design decisions, read:

- `working-notes.md` — current state, decisions, open questions, session log.
  Update it before the session ends.
- `docs/initial-discussion.md` — design philosophy and research grounding.

## Commands

- `npm run dev` — dev server
- `npm run test` / `npm run test:ci` — Vitest
- `npm run typecheck`, `npm run lint`, `npm run build`

## Structure

Multi-page Vite app: `index.html` is the launcher, each game gets its own
`<game>.html` page and `src/<game>/` directory.

Within a game, `src/<game>/core/` is the pure layer: game rules and scenery
generation, deterministic, no DOM, no audio. Time comes in through `now`
arguments, randomness through injected RNGs. Core is unit-tested and must not
import the render/audio/main layers (enforced by ESLint). Render and audio
react to events returned by the core; they never drive the state.

## Design rules (details in docs/initial-discussion.md §16)

- The child's only input is "any keyboard key". Mouse clicks are parent-only
  gates (start, restart).
- Calm and short: no scores, streaks, timers, or difficulty progression.
- Success triggers an intrinsic consequence in the game world; errors get a
  small neutral acknowledgement, never punishment.
- Novelty comes from generated scenery and consequences, not harder rules.

Deploys to GitHub Pages (`games.f4t.dev`) on push to main.
