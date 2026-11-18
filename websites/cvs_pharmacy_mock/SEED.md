# CVS Pharmacy — build brief

- Real product: CVS Pharmacy (https://www.cvs.com). Mock directory: `websites/cvs_pharmacy_mock`.
- Scenario: 生活消费; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): prescriptions, refills, pickup, vaccine appointments.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5340 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
