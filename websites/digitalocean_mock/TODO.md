# DigitalOcean account — TODO

> Status: DEV COMPLETE  
> Last updated by: dev agent, 2026-11-18  
> See [research](assets/README.md), [state model](assets/data_model.md), and [design](DESIGN.md).

## Status legend

- [ ] Pending
- [~] In progress
- [x] Done

## P0 — App shell and Harbor

- [x] **Local setup and build.** Scaffold React and Vite within this directory with an npm lockfile. Serve on strict port 5483. Use the supplied Node Playwright installation from `PILOT_PLAYWRIGHT` and Chromium. For a persistent server, use PowerShell `Start-Process -WindowStyle Hidden` with an absolute Vite entry point and this site's working directory. Keep scratch files gitignored or remove them. Verify `npm run build` and offline assets. The parent runner handles Docker certification and commits.
- [x] **Account shell and routing.** Use the top navigation in DESIGN.md. Routes are `/` (overview), `/droplets`, `/droplets/new`, `/droplets/:id`, `/networking/domains`, `/networking/domains/:id`, and `/snapshots`. Give unknown routes and missing records a readable recovery link. Keep all routes under the same providers. Preserve `?sid=` on SPA navigation and use `withSid()` for internal links outside it. Render real links for cross-resource navigation and derived overview links and counts.
- [x] **State and sessions.** Copy `templates/dataManager.js` to `src/utils/dataManager.js` and the state API template into the site unchanged. Register `stateApi(createInitialData)` in Vite. Let the state API serve `/state`, `/post`, and JSON `/go` per the contract. Await `loadState('digitalocean_mock', createInitialData)` before routes mount, with a neutral loading view. Centralize writes in the store. Each successful business action commits its resource changes and activity together and calls `saveState` once with the full serializable state. No writes for navigation, filters, canceled dialogs, failed validation, or idle time after baseline. Verify reloads, session isolation, injected empty and partial records, and lists with hundreds of records. Handle missing labels and related records gracefully.
- [x] **Verifier handoff.** Write `SCHEMA.md` with every top-level key, complete record definitions, and an Observable State Changes table matching the implementation. In `TEST.md`, document localhost Playwright coverage of every P1 workflow, including the exact observed state fields, deep-link reloads with sid, an injected world, and an idle interval with zero further POSTs. For each mutation below verify the saved server state using `/go?sid=…`, independently of visible UI feedback.

## P1 — Seed workflows

The field definitions and activity envelope are in [the data model](assets/data_model.md). Each named activity kind is a structured row in `activity` with actor, timestamp, entity ID, and relevant related IDs or changed values.

- [x] **Droplets — find, inspect, and create.** Search by name or IP, filter by project, region, and status, and show name, status, region, plan, and IPv4. The detail view shows configuration, available actions, and linked snapshots. The create form exposes hostname, region, project, plan, and OS or snapshot image with an inline configuration summary. Validate inputs and show the new Droplet after save. Creation appends a `droplets[]` record with config, synthetic IPv4, `status: active`, and creation metadata, plus `droplet.created`. Search and inspection have no write.
- [x] **Droplets — rename, resize, power, and destroy.** Provide named actions on the detail view. Rename updates `name` and records `droplet.renamed`. Power on/off changes `status` between `active` and `off` and records `droplet.powered_on` or `droplet.powered_off`. Offer resize for powered-off Droplets. CPU/RAM-only preserves disk capacity, and disk resize permits increases only. Resize updates plan and numeric compute fields and records `droplet.resized` with the selected mode and before/after configuration. Each update sets `updatedAt`. Destroy requires the Droplet name, removes the row, records `droplet.destroyed`, and preserves related snapshots. Return to the inventory after deletion.
- [x] **DNS — add, find, and remove a domain.** List domains with project and record count. Add Domain collects an apex name and project, lowercases the name, strips a trailing dot, and checks for duplicates in memory. Create appends `domains[]` with `status: active` and creation metadata and appends three default NS rows in `dnsRecords[]` linked by `domainId`. Record `domain.created` with the generated IDs. Detail displays zone name and linked records. Remove requires the domain name and removes the domain and its linked DNS rows in one save, recording `domain.deleted` and the removed record IDs.
- [x] **DNS — create, edit, and delete records.** In a domain, search by host or value and filter by type. Show type, hostname, value, TTL in seconds, and type-specific values. Create/Edit forms support A, AAAA, CNAME, MX, TXT, NS, SRV, and CAA. Validate type-specific data and positive integer TTL. Support apex, wildcard where applicable, and selecting an eligible Droplet's IPv4 for an A record. Create appends `dnsRecords[]` and `dns_record.created`. Edit preserves id, `domainId`, type and creation metadata, rewrites editable fields and `updatedAt`, and records `dns_record.updated`. Delete requires domain-name confirmation, removes one row, and records `dns_record.deleted` with the removed values and domain ID. Clear obsolete type-specific form fields when choosing a different type before creation.
- [x] **Snapshots — take, find, and delete.** From a Droplet detail, Take Snapshot asks for a name and shows a live-snapshot caution if the Droplet is active. Successful submission appends `snapshots[]` with source ID/name, image slug, regions, numeric size and minimum disk, `status: available`, and creation metadata. Append `snapshot.created`. Make the new snapshot immediately usable. Global inventory searches by snapshot or source name and filters by region. Confirm deletion by snapshot name, remove the row, and append `snapshot.deleted` with the original source ID.
- [x] **Snapshots — create Droplet and restore.** A snapshot row's Create Droplet action opens the Droplet form with that snapshot selected. Restrict to compatible region and disk size. Save a new `droplets[]` row with `sourceSnapshotId` and snapshot image in `imageSlug`, and append `droplet.created_from_snapshot`. For in-place Restore, choose a compatible existing Droplet, show disk-replacement consequences, and require the target's name. Preserve target identity, project, configuration, IP and status. Set `lastRestoredSnapshotId`, `lastRestoredAt`, and `updatedAt` on the target and append `droplet.restored` with both IDs. Both flows preserve the original snapshot.

## P2 — Secondary features

- [x] Recent activity on the overview, showing action, affected resource, and time from the existing `activity` rows. Link only when the resource still exists. This view makes no writes.

## Data seed

- [x] Fixed English fixtures with three projects, 36 Droplets, 24 domains, at least 72 DNS records, 24 snapshots, and 12 recent activity records. Include varied statuses, regions, plans, domain record types, repeated naming prefixes, and an archived source snapshot. Follow the exact field types in the state model. Use reserved example domains and documentation IP blocks.

## Out of scope

Authentication, actual credentials or VM operations, live billing, registrar access, DNS resolution, automated backups, volume provisioning, team transfers, and production integrations.
