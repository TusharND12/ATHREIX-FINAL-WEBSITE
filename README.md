# Athreix — scroll-driven 3D site

Phase 1 scaffold: the scroll choreography, running end to end with placeholder
geometry. The point is to get the timing and the mechanism right *before*
commissioning the 3D art, so the model gets built to a brief that is already
proven rather than guessed at.

## Run it

```bash
npm run dev     # http://localhost:3000
npm run build   # production build
npx tsc --noEmit && npx eslint .
```

## The one idea

There is **one 3D object, one scene, and one timeline**. Scroll position is the
playhead. Everything else — camera, explode, render mode, theme, accent colour —
is derived from a single 0..1 progress number.

```
scroll → Lenis → ScrollTrigger (scrub) → tl.progress(p) → sceneState → useFrame → scene
```

The canvas mounts once at app root and never unmounts. DOM sections scroll over
the top of it.

## Where things live

| File | Role |
| --- | --- |
| `lib/acts.ts` | **The scroll script.** Act order, `vh` pacing, copy, accent colours. Start here. |
| `components/core/timeline.ts` | The master GSAP timeline. Positions derive from `acts.ts`. |
| `components/core/sceneState.ts` | The plain object GSAP tweens and `useFrame` reads. |
| `components/core/buildPlaceholderCore.ts` | **Placeholder geometry — delete in Phase 2.** |
| `components/core/Rig.tsx` | Applies `sceneState` to the scene each frame. The only place the 3D world is mutated. |
| `components/core/Stage.tsx` | The fixed `<Canvas>`. |
| `components/SmoothScroll.tsx` | Lenis + ScrollTrigger + accent interpolation. |
| `components/ui/ApertureStage.tsx` | DOM layer registered to the projected 3D aperture. |
| `components/ui/Scrubber.tsx` | Timeline scrubber. Act boundaries are the tall ticks. |

## Tuning the feel

- **Pacing** — change `vh` in `lib/acts.ts`. The timeline re-times itself.
- **Weight** — `scrub` in `SmoothScroll.tsx`. Try `0.4` and `1.5` to feel the range.
- **Explode distance** — `EXPLODE_SPREAD` in `sceneState.ts`.
- **Theme palettes** — `THEME` in `sceneState.ts`. Drives materials *and* CSS vars together.

## What is verified working

All nine acts render correctly and in sync with their copy: hero, orbit,
explode, blueprint (line-art + light theme + accent), fly-in, three capability
acts (aperture stage, DOM demo registered to the 3D ring, per-section accent),
modular scatter, outro. The hero paints on a cold load in both dev and
production. Typecheck, lint and production build are clean.

The aperture registration is the piece most worth knowing works: `Rig` projects
the aperture ring into screen space each frame and writes `--ap-x` / `--ap-y` /
`--ap-r`, which the DOM layer consumes. It stays aligned across viewport sizes.

## Fixed: cold-load first paint

**Symptom.** On a hard load the canvas stayed blank until the first scroll
input. Every act was correct from then on, which made it look cosmetic.

**Cause.** react-three-fiber measures the `<Canvas>` container with a
ResizeObserver and only mounts the canvas *children* once it has a size. On a
cold load that first measurement never settled, so `Rig`'s function body was
never called and `useFrame` never ran — even though the `<canvas>` element
existed and the WebGL context came up fine, which is what made this misleading
to diagnose. Nothing on a static page resizes afterwards, so R3F never retried.
Scrolling only appeared to "fix" it because scrolling forces a reflow, which
finally fires the observer.

**Fix.** `Stage` dispatches the resize notification itself on mount
(synchronously, next frame, and at 120ms, to cover slow stylesheet and font
loads) instead of waiting for the user to scroll. See the comment in
`components/core/Stage.tsx` — verified against production builds, not just dev.

Two related changes were made while tracking this down. Neither was the cause,
but both are correct and are kept:

- the canvas container is sized with inline styles rather than Tailwind
  utilities, so the measured geometry does not depend on stylesheet timing
- the core is built per mount and attached with `scene.add` in an effect rather
  than via `<primitive>` with a module-level singleton — R3F cannot remount the
  same object instance, so the old shape was a latent StrictMode bug

**If it ever regresses**, test a hard reload at scroll 0 against a production
build (`npm run build && npm run start`) — this did not reproduce reliably in
dev alone. The tell is `document.documentElement.getAttribute('style')` being
`null`: `Rig` writes `--ap-x` / `--ap-y` / `--ap-r` there on every frame, so if
they are absent, `useFrame` never ran and the canvas children never mounted.

## Phase 2 — swapping in the real model

Replace `buildPlaceholderCore.ts` with a GLB loader producing the same
`CorePart[]` shape. Nothing else needs to change. The contract for the 3D artist:

- one top-level object per named part; names as in `PART_SPECS`
  (`ingest`, `embed`, `retrieve`, `infer`, `guard`, `orchestrate`, `observe`,
  `deploy`, `aperture`)
- each part's origin set to its own centroid
- `+Z` is the front face — the one the camera flies into
- model fits roughly within a 4-unit cube
- ≤ 150k triangles, GLB with Draco + meshopt, ≤ 4 MB
- a second GLB of baked edge geometry for the blueprint mode (generating
  `EdgesGeometry` at runtime on a model this size will jank the main thread)

## Not yet built (later phases)

Mobile/reduced path, the real capability demos and code panels, SVG leader lines
in the blueprint act, aperture ring colour segments, render-on-demand.
