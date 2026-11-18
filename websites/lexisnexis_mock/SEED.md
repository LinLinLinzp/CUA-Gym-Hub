# LexisNexis — build brief

- Real product: LexisNexis (https://advance.lexis.com). Mock directory: `websites/lexisnexis_mock`.
- Scenario: 专业事务; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): research folders, citations, alerts.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5418 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
