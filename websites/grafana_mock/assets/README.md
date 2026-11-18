# Grafana workflow research

Grafana is an observability workspace for assembling data visualizations, defining alert conditions, and routing notifications. In Acme Operations, a service owner builds a dashboard for a rollout, a reliability engineer defines and inspects an alert on a service metric, and an on-call coordinator maintains and tests the team's notification destinations.

## Workflow findings

- **Dashboards.** A dashboard groups visualizations, each with a data source, query, and visualization type. Folder, title, tags, and stars support rediscovery. Multiple selected tags use an intersection. Use a local dashboard draft so users can assemble several panel changes before an explicit save. [Create dashboards](https://grafana.com/docs/grafana/latest/visualizations/dashboards/build-dashboards/create-dashboard/), [Search dashboards and folders](https://grafana.com/docs/grafana/latest/visualizations/dashboards/search-dashboards/), [Dashboard API shape](https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/dashboard/)
- **Alert rules.** Grafana-managed rules combine an input query and condition with a folder, evaluation group, pending period, labels, annotations, and notification settings. An evaluation group supplies an interval. A rule can be paused independently of its last evaluation state, so the workspace can keep the existing state snapshot behind the pause flag. [Configure Grafana-managed rules](https://grafana.com/docs/grafana/latest/alerting/alerting-rules/create-grafana-managed-rule/), [Alert rule evaluation](https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rule-evaluation/)
- **Contact points.** A contact point contains multiple integrations. Grafana can assign a point directly to a rule or route through notification policies. Direct assignment covers the seeded rule-to-point workflow. A local test result gives users feedback and leaves evidence of the explicit action. [Configure contact points](https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/), [Notifications](https://grafana.com/docs/grafana/latest/alerting/fundamentals/notifications/), [Notifications API shape](https://grafana.com/docs/grafana-cloud/learn-and-build/developer-resources/api-reference/http-api/alert-notifications/)

## Feature inventory and view layout

| Priority and area | View and interactions |
| --- | --- |
| P0 project and state API | Vite build with Harbor's development and preview state API plugin. `/go` serves verifier JSON. |
| P0 hydration and mutations | Neutral boot view, session-aware URLs, one save path, read-only routing and filters. |
| P0 shell and routing | Aubergine header with Grafana text, workspace identity, and tabs for Dashboards, Alert rules, and Contact points. Main content scrolls under the shared header. |
| P0 state documentation and runtime checks | Model and exact writes in `SCHEMA.md`. Test sample state, missing fields, large arrays, session isolation, idle behavior, and build. |
| P1 dashboard discovery | In the dashboard library, left column lists folders. Right area holds filters and sortable dashboard rows. Detail shows saved charts and the selected time range. |
| P1 folder and dashboard metadata | Folder creation dialog and dashboard form support title, description, location, tags, and moving via the folder picker. |
| P1 dashboard panel editor | Open a panel form from the dashboard draft. Query, visualization, and preview controls are grouped together. Save commits the draft. |
| P1 stars and dashboard removal | Accessible star buttons in lists and detail. A separate confirmation shows the dashboard name and explains linked-rule dependencies. |
| P1 alert discovery | Folder and group sections organize the rules table, with a flat mode for filtering. Rule detail shows condition, health, timing, labels, and related objects. |
| P1 alert rule authoring | Form groups configuration into query, evaluation, notifications, and metadata sections. Add an evaluation group inside the rule form. Preview uses local fixtures. |
| P1 pause, resume, and delete alerts | Lifecycle controls on rule detail or in its menu. Pause overrides the displayed evaluation chip. Delete asks for confirmation. |
| P1 contact point discovery | Search and integration filters sit above the list. Each row shows channel summaries and rule usage. |
| P1 contact point authoring | Editor stacks typed integration sections with add/remove controls and fields specific to Email, Slack, and Webhook. |
| P1 test and delete contact points | Test dialog records a simulated result for one saved integration. Remove unused points through confirmation and surface linking rules for used points. |
| P2 dashboard duplication | Offer duplication through the dashboard action menu and reuse the new-dashboard editor. |

## State and visual references

Folders organize dashboards and evaluation groups. Dashboards own panels, and contact points own integrations. Rules link those objects by stable ID. `data_model.md` defines records, links, and fixtures. `TODO.md` is the implementation and acceptance checklist.

`../DESIGN.md` specifies the original visual system. `header-metrics.svg` is a local, original illustration for the dashboard library. Render functional charts from the site's synthetic metric fixtures.

The workspace opens pre-signed-in. Account administration, live data connectors, notification delivery, and notification policy tree editing are outside the exercise. The app can complete all required workflows with local data and the Harbor state API.
