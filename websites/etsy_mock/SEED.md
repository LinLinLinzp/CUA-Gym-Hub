# Etsy — build brief

- Real product: Etsy (https://www.etsy.com). Mock directory: `websites/etsy_mock`.
- Scenario: 生活消费; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): buy, messages to shops, cases/returns, favorites.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5312 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
