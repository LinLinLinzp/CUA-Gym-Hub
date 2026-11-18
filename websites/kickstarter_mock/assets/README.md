# Creator workflow research

Kickstarter lets creators fund a specific creative project through pledges. The creator defines the project story, funding goal and deadline, offers rewards, and communicates with backers during production and fulfillment. This account centers on Maya Chen, a publisher and producer managing English-language film, publishing, illustration and music projects. The portfolio and its artwork are synthetic. [Kickstarter for content creators](https://launch.kickstarter.com/content-creators)

## Workflow decisions

| Priority | Workflow and intended use | Research |
| --- | --- | --- |
| P0 | Creator account shell. The Projects catalog gives the creator direct entry to a campaign and its tools. The original catalog, project navigation and form layouts are specified in `DESIGN.md`. | [Creator Handbook](https://www.kickstarter.com/help/handbook) |
| P1 | Campaign. A project producer prepares the pitch, goal and funding deadline, then previews the page and launches. The local launch is an explicit status transition. The project form includes story and risks so the campaign is more than a funding card. | [Telling your story](https://www.kickstarter.com/help/handbook/your_story), [Funding](https://www.kickstarter.com/help/handbook/funding) |
| P1 | Rewards. A fulfillment coordinator creates pledge tiers and add-ons, with included items, estimated delivery, optional quantity limits and shipping destinations. Claimed rewards retain their original terms. | [Building rewards](https://www.kickstarter.com/help/handbook/rewards) |
| P1 | Backer surveys. A creator drafts collection questions after launch and sends after a successful campaign. The local workflow models one basic survey per campaign and a recipient snapshot. The view shows responses already recorded in the dataset. | [From launch to fulfillment](https://updates.kickstarter.com/how-to-run-a-kickstarter-film-project-from-launch-to-fulfillment/) |
| P1 | Updates. A creator saves progress notes and publishes public or backer-only updates. Use text, audience selection and local preview. Publication records the audience and date. | [Communicating with backers](https://www.kickstarter.com/help/handbook/updates) |
| P2 | Survey response browsing. Add filters for answered/pending and reward title, plus an individual response detail. | [Building rewards](https://www.kickstarter.com/help/handbook/rewards) |

## View inventory

| View | Layout and interactions |
| --- | --- |
| Projects | Brand masthead, page title with `New project`, search/status/sort toolbar and project cards with cover art and funding metadata. |
| Project overview | Compact status header and section links. The main area shows the project cover, short description, funding goal, amount pledged and backer count, plus links to the creator tasks. |
| Campaign and preview | Single-column editor grouped around basics, funding and story. Preview lays out the project cover, story, funding summary, active tiers and published public updates. |
| Rewards | Search and filter toolbar with detail links on reward names. The detail route shows a grouped editor for terms, quantities and delivery. Claimed rows remain inspectable. |
| Backer surveys | Survey status and a compact draft builder with ordered questions. A preview shows recipient inputs. The sent view uses recipient and response records to report completion. |
| Updates | Searchable, filterable list with a `New update` button. The editor shows title, body and audience, with a preview and audience-specific publish confirmation. |

## Data and boundaries

`account` identifies the active creator. Campaigns in `projects[]` own `rewards[]`, `backers[]`, `surveys[]` and `updates[]`. `surveyResponses[]` joins sent surveys and recipients. See `data_model.md` for field types and example records. Search, filter, sort and preview are transient UI interactions. Explicit saves, launches, archives, sends and publications are business actions with structured writes.

The workspace opens signed in. Payment, identity, pledging, external notifications and the full Pledge Manager sit outside the core creator workflows. Use the public documentation for workflow behavior and the original design spec for layout and assets.
