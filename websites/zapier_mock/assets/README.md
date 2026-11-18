# Zapier workflow research

Zapier runs workflows called Zaps. A trigger starts the workflow, and one or more actions use configured values or data from earlier steps. The account workspace is for building workflows, inspecting their runs, and maintaining the app accounts they rely on. [What is a Zap?](https://help.zapier.com/hc/en-us/articles/8496309697421-What-is-a-Zap)

## Personas

| Persona | Primary task |
| --- | --- |
| Operations specialist | Build a lead intake automation, map fields, test it, then publish it. |
| Workflow owner | Find a failing run, inspect the affected step, and replay it after fixing the issue. |
| Workspace administrator | Find a connection by app and status, review dependent Zaps, and reconnect or retire the account. |

## Feature inventory

| Priority | View | Layout and behavior |
| --- | --- | --- |
| P0 | Workspace shell | Three persistent destinations in a dark rail, a context header, and a workspace identity. All routes share the loaded state and support session-scoped deep links. |
| P1 | Zaps | Table with title, integrations, folder, owner, status, and modification time. A toolbar handles search, filtering, and sorting. Row actions cover rename, duplicate, move, toggle, and delete. [Manage assets](https://help.zapier.com/hc/en-us/articles/39703938224781-Manage-assets-in-your-Zapier-account) |
| P1 | Zap editor | A vertical step list and adjacent step form. Configure, map, test, and publish. Keep a published version runnable while a separate draft is edited. [Zap drafts and versions](https://help.zapier.com/hc/en-us/articles/9693520498445-Create-Zap-drafts-and-versions) |
| P1 | Zap runs | Filtered run table with status and task count. Deep links open a step-by-step breakdown with input, output, and errors. Replay makes a separately inspectable run with a link to the original. [Zap history](https://help.zapier.com/hc/en-us/articles/8496291148685-View-and-manage-your-Zap-history) · [Replay Zap runs](https://help.zapier.com/hc/en-us/articles/8496241726989-Replay-Zap-runs) |
| P1 | Task usage | Daily bars and per-Zap totals derived from the filtered runs. One task per successful action in this workspace. [Measure task usage](https://help.zapier.com/hc/en-us/articles/8496196837261-How-is-task-usage-measured-in-Zapier) |
| P1 | App connections | Filterable table with account, owner, health, and dependent Zap count. Add, rename, test, reconnect, and remove synthetic accounts locally. [Manage app connections](https://help.zapier.com/hc/en-us/articles/8496290788109-Manage-your-app-connections) |
| P2 | Apps and bulk replay | Group connections by app and apply the normal replay rules to selected runs. |

## Data model and scope

Zaps reference folders and users and contain ordered steps. Steps reference integration catalog entries and connections. Runs snapshot the Zap name and step results so history remains intelligible after a rename or deletion. See the [state model](data_model.md) for types and examples.

The product references establish terminology and workflows. The interface styling and component layout come from the original [workspace design](../DESIGN.md). Authentication, third-party data access, and scheduled automation execution are outside the offline workspace scope. Reconnect is a local state change initiated by the user.
