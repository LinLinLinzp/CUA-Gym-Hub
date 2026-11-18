# Loom — build brief

- Real product: Loom (https://www.loom.com). Mock directory: `websites/loom_mock`.
- Scenario: 组织办公; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): videos, folders, comments.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5407 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
