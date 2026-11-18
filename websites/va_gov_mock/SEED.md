# VA.gov — build brief

- Real product: VA.gov (https://www.va.gov). Mock directory: `websites/va_gov_mock`.
- Scenario: 公共事务; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): claims, appointments, prescriptions, payments.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5534 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
