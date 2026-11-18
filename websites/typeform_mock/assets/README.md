# Typeform workflow research

The account serves three overlapping roles. A workspace coordinator organizes and publishes forms. A form author edits prompts and routes respondents to relevant follow-ups. A results reviewer finds individual submissions and exports the subset they need.

| Priority | Features | Main view |
| --- | --- | --- |
| P0 | Signed-in account shell, workspace navigation, deep links, isolated Harbor state | Workspace rail and routed main area |
| P1 | Search, filter, and sort forms. Create, rename, duplicate, move, and delete | Workspace list and row actions |
| P1 | Add and reorder questions, edit options and endings, preview, publish, close or reopen | Form builder and local respondent route |
| P1 | Create, edit, reorder, and remove branch rules with optional fallback | Logic panel and preview |
| P1 | Submit, search, filter, inspect, export, and delete responses | Respondent route and results table |
| P2 | Inspect the logic diagram and answer distributions | Logic and results secondary panels |

Typeform's workspace groups forms and exposes lifecycle actions. Its builder supports question ordering and lets edits accumulate before they are published to the live form. The local account uses the same draft/published behavior and assigns every publish a version so older responses remain interpretable. [Workspaces](https://help.typeform.com/hc/en-us/articles/360029612971-Workspaces) · [My first form](https://help.typeform.com/hc/en-us/articles/360053660271-My-first-form)

Branching rules can jump to a question or ending. Rules evaluate in order and the first match wins. A fallback applies when the conditions do not match. The local editor uses forward targets and typed single conditions so the preview and published route can use the same deterministic evaluator. [What is branching logic?](https://help.typeform.com/hc/en-us/articles/360029116392-What-is-branching-logic) · [Logic Map](https://help.typeform.com/hc/en-us/articles/360057591531-Logic-Map)

The responses view supports searching answer text, filtering, opening individual responses, and selecting rows for export or deletion. The local implementation downloads CSV on the device. [Working with your responses](https://help.typeform.com/hc/en-us/articles/360029253732-Working-with-your-responses) · [Export your responses](https://help.typeform.com/hc/en-us/articles/360029253572-Export-your-responses)

Stable form, question, and choice IDs keep logic and answers linked when display text changes. The local model stores historical question and choice labels on each answer. Typed answers and ISO timestamps reflect the concepts described in the API reference. [Create form reference](https://www.typeform.com/developers/create/reference/create-form/) · [Responses JSON explanation](https://www.typeform.com/developers/responses/JSON-response-explanation/) · [Local data model](data_model.md)

The training account starts signed in as Morgan Ellis. Authentication, billing, integrations, hosted uploads, and email delivery sit outside the local workflows. [DESIGN.md](../DESIGN.md) specifies the original account interface and the locally drawn decorative patterns.
