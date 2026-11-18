# digitalocean_mock Schema

**Base URL** `http://localhost:5483/`  
**Go endpoint** `GET /go?sid=<sid>` returns `{initial_state, current_state, state_diff}`.  
**Inject** `POST /post?sid=<sid>` with `{"action":"set","state":{...}}`. Inject before opening a fresh browser session for that `sid`.  
**Reset** `POST /post?sid=<sid>` with `{"action":"reset"}` restores the initial server world, or the defaults if there is no initial world. A fresh browser context reads the reset state from the server.

The session world is a JSON object. IDs and timestamps are strings. Timestamps use ISO 8601 UTC. The named fixtures use fixed IDs, and new user actions use generated IDs. The lists below define the application's seven top-level keys.

| Key | Type |
| --- | --- |
| `account` | Account object |
| `projects` | Project array |
| `droplets` | Droplet array |
| `domains` | Domain array |
| `dnsRecords` | DNS record array |
| `snapshots` | Snapshot array |
| `activity` | Activity array, appended in submission order |

## Records

**Account** contains string `id`, `name`, `email`, and `teamName`.

**Project** contains string `id`, `name`, and `environment`.

**Droplet** contains string `id`, `name`, `projectId`, `region`, `imageSlug`, `planSlug`, `ipv4`, `createdBy`, and `createdAt`. `status` is `active` or `off`. `vcpus`, `memoryMb`, `diskGb`, and `monthlyPrice` are numbers. Optional strings are `updatedAt`, `sourceSnapshotId`, `lastRestoredSnapshotId`, and `lastRestoredAt`.

**Domain** contains string `id`, `name`, `projectId`, `createdBy`, and `createdAt`. `status` is `active`.

**DNS record** contains string `id`, `domainId`, `name`, `data`, `createdBy`, and `createdAt`; numeric `ttl` in seconds; and `type` from `A`, `AAAA`, `CNAME`, `MX`, `TXT`, `NS`, `SRV`, or `CAA`. Optional strings are `updatedAt` and `dropletId` (A only). MX and SRV have numeric `priority`; SRV also has numeric `weight` and `port`. CAA has numeric `flags` and string `tag`.

**Snapshot** contains string `id`, `name`, `sourceDropletId`, `sourceDropletName`, `imageSlug`, `createdBy`, and `createdAt`; string array `regions`; numeric `sizeGb` and `minDiskGb`; and `status: available`. The source ID and name remain on the snapshot after its Droplet is destroyed.

**Activity** contains string `id`, `kind`, `entityId`, `actorId`, and `createdAt`; `entityType` from `droplet`, `domain`, `dns_record`, or `snapshot`; `status: completed`; and object `details`. Relevant links appear directly in `details` as string `projectId`, `domainId`, `snapshotId`, `sourceDropletId`, or string array `recordIds`. The table below specifies `details.before` and `details.after`. A resize includes `details.resizeMode` of `cpu_ram` or `disk_cpu_ram`. Missing values in partial injected records can be absent; activity records prior values of absent resize or restore fields as null.

### Default IDs

- Account `usr-maya`. Projects `prj-northline`, `prj-harbor`, and `prj-fieldwork`.
- Droplets `drp-{web,api,worker,db,cache,build}-{01…06}`. The first zone is `dom-northline`, followed by IDs such as `dom-harbor-services` and `dom-fieldwork-lab`.
- For each zone index `01…24`, the five records are `dns-web-<index>`, `dns-zone-<index>`, and `dns-ns-<index>-<1…3>`.
- Snapshots `snap-web-01` and `snap-image-{02…24}`. The last uses the archived source `drp-legacy-proxy-01`. Activity IDs are `act-seed-{01…12}`.

## Minimal Inject Example

Use this world as the `state` property to exercise empty inventories. Unspecified account fields merge with the seed. The arrays replace their defaults.

```json
{
  "account": { "teamName": "Example Workspace" },
  "projects": [],
  "droplets": [],
  "domains": [],
  "dnsRecords": [],
  "snapshots": [],
  "activity": []
}
```

## Observable State Changes (for LLM evaluation)

Every successful UI submission appends one structured activity row and applies its resource changes in a full-world `set_current` save. Read `current_state` for records and `state_diff` for changed collections. Record counts, filters, and presentation values are derived. See [AUDIT.md](AUDIT.md) for conditions where the submitted world can differ from the server world.

| Action | Resource change | Activity kind and details |
| --- | --- | --- |
| Create Droplet | Append full Droplet with selected configuration, unique documentation IPv4, `active` status and creation metadata | `droplet.created` with `projectId` and `after` equal to the new Droplet |
| Rename Droplet | Set `name` and `updatedAt` | `droplet.renamed` with `projectId` and `before.name` / `after.name` |
| Power off or on | Set `status` to `off` or `active` and set `updatedAt` | `droplet.powered_off` or `droplet.powered_on` with `projectId` and `before.status` / `after.status` |
| Resize powered-off Droplet | Set `planSlug`, `vcpus`, `memoryMb`, `monthlyPrice`, and `updatedAt`. CPU/RAM-only keeps `diskGb`. Disk resize increases `diskGb`. | `droplet.resized` with `projectId`, `resizeMode`, and before/after configurations including `diskGb` |
| Destroy Droplet | Remove the Droplet and keep its snapshots and DNS records | `droplet.destroyed` with `projectId` and `before` equal to the removed Droplet |
| Add domain | Append normalized active domain and three linked apex NS records with TTL 1800 | `domain.created` with `projectId`, the new domain in `after`, and the generated `recordIds` |
| Remove domain | Remove domain and all records with its `domainId` | `domain.deleted` with `projectId`, the removed domain in `before`, and the removed `recordIds` |
| Create DNS record | Append linked record with type-specific values and creation metadata | `dns_record.created` with `domainId` and the new record in `after` |
| Edit DNS record | Set `name`, `data`, `ttl`, applicable type-specific values, and `updatedAt`. Preserve identity, domain, type, and creation metadata. A manually entered A address clears `dropletId`. | `dns_record.updated` with `domainId` and full `before` / `after` records |
| Delete DNS record | Remove the confirmed record | `dns_record.deleted` with `domainId` and the removed record in `before` |
| Take snapshot | Append full available Snapshot with source ID and name, image slug, regions, size, minimum disk, and creation metadata | `snapshot.created` with `sourceDropletId` and the new snapshot in `after` |
| Create Droplet from snapshot | Append Droplet with `sourceSnapshotId` and the chosen snapshot's `imageSlug` | `droplet.created_from_snapshot` with `projectId`, `snapshotId`, `sourceDropletId`, and the new Droplet in `after` |
| Restore Droplet | Set target `lastRestoredSnapshotId`, `lastRestoredAt`, and `updatedAt`. Preserve configuration, identity, networking, power state, and snapshot. | `droplet.restored` with target `entityId`, `projectId`, `snapshotId`, `sourceDropletId`, and before/after restore metadata |
| Delete snapshot | Remove the confirmed Snapshot | `snapshot.deleted` with original `sourceDropletId` and the removed Snapshot in `before` |
