# Product research and screen inventory

Google Search Console helps site owners manage website scopes and diagnose what Google can discover, crawl and index. In this account, an SEO lead switches between managed sites, a publisher checks whether a changed page is eligible for indexing, and a technical operator follows up on failed sitemap submissions.

## Workflow research

- **Properties.** The product distinguishes a Domain property, which spans the domain's subdomains and protocols, from a URL-prefix property for a particular origin and prefix. Owners can defer verification and revisit a pending property. Domain properties use DNS verification. URL-prefix properties offer methods that include an HTML file and an HTML tag. The settings page includes an action to remove the current property from the account's list. [Add a property](https://support.google.com/webmasters/answer/34592?hl=en), [Verify ownership](https://support.google.com/webmasters/answer/9008080?hl=en), [Property settings](https://support.google.com/webmasters/answer/7687465?hl=en-GW)
- **URL Inspection.** Start with a full URL in the current property's scope. The index report can explain a verdict with discovery, crawl, fetch, indexing and canonical information. Running a live test creates a separate perspective on current availability. A valid request queues indexing, so checking again can still show the previous index result. [Inspect and troubleshoot a page](https://support.google.com/webmasters/answer/12482179?hl=en), [URL Inspection tool](https://support.google.com/webmasters/answer/9012289?hl=en-SA)
- **Sitemaps.** Submit the URL of a sitemap within the current property and follow its status and discovery counts. The details view explains fetch and parsing issues. Submitting again is useful after a correction. Removal hides the sitemap from the report while retaining prior discovery history. [Sitemaps report](https://support.google.com/webmasters/answer/7451001?hl=en)
- **State vocabulary.** The public API references inform field names and distinctions such as property permission, index inspection results and sitemap submission metadata. The app uses its own local records, including separate live-test and indexing-queue records. [Sites resource](https://developers.google.com/webmaster-tools/v1/sites), [URL inspection resource](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect), [Sitemaps resource](https://developers.google.com/webmaster-tools/v1/sitemaps)

## Screen inventory

| Priority | View | Layout and interactions |
|---|---|---|
| P0 | Account shell and overview | Dark horizontal workspace strip with the text brand, property switcher and account identity. Second horizontal row with four navigation links and the persistent inspection input. Overview leads with the selected property and shows two compact status cards and recent inspections. |
| P1 | Properties | Wide searchable table with type and verification filters. Add property opens a right-side sheet with a type choice, scope entry and local verification step. A detail page carries verification status and the remove action. |
| P1 | URL Inspection | Page form and recent URL history when there is no submitted URL. Result view shows the URL, a status summary with primary actions, Google Index and Live Test tabs, and expandable groups for discovery and crawl details. |
| P1 | Sitemaps | Submission form above the submitted table. Search, status filter and pagination support larger lists. Details show a status summary and issue list, with retry and removal controls reachable from the record. |
| P2 | Overview drilldowns | Optional links from property-scoped status summaries into filtered reports. |

[DESIGN.md](../DESIGN.md) specifies the original visual system. [The state model](data_model.md) maps the user journey to account, property, inspection and sitemap records. The app boots into a synthetic account, verifies ownership locally, and generates inspection results from fixed fixtures. This phase covers website properties and excludes authentication, real crawl and verification integrations, platform properties and unrelated reports.
