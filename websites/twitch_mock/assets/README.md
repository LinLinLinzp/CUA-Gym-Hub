# Twitch creator workspace research

Twitch’s Creator Dashboard lets a broadcaster prepare a stream, manage recordings, moderate the community, and maintain a public-facing schedule. Fieldnote Live is a synthetic culture channel for printmaking, ceramics, book arts and photography. The broadcaster prepares shows and manages publishing, an editor looks up and curates recordings, and moderators review chat and enforce channel rules. The account opens as owner Rhea Mercer with two seeded moderators visible in history. [Creator Dashboard](https://help.twitch.tv/s/article/creator-dashboard) · [Channel roles](https://help.twitch.tv/s/article/Managing-Roles-for-your-Channel)

## Product findings and local layout

| Priority and view | Layout and workflow |
| --- | --- |
| P0 · Overview | Horizontal creator navigation and signed-in channel identity. One stream-info card with an edit action, alongside shortcuts linked to actual schedule, video and moderation data. |
| P1 · Stream Settings | Stream info summary with an editor for title, category, tags, language, Go Live Notification and classification labels. Separate VOD defaults section for storage, auto publication and category exclusions. Changing the defaults affects policy for future broadcasts. |
| P1 · Video Producer | Search and type/visibility tabs or filters above a paged library. Cover, duration, metadata, status and action button on each row. Use a details dialog for metadata and a contextual selection bar for publishing, unpublishing and deletion. Cover art is decorative. |
| P1 · Moderation | Searchable viewer directory and selected viewer card side by side. Show current restriction, recent messages and actions for the viewer. Put the filterable cross-viewer Mod Actions log below. Restriction changes and individual message removals appear in the log after saving. |
| P1 · Schedule | Month navigator and dated agenda. Add one-time or weekly streams, edit an entry or series, cancel and restore an individual occurrence, delete an entry or series, and configure a vacation interval. Show the creator’s timezone near the agenda and in the form. |
| P2 · Quick navigation | Optional search of the four local destinations, including keyboard focus and selection. |

- Stream Info combines searchable category, custom tags and classification labels. Go Live Notification is editable separately from the title. Store Past Broadcasts, Always Publish VODs and Excluded Categories belong together. [Stream Info](https://help.twitch.tv/s/article/stream-from-browser?language=en_US) · [Tags](https://help.twitch.tv/s/article/guide-to-tags) · [Notifications](https://help.twitch.tv/s/article/how-to-use-go-live-notifications?language=en_US) · [Classification labels](https://help.twitch.tv/s/article/content-classification-labels) · [On-demand content](https://help.twitch.tv/s/article/video-on-demand?language=en_US)
- Video Producer organizes past broadcasts, highlights and uploads and supports changing publication individually or in bulk. Use those content types in the library fixtures and exercise the same metadata and publication actions through the local UI. [On-demand content](https://help.twitch.tv/s/article/video-on-demand?language=en_US)
- Mod View centers the viewer’s chat and moderation history. Model timeouts as expiring restrictions, bans as open-ended restrictions, and unbans or timeout removal as separate actions. Deleting a message targets its own id. [Mod View](https://help.twitch.tv/s/article/mod-view) · [Moderating Twitch Chatrooms](https://dev.twitch.tv/docs/chat/moderation/)
- Schedule semantics use one-time or weekly slots. Dates use the displayed timezone, an individual cancellation is distinct from changing a series, and vacations use a separate interval. The fixture account is an Affiliate so both frequencies appear. [Channel Page Setup](https://help.twitch.tv/s/article/channel-page-setup?language=en_US) · [Scheduling Broadcasts](https://dev.twitch.tv/docs/api/schedule/)

## Data and boundaries

The store joins categories, creators, viewers and the four workflow collections with stable string ids. Append-only audit history links to edited records. Typed timed restrictions and recurring schedule exceptions let the verifier distinguish active state from history. See the [data model](data_model.md) for shapes and fixtures and the [TODO](../TODO.md) for acceptance criteria.

The research uses Twitch’s public documentation for behavior. [DESIGN.md](../DESIGN.md) specifies an original visual system and local artwork treatment. Broadcasting, account management, media processing, payments, and external actions are outside the local account workspace.
