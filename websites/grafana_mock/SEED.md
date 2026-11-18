# Grafana — build brief

- Real product: Grafana (https://acme.grafana.net). Mock directory: `websites/grafana_mock`.
- Scenario: 数字技术; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): dashboards, alerts, contact points.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5491 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
