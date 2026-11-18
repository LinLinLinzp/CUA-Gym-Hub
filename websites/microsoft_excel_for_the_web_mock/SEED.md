# Microsoft Excel for the web — build brief

- Real product: Microsoft Excel for the web (https://excel.cloud.microsoft). Mock directory: `websites/microsoft_excel_for_the_web_mock`.
- Scenario: 公共工具; tier A (core mainstream: highest fidelity).
- Must-have workflows (each is P0/P1 and must persist structured records): workbooks, sheets, formulas, filters, sharing.
- Runtime contract: follow `HARBOR_CONTRACT.md` and use `templates/state-api.js` + `templates/dataManager.js` as-is.
- Dev server port for this app: 5305 (other apps are built in parallel; never use another port).
- Default data (`createInitialData`): realistic, English, fixed ids, enough volume to make
  lists, filters and search meaningful (dozens of records per main entity).
