# Box workflow research

This workspace supports a synthetic organization’s document lifecycle. Morgan Ellis coordinates team folders and invites project members, reviews documents as an assignee, and manages retention as the workspace administrator. Staff locate files by project path or search. Records staff apply policies to selected folder trees and review coverage from policy and folder details.

## Feature inventory

| Priority | Area | Views and interactions |
| --- | --- | --- |
| P0 | Shell | Files, Tasks and Governance in a horizontal header. Global search, a signed-in identity indicator, route-safe loading and missing-record views. |
| P0 | Runtime | Fixed initial state, session-scoped state transport, one save per business action, and an observable schema. |
| P1 | Folders | Browse root and nested folders, sort and filter contents, search by name and navigate by path. Create, rename, move, trash and restore folders through labeled forms and row menus. |
| P1 | Collaborators | Manage access from a folder's row or header. Show owner, direct and inherited roles, and pending invites. Invite, change direct roles and remove direct access. |
| P1 | Tasks | Open file preview, create general or approval tasks in Activity, and review or act from Activity or Task Center. List assigned and created tasks with type, status, file and due date. |
| P1 | Retention | Governance policy list and detail, create and start policy, folder picker, coverage display, permissible edits and retirement. |

## Public workflow references

- Box documents creating folders from the current location, optional invitation at creation, and role selection. The mock uses separate row actions for rename, move and trash, and a navigable picker for destinations. [Box basics](https://support.box.com/hc/en-us/articles/360044196373-The-Basics-of-Box) · [Move and copy](https://support.box.com/hc/en-us/articles/360044196593-Moving-and-Copying-Files-Folders) · [Trash](https://support.box.com/hc/en-us/articles/360044196093-Managing-Trash)
- Folder access cascades to descendants. The mock shows access provenance, differentiates a known coworker from an outside invitee awaiting acceptance, and offers direct role management. [Box user basics](https://support.box.com/hc/en-us/articles/20727423579155-Getting-Started-Box-User-Basics) · [Permission levels](https://support.box.com/hc/en-us/articles/360044196413-Understanding-Collaborator-Permission-Levels) · [Managing collaborators](https://support.box.com/hc/en-us/articles/360044196273-Managing-Collaborators)
- The file preview is the entry point for general and approval tasks. A task can have multiple assignees, an optional due date and an any-versus-all completion rule. Task Center provides a second entry point for assignees to act. [Adding tasks](https://support.box.com/hc/en-us/articles/360043695954-Adding-Comments-and-Tasks) · [Task Center](https://support.box.com/hc/en-us/articles/360044195793-Using-the-Box-Task-Center)
- Folder-scoped retention covers subfolders. Modifiable and non-modifiable policies have different edit rules, and content moved out of a covered folder can remain under retention. The mock records both the policy configuration and the folder coverage relationship. [Retention overview and edit rules](https://support.box.com/hc/en-us/articles/360043694374-About-Retention-and-Retention-Policies) · [Governance settings](https://support.box.com/hc/en-us/articles/1500007168782-Governance-Settings) · [Adding folders to a policy](https://support.box.com/hc/en-us/articles/7765262877971-Adding-Folders-to-a-Retention-Policy)

## Records and local assets

The directory and signed-in identity supply people for folder ownership, invitations, and assignments. Folders form a parent tree. Files link that tree to tasks. Retention policies link to folders through assignment records. The [data model](data_model.md) contains field shapes, fixed seed targets, and transaction rules.

Use the original composition and tokens in [DESIGN.md](../DESIGN.md). Author the file previews from synthetic project copy and use locally drawn file-type markers and initials. All forms and views operate within the pre-signed-in workspace. External delivery, real account access, and timed jobs fall outside the sandbox.
