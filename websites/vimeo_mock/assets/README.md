# Vimeo account workflow research

Northline Documentary Studio is a synthetic film team. The account workspace gives a producer a searchable library, a curator a way to assemble screenings, and an editor a place to exchange time-coded notes with colleagues. Fictional account and content details are defined in the [state model](data_model.md).

| Priority | Workflow | View and interaction |
| --- | --- | --- |
| P0 | Workspace and session | Horizontal account navigation, direct routes, stable sid, neutral startup, and empty or injected records |
| P1 | Video library | Search and filter catalog cards or rows. Open video details to inspect media and edit metadata. Upload a local file or confirm deletion from the account. |
| P1 | Showcases | Browse collection covers, create a showcase, edit its settings, and manage the ordered member list from a searchable picker. |
| P1 | Privacy | Open Share from the video or showcase header. Inspect the current mode, choose who can view the item, and save. |
| P1 | Review comments | Open a video review, scrub to a timestamp, leave a comment, reply, and resolve or reopen a thread. |
| P2 | Bulk showcase membership | Select videos in the Library and add them to chosen showcases in one action. |

## Product behavior

- Libraries support browsing, search, sorting, privacy filters, and per-video management. Video metadata includes a title and description. The plan uses an explicit Save details action so editing drafts remain transient. [Vimeo library overview](https://help.vimeo.com/hc/en-us/articles/12426274382609-Vimeo-library-overview) · [Vimeo Library search](https://help.vimeo.com/hc/en-us/articles/19832457988625-How-to-search-your-Library) · [Vimeo title and description editing](https://help.vimeo.com/hc/en-us/articles/28057066916369-How-to-update-your-video-s-title-and-description)
- Showcases collect videos into a shareable group and a video can belong to multiple showcases. Membership can be added from a Library picker and arranged within a showcase. The plan supports up/down controls so custom ordering can be exercised with a mouse or keyboard. [Creating a showcase](https://help.vimeo.com/hc/en-us/articles/12426259177105-How-to-create-a-showcase) · [Adding videos](https://help.vimeo.com/hc/en-us/articles/15004749856529-How-to-add-videos-to-a-showcase) · [Arranging showcase videos](https://help.vimeo.com/hc/en-us/articles/15004751322129-How-to-customize-videos-in-my-showcase)
- Vimeo describes different viewing modes for individual videos and showcases. Showcases have a Public, Password, Embed only, or Private setting depending on the account. The synthetic workspace exposes those settings and all five supported video modes. [Video viewing options](https://help.vimeo.com/hc/en-us/articles/12426199699985-About-video-privacy-settings) · [Showcase privacy](https://help.vimeo.com/hc/en-us/articles/15004792582545-How-to-manage-my-showcase-s-privacy-settings)
- Collaborator comments serve the editing process and can link a reviewer to a moment in the player. Resolving the parent also resolves its replies. The planned Review route models feedback from the active account with seeded collaborators. [Review link behavior](https://help.vimeo.com/hc/en-us/articles/12426192100113-How-to-use-and-manage-video-review-links) · [Vimeo comment management](https://help.vimeo.com/hc/en-us/articles/32677364621841-How-to-manage-comments-on-my-video)

## Views and records

[DESIGN.md](../DESIGN.md) defines the original appearance and local media direction. The Library reads video records. Showcases reference videos by ordered IDs. Review threads reference their video and author and group direct replies under a root ID. Activity records describe committed changes, including destructive operations.

The workspace opens in the synthetic account and focuses on content management. Authentication, subscriptions, external invitations, external embeds, public discovery, and production encoding are outside the workflow brief.
