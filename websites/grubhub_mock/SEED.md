# Grubhub — build brief

- Real product: Grubhub (https://www.grubhub.com). Mock directory: `websites/grubhub_mock`.
- Scenario: 生活消费; tier B (supporting site).
- Must-have workflows (each is P0/P1 and must persist structured records): orders, scheduled delivery, refunds.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5317 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
