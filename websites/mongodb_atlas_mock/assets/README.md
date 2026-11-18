# MongoDB Atlas workflow research

MongoDB Atlas groups managed MongoDB deployments and their access settings by project. The console opens on an overview of the synthetic Signal Harbor organization and its Commerce Platform project. Avery Chen, the signed-in project owner, can switch projects, inspect clusters and manage database or project access. Other seeded roles make the lists useful for operators and reviewers practicing search, filtering and targeted changes.

## Workflow inventory

| Priority | View | Tasks and UI |
| --- | --- | --- |
| P0 | Project overview and shell | Project selector, signed-in identity, persistent overview/cluster/access navigation, linked project counts, deep links and workspace loading/empty states |
| P1 | Clusters | Name search, state/tier filters, paged inventory, cluster details, deploy with review, edit configuration, pause/resume and confirm termination |
| P1 | Database Access | Search for credentials by username, filter by status/role, add database users, assign roles, target selected clusters, set expiry, edit and delete |
| P1 | Project Access | Search the roster, grant member access or record pending invitations, change roles, confirm removal or cancel invitations |
| P1 | Network Access | Search and filter IP entries, validate exact addresses and CIDR ranges, grant permanent or temporary access, edit and confirm deletion |
| P2 | Activity | Filter and read the already persisted record of project changes |

## What informs the workflows

- Cluster choices span Free, Flex and Dedicated. Provider and region choices are related. Dedicated configuration can include sizing, backups and termination protection. Pause and resume belong to eligible dedicated deployments. The sandbox applies accepted changes immediately and records lifecycle transitions. [Manage clusters](https://www.mongodb.com/docs/atlas/manage-clusters/), [providers and regions](https://www.mongodb.com/docs/atlas/cloud-providers-regions/), [modify a cluster](https://www.mongodb.com/docs/atlas/scale-cluster/), [pause, resume or terminate](https://www.mongodb.com/docs/atlas/pause-terminate-cluster/)
- Database users carry database roles and can be scoped to selected clusters. Project users carry Atlas project roles. A current organization member can be granted project access directly, while an external email is represented as a pending invitation with expiry. [Database users](https://www.mongodb.com/docs/atlas/security-add-mongodb-users/), [project access](https://www.mongodb.com/docs/atlas/access/manage-project-access/), [Atlas user roles](https://www.mongodb.com/docs/atlas/reference/user-roles/)
- Network entries belong to a project and accept an address or CIDR. Temporary rules carry a duration and can be made permanent on edit. Entry comments and named row actions help users find and update the correct rule. [IP access list entries](https://www.mongodb.com/docs/atlas/security/ip-access-list/)

## Implementation references

The visual direction in [DESIGN.md](../DESIGN.md) defines an original masthead, horizontal menu, overview and list layouts using local CSS artwork. The [state model](data_model.md) defines the account, project and entity relationships plus the event structure read by Harbor. The [implementation plan](../TODO.md) assigns workflow priority, writes and acceptance checks.

The sandbox starts with a synthetic owner. Cloud infrastructure, login, external invitations, actual network access, billing and secret storage are outside the scenario. The docs serve as references for terminology and workflow behavior.
