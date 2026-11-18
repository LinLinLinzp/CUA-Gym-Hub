# USPS — build brief

- Real product: USPS (https://www.usps.com). Mock directory: `websites/usps_mock`.
- Scenario: 公共事务; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): change of address, hold mail, package claims, PO boxes.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5532 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
