# SurveyMonkey workspace research

SurveyMonkey supports an office team through three connected tasks. A survey owner designs a questionnaire, an operations coordinator decides how answers come in, and an analyst inspects those answers. The same person can work across all three roles in this pre-signed-in account. A participant uses the local collector link to complete the questionnaire.

## Workflow findings

| Priority | Area | Research translated into the workspace |
| --- | --- | --- |
| P0 | Shell and state | A survey library anchors navigation. Survey-specific routes share the selected survey and the same Harbor store. |
| P1 | Survey library | Search titles, filter by owner and status, sort by date, title or response count, and open a survey or use its row menu. |
| P1 | Survey design | Create a draft, edit questions and preview the respondent experience. Copying creates a separate draft with its own question IDs. |
| P1 | Collectors | Associate each web link or manual intake channel with a single survey. Manage availability at the collector level so several channels can operate independently. |
| P1 | Response entry | Account operators can transcribe an offline answer set. A local web link supports the participant form, closed state and completion state. |
| P1 | Analysis | Combine question summaries with individual responses. Apply the same filter set to both views and to CSV export. |
| P1 | Maintenance | Edit or delete an individual response, clear collector responses, delete an empty collector, or delete a survey with its related data. |

## View layouts

- **Library.** An indigo workspace rail opens into a light work area. The library header carries the create action, followed by three aggregate counts and the survey table. Search and filter controls sit directly above the table.
- **Design.** A survey header leads to Design survey, Collect responses and Analyze results. The design workspace has ordered question cards and a compact question-type panel. Editing uses labeled fields and explicit save and cancel actions. Preview uses the participant form with an exit action.
- **Collect.** The collector list shows status and response count side by side. Detail surfaces the local link or manual-entry action at the top, collector settings below, and close, reopen or data-clearing actions with their relevant context.
- **Analyze.** A shared filter row precedes either question summaries or an individual-response table. The response detail shows respondent, collector and timestamps before the answer set. Sparse and empty datasets have dedicated messages.
- **Participant entry.** A narrow, centered form uses native answer controls and an inline completion action. Closed and missing collectors have standalone message states. Preview and entry omit the account rail to keep the focus on the questions.

## Data and implementation

The [data model](data_model.md) defines survey ownership, the survey-to-collector relationship, the collector-to-response relationship and answer values linked to question IDs. Copy and deletion behavior preserve these relationships in the verifier-visible state. Result counts and status labels are derived from the records already present. The [design guide](../DESIGN.md) specifies the original visual treatment and local drawing assets.

Authentication and billing sit outside the signed-in workflow. Distribution remains local to the running site. Email delivery and external integrations are unnecessary for individual entry, manual transcription and results analysis.

## Public workflow references

- Survey creation, question building and preview informed the Design route. [Creating Great Surveys](https://help.surveymonkey.com/en/surveymonkey/create/creating-a-survey/)
- Survey titles, status, owner filtering, sorting and copy behavior informed the library. [Managing Your Surveys](https://help.surveymonkey.com/en/surveymonkey/manage/managing-surveys/) · [Copying a Survey](https://help.surveymonkey.com/en/surveymonkey/manage/copying-surveys/)
- Distribution methods and independent open/closed availability informed collector types and management. [Ways to Send Your Survey](https://help.surveymonkey.com/en/surveymonkey/getting-started/sending-your-survey/) · [Opening or Closing Surveys](https://help.surveymonkey.com/en/surveymonkey/manage/opening-closing-surveys/)
- Summary and individual results, filter behavior, answer editing and CSV export informed the analysis workflow. [How to Analyze Results](https://help.surveymonkey.com/en/surveymonkey/analyze/analyzing-results/) · [Viewing Individual Responses](https://help.surveymonkey.com/en/surveymonkey/analyze/individual-responses/) · [Editing Survey Responses](https://help.surveymonkey.com/en/surveymonkey/send/editing-survey-responses/)
