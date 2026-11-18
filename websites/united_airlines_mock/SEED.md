# United Airlines — build brief

- Real product: United Airlines (https://www.united.com). Mock directory: `websites/united_airlines_mock`.
- Scenario: 生活消费; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): bookings, seat changes, MileagePlus, travel credits.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5322 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
