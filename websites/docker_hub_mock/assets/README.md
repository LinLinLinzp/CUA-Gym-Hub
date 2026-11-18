# Docker Hub workflow research

The account UI serves two roles. A maintainer organizes repositories and image versions, checks image references and platforms, and cleans up stale tags. An organization owner groups people into teams and manages each team's access to repositories. The default user, Avery Chen, can exercise both paths in a synthetic organization.

## Product behavior

- A repository lives under a user or organization namespace. Creation uses a unique name in that namespace, a short description, and a public/private visibility setting. Description and visibility can be edited after creation. Repository names stay fixed. Deletion is a separate repository-level action. [Create a repository](https://docs.docker.com/docker-hub/repos/create/) · [Repository information](https://docs.docker.com/docker-hub/repos/manage/information/) · [Access management](https://docs.docker.com/docker-hub/repos/manage/access/) · [Delete a repository](https://docs.docker.com/docker-hub/repos/delete/)
- Tags identify image versions. Docker Hub shows them in a repository's Tags tab, exposes image details from the digest, and confirms bulk tag deletion. Immutable tags are protected from deletion. Docker documents creating a tag and pushing the image from the CLI. The proposed local Add tag action uses existing image metadata so the workflow can be exercised offline. [Tags on Docker Hub](https://docs.docker.com/docker-hub/repos/manage/hub-images/tags/) · [Immutable tags](https://docs.docker.com/docker-hub/repos/manage/hub-images/immutable-tags/)
- Teams group people within an organization. Repository permissions are separate from organization roles, with Read-only, Read & Write, and Admin levels. Deleting a team removes its access and leaves the organization's users and repositories available. The API reference treats team membership and repository access as distinct resources, reflected in the proposed state model. [Manage a team](https://docs.docker.com/accounts/organization/manage/manage-a-team/) · [Roles and permissions](https://docs.docker.com/security/roles-and-permissions/) · [Docker Hub API reference](https://docs.docker.com/reference/api/hub/latest/)

## Views and priorities

| Priority | View | Behavior and layout |
| --- | --- | --- |
| P0 | Account shell and state | Charcoal navigation rail with Docker Hub wordmark, Repositories and Teams navigation, signed-in identity, and a breadcrumb row. The shared Harbor state API backs every write. |
| P1 | Repository index | Title/action row, namespace and visibility filters, search and sort, and a paginated inventory table. |
| P1 | Repository create and General | Compact create form. The repository of record then opens with an editable overview, description, visibility chip and copyable image reference. |
| P1 | Repository Settings | Visibility controls above a distinct delete section with typed confirmation. |
| P1 | Tags and tag details | Filterable tag table with per-row and bulk selection, metadata detail, copyable pull reference, local retagging and delete confirmation. |
| P1 | Teams directory and details | Organization-scoped directory, team create/edit, member picker, member removal, repository grant summary and team deletion. |
| P1 | Repository Permissions | Team and permission selectors above current grants, with edit and revoke controls in each row. |

[TODO.md](../TODO.md) specifies acceptance behavior and each workflow's write set. [The data model](data_model.md) defines repository and tag identity, organization membership, team membership, repository grants, and structured activity. [DESIGN.md](../DESIGN.md) defines the original interface and local visual treatment.

The sandbox opens in a signed-in state. Authentication, subscriptions, registry operations, and invitations require external systems and fall outside the build scope. Functional tests stay on localhost with synthetic accounts.
