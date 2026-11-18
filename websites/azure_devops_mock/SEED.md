# Azure DevOps — build brief

- Real product: Azure DevOps (https://dev.azure.com). Mock directory: `websites/azure_devops_mock`.
- Scenario: 数字技术; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): boards, repos, pipelines, releases.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5479 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
