# Medicare.gov — build brief

- Real product: Medicare.gov (https://www.medicare.gov). Mock directory: `websites/medicare_gov_mock`.
- Scenario: 公共事务; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): plan compare, claims, enrollment.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5513 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
