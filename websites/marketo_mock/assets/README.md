# Marketo product research

Marketo Engage organizes marketing initiatives into programs, groups people into reusable audiences, and automates audience processing with Smart Campaigns. The account models an English-speaking demand operations team running webinars, trade shows, nurture programs and partner launches. Maya Chen is the signed-in marketing operations manager. Field marketers manage program attendance, database specialists maintain audience lists, and automation specialists configure and review campaign runs. [Adobe Marketo Engage developer documentation](https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/rest-api)

## Features and behavior

| Priority | Feature | User outcome |
| --- | --- | --- |
| P0 | Workspace navigation | Locate programs, lists and smart campaigns through searchable, sortable inventories and deep links. |
| P0 | Harbor runtime | Open a session-scoped account and persist every confirmed change for verification. |
| P1 | Program management | Create a program with a compatible type and channel, edit details, and archive or restore it. |
| P1 | Program participation | Add people and update channel-defined member statuses. |
| P1 | Static lists | Create an audience and add or remove specific people. |
| P1 | Smart lists | Save rules and preview the people who match them. |
| P1 | Smart Campaign setup | Select the owning program, specify audience rules or triggers, and order flow steps. |
| P1 | Smart Campaign lifecycle | Execute a local batch, schedule or cancel a future batch, or activate and deactivate trigger configuration. |
| P2 | Record activity | Read recent changes attached to the current asset. |

Programs belong in folders and track participation and success. Type and channel are selected at creation, and the channel determines the allowed member statuses. [Adobe Programs reference](https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/assets/programs), [program channel documentation](https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/administration/tags/create-a-program-channel)

Static membership is an explicit relationship between a list and a database person. Removing a membership keeps the person available elsewhere. Smart lists find people through saved rules. People can access shared lists in Database and scoped lists in the owning program. [Adobe static lists documentation](https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/core-marketo-concepts/smart-lists-and-static-lists/static-lists/understanding-static-lists), [Adobe smart lists documentation](https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/core-marketo-concepts/smart-lists-and-static-lists/understanding-smart-lists)

A batch campaign uses filters and processes a group at a specified time. Adding a trigger switches the mode to Trigger. Trigger activation requires a valid trigger and flow. The account models an immediate batch locally and records future schedules and trigger configuration for review. [Adobe batch and trigger documentation](https://experienceleague.adobe.com/en/docs/marketo/using/product-docs/core-marketo-concepts/smart-campaigns/creating-a-smart-campaign/understanding-batch-and-trigger-smart-campaigns), [Adobe Smart Campaigns reference](https://experienceleague.adobe.com/en/docs/marketo-developer/marketo/rest/assets/smart-campaigns)

## Workspace views

- **Programs** opens the inventory. Each detail header shows channel and status. Overview presents editable metadata, Members presents people and participation status, and Assets links to scoped lists and campaigns.
- **Lists** uses a shared inventory for Static and Smart. The static detail opens the member table and person picker. The smart detail shows saved rules and matching people in adjacent tabs.
- **Smart Campaigns** uses a program-filterable inventory. A detail opens the Smart List builder and provides Flow, Schedule and Results tabs. Schedule displays the controls applicable to the current mode and saved configuration.
- **Create and edit** use centered dialogs for short forms. Membership editing uses a drawer with a searchable, selectable table. Confirmations name the resulting action and the affected record.

Design measurements and component behavior are in [DESIGN.md](../DESIGN.md). The layout and visual tokens are original to this workspace.

## Data and scope

Folders contain programs. Lists are shared or linked to a program. Campaigns always link to a program. Program memberships and static-list memberships reference people by ID. Campaign runs record qualified people and applied flow steps. The [data model](data_model.md) defines the record keys and field values to expose through Harbor.

The account begins signed in and uses synthetic marketing data. Authentication, integrations, external delivery and background execution fall outside the program, list and campaign workflows. Future schedules and trigger activation remain inspectable in the account state.
