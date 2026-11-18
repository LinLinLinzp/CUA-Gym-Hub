# Vimeo — build brief

- Real product: Vimeo (https://vimeo.com). Mock directory: `websites/vimeo_mock`.
- Scenario: 文化内容; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): videos, showcases, privacy, review comments.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5360 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
