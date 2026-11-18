# NetSuite — build brief

- Real product: NetSuite (https://acme.app.netsuite.com). Mock directory: `websites/netsuite_mock`.
- Scenario: 产业运营; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): sales orders, POs, inventory, invoices.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5447 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
