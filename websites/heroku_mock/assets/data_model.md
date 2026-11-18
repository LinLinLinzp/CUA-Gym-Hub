# Heroku proposed state model

Use plain JSON. This is an implementation-facing proposal. The completed site's SCHEMA.md documents the exact implemented fields and observable changes.

IDs, timestamps, status, and actor IDs are strings. Use UTC ISO 8601 dates, integer quantities and versions, and numeric USD monthly prices. Application references use immutable IDs across rename and deletion. Fields marked optional may be missing in an injected record. The app should remain navigable if an injected related record is missing.

| Top-level key | Shape | Purpose |
|---|---|---|
| account | Account | Pre-signed-in actor and workspace |
| apps | App[] | Account application inventory |
| formations | Formation[] | Desired dyno state by app and process type |
| addOns | AddOn[] | Installed, changed or removed service instances |
| releases | Release[] | App-scoped history, including prior active versions |
| appEvents | AppEvent[] | Creation, rename and deletion history |
| dynoEvents | DynoEvent[] | Scaling, resizing and restart history |
| addOnEvents | AddOnEvent[] | Provisioning, plan changes and removal history |

The add-on catalog and dyno size options are static local configuration. Search terms, filters, menu state and form drafts belong to transient UI state.

## Account and apps

- **Account** — id (e.g. usr-avery-morgan), name (Avery Morgan), email (avery.morgan@northline.example), workspaceName (Northline Engineering).
- **App** — id (app-001), name (northline-billing-prod), region (us or eu), stack (heroku-24), status (active, maintenance, or deleted), activeReleaseId (optional, release-app-001-004), actorId (usr-avery-morgan), createdAt and updatedAt (2026-10-12T14:30:00.000Z), deletedAt (optional). Use a muted fallback when injected metadata is unavailable.
- **AppEvent** — id (app-event-001), appId (app-001), actorId, createdAt, status (completed), type (create, rename, or delete), name (northline-billing-prod), previousName (optional, northline-billing), initialReleaseId (optional), formationIds and addOnIds (optional string arrays captured before deletion).

## Dynos

- **Formation** — id (formation-app-001-web), appId (app-001), processType (web or worker), command (optional, node server.js), size (eco, basic, standard-1x, or standard-2x), quantity (2), status (running, stopped, or retired), actorId, updatedAt, createdAt, lastRestartedAt (optional).
- **DynoEvent** — id (dyno-event-001), appId, actorId, createdAt, status (completed), type (scale, resize, scale_and_resize, or restart), formationIds (string array), and quantity (total desired or restarted count). Edits also carry previousQuantity, previousSize and size.
- Use integers from 0 to 1 for Eco or Basic. For Standard sizes, choose a documented sandbox limit suitable for the control, for example 0 to 10. A quantity of zero sets status stopped. Offer no extra write when an edit changes neither size nor quantity.

## Add-ons

- **AddOn** — id (addon-app-001-01), appId, serviceKey (heroku-postgresql), serviceName (Heroku Postgres), name (postgresql-tapered-41826), planKey (essential-0), monthlyPrice (5), status (provisioned or removed), actorId, createdAt, updatedAt, removedAt (optional).
- **AddOnEvent** — id (addon-event-001), appId, addOnId, releaseId, actorId, createdAt, status (completed), type (provision, change_plan, or remove), planKey, monthlyPrice, previousPlanKey and previousMonthlyPrice (optional).
- Catalog example — service keys heroku-postgresql, heroku-redis, and papertrail. Store a service label, category, description, and plan array locally. Example plan object has key essential-0, label Essential-0 and monthlyPrice 5. Supply at least two choices for some services, including essential-1 as a second Postgres choice.

## Releases

- **Release** — id (release-app-001-004), appId, version (4), type (initial, deploy, add_on, or rollback), status (succeeded, failed, pending, or expired), description (Deploy 2a4bf17), revision (optional, 2a4bf17), actorId, createdAt, rollbackToReleaseId (optional), addOnId and addOnEventId (optional).
- The app's activeReleaseId selects the current release. Use the largest version for that app plus one when creating a release, with 1 when history is empty. A successful deployment, add-on mutation or rollback appends a release and changes the pointer atomically. Add-on releases retain the previously active revision if present. Rollback to a succeeded older release copies its revision without altering services or quantities. An expired or failed release remains visible in history.

## Seed shape and coverage

Return an object with all eight top-level keys. Use one fixed account, 32 applications, around 65 process rows and 48 installed services, and at least 112 release rows. The event arrays may start empty. Deterministically generate stable relationship IDs and timestamps from fixed data. For each populated app, point activeReleaseId at its latest successful release. Include realistic names such as northline-billing-prod, harbor-reporting-staging and cedar-events-dev. Cover both regions, absent optional commands, multiple dyno sizes, stopped processes, withdrawn release artifacts and at least one app with no formations or add-ons. Keep baseline seed creation independent of the clock. Relative display labels use the runtime clock at render time.

For a test injection, use a fresh SID and browser context and supply replacement arrays through the Harbor state API. Ensure an empty app inventory and orphaned related rows render without treating them as changes. Build mutations against the current store snapshot, preserve unrelated fields, and send the entire state through the shared data manager.
