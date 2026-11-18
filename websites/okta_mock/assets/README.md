# Okta workflow research

This workspace covers routine directory administration for Acme Workspace. A directory admin onboards staff, maintains profiles and controls directory status. A group admin organizes access by team and reviews membership. An app admin assigns an application to an individual or group and checks how a person receives access. These roles describe tasks in the same signed-in workspace.

## Public workflow references

- The People workflow supports manual creation with name, username and email, followed by profile, group and app management. Status filters help admins find people, and suspension preserves group and app relationships. User deletion follows deactivation. [Add users manually](https://help.okta.com/en-us/Content/Topics/users-groups-profiles/usgp-add-users.htm), [Manage users](https://help.okta.com/okta_help.htm?id=ext_Directory_People), [Suspend and unsuspend users](https://help.okta.com/en-us/content/topics/users-groups-profiles/usgp-suspend.htm), [Deactivate and delete user accounts](https://help.okta.com/en-us/Content/topics/users-groups-profiles/usgp-deactivate-user-account.htm)
- Groups have a searchable directory with a name and optional description. Membership gives people access to resources granted to their group. [Groups](https://help.okta.com/en-us/Content/Topics/users-groups-profiles/usgp-about-groups.htm), [Create a group](https://help.okta.com/en-us/content/topics/users-groups-profiles/usgp-groups-create.htm), [Manually assign people to a group](https://help.okta.com/oie/en-us/content/topics/users-groups-profiles/usgp-assign-group-people.htm)
- App assignments can target people or groups. The app's Assignments view is a primary entry point. Removing access inherited through a group requires changing the membership or the group's grant. [Assign app integrations](https://help.okta.com/en-us/Content/Topics/Apps/apps-assign-applications.htm), [Unassign users from applications](https://help.okta.com/en-us/Content/topics/users-groups-profiles/usgp-unassign-apps.htm)

## Feature inventory and screen layout

| Priority | View | Behavior |
| --- | --- | --- |
| P0 | Workspace shell | Horizontal navigation, visible workspace and admin identity, stable deep links, isolated Harbor state |
| P1 | People directory | Summary count controls, search, status filtering, pagination and Add Person drawer |
| P1 | Person detail | Name, username and status in the header. Profile, Groups and Applications tabs. Profile editing and context-valid lifecycle actions |
| P1 | Groups directory | Search, source filtering, member count, pagination and Add Group drawer |
| P1 | Group detail | Editable name and description, Members and Applications tabs, searchable membership picker and confirmed removals |
| P1 | Applications directory | Search, status filter, pagination, app names, categories and counts |
| P1 | Application detail | People and Groups assignment lists, searchable assign picker, grant removal and access-source labels |
| P2 | Repeated data entry | Save and Add Another for sequential person or group creation |

People, groups and applications have stable IDs. Membership and app grants are separate relationship records and power every related view. A structured activity record accompanies each business action. See [state model](data_model.md) for fields and examples and [design](../DESIGN.md) for sizing, hierarchy and design tokens. The original visual system uses local initials, app monograms and CSS glyphs.

The scenario begins inside the admin workspace and uses synthetic directory records. Passwords, authentication, factor resets, external directory synchronization and app provisioning are outside the seeded workflows.
