# PandaDoc — build brief

- Real product: PandaDoc (https://app.pandadoc.com). Mock directory: `websites/pandadoc_mock`.
- Scenario: 专业事务; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): proposals, pricing tables, signatures.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5421 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
