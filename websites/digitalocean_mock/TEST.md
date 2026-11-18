# DigitalOcean Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://localhost:5483  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
| --- | ---: |
| Routes tested, including fallback | 8 |
| Elements tested, grouped into cases below | 26 |
| ✅ Passed | 21 |
| ❌ Failed | 5 |
| ⚠️ Skipped (out of scope) | 0 |

All three workflows in `SEED.md` passed in Chromium on both Vite dev and the built `dist/` preview. Both used strict port 5483. `npm run build` passed, and the site copies of `state-api.js` and `dataManager.js` matched the Harbor templates by SHA-256. Browser testing used the installed Playwright at `PILOT_PLAYWRIGHT` with localhost and synthetic test sessions. Docker certification is the parent runner's phase.

---

## ✅ Passing Tests

### Seed workflows and /go results

The seeded session sent one baseline `set`, then exactly one full-state `set_current` for each of 23 successful mutations. After each save, an independent JSON request to `/go?sid=…` checked `initial_state`, changed collections in `state_diff`, the persisted records in `current_state`, and the appended `activity` row. The activity assertions covered `id`, `kind`, `entityType`, `entityId`, `actorId`, `status`, and `createdAt`.

| Browser workflow | Observed server state |
| --- | --- |
| Find and open a Droplet by project, region, status, and IPv4. Create `verifier-edge` from Ubuntu. | `droplets[]` appended `id`, `name`, `projectId`, `region`, `imageSlug`, `planSlug`, `vcpus`, `memoryMb`, `diskGb`, `monthlyPrice`, `ipv4: 203.0.113.1`, `status: active`, `createdBy`, and `createdAt`. `droplet.created.details` included `projectId` and the full row in `after`. Search and inspection wrote nothing. |
| Rename, power off, resize in both modes, and power on. | Rename changed `name` and `updatedAt` with `droplet.renamed.details.before.name` and `after.name`. Power off and on changed `status` and `updatedAt` with before/after statuses. CPU/RAM resize retained the 25 GB disk and changed `planSlug`, `memoryMb`, and `monthlyPrice`. Disk resize increased `diskGb` to 80 and changed the compute configuration. Both set `updatedAt` and produced `droplet.resized` with `resizeMode` and before/after `planSlug`, `vcpus`, `memoryMb`, `diskGb`, and `monthlyPrice`. Active Droplets could not open Resize. |
| Find domains and add `Verifier-Zone.Example.`. | `domains[]` appended `id`, `name: verifier-zone.example`, `projectId`, `status: active`, `createdBy`, and `createdAt`. The same state write appended three linked `dnsRecords[]` rows with apex `@`, `type: NS`, literal name-server values, `ttl: 1800`, and creation metadata. `domain.created.details` included `projectId`, the new domain, and all three `recordIds`. |
| Create A, AAAA, CNAME, MX, TXT, NS, SRV, and CAA records. | Each `dnsRecords[]` row stored `id`, `domainId`, `type`, `name`, `data`, numeric `ttl: 600`, `createdBy`, and `createdAt`. A stored the selected `dropletId` and its IPv4, CNAME stored wildcard `*`, MX stored numeric `priority`, SRV stored numeric `priority`, `weight`, and `port`, and CAA stored numeric `flags` and string `tag`. Switching SRV to A preserved the shared TTL and omitted the abandoned port. Each `dns_record.created.details` matched the domain ID and new record. |
| Find the A record by type and value. Edit it to host `app`, manual IPv4 `198.51.100.99`, and TTL 900. Confirm and delete that record. | Edit changed `name`, `data`, `ttl`, and `updatedAt`, removed `dropletId`, and preserved `id`, `domainId`, `type`, `createdBy`, and `createdAt`. `dns_record.updated.details` included the domain ID and complete before/after values. Delete removed only that row and logged its full value in `dns_record.deleted.details.before`. |
| Remove the domain with typed confirmation. | A single save removed the domain and its 10 remaining DNS rows. `domain.deleted.details.before` held the original domain and `recordIds` held the 10 deleted IDs. |
| Take and find `verifier-recovery`, starting from an active Droplet. | `snapshots[]` appended `id`, `name`, `sourceDropletId`, `sourceDropletName`, `imageSlug`, `regions: [nyc3]`, `sizeGb: 24`, `minDiskGb: 80`, `status: available`, `createdBy`, and `createdAt`. `snapshot.created.details` held the source ID and full snapshot. The new snapshot could be found immediately by source name and region. |
| Create `verifier-clone` from the snapshot. | The form preselected the image and limited placement to New York and disks of at least 80 GB. The new Droplet stored its full configuration, `ipv4: 203.0.113.2`, `sourceSnapshotId`, and the snapshot's `imageSlug`. `droplet.created_from_snapshot.details` included `projectId`, `snapshotId`, `sourceDropletId`, and the full Droplet. The snapshot was preserved. |
| Restore `verifier-clone` from the snapshot. | The restore form excluded an incompatible target and displayed the disk replacement consequence. Typed confirmation set the target's `lastRestoredSnapshotId`, `lastRestoredAt`, and `updatedAt`. A comparison against the full previous target verified that all other fields and the snapshot stayed the same. `droplet.restored` identified the target as `entityId` and recorded the snapshot and source Droplet IDs. |
| Destroy the source Droplet, then delete the retained snapshot. | `droplet.destroyed` removed the source from `droplets[]`, kept the full snapshot, and recorded the removed Droplet in `details.before`. The source name remained visible on its snapshot row. `snapshot.deleted` removed only the snapshot and logged its original `sourceDropletId` and full `before` value. Overview linked the existing restored Droplet and displayed the destroyed Droplet without a resource link. |

