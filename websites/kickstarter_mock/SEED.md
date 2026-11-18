# Kickstarter — build brief

- Real product: Kickstarter (https://www.kickstarter.com). Mock directory: `websites/kickstarter_mock`.
- Scenario: 文化内容; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): campaign, rewards, backer surveys, updates.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5366 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
