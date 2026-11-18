# Square Dashboard — build brief

- Real product: Square Dashboard (https://squareup.com). Mock directory: `websites/square_dashboard_mock`.
- Scenario: 产业运营; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): items, orders, refunds, payouts.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5458 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
