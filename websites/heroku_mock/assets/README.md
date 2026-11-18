# Heroku workflow research

The target is a pre-signed-in account workspace for app operators. A developer finds or creates an app and inspects its release history. An operator adjusts capacity or restarts compute. A maintainer provisions data services, changes plans, or recovers from a bad deployment.

| Priority | View | What a user can do |
|---|---|---|
| P0 | Account shell | Open Applications, navigate into an app and switch between Overview, Resources, Releases and Settings. |
| P1 | Applications | Search, sort and filter the inventory, create an app, and use Settings to rename or delete it. |
| P1 | Resources · Dyno formation | Inspect process type, command, size and quantity. Scale, resize, stop by scaling to zero, or restart running processes. |
| P1 | Resources · Add-ons | Review installed services, search a local catalog, choose a plan, change plans and remove an instance. |
| P1 | Releases | Identify the active version, inspect history, deploy a synthetic revision, and roll back to an eligible version. |
| P2 | Quick Jump | Focus the app picker with slash and navigate to a named app from its results. |

## Product behavior

- The dashboard supports creating, renaming and deleting apps. Its list surfaces app name, stack and region. Names contain lowercase letters, digits and dashes, up to 30 characters. Quick Jump and its slash shortcut provide an optional cross-app navigation pattern. [Dashboard](https://devcenter.heroku.com/articles/heroku-dashboard), [Application names](https://devcenter.heroku.com/articles/app-names-and-subdomains)
- Dynos are instances of named process types such as web and worker. Scale formation quantity separately from size and preserve a zero-quantity row. Eco and Basic have a one-dyno maximum per process type. Restart applies to running compute and does not require changing desired formation. [Process model](https://devcenter.heroku.com/articles/process-model), [Scaling](https://devcenter.heroku.com/articles/scaling), [Dyno restarts](https://devcenter.heroku.com/articles/dyno-restarts)
- Installed add-ons have a service, plan, and identifiable instance. The Resources surface supports provisioning through a catalog and changing or removing plans. Use a local plan list with synthetic price snapshots. [Managing add-ons](https://devcenter.heroku.com/articles/managing-add-ons), [Heroku Postgres plans](https://devcenter.heroku.com/articles/heroku-postgres-plans), [Add-ons overview](https://devcenter.heroku.com/articles/add-ons)
- Deploys and add-on changes create sequential releases. Rollback creates another version from an earlier eligible artifact. An expired artifact is ineligible, and rollback leaves add-on provisioning in place. A compact schema with stable string identifiers is sufficient for this workspace. [Releases](https://devcenter.heroku.com/articles/releases), [Platform API reference](https://devcenter.heroku.com/articles/platform-api-reference)

## Original layout

Applications is the main inventory under a dark workspace rail and slim breadcrumb bar. Its heading includes the visible New app action, followed by search and filters and name-linked table rows. Overview summarizes compute, add-ons and the active release. Resources uses stacked Dynos and Add-ons sections with independent actions. Releases is a newest-first version table with a detail view. Settings separates the rename form and destructive action. See [DESIGN.md](../DESIGN.md) for tokens and behavior at narrow widths.

Use synthetic English records, including realistic resource names, statuses and dates. The state model associates formations, add-ons and releases with an app ID and gives mutations audit records where a row update alone would lose important details. See [data model](data_model.md). Keep authentication, provider connections and billing out of scope so every action can be exercised against localhost.
