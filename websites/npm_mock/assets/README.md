# npm account workflow research

The account workspace brings together the packages a maintainer oversees, the scoped access tokens an automation engineer configures, and the organization resources an owner or administrator manages. It opens with Avery Chen signed in. The primary task paths are package maintenance, granular credential management, and organization governance.

## Build inventory

| Priority | Workspace | Core interaction |
| --- | --- | --- |
| P0 | Global navigation | Three account areas, breadcrumbs, deep links, and mobile navigation |
| P0 | Harbor state | Seed and injected worlds, session isolation, one save per successful action, readback via `/go` |
| P1 | Package inventory | Search, scope and visibility filters, sorting, pagination, overview and versions |
| P1 | Package settings | Change eligible visibility, deprecate with confirmation, restore |
| P1 | Token list and detail | Inspect masked tokens, permissions, resources, expiry, and last use |
| P1 | Token generation | Configure granular access and expiration, review, generate, copy once |
| P1 | Token revocation | Confirm single or bulk revocation and inspect revoked records |
| P1 | Organization directory | Search, filter by role, open overview, create a scope and its default team |
| P1 | Organization membership | Invite, revoke invitations, change roles, and remove members |
| P1 | Team administration | Create teams, assign members, grant package access, and remove custom teams |

## Workflow decisions and sources

- **Packages.** Use the package inventory as the default landing view, with a compact metadata table and a direct route to settings. Public/private changes apply to eligible scoped packages. Model deprecation as a status with a message so maintainers can find and restore deprecated packages from their inventory. [npm package visibility](https://docs.npmjs.com/changing-package-visibility/) · [npm package deprecation](https://docs.npmjs.com/deprecating-and-undeprecating-packages-or-package-versions/)
- **Access tokens.** Show a masked list and a dedicated generation form. Group package/scope permissions and organization permissions separately. Display the generated synthetic value once and keep only its masked form in state. Bulk selection belongs in the list, with a confirmation listing affected tokens. [Creating and viewing access tokens](https://docs.npmjs.com/creating-and-viewing-access-tokens/) · [Revoking access tokens](https://docs.npmjs.com/revoking-access-tokens/)
- **Organizations.** Use an overview plus Members, Teams, and Packages tabs. Organization creation establishes ownership and the default `developers` team. Invitations remain pending in this account. Existing organization members can join teams, whose package grants have explicit read or write access. Plan and role choices are synthetic account metadata. [Creating an organization](https://docs.npmjs.com/creating-an-organization/) · [The developers team](https://docs.npmjs.com/about-developers-team/) · [Organization permissions](https://docs.npmjs.com/managing-organization-permissions/) · [Team package access](https://docs.npmjs.com/managing-team-access-to-organization-packages/)

The [state model](data_model.md) defines ID relationships, optional fields, and seed coverage. The [design spec](../DESIGN.md) defines an original local visual system. Functional scope begins with the signed-in account and ends at local state, so auth, billing, registry publishing, and invitation delivery are outside the training flows.
