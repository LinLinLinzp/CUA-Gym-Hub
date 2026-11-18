# Firebase workflow research

This workspace gives a signed-in project operator four connected administrative workflows with synthetic records. The synthetic project, Northstar Field Notes, represents a team that publishes outdoor field reports. A support operator manages end-user records, a data maintainer updates Firestore documents and rules, and a release operator controls which Hosting version is live.

## Workflow inventory

| Priority | View | Interactions |
| --- | --- | --- |
| P0 | Overview and shell | Show project, operator, service counts and recent actions. Link to each product and retain the Harbor session when navigating. |
| P1 | Authentication | Find users by identifier or UID, filter by provider or status, add an email/password record, disable, enable and delete. |
| P1 | Cloud Firestore | Browse collection paths and typed documents, create collections and documents, edit fields, and delete selected subtrees. |
| P1 | Firestore Rules | Inspect published source and version history, edit a draft, simulate a supported rule, publish and restore earlier source. |
| P1 | Hosting | Switch sites, inspect live and historical releases, roll back and manage synthetic custom-domain records. |

## Product behavior used in the plan

- Authentication user records carry a stable UID, provider information and account metadata. The workflow uses administrator actions on project users. The workspace operator opens already signed in. [Firebase Authentication user management](https://firebase.google.com/docs/auth/admin/manage-users)
- Firestore collections contain documents. Documents can contain typed fields and subcollections. Collection creation includes its first document, and subtree removal is distinct from editing a field. [Firestore console management](https://firebase.google.com/docs/firestore/using-console) · [Firestore data model](https://firebase.google.com/docs/firestore/data-model)
- Firestore Rules supports editing source, running a Playground check and publishing. The local workspace supports a documented simulation subset and keeps version history for the publish and restore workflows. [Manage and deploy Firebase Security Rules](https://firebase.google.com/docs/rules/manage-deploy) · [Rules Playground](https://firebase.google.com/docs/rules/simulator)
- Hosting separates versions from releases. A rollback creates a release pointing to the earlier version, so the release feed keeps both records. Custom domains have setup states and associated DNS records. [Manage Hosting resources](https://firebase.google.com/docs/hosting/manage-hosting-resources) · [Connect a custom domain](https://firebase.google.com/docs/hosting/custom-domain)

## Layout and data handoff

Overview uses a project summary and linked service cards. Authentication uses a searchable account table. Firestore uses a path breadcrumb and collection, document and field panes. Rules combines a source editor, Playground and version list. Hosting combines site selection with independent domain and release panels. [Original design specification](../DESIGN.md)

The model uses project and operator records, separate project-user and Firestore arrays, active version pointers for Rules and Hosting, and an activity array with action names, actor IDs, timestamps and related IDs. All seeded users and custom domains use reserved example data. Auth credentials, cloud enforcement, real deployment and DNS operations are outside the workspace scope. [State model](data_model.md) · [Implementation checklist](../TODO.md)
