# Twilio Console — Workflow research

The account workspace supports managing business phone numbers, grouping SMS senders under Messaging Services, and investigating message delivery. A telecom administrator acquires numbers and changes routing. An integration engineer manages senders and submits a local SMS. A support operator filters delivery logs, examines failed messages, and exports a matching set for review.

## Workflow and view inventory

| Priority | View | User interaction |
| --- | --- | --- |
| P0 | Overview and account frame | Navigate through the account rail, read aggregate counts and recent message activity, and open the three workflows. |
| P1 | Active Numbers | Search, filter, and sort a paged number table. Open a number by its phone-number link. |
| P1 | Buy a Number | Filter available inventory, review capabilities and monthly price, and confirm a selection. |
| P1 | Number Configuration | Inspect the SID and change friendly name and voice/SMS webhook settings. Confirm release and return to the current inventory. |
| P1 | Messaging Services | Search services and create a named service with a use case. |
| P1 | Service Details | Manage SMS senders, inbound handling, and delivery callback settings in labeled sections. |
| P1 | Send an SMS | Choose a number or service, enter recipient and content, and follow the success link to its delivery log. |
| P1 | Messaging Logs | Combine date, sender, recipient, SID, direction, and status filters. Export a matching CSV. |
| P1 | Message Details | Read the message SID and status, inspect delivery steps and any error, and return to the log list. |

## Public behavior references

- Twilio models available inventory separately from an acquired number. Owned numbers carry an SID, friendly name, capabilities, and voice and messaging routing fields. These concepts inform the local inventory and configuration pages. [Available numbers resource](https://www.twilio.com/docs/phone-numbers/api/availablephonenumberlocal-resource) · [Incoming phone number resource](https://www.twilio.com/docs/phone-numbers/api/incomingphonenumber-resource)
- Messaging Services group senders and share inbound handling and callback settings. The Message resource distinguishes a direct send entering `queued` and automatic service selection entering `accepted`. The local compose view records those initial statuses and chooses a sender in a fixed order. [Messaging Services](https://www.twilio.com/docs/messaging/services) · [Message resource](https://www.twilio.com/docs/messaging/api/message-resource)
- Messaging Logs use message IDs, date ranges, endpoints, directions, and statuses to locate traffic. Message details show delivery steps and errors. Filtered CSV export provides a concrete action whose row IDs and filter snapshot can be verified in Harbor. [Messaging Logs](https://www.twilio.com/docs/messaging/features/messaging-logs) · [Filter messaging logs](https://help.twilio.com/articles/55716143569819)

## Design and state handoff

The layout and tokens in [DESIGN.md](../DESIGN.md) are original. Build the wordmark as text, the activity chart in CSS, and use local system fonts. The view inventory and behavior come from public documentation.

See [data_model.md](data_model.md) for six top-level keys, stable IDs, synthetic examples, and relationships. Messaging Logs display the same message records created by Send an SMS. Export history records what the operator exported. Local forms, filters, pagination, and inspected rows are UI state.

The workspace starts with an assigned operator and fictional organization. Keep authentication, billing, porting, real messaging, and external webhook execution outside the sandbox scope so workflows work offline.
