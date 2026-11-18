# Coursera — build brief

- Real product: Coursera (https://www.coursera.org). Mock directory: `websites/coursera_mock`.
- Scenario: 文化内容; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): enrollments, assignments, certificates.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5370 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
