# Toast — build brief

- Real product: Toast (https://www.toasttab.com). Mock directory: `websites/toast_mock`.
- Scenario: 产业运营; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): menus, orders, labor, refunds.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5459 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
