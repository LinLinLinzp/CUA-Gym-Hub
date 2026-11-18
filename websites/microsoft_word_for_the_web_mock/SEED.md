# Microsoft Word for the web — build brief

- Real product: Microsoft Word for the web (https://word.cloud.microsoft). Mock directory: `websites/microsoft_word_for_the_web_mock`.
- Scenario: 公共工具; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): documents, comments, track changes, sharing.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5306 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
