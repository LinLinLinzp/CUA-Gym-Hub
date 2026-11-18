# DigitalOcean account research

The account starts with Maya Chen's Northline Studio workspace. A cloud operator creates and maintains Droplets, a DNS operator manages project zones and records, and a release engineer takes recovery images before changes. The same account supports that handoff through links from Droplets to snapshots and from snapshot entries back to their source when available.

- Droplets are virtual servers with region, image, and compute configuration. Select those values during creation. Require power off for resize and keep disk size when the operator chooses a CPU/RAM-only change. Use name confirmation for destroy. [Creation](https://docs.digitalocean.com/products/droplets/how-to/create/), [resize](https://docs.digitalocean.com/products/droplets/how-to/resize/), [destroy](https://docs.digitalocean.com/products/droplets/how-to/destroy/)
- Domains organize DNS records by zone. Record types determine the required inputs. TTL is in seconds, MX and SRV use priority, and SRV also needs port and weight. The sandbox seeds its own examples and uses synthetic inputs throughout. [Add a domain](https://docs.digitalocean.com/products/networking/dns/how-to/add-domains/), [manage records](https://docs.digitalocean.com/products/networking/dns/how-to/manage-records/)
- A snapshot is a stored disk image. It can seed a new Droplet or restore an existing compatible Droplet. A retained image remains usable after its original Droplet is destroyed. [Snapshot features](https://docs.digitalocean.com/products/snapshots/details/features/), [create and restore Droplets](https://docs.digitalocean.com/products/snapshots/how-to/create-and-restore-droplets/)

## Feature inventory and layouts

| Priority | View | Layout and interactions |
| --- | --- | --- |
| P0 | Account shell | Top account band with DigitalOcean text, team identity, and horizontal resource navigation. Routed content starts below the active section. |
| P0 | Session and persistence | Shared boot, store, URL/session isolation, and Harbor endpoints. Empty states and fallback routes use the same shell. |
| P1 | Droplets inventory and detail | Inventory has search and filter controls above data rows. Detail has a configuration facts panel, a named Actions menu, and snapshots. |
| P1 | Create Droplet | A full-page form groups placement, image, plan, and hostname. A side summary reflects the current selections. A snapshot can prefill the image. |
| P1 | Domains and DNS | Domains inventory links to a zone detail with record controls and a table. Add/edit uses a side panel with fields driven by record type. |
| P1 | Snapshots | Inventory lists name, source, size, regions, and creation date. View actions create a Droplet, restore a target, or delete a snapshot. |
| P2 | Recent activity | Overview displays recent successful resource actions with timestamps and available links. |

The [data model](data_model.md) defines account and project records, the four resource collections, and structured activity. [DESIGN.md](../DESIGN.md) specifies the original interface and local visual treatment. The feature and test checklist is in [TODO.md](../TODO.md).

The sandbox covers resource management within a pre-signed-in workspace. Authentication, production operations, and live external integrations are outside scope because each scenario runs offline against isolated state.
