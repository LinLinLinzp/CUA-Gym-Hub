# Wayfair — build brief

- Real product: Wayfair (https://www.wayfair.com). Mock directory: `websites/wayfair_mock`.
- Scenario: 生活消费; tier B (supporting site).
- Must-have workflows (each is P0/P1 and must persist structured records): orders, delivery scheduling, damage claims, returns.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5313 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
