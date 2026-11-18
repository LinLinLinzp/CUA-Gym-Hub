# Hootsuite workflow research

The training workspace follows a fictional community equipment and repair organization, Juniper Works. A content coordinator schedules announcements across social profiles. A social lead reviews teammate posts and returns specific feedback. A community manager keeps track of campaign conversations and owned posts through saved feeds. Maya Chen is the signed-in team member and has authored and received review requests in the fixture data.

## Product behavior and scope

| Priority | Area | Publicly documented behavior | Implementation scope |
| --- | --- | --- | --- |
| P0 | Workspace shell | Hootsuite groups publishing, planning, and approvals as related work. [Hootsuite publishing](https://www.hootsuite.com/platform/publishing) | A horizontal header with Planner, Approvals, Streams, and a persistent New post action. Local routes and time-zone-aware formatting. |
| P1 | Planner | The calendar exposes status/account filters and lets users open, edit, and reschedule unpublished posts. [Manage your content calendar](https://help.hootsuite.com/s/article/manage-content-calendar) · [Create and schedule content in a calendar](https://help.hootsuite.com/s/article/create-and-schedule) | Week and List views, profile/status/text filters, scheduled post creation, drafts, editing, rescheduling, and cancellation. |
| P1 | Approval requests | A scheduled post can be routed to a named teammate for review. [Ask a team member to approve your content](https://help.hootsuite.com/s/article/ask-for-approval) | One reviewer per request, with a pending post and a linked request saved together. |
| P1 | Approval decisions | Reviewers can approve or reject posts. Authors can revise rejected content and submit it again. [Approve content before it goes live](https://help.hootsuite.com/s/article/approve-posts) | Assigned to me, Requested by me, and History, with clear decision controls, saved feedback, and a linked request on resubmission. |
| P1 | Stream boards | Boards hold several feeds and can be named, ordered, and removed. Stream order within a board is configurable. [Organize your streams](https://help.hootsuite.com/s/article/organize-streams) | A board index, side-by-side feed columns, board creation, rename, and removal, plus stream ordering and movement across boards. |
| P1 | Stream feeds | Streams include profile-specific feeds. X supports mentions and saved searches. [Overview of Streams](https://help.hootsuite.com/s/article/overview-streams) · [Create an X stream](https://help.hootsuite.com/s/article/create-x-stream) | My Posts for connected profiles, plus Mentions and Keyword search for X. Feed cards are derived from the synthetic item collection. |

## View inventory

- **Planner** has one filter toolbar across Week and List. Opening a post reveals a detail pane or composer with its profile selections, copy, and schedule. Calendar clicks set a starting date. The List view lets users locate a post independent of the current week.
- **Approvals** puts a filterable request list next to the actionable post preview. Pending decisions and past requests present the corresponding reviewer, timestamps, and notes. The composer is shared with Planner for revisions.
- **Streams** has a board index and one scrollable region for the selected board's columns. Each column header identifies the profile, feed type, and optional saved query. Board and stream menus contain labeled configuration actions.

## Data and fixtures

The workspace links teammates and connected profiles to posts. Approval requests and decisions link to posts and workshop team members through stable IDs. Stream boards organize per-profile filters over a fixed set of feed items. See the [data model](data_model.md) for record definitions, fixture counts, and observable writes. The [design guide](../DESIGN.md) defines the original layout and local CSS visuals.

## Phase boundaries

P0 and P1 cover setup and the three seed workflows. There are no P2 requirements. The account starts signed in with fictional people, channels, and posts. Authentication, account connection, multi-stage approval policy, publishing to social accounts, and live feed communication are outside the scenario.
