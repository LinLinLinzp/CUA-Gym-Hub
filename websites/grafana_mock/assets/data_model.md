# Grafana workspace state model

`src/data/seed.js` exports `createInitialData()` with the keys below. Use flat arrays for independent entities and nested arrays for owned records. IDs are opaque strings. Selectors should tolerate missing optional fields, empty or replaced arrays, and stale foreign keys. Preserve injected fields unknown to the form when updating an entity. Document the as-built model and mutation table in `SCHEMA.md`.

## Top-level keys

| Key | Type | Example |
| --- | --- | --- |
| `workspace` | `{id: string, name: string}` | `{id: 'ws-acme', name: 'Acme Operations'}` |
| `currentUser` | `{id: string, name: string, email: string, role: string}` | `{id: 'usr-maya', name: 'Maya Chen', email: 'maya@example.test', role: 'Editor'}` |
| `folders` | `Folder[]` | Platform, Checkout, Edge, Storage, Reliability, Security |
| `dataSources` | `DataSource[]` | Prometheus and TestData DB |
| `dashboards` | `Dashboard[]` | Checkout service overview |
| `starredDashboardIds` | `string[]` | `['db-checkout-overview']` |
| `evaluationGroups` | `EvaluationGroup[]` | Checkout / service-slos |
| `alertRules` | `AlertRule[]` | Checkout API error rate |
| `contactPoints` | `ContactPoint[]` | Checkout on-call |
| `notificationTests` | `NotificationTest[]` | `[]` initially |
| `activity` | `Activity[]` | `[]` initially |

## Record shapes

`Creation` contains `createdBy: string` and `createdAt: string`. `Revision` contains both creation fields plus `updatedBy: string` and `updatedAt: string`. Actor IDs refer to the active user. Generate new business-action timestamps with `new Date().toISOString()` and use fixed ISO strings in seeds. On create, use the same actor/time for creation and last update. Example below uses `usr-maya` and `2026-01-12T14:25:00.000Z` for metadata.

| Record | Fields and sample values |
| --- | --- |
| Folder | `id: string` (`fld-checkout`), `title: string` (`Checkout`), `Creation` |
| DataSource | `id: string` (`ds-prom`), `name: string` (`Prometheus`), `type: string` (`prometheus`, `testdata`). Read-only selector sources for local fixtures. |
| Dashboard | `id: string` (`db-checkout-overview`), `title: string` (`Checkout service overview`), `description: string` (`Latency, error rate and traffic for the checkout API.`), `folderId: string or null` (`fld-checkout`), `tags: string[]` (`['checkout', 'production']`), `timeRange: {from: string, to: string}` (`{from: 'now-6h', to: 'now'}`), `panels: Panel[]`, `Revision` |
| Panel | `id: string` (`pnl-latency`), `title: string` (`p95 request latency`), `type: 'timeseries' or 'stat' or 'table'`, `dataSourceId: string` (`ds-prom`), `query: string` (`histogram_quantile(0.95, sum by (le) (rate(checkout_request_duration_seconds_bucket[5m])))`), `unit: string` (`seconds`). Panel order is array order. |
| EvaluationGroup | `id: string` (`grp-checkout-slos`), `name: string` (`service-slos`), `folderId: string` (`fld-checkout`), `intervalSeconds: number` (`60`), `Creation` |
| AlertRule | `id: string` (`rule-checkout-errors`), `name: string` (`Checkout API error rate`), `folderId: string`, `evaluationGroupId: string` (`grp-checkout-slos`), `dataSourceId: string` (`ds-prom`), `query: string` (`sum(rate(checkout_requests_total{status=~\"5..\"}[5m]))`), `condition: {operator: 'gt' or 'lt', threshold: number}` (`{operator: 'gt', threshold: 0.05}`), `pendingSeconds: number` (`300`), `noDataState: 'no_data' or 'alerting' or 'normal' or 'keep_last'`, `errorState: 'error' or 'alerting' or 'normal' or 'keep_last'`, `labels: Record<string, string>` (`{severity: 'critical', team: 'checkout'}`), `annotations: {summary?: string, description?: string, runbookUrl?: string}` (`{summary: 'Checkout API errors exceed target.'}`), `contactPointId: string or null` (`cp-checkout`), `dashboardId: string or null` (`db-checkout-overview`), `panelId: string or null` (`pnl-latency`), `isPaused: boolean` (`false`), `evaluationState: 'normal' or 'pending' or 'alerting' or 'no_data' or 'error'`, `health: 'ok' or 'error' or 'no_data'`, `Revision` |
| ContactPoint | `id: string` (`cp-checkout`), `name: string` (`Checkout on-call`), `integrations: Integration[]`, `Revision` |
| Integration | `id: string` (`int-checkout-email`), `type: 'email' or 'slack' or 'webhook'`, `disableResolveMessage: boolean` (`false`), and `settings` by type. Email has `{addresses: string[]}` (`['checkout-oncall@example.test']`). Slack has `{channel: string, url: string}` (`{channel: '#checkout-oncall', url: 'https://hooks.example.test/checkout'}`). Webhook has `{url: string, method: 'POST' or 'PUT'}` (`{url: 'https://events.example.test/alerts', method: 'POST'}`). URLs are configuration text for the local simulator. |
| NotificationTest | `id: string` (`nt-checkout-01`), `contactPointId: string` (`cp-checkout`), `integrationId: string` (`int-checkout-email`), `integrationType: 'email' or 'slack' or 'webhook'`, `message: string` (`Checkout test alert`), `status: 'simulated_success'`, `Creation` |
| Activity | `id: string` (`act-checkout-01`), `action: 'delete'`, `entityType: 'dashboard' or 'alert_rule' or 'contact_point'`, `entityId: string`, `entityName: string`, `status: 'completed'`, `Creation`. Persist only successful deletions. |

## Relationships and defaults

- A dashboard can live in a folder or at the library root (`null`). It owns its panels, which may reference a data source. A rule belongs to a folder and its matching evaluation group, and references a data source. An optional linked panel must belong to the selected dashboard. A nullable contact point selection allows saving in an injected world with no receivers. Show `No contact point selected` in detail for that case.
- A contact point owns its integrations. Tests link to the point and integration by ID and keep their original type even after edits. Dashboard stars store IDs. Tests and deletion entries are historical references and can outlive their targets.
- Seed six folders with six dashboards and two evaluation groups per folder. Seed three rules per group with a mix of evaluation states and pause flags. Use source IDs `ds-prom` and `ds-testdata` and varied local panel data and tags such as `production`, `platform`, `checkout`, `slo`, and `edge`. Seed contact points for each team, several multi-integration points, and several points with zero rule references. Resolve all foreign keys in the seeded world.
- Use deterministic series functions keyed by saved fixture identifiers or panel/query values and displayed range. Render chart samples and relative dates on demand from the selected range and `new Date()`. Keep render results and form previews out of persisted state.
- Suggested seed return shape is `{ workspace, currentUser, folders, dataSources, dashboards, starredDashboardIds, evaluationGroups, alertRules, contactPoints, notificationTests: [], activity: [] }`. Use fixed seed IDs and dates before the fixture clock by default. Generate stable unique IDs for new records at successful save time.
