# Udemy — build brief

- Real product: Udemy (https://www.udemy.com). Mock directory: `websites/udemy_mock`.
- Scenario: 文化内容; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): courses, Q&A, instructor dashboard.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5372 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
