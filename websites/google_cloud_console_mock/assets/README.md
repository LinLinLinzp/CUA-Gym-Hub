# Google Cloud Console product research

The project workspace lets platform operators manage user access, virtual machines, and object storage in a selected project. Billing administrators switch between account-scoped usage, budgets, and project billing relationships. The implementation starts with a synthetic user and account data. [Google Cloud product catalog](https://cloud.google.com/products)

## Personas and recurring tasks

| Persona | Work in the app |
|---|---|
| Project IAM administrator | Find a principal, grant a project role, add a role to an existing principal, and revoke a direct grant |
| Compute operator | Filter VM instances by state/zone, provision a VM, inspect its configuration, then stop, start, reset, or delete it |
| Storage operator | Find buckets by location/class, create and configure a bucket, add object metadata, and remove objects or an empty bucket |
| Billing administrator | Compare costs by time period, project, and service, manage budget thresholds, and change project billing links |

## Product findings and screen inventory

| Priority | Screen and behavior | Original layout |
|---|---|---|
| P0 | Overview, project selection, route and session handling, and activity summary | Deep navy product rail, slim white scope bar, project panel, four summary cards, and activity table |
| P1 | IAM search/filter, grant, role edits, and direct-grant revocation | Principal-first table with role chips and an edit panel |
| P1 | VM instances browse and create, configuration detail, and lifecycle actions | Persistent action header, table with status/zone filters, separate detail view |
| P1 | Buckets browse/create, Objects and Configuration tabs, and bucket deletion | Location and class filters, bucket detail tabs, and local file-picker metadata workflow |
| P1 | Billing overview and project linking, Reports, and Budgets & alerts | Account picker and local tabs, cost totals and chart, budget table with progress |
| P2 | Overview activity product filters and resource links | Filter above a compact activity table |

- **IAM.** An allow policy binds principals to roles. Grant and revoke each operate on a principal/role pair. Existing principals can hold multiple roles and inherited roles are edited at their source. The UI groups by principal while state stores one row per grant. [Manage access to projects, folders, and organizations](https://docs.cloud.google.com/iam/docs/granting-changing-revoking-access)
- **Compute Engine.** Instances are zonal. Creation needs a machine configuration and boot source. Start and stop change lifecycle status. Reset restarts a running instance and is recorded separately from start. The interface exposes only local synthetic operations. [Create and start a Compute Engine instance](https://docs.cloud.google.com/compute/docs/instances/create-start-instance) · [Instance lifecycle](https://docs.cloud.google.com/compute/docs/instances/suspend-stop-reset-instances-overview) · [Instances resource](https://docs.cloud.google.com/compute/docs/reference/rest/v1/instances)
- **Cloud Storage.** A bucket belongs to a project and carries location, default storage class, and access settings. Objects belong to a bucket and carry independent metadata. A local file picker supplies object names and sizes and the app records metadata in Harbor state. [Create a bucket](https://docs.cloud.google.com/storage/docs/creating-buckets) · [Bucket fields](https://docs.cloud.google.com/storage/docs/json_api/v1/buckets) · [Upload objects](https://docs.cloud.google.com/storage/docs/uploading-objects)
- **Cloud Billing.** Billing account scope drives cost reports and budget scope. A project links to a billing account. Budget targets and percentage thresholds are separate fields. Usage reports group independently of budget settings. [Analyze costs in Reports](https://docs.cloud.google.com/billing/docs/how-to/reports) · [Manage budgets and alerts](https://docs.cloud.google.com/billing/docs/how-to/budgets) · [Manage project billing](https://docs.cloud.google.com/billing/docs/how-to/modify-project)

## State and design references

Projects own IAM grants, VM instances, and buckets. Objects reference buckets. Projects point to their current billing account, while costs reference the account that incurred them. Budgets belong to an account and can target a subset of projects. Activity records link mutations to their actors and resources. See [the state model](data_model.md) for record shapes and [the design guide](../DESIGN.md) for layout and local asset specifications.

Authentication, payment handling, email delivery, live cloud infrastructure, and storage of file contents fall outside this account workspace. The visual reference is the original design guide, with a state-derived CSS graphic and locally rendered components.
