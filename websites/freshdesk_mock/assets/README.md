# Freshdesk workflow research

Freshdesk connects a shared support queue with individual conversations, deadline policies and reusable replies. In this account, Morgan Ellis is a support lead who handles tickets and administers routing policies and response templates. Agents triage and reply. Team leads monitor deadlines and assign work, and administrators maintain the policy and response libraries.

| Priority | Area | Planned behavior |
| --- | --- | --- |
| P0 | Account shell | Text wordmark, Tickets and Admin navigation, signed-in identity, direct routes and session-aware links |
| P0 | Harbor state | Load before rendering, preserve injected worlds, save explicit business actions in one transaction, expose records via `/go` |
| P1 | Ticket queue | Search, saved queue views, filters, sort, row selection, pagination and bulk actions |
| P1 | Ticket creation and triage | Existing or new requester, initial SLA assignment, editable properties, assignment and status changes |
| P1 | Conversation | Customer replies, private/public notes and optional status changes with a message |
| P1 | SLA policy administration | Matching conditions, per-priority targets, coverage hours, default fallback and policy precedence |
| P1 | Ticket SLAs | First and next response and resolution deadlines, completion and manual overrides |
| P1 | Canned response library | Folders, visibility, search, short codes, placeholders and response management |
| P1 | Composer insertion | Filter visible templates, preview, insert and send a personalized reply with template provenance |

## Public product references

The ticket list supports filtering by ticket properties and using views to find work. In ticket detail, reply and note are distinct actions, and agents can change the ticket status with a submission. The planned account uses a queue rail, table and separate properties rail to surface those behaviors. [Ticket list guide](https://support.freshdesk.com/support/solutions/articles/37559-filtering-tickets-using-views) · [Ticket reply and properties guide](https://support.freshdesk.com/support/solutions/articles/50000001138-replying-to-and-modifying-properties-of-tickets)

Freshdesk documents a default SLA, ordered matching, and targets for first response, later responses and resolution by priority. The local account uses an ordered policy list and a four-row matrix editor, with business or calendar time. [SLA policies guide](https://support.freshdesk.com/support/solutions/articles/37626-understanding-sla-policies)

Canned responses include folders, dynamically substituted placeholders, visibility and short codes. The local account uses a folder rail and searchable library, with an insertion picker in the ticket composer. [Canned responses guide](https://support.freshdesk.com/support/solutions/articles/37577-creating-common-reply-templates-with-canned-responses)

## Data and visual references

Use synthetic support cases around supplier onboarding, equipment delivery, shift access, billing and warehouse operations. Contacts and agents connect to tickets by ID. The policy selected for a ticket and the templates used in a reply remain traceable in the state. See [data model](data_model.md) for examples and the action-to-record map.

[Design system](../DESIGN.md) specifies the original account layout, colors and components. Build visuals with type, CSS and local generic icons. The account starts signed in, with customer communication represented by stored conversation entries. External delivery, authentication and third-party integrations are outside this workflow.
