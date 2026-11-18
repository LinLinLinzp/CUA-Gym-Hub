# DigitalOcean state model

Use one serializable object from `src/data/seed.js` and treat the following as its complete top-level key set. All IDs are strings. Seed IDs are fixed. Generate new IDs at successful user submission. Use ISO strings for timestamps, with new action times from `new Date().toISOString()`. Optional fields may be absent from injected state.

| Key | Shape and sample values |
| --- | --- |
| `account` | Object with `id` (`usr-maya`), `name` (Maya Chen), `email` (`maya@example.com`), and `teamName` (Northline Studio), all strings. |
| `projects` | Array of objects with string `id` (`prj-northline`), `name` (Northline Platform), and `environment` (`production`). Include staging and development projects. |
| `droplets` | Array of Droplet objects. See below. |
| `domains` | Array of Domain objects. See below. |
| `dnsRecords` | Array of DNS record objects. See below. |
| `snapshots` | Array of Snapshot objects. See below. |
| `activity` | Array of Action objects. See below. |

## Resource shapes

Lists display readable fallbacks for missing optional properties. Treat IDs as stable and resolve links by ID. Store regions, image slugs, and plan options as static catalogs outside state. Derive counts, preview labels, and filtered rows at render time.

- **Droplet** — `id` (`drp-web-01`), `name` (`web-edge-01`), `projectId` (`prj-northline`), `region` (`nyc3`), `imageSlug` (`ubuntu-24-04-x64`), `planSlug` (`s-2vcpu-4gb`), `ipv4` (`192.0.2.24`), `status` (`active` or `off`), `createdBy` (account ID), `createdAt`, and optionally `updatedAt`. Numeric fields are `vcpus` (2), `memoryMb` (4096), `diskGb` (80), and `monthlyPrice` (24, synthetic USD). Optional strings are `sourceSnapshotId`, `lastRestoredSnapshotId`, and `lastRestoredAt`.
- **Domain** — `id` (`dom-northline`), `name` (`northline.example`), `projectId`, `status` (`active`), `createdBy`, and `createdAt`.
- **DNS record** — `id` (`dns-web-01`), `domainId` (`dom-northline`), `type` (A, AAAA, CNAME, MX, TXT, NS, SRV, or CAA), `name` (`@`, `www`, or `_sip._tcp`), `data` (`192.0.2.24`, `2001:db8::24`, `northline.example.`, or the type's value), numeric `ttl` (3600), `createdBy`, `createdAt`, optional `updatedAt`. Optional string `dropletId` accompanies the value when set by picking a Droplet. Optional numeric `priority` applies to MX and SRV (10), numeric `weight` and `port` apply to SRV (5 and 5060), and numeric `flags` and string `tag` apply to CAA (0 and `issue`). Remove `dropletId` if the record is edited to use a manually entered target. Each created domain starts with three apex NS records pointing to `ns1.digitalocean.com.`, `ns2.digitalocean.com.`, and `ns3.digitalocean.com.` at TTL 1800. These are display data.
- **Snapshot** — `id` (`snap-web-01`), `name` (`web-edge-before-release`), `sourceDropletId` (`drp-web-01`), `sourceDropletName` (`web-edge-01`), `imageSlug` (`snapshot-snap-web-01`), string array `regions` (e.g. `["nyc3"]`), numeric `sizeGb` (12.5), numeric `minDiskGb` (80), `status` (`available`), `createdBy`, and `createdAt`. The name survives source destruction and keeps the row intelligible. A snapshot must be available in the destination region and fit the disk for creation or restoration.
- **Action** — `id` (`act-seed-001`), `kind` (e.g. `dns_record.updated`), `entityType` (`droplet`, `domain`, `dns_record`, or `snapshot`), `entityId`, `actorId`, `status` (`completed`), `createdAt` (e.g. `2026-10-28T15:00:00.000Z`), and object `details`. Use `details.before` and `details.after` for changed field values or create/delete record values. Put related IDs directly in `details` as applicable (`projectId`, `domainId`, `snapshotId`, `sourceDropletId`, `recordIds`) and use `details.resizeMode` (`cpu_ram` or `disk_cpu_ram`) for resizes. For deletions keep the removed record in `details.before` even though its primary collection no longer holds it.

## Fixture composition

Return a new object with `account`, `projects`, `droplets`, `domains`, `dnsRecords`, `snapshots`, and `activity`. Generate repeated fixtures from fixed lists and stable padded IDs. Use reserved IPv4 documentation blocks and IPv6 examples from `2001:db8::/32`. Reserve unused documentation addresses for newly created Droplets and ensure they are distinct within the world. Use `.example` zones, varied names such as `api-staging-03`, multiple projects, and several rows per frequently used status, type, and region. Include snapshots available in multiple regions and a snapshot whose source ID is absent. A DNS row may outlive its optional Droplet link, retaining its literal `data`. Keep saved input, display-only catalogs, and transient form state distinct.