### Sessions and read-only behavior

- Checked fixture counts of 3 projects, 36 Droplets, 24 domains, 120 DNS records, 24 snapshots, and 12 activity entries.
- Reloaded Droplet and DNS detail URLs with their `sid` and confirmed persistence and no extra baseline. Missing Droplets, domains, and routes offered working recovery links.
- Invalid hostname, duplicate domain, invalid IPv4, incorrect delete confirmation, canceled rename, filters, and navigation produced no mutation POSTs.
- A **3.2-second idle interval** after the seeded workflows produced **zero additional POSTs** and an identical server world.
- Tested a separate injected session with empty arrays and a partial account. Its custom team name and default missing account fields rendered correctly.
- Tested a third session with 320 injected Droplets including sparse rows, a sparse domain and DNS record, and an archived-source snapshot. Search and deep-link reload worked at a 390 px viewport. Creating a Droplet posted a full world over 60 KB once and persisted the 321st row and its activity. The earlier seeded session remained identical.

### Navigation, controls, and layout

- Overview resource cards, active navigation tabs, the DigitalOcean wordmark, and the Snapshots **View Droplets** link navigated to the expected routes.
- Project, region, image, and plan selections updated the Droplet configuration summary. Cancel returned to the inventory.
- Primary button hover changed its background. DNS and domain dialogs closed by Close, Cancel, or Escape and returned focus to the trigger where applicable.
- Seven primary routes rendered at 1320 px and 390 px. The Droplet, DNS, and snapshot tables could scroll within their containers at 390 px. The screenshots were reviewed against the site's original [DESIGN.md](DESIGN.md).
- The navigation and visual suite recorded zero console errors, page exceptions, and external browser requests. Read-only actions left `/go` unchanged. Reset returned HTTP 200 and the same clean baseline.

---

## ❌ Bugs for Dev Agent

### BUG-001 · P0 · A multibyte world can fail to save

| Field | Value |
| --- | --- |
| Route | `/droplets/new` |
| Element | Create Droplet |
| Action | Inject 28 TXT records with 150 three-byte characters each, then create a Droplet. |
| Expected | `/go` records the new Droplet and its activity. |
| Actual | The UI and local reload showed the Droplet. Chromium rejected the 68,131-byte keepalive request, and `/go` omitted the Droplet and activity. |
| Console errors | The instrumented fetch rejected with `Failed to fetch`. |
| Fix hint | Use the UTF-8 byte length when deciding whether to use keepalive in the app-side store integration. |

### BUG-002 · P0 · A delayed baseline overwrites a saved mutation

| Field | Value |
| --- | --- |
| Route | `/droplets/new` |
| Element | Create Droplet |
| Action | Hold the first baseline POST, create a Droplet, wait for mutation HTTP 200, then release the baseline. |
| Expected | `initial_state` contains the pristine baseline. `current_state` contains the new Droplet and its activity. |
| Actual | After the baseline completed, `/go` removed the Droplet from `current_state` and included it in `initial_state`. |
| Console errors | The baseline and mutation returned HTTP 200. |
| Fix hint | Serialize the app's baseline and mutation requests. |

### BUG-003 · P1 · Editing the CAA tag leaves a stale validation error

| Field | Value |
| --- | --- |
| Route | `/networking/domains/:id` |
| Element | Add DNS Record, CAA tag |
| Action | Submit `mailto:dns@example.com` with tag `issue`, change the tag to `iodef`, and submit again. |
| Expected | The existing value passes validation and `/go` records the CAA row with `tag: iodef`. |
| Actual | The previous error stays on the value. The form writes no record until the value is edited. |
| Console errors | None observed. |
| Fix hint | Clear or revalidate the value field when the tag changes. |

## Visual Alignment Feedback

### BUG-004 · P1 · Secondary controls are below the design minimum

| Field | Value |
| --- | --- |
| View | `/networking/domains/:id` |
| Element | DNS row Edit and dialog Close |
| Action | Measure the Edit control and open the dialog to measure Close. |
| Expected | Both controls meet the 40 px minimum in `DESIGN.md`. |
| Actual | Playwright measured Edit at 34 px and Close at 36 px. |
| Fix hint | Apply the 40 px minimum to row actions, compact buttons, and the dialog close control. |

### BUG-005 · P2 · Compact table values split across lines on mobile

| Field | Value |
| --- | --- |
| Views | `/networking/domains/:id` and `/snapshots` |
| Element | DNS type and snapshot size cells |
| Action | View the inventory at 390 px. |
| Expected | Short tokens and size values remain readable within the horizontally scrolling table. |
| Actual | `AAAA` spans two lines. `12.5 GB` spans three lines with the decimal split. |
| Fix hint | Keep short tokens and sizes together and let the table scroll to accommodate them. |

---

## Round History

### Round 1 → Round 2

- BUG-001 through BUG-004 are still reproducible in dev and the built preview. See [AUDIT.md](AUDIT.md).
- BUG-005 was identified during the mobile screenshot review.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `131988`. The local evidence is `factory/build/dyn_certify/131988/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `projects → 0 → name`.
