# TikTok Studio workflow research

TikTok Studio gives creators a workspace for handling content, feedback, and performance. TikTok describes uploading and editing content, managing published and scheduled posts, searching and filtering comments, and reviewing account and content performance. Those actions determine this project's routes and controls. [TikTok Studio product announcement](https://newsroom.tiktok.com/helping-creators-bring-creativity-to-life-with-tiktok-studio?lang=en)

The fictional creator, Mara Ellis, runs Field Notes on Culture. She publishes short English-language clips about community archives, typography, craft, and local arts spaces. An independent creator uses the workspace to plan a publishing week and respond to viewers. An editor working on the same kind of culture account would use the same tools to resume drafts, review post settings, and export results for a recap. The workspace opens under one synthetic creator identity.

## Feature inventory

| Priority | View | Behavior and layout |
| --- | --- | --- |
| P0 | Account shell and Overview | A forest masthead with horizontal navigation and the account context anchors an ivory workspace. Overview places a trend card next to drafts, with recent publications and unanswered comments below. Each module links directly to its working view. |
| P1 | Posts and New post | A searchable publication table shows cover, caption, status, audience, date and performance. The composer pairs a form with a vertical media preview and supports publication, scheduling and editing. Published post rows lead into individual analytics. |
| P1 | Drafts | A card grid emphasizes covers, media readiness and edit time. Reopening a draft restores the composer. Creators can update, discard, or convert a draft into a publication. |
| P1 | Comments | A searchable inbox keeps post context beside each comment. Replies appear inline. Heart and delete actions are available per row, with filters for post and reply status. |
| P1 | Analytics | Period controls sit above metrics and a trend chart. A ranked post list links to a scoped report. Report actions save a dated snapshot or download a local CSV. |
| P2 | Bulk comment deletion | Selection in the comments inbox allows one confirmed action across multiple audience comments. |

## Research decisions

- The composer uses the familiar sequence of choosing a video, setting its caption, cover, audience and interactions, then posting now or choosing a scheduled time. The workspace stores scheduled records for verification and displays their due time. [TikTok web scheduler guide](https://ads.tiktok.com/business/en-US/blog/introducing-video-scheduler-now-you-can-plan-tiktoks-in-advance)
- TikTok's help describes drafts as work saved before publication. The dedicated Drafts route and Harbor-backed draft persistence are project design decisions for the required desktop workflow. [TikTok guide to editing, posting, and deleting](https://support.tiktok.com/en/using-tiktok/creating-videos/editing-posting-and-deleting)
- TikTok documents comment deletion on a creator's posts and account-specific post analytics links. The design places moderation in the Comments inbox and keeps a direct analytics action on each published row. [TikTok comment guide](https://support.tiktok.com/en/using-tiktok/messaging-and-notifications/comments) · [TikTok comment insights](https://support.tiktok.com/en/using-tiktok/growing-your-audience/comment-insights-on-tiktok)
- TikTok describes account and per-post performance and desktop exports. This design adds saved snapshots and records exports as explicit actions so Harbor can verify the chosen scope and dates. Post counters use the standard measures of views, likes, comments and shares. [TikTok Analytics tutorial](https://newsroom.tiktok.com/product-tutorial-tiktok-analytics?lang=en) · [TikTok video object](https://developers.tiktok.com/docs/en/tiktok-api-v2-video-object)

## Data and scope

The six state keys are the account, posts, drafts, comments, analytics samples, and analytics reports. Stable links tie drafts to converted posts, comments to posts and parents, and post-scoped analytics to publications. Explicit mutations produce structured records. See the [data model](data_model.md) and the acceptance checklist in [TODO.md](../TODO.md).

The project starts with the creator account already open so practice begins with the four workflows. Authentication, real account access, LIVE, payments, direct messages, and advanced video editing fall outside the SEED. [DESIGN.md](../DESIGN.md) specifies the original interface and local asset direction. Product research uses public textual documentation.
