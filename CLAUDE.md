# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Tipeando — a Spanish-language typing game built around Argentina's national routes (Rutas Nacionales). Players select a route on a map (MapLibre GL) and type the names of the cities along it in order, tracking WPM/accuracy/combo stats. No backend; all progress persists to `localStorage`.

## Commands

- `yarn start` — dev server on port 1234 (HTTP)
- `yarn start-vite-ssl` — dev server on port 443 with HTTPS, using certs in `certificates/` (requires `certificates/localhost-key.pem` and `certificates/localhost.pem`; falls back to HTTP with a warning if missing)
- `yarn build` — type-checks (`tsc --noEmit`, via `tsconfig.json`) then builds with Vite
- `yarn preview` — preview the production build

There is no test suite and no linter configured in this repo. `yarn build` is the closest thing to a correctness check (TypeScript with `noUnusedLocals`/`noUnusedParameters` enabled).

## Architecture

### Entry point and composition root

`src/js/main.ts` (`MainApplication`) is the single composition root: it constructs every controller/coordinator and wires them together by hand (no framework, no DI container). `window.app` exposes the instance for debugging. Read this file first when tracing how a feature connects end-to-end.

### Data flow: JSON → controllers → map/UI

Static game data lives under `src/assets/data/` as build-time-imported JSON (not fetched at runtime):
- `national_routes.json` — route metadata (id, number, name, length, road type)
- `national_cities.json` — a **shared, deduplicated city catalog** (cities can belong to multiple routes)
- `national_routes_cities.json` — per-route `city_refs: string[]` pointing into the shared catalog, in traversal order, plus optional `city_meta`
- `national_routes_geometries.json` — GeoJSON geometry per route

`RoutesController` (`src/js/RoutesController.ts`) loads and joins all four at `init()` time into `Route`/`City` domain objects (`src/js/Route.ts`, `src/js/City.ts`), and builds lookup maps (`routeCityIdsMap`, `cityRoutesMap` for "which routes pass through this city"). It also probes `/images/routes/RN{n}.webp` existence per route (used for the menu preview card) and exposes GeoJSON `FeatureCollection`s for the map layers.

The raw DNV (Argentina's road authority) GeoJSON export is transformed into these files offline by `data/build_national_routes.py`; cities are added manually afterward. This script is not part of the app build.

`MapController` (`src/js/MapController.ts`) owns the MapLibre GL instance and all map layers/sources (routes line layer, cities circle layer, progress marker). It renders from the `FeatureCollection`s produced by `RoutesController` and emits DOM `CustomEvent`s (`route-selected`, `city-selected`) on the map canvas rather than taking callbacks directly — consumers call `map_controller.addEventListener(...)`.

### Game state machine

`Game` (`src/js/Game.ts`) extends `EventTarget` and holds the authoritative state (`GameState.MENU | PLAYING | PAUSED`, see `src/js/GameState.ts` for the `ALLOWED_TRANSITIONS` table — `setState` rejects invalid transitions). `Game` delegates character-by-character matching to `TypingController` (`src/js/TypingController.ts`), which is deliberately decoupled: it only knows about a `target` string and dispatches `target-set` / `progress` / `mistake` / `city-complete` events. `Game` listens for `city-complete` to advance to the next city and dispatches its own `city-visited` / `route-complete` events.

### Orchestration layer

`GameFlowCoordinator` (`src/js/app/GameFlowCoordinator.ts`) is the largest class and the glue between `Game`, `MapController`, `RoutesController`, `GameUiPresenter`, `ModalController`, and `UserStats`. It has no DOM/map internals of its own; it only reacts to events from the pieces above and:
- computes live run stats (gross/net WPM, accuracy, combo) from raw `Game`/`TypingController` events,
- projects city coordinates onto the route geometry (`src/js/utils/GeometryUtils.ts`: `buildRouteMetrics` / `projectPointOnRoute` / `interpolateOnRoute`) so the progress marker moves smoothly *along the road* as the player types, rather than jumping city-to-city,
- persists best-run records via `UserStatsStorage` and triggers the route-complete modal.

If you're adding a new stat or changing how progress is tracked, this is almost always the file to touch — avoid pushing stat logic into `Game` or `MapController`.

### UI rendering (no framework)

`GameUiPresenter` (`src/js/ui/GameUiPresenter.ts`) and `ModalController` (`src/js/ui/ModalController.ts`) are manual DOM-manipulation classes (`querySelector` + `textContent`/`classList`), not components. They expose `on*Requested`/`on*Input` registration methods and `render*` methods; `GameFlowCoordinator` is the only caller. There's no virtual DOM or reactivity — every UI update is an explicit imperative call from the coordinator.

Typing input on mobile is handled via a hidden, always-focused `<input>` element (`.game-playing__keyboard-focus-target`) whose `input` events are forwarded character-by-character, plus `visualViewport` listening to detect when the on-screen keyboard is open and resize the playing panel accordingly (see `updateKeyboardViewportState` in `GameUiPresenter`).

### Persistence

`UserStatsStorage` (`src/js/app/UserStatsStorage.ts`) reads/writes a single `localStorage` key (`typing-routes.user-stats.v1`) holding a versioned JSON snapshot. It supports migrating older snapshot shapes forward (v1 legacy → v2 → v3); when changing `UserStats`'s snapshot shape, bump `USER_STATS_VERSION` and add a migration path rather than breaking old saves. `UserStats` (`src/js/UserStats.ts`) itself is a plain in-memory model (`Set`/`Map`-backed) with a `toSnapshot`/`fromSnapshot` pair — it has no knowledge of `localStorage`.

### Views and styling

Views are Pug templates (`src/views/`), compiled at dev/build time by a custom Vite plugin in `vite.config.ts` (`pugHtmlTemplate`) that looks for a `<template data-type="pug" data-src="...">` marker in `index.html` and inlines the rendered HTML — there's no `.pug` → route mapping beyond that single marker in `index.html`/`index.pug`. Styles are SCSS under `src/styles/`, split into `common/` (colors, mixins, fonts, buttons) and `components/` (one partial per UI section), aggregated in `src/styles/main.scss`.

### Settings

`src/js/Settings.js` is a plain JS singleton (typed via the hand-written `src/js/Settings.d.ts` ambient declaration) holding map/game tuning constants: map center/zoom/bounds, MapLibre source/layer IDs, route and city color states (default/hovered/selected/visited), and route-selection fly-to zoom thresholds. Prefer adding new tunables here over hardcoding them in controllers.

## Conventions worth knowing

- Class fields and most local variables use `snake_case` in the older files (`Game`, `main.ts`) but newer additions (`GameFlowCoordinator`, `GeometryUtils`, `UserStats`) use `camelCase` — match the style of the file you're editing rather than mixing conventions within it.
- Cross-module communication favors DOM `CustomEvent`s / `EventTarget` over direct method calls or callbacks wherever two pieces shouldn't be tightly coupled (`Game`, `MapController`, `TypingController` all extend or wrap `EventTarget`).
- Route/city id formats: routes are `rn-XXXX` (matches `RawRoute.id`), city ids look like `rn{n}-XXX`; display names are formatted on the fly via `formatRouteDisplayName`/`sanitizeRouteNumber` helpers (strip leading zeros, prefix `RN`) rather than stored pre-formatted.
