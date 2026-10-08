# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tipeando — a Spanish-language typing game built around Argentina's national routes (Rutas Nacionales). Players select a route on a hand-rendered Canvas 2D map and type the names of the cities along it in order, tracking WPM/accuracy/combo stats. No backend; all progress and preferences persist to `localStorage`. Desktop only: touch-only devices (`DeviceSupport.ts`, `(pointer: coarse) and (hover: none)`) never boot the app and see a CSS-only sign instead.

## Commands

- `yarn start` — dev server on port 1234 (HTTP)
- `yarn start-vite-ssl` — dev server on port 443 with HTTPS, using certs in `certificates/` (requires `certificates/localhost-key.pem` and `certificates/localhost.pem`; falls back to HTTP with a warning if missing)
- `yarn build` — type-checks (`tsc --noEmit`, via `tsconfig.json`) then builds with Vite
- `yarn preview` — preview the production build

There is no test suite and no linter configured in this repo. `yarn build` is the closest thing to a correctness check (TypeScript with `noUnusedLocals`/`noUnusedParameters` enabled).

## Architecture

### Entry point and composition root

`src/js/main.ts` is a deliberately tiny entry: it shows the `LoadingManager` intro, starts downloading the route geometry blob, and dynamically imports `src/js/app/MainApplication.ts`. `MainApplication` is the single composition root: it constructs every controller/coordinator and wires them together by hand (no framework, no DI container). `window.app` exposes the instance for debugging. Read `MainApplication` first when tracing how a feature connects end-to-end.

The repo also builds two standalone content pages that must **not** import the game: `por-que-tipear.html` (`src/views/por_que_tipear.pug`, `src/js/info/`) and the interactive essay `ensayo.html` (`src/views/ensayo.pug`, `src/js/essay/`). Both are extra Rollup inputs in `vite.config.ts` and share `src/styles/info.scss` plus the Pug partials in `src/views/partials/`.

### Data flow: JSON → controllers → map/UI

Static game data lives under `src/assets/data/` as build-time-imported JSON (not fetched at runtime), except the `routes_render.bin` geometry blob, which is fetched once at boot:
- `routes.json` — route metadata plus an ordered `cities: string[]` of city ids (ids per route, in traversal order); see `data/README.md` for the full schema
- `cities.json` — a **shared, deduplicated city catalog** (cities can belong to multiple routes)
- `routes_render.json` + `routes_render.bin` — simplified, quantized route geometry (see below)

`RoutesController` (`src/js/RoutesController.ts`) loads `routes.json` and `cities.json` at `init()` time, resolving each route's city ids against the shared catalog into `Route`/`City` domain objects (`src/js/Route.ts`, `src/js/City.ts`), and builds lookup maps (`routeCityIdsMap`, `cityRoutesMap` for "which routes pass through this city"). It also probes `/images/routes/RN{n}.webp` existence per route (used for the menu preview card) and exposes GeoJSON `FeatureCollection`s consumed by the map. Route geometry itself comes from the binary blob loaded by `src/js/data/RouteGeometryStore.ts`.

