# Harbor runtime contract for mocks

Mocks in this fork are packaged into single-container Harbor tasks
(`factory/runtime`): every site's built `dist/` is served offline under its real
domain, an agent drives a headless browser, and a Python verifier reads the
state the site persisted. High visual and functional fidelity (see
`.claude/agents/*.md`) is still the goal; this file adds what the runtime needs.
Every rule below comes from a real failure in an existing mock.

## 1. State: load, save, never on its own

- Use `templates/dataManager.js` unchanged (`src/utils/dataManager.js`) and
  `templates/state-api.js` in `vite.config.js`. Defaults live in
  `src/data/seed.js` as `createInitialData()` with fixed ids.
- On boot: `await loadState(APP, createInitialData)` before rendering routes (it pushes one
  baseline `set` to the server);
  render a neutral loading state until it resolves.
- Every **user-driven** change calls `saveState(APP, newState)` with the whole
  state. Wire it once in the store (e.g. `useEffect` on state after load, or in
  the reducer wrapper), not per component.
- **Nothing may change state without a user action**: no `setInterval`/tickers,
  live prices, random notifications or "simulated activity" written into state.
  If the real product shows live data, derive it at render time from fixed data.
  (Idle tabs that keep posting overwrite newer state from other tabs.)
- Every business action leaves a **structured record** a verifier can read:
  ids, status, amounts as numbers or 2-decimal strings, quantities, actor,
  `createdAt` from `new Date().toISOString()`, links to related ids. A toast or a
  timeline sentence alone is not enough (e.g. a refund records its line items,
  quantities and amounts).
- Keep `/go`-observable state JSON-serialisable; no functions, Dates or Maps.

## 2. Must render any injected world

- Tasks inject their own state via `/state`: arrays replace defaults, objects
  merge. The app must render with empty arrays, a single record, hundreds of
  records, and missing optional fields — no crashes, no `undefined.filter`.
- All routes sit inside every provider they use (toast, theme, store). Visiting
  `/`, any deep link, and a hard reload on any route must work.
- Use `withSid()` for internal links that leave the SPA router; React Router
  navigation must keep `?sid=`.
- Dates shown relative to "now" must use `new Date()` (the runtime freezes the
  clock per task); never hard-code "today".

## 3. Offline and real

- No network at runtime: no Google Fonts/CDN links, no remote images
  (picsum, pravatar, unsplash, placehold.co …), no remote scripts or maps.
  Use `@fontsource/*` packages or system font stacks, local files under
  `public/`, or generated SVG/data-URI images.
- Real brand name, logo text, colours and UI copy; never "Mock", "Clone" or an
  invented brand in the UI or `<title>`.
- `npm run build` passes; `package-lock.json` is committed; the app runs from the
  built `dist/` with only the state API (no dev-only code paths).

## 4. Document what a verifier can read

`SCHEMA.md` lists every top-level key and record shape, and the **Observable
State Changes** table maps each user action to the exact fields it writes. Keep
it in sync with the code; verifiers are written from it.

## Acceptance

`python3 factory/hub_tools/dyn_certify.py <site>` must pass (renders, syncs, idle
tab posts nothing), plus every workflow listed in the site's `SEED.md` must be
exercised by the playwright agent and shown in `TEST.md` with the state fields it
changed.
