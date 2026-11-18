# Zotero — build brief

- Real product: Zotero (https://www.zotero.org). Mock directory: `websites/zotero_mock`.
- Scenario: 专业事务; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): libraries, collections, citations.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5427 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
