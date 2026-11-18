# Patreon workflow research

This workspace serves the creator of Lantern Room, a fictional culture publication. Mara Chen uses it to publish essays, photo journals and listening notes, maintain paid membership levels, review member history, and send private updates. The interface begins in that account and uses English synthetic data.

## Feature inventory

| Priority | Feature | Implementation direction |
| --- | --- | --- |
| P0 | Creator workspace | Text wordmark, account identity, section navigation, direct routes and original local art |
| P0 | Harbor state | Await injected state on boot, then persist every committed mutation through the shared templates |
| P1 | Post library | Find published, scheduled and draft work by title, body, format and audience |
| P1 | Post editor | Draft, preview, duplicate, publish, schedule, edit and delete |
| P1 | Tier editor | Manage monthly price, description and benefits |
| P1 | Tier availability | Publish, unpublish and retire unlinked tiers |
| P1 | Member directory | Search, combine filters, sort, view details and export the current results locally |
| P1 | Member notes | Create, edit and remove internal notes |
| P1 | Compose and send | Send to a single eligible member or privately to several |
| P1 | Inbox and reply | Find a conversation, read, change the unread flag and reply |
| P2 | Reset filters | Restore section defaults |

## What the public documentation establishes

- A creator can draft, publish, schedule, edit, duplicate and delete posts. Post access can be public, for free or paid members, or based on selected tiers. The workspace uses explicit Draft, Schedule and Publish actions. An elapsed scheduled time can be shown from the runtime clock while the record stays unchanged until a creator action. [Posting to your Patreon](https://support.patreon.com/hc/en-gb/articles/115004048046-Posting-to-your-Patreon) · [Setting post access](https://support.patreon.com/hc/en-us/articles/37807653033997-Setting-post-access-for-your-Patreon-audience) · [Editing published posts](https://support.patreon.com/hc/en-gb/articles/204606075-Editing-your-published-posts)
- Paid tiers have a name, price and benefits. Unpublishing hides a tier from new members while keeping existing relationships and allowing republishing. The workspace limits retirement to unlinked tiers and keeps historical records for verification. [Set up paid tiers](https://support.patreon.com/hc/en-us/articles/203913559-How-to-set-up-paid-tiers-and-benefits) · [Tier publishing and retirement](https://support.patreon.com/hc/en-gb/articles/360027992451-Best-practices-for-increasing-your-tier-prices)
- The Relationship manager supports searching member names and email addresses, filtering by tier and status, reviewing notes and amounts, and exporting filtered rows. The workspace puts those functions in Members and gives notes an edit history timestamp and author. [Relationship manager](https://support.patreon.com/hc/en-us/articles/360045516212-How-to-use-your-Relationship-manager)
- Creator direct messages reach current and former paid members. A send to multiple members goes into separate private threads, with replies coming back individually. The workspace includes explicit read and unread controls so changing the flag is an observable user action. [Direct message members](https://support.patreon.com/hc/en-us/articles/203913429-How-to-direct-message-members)

## View composition

Posts is the default landing page. A publication image and creation action anchor the heading. Tabs, search and compact filters sit just above a structured library. The editor pairs writing with audience and scheduling controls, and Preview displays the draft without changing it.

Tiers uses a card grid with readable price and benefit lists. Availability actions appear alongside the editor and name the affected tier in the confirmation. Members uses a searchable table and a detail view for membership facts, private notes and a message entry point. Messages puts conversation search and snippets next to the active thread on wide screens, with separate list and thread views on narrow screens.

## State and scope

Post audience restrictions reference tiers by ID. Member records link to current or historical tiers, while notes and transcripts use the member ID directly. A bulk send records a batch and its private message IDs. The proposed shapes and seed volumes are in [the data model](data_model.md). Visual tokens are in [the design guide](../DESIGN.md).

Authentication, checkout, billing changes and delivery to external services fall outside the creator workflows. Local seed assets and the same-origin Harbor API let the workspace run offline.