The raw DNV (Argentina's road authority) GeoJSON export lives at `data/raw/national_routes_geometries.json` and is transformed offline by `data/build_national_routes.py` (route metadata) and `data/simplify_geometries.py` (the render geometry); cities are added manually afterward. Neither script is part of the app build. `data/validate_data.py` checks the checked-in `routes.json`/`cities.json`/`routes_render.json` for id/reference integrity — see `data/README.md`.

`MapController` (`src/js/map/MapController.ts`) owns the map canvas: camera (`MapCamera`, `MercatorProjection`), drawing (`MapRenderer`, `SeaRenderer`, `CountryOutline`, all Canvas 2D), hit testing via a single offscreen pick buffer (`PickBuffer`, so hover priority is just draw order) and pointer interaction. It replaced an earlier MapLibre GL implementation with the same public API; there is no map library dependency anymore. It emits DOM `CustomEvent`s (`route-selected`, `city-selected`) on the map canvas rather than taking callbacks directly — consumers call `map_controller.addEventListener(...)`.

### Game state machine

`Game` (`src/js/Game.ts`) extends `EventTarget` and holds the authoritative state (`GameState.MENU | COUNTDOWN | PLAYING | PAUSED`, see `src/js/GameState.ts` for the `ALLOWED_TRANSITIONS` table — `setState` rejects invalid transitions). `Game` delegates character-by-character matching to `TypingController` (`src/js/TypingController.ts`), which is deliberately decoupled: it only knows about a `target` string and dispatches `target-set` / `progress` / `mistake` / `near-miss` / `city-complete` events. `Game` listens for `city-complete` to advance to the next city and dispatches its own `city-visited` / `route-complete` events.

### Orchestration layer

`GameFlowCoordinator` (`src/js/app/GameFlowCoordinator.ts`) is the largest class and the glue between `Game`, `MapController`, `RoutesController`, `GameUiPresenter`, `ModalController`, and `UserStats`. It has no DOM/map internals of its own; it only reacts to events from the pieces above and:
- computes live run stats (gross/net WPM, accuracy, combo) from raw `Game`/`TypingController` events,
- projects city coordinates onto the route geometry (`src/js/utils/GeometryUtils.ts`: `buildRouteMetrics` / `projectPointOnRoute` / `interpolateOnRoute`) so the progress marker moves smoothly *along the road* as the player types, rather than jumping city-to-city,
- persists best-run records via `UserStatsStorage` and triggers the route-complete modal.

If you're adding a new stat or changing how progress is tracked, this is almost always the file to touch — avoid pushing stat logic into `Game` or `MapController`.

### UI rendering (no framework)

`GameUiPresenter` (`src/js/ui/GameUiPresenter.ts`) and `ModalController` (`src/js/ui/ModalController.ts`) are manual DOM-manipulation classes (`querySelector` + `textContent`/`classList`), not components. They expose `on*Requested`/`on*Input` registration methods and `render*` methods; `GameFlowCoordinator` is the only caller. There's no virtual DOM or reactivity — every UI update is an explicit imperative call from the coordinator.

### Typing input and accents

During a run, keystrokes reach `TypingController` through a hidden, always-focused `<input>` (`.game-playing__keyboard-focus-target`), wired by `bindTextInput` in `src/js/input/TextInputForwarder.ts` (the essay widgets reuse it). It ignores in-progress IME composition (dead keys such as `´`+vowel or ⌥N+N), forwards the composed text once on `compositionend` (deduping Safari's trailing `input`), and routes `insertReplacementText` (macOS press-and-hold accent picker) to `TypingController.handleReplacement`. `KeyboardInputCoordinator` handles non-text keys (restart, Escape, countdown skip) and only forwards characters when no editable element is focused.

The target is the city's display `name` (NFC, e.g. `Cañuelas`), not the plain `typing` field. Matching folds case, accents and `ñ`→`n` via `src/js/utils/TextFolding.ts` by default; the optional strict mode (Settings → "Tildes y ñ obligatorias", persisted by `GameplayPreferencesStorage` under `typing-routes.gameplay.v1`) requires exact letters, and typing only the base letter of an accented one is a `near-miss` (no progress, no mistake). `typed` always accumulates the *expected* characters, so the display shows correct accents regardless of input. `name` folded equals `typing` for every city, so lengths line up.

### Persistence

`UserStatsStorage` (`src/js/app/UserStatsStorage.ts`) reads/writes a single `localStorage` key (`typing-routes.user-stats.v2`) holding a versioned JSON snapshot; only the current shape (`USER_STATS_VERSION`) is accepted, anything else resets to empty stats. The key itself was bumped to `.v2` when route/city ids were rewritten (see `data/README.md`), since old snapshots held ids that no longer resolve to anything — treat a future id rewrite the same way rather than trying to migrate stale ids forward. When changing `UserStats`'s snapshot shape without an id rewrite, bump `USER_STATS_VERSION` instead and add a migration path. `UserStats` (`src/js/UserStats.ts`) itself is a plain in-memory model (`Set`/`Map`-backed) with a `toSnapshot`/`fromSnapshot` pair — it has no knowledge of `localStorage`.

Preferences are deliberately stored under their own keys, never folded into the stats snapshot: `AudioPreferencesStorage` (`typing-routes.audio.v1`), `GameplayPreferencesStorage` (`typing-routes.gameplay.v1`) and `AchievementsStorage`. Follow the same pattern (versioned snapshot, try/catch, defaults) for any new preference.

### Views and styling

Views are Pug templates (`src/views/`), compiled at dev/build time by a custom Vite plugin in `vite.config.ts` (`pugHtmlTemplate`) that looks for a `<template data-type="pug" data-src="...">` marker in each HTML entry (`index.html`, `por-que-tipear.html`, `ensayo.html`) and inlines the rendered HTML — a new page needs both that one-line HTML shell and a Rollup input in `vite.config.ts`. Styles are SCSS under `src/styles/`, split into `common/` (colors, mixins, fonts, buttons) and `components/` (one partial per UI section), aggregated in `src/styles/main.scss`.

### Settings

`src/js/Settings.js` is a plain JS singleton (typed via the hand-written `src/js/Settings.d.ts` ambient declaration) holding map/game tuning constants: map center/zoom/bounds, zoom-dependent widths/radii and hitboxes for routes and cities, color states (default/hovered/selected/visited), star-rating thresholds, audio (volumes, cues, key-pack unlocks) and route-selection fly-to zoom thresholds. Prefer adding new tunables here over hardcoding them in controllers.

## Conventions worth knowing

- Class fields and most local variables use `snake_case` in the older files (`Game`, `MainApplication`) but newer additions (`GameFlowCoordinator`, `GeometryUtils`, `UserStats`) use `camelCase` — match the style of the file you're editing rather than mixing conventions within it.
- Cross-module communication favors DOM `CustomEvent`s / `EventTarget` over direct method calls or callbacks wherever two pieces shouldn't be tightly coupled (`Game`, `MapController`, `TypingController` all extend or wrap `EventTarget`).
- Route/city id formats: routes are `rn-<n>` with no zero padding (e.g. `rn-3`); city ids are `<province-slug>/<city-slug>`, both kebab-case ASCII (e.g. `buenos-aires/la-plata`) — see `data/README.md` for the full id rules. `route_number`/`route_name` are derived from the route id at load time in `RoutesController`, not stored; display names are formatted on the fly via `formatRouteDisplayName`/`sanitizeRouteNumber` helpers (prefix `RN`) rather than stored pre-formatted.
