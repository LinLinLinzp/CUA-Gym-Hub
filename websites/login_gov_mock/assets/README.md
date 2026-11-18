# Login.gov workflow research

Login.gov provides sign-in and, when an agency requests it, identity verification. Agency services vary in the attributes they request, and users explicitly consent before those attributes are shared. The workspace opens with a synthetic account already signed in. [Login.gov developer guide](https://developers.login.gov/overview/)

## Users and tasks

- Someone preparing to use a service that requires identity verification can review prior attempts, start or resume a verification, and complete an online exercise or follow the local in-person path. The public journey describes identity review, contact confirmation, and an in-person option for eligible services. This workspace uses prefilled sample values and an explicit sample visit completion. [Verification overview](https://login.gov/help/verify-your-identity/overview/) · [In-person verification](https://www.login.gov/help/verify-your-identity/verify-your-identity-in-person/)
- A returning account holder can identify which services have access and change the email shared with a selected service. Public help describes choosing a partner-specific email during first-time consent, after identity verification, and from the connected-services page. [Partner email help](https://www.login.gov/help/manage-your-account/change-partner-email-address/)
- An account holder can review consent and revoke access. The local service catalog represents the action of starting from a partner service. Reconnecting repeats explicit consent and preserves prior activity. [Privacy Act statement](https://www.login.gov/policy/our-privacy-act-statement/) · [Integration flow](https://developers.login.gov/overview/)

## Views and feature inventory

| Priority | View | Purpose and controls |
| --- | --- | --- |
| P0 | Shared shell and account overview | Navigation, signed-in name, identity summary with next action, and connected-service count with link to manage access |
| P0 | State and routing | Fixed default world, per-session loading and persistence, Harbor endpoints, reload-safe routes, and resilient empty/large injected worlds |
| P1 | Identity | Status and verification history with method/outcome filters and service search |
| P1 | Verification | Method, sample identity, sample contact, review, and optional sample visit. Resume and cancel explicit attempts |
| P1 | Connected services | Search and sort current and historical connections, filter by state, and open connection details |
| P1 | Catalog and consent | Select a service, read the attribute list, select a shared email, meet the identity prerequisite if present, and grant consent |
| P1 | Connection details | Inspect history, change shared email, disconnect with confirmation, or reconnect with consent |

P2 has no planned features for this seed. [TODO.md](../TODO.md) defines the actions and acceptance evidence.

The overview uses two workflow cards. Identity and connection collections use readable status labels with subdued metadata and filters above the list. The verification and consent views use single-column forms. At narrow widths, navigation wraps, cards stack, and row actions stay visible. [DESIGN.md](../DESIGN.md) defines the original palette, layout and components.

The state model links the signed-in account to verified identity and attempt history, email choices, and service relationships with consent events. Opening and filtering views is read-only. A single user action writes each associated record together. [Data model](data_model.md)

The exercise covers outcomes under the user's control inside the account. Production sign-in, agency applications, actual verification, document or biometric capture, and outbound notifications are outside the exercise because they require external services or personal information.
