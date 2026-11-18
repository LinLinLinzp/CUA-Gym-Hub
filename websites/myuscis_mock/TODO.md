# myUSCIS — TODO

> Status: READY FOR DEV  
> Last updated by: plan agent, 2026-11-18  
> References: [Research](assets/README.md) · [Data model](assets/data_model.md) · [Design](DESIGN.md)

## Status legend

- [ ] Not started
- [~] In progress
- [x] Done

## P0 — Application and Harbor runtime

- [x] **Scaffold and build.** Set up a React and Vite app in this directory with a lockfile and a production build to `dist/`. Configure Vite for port **5511** with `strictPort: true` and run it with the site as the working directory. Keep bundled assets and fonts local. Use `myUSCIS` as the browser title and text wordmark. Follow [DESIGN.md](DESIGN.md) for the distinct interface.
- [x] **Account shell and routing.** Implement `/` (account overview), `/cases`, `/cases/:caseId`, `/forms`, `/forms/drafts/:draftId`, `/address-change`, and `/address-change/:requestId`. The overview shows linked cases, resumable drafts, and the latest address request, with direct actions for each workflow. Wrap all routes in their required providers. Preserve `?sid=` across links and programmatic navigation, including recovery links. Use `withSid()` for internal links outside SPA routing. Unknown IDs get a useful return link. Direct links and reloads resolve to the same view.
- [x] **State and session API.** Copy `templates/dataManager.js` unchanged to `src/utils/dataManager.js`. Import `stateApi` from `../../templates/state-api.js` in `vite.config.js`. Implement fixed defaults via `createInitialData()` in `src/data/seed.js`. Await one `loadState(APP, createInitialData)` per boot before rendering routes, with a neutral loading view. Save each successful user mutation as one complete state snapshot through a single store entry point. API middleware owns `GET /state`, `GET /go`, and `POST /post`; the runtime provides those endpoints for built assets. Support injected arrays of zero, one, or hundreds of records, partially populated objects, missing optional fields, and dangling optional links. Keep rendering, reload, idle, filtering, and canceled or invalid actions free of business-state writes. Generate action timestamps at commit time with `new Date().toISOString()`.

## P1 — Required workflows

- [x] **Case status.** On `/cases`, list tracked cases by latest status update with search by receipt number or form and filters by status. Use a distinct “Check case status” field to look up any receipt in the local fixture registry, including untracked cases. Normalize receipt input (trim, uppercase, remove hyphens); distinguish invalid syntax from an unknown receipt. A valid lookup appends `caseStatusChecks[]` with `id`, `receiptNumber`, `caseId`, `outcome`, `caseStatus`, `actorId`, and `createdAt`. Open a matched result to see its current status, update date, and descending history. “Track this case” appends `trackedCases[]` with `id`, `caseId`, `actorId`, and `createdAt`; hide that action for an existing association. A detail view or a list filter alone writes nothing. See [Case data](assets/data_model.md#case-data).
- [x] **Forms.** On `/forms`, show searchable catalog and draft/submission lists with form code, title, category, and applicable status. “Start form” on an enabled catalog entry appends `formDrafts[]` with stable draft ID, `formId`, `actorId`, `status: "draft"`, `currentStep`, `answers`, `createdAt`, and `updatedAt`. Resume a draft by ID. Collect applicant and form-specific answers, validate required fields, then show review and typed signature. Explicit save and successful forward steps update `answers`, `currentStep`, and `updatedAt` on the same draft. Submission sets the draft’s `status`, `submittedAt`, and `updatedAt`, appends `formSubmissions[]` with an answer and signature snapshot, and creates a linked received case, initial event, and tracked case in the same save. Show the receipt and link to the case. Reloading or repeating the submit event must leave a single submission for that draft. See [Filing data](assets/data_model.md#filing-data).
- [x] **Address change.** On `/address-change`, show current physical and mailing addresses and request history. “Start address change” opens a flow for new physical and mailing addresses, with a same-as-physical option. Let users choose eligible tracked receipts or enter other known pending receipts. Support an explicit “I have no pending cases” selection. Reject invalid, unknown, closed, and duplicate receipt additions. Review both addresses and the requested case links before confirmation. One submit appends `addressChanges[]` with request and confirmation IDs, previous/new address snapshots, normalized receipt associations, `status: "submitted"`, `actorId`, and `createdAt`. In the same save, update the two addresses and `profile.updatedAt`, and update only the linked cases’ `mailingAddress` and `addressChangeId`. Show a durable confirmation and request detail. Back, cancel, and failed validation leave state untouched. See [Address data](assets/data_model.md#address-data).
- [x] **Verifier documentation and browser acceptance.** Write `SCHEMA.md` with all actual keys and record shapes plus an Observable State Changes table listing exact writes per action. Use installed Node Playwright from `PILOT_PLAYWRIGHT` and Chromium on localhost port 5511. If starting a persistent server, use `Start-Process -WindowStyle Hidden` with the absolute Vite entry point. Save test runners under an ignored directory or remove them. Verify the case lookup and tracking, form draft/resume/submit, and address submission via UI and sid-scoped `/go`. Check reloads, invalid data, duplicate submission, separate sessions, injected empty/sparse/large states, and an idle tab with no extra posts. Run `npm run build` and use the built app for an offline-asset and deep-link smoke check on the same port. Record commands, results, and changed state fields for all three workflows in `TEST.md`. The parent runner handles Docker certification and commits after that handoff.

## P2 — Optional depth

No P2 tasks are needed for this brief.

## Data seed

- [x] **Case fixtures.** Seed 48 cases with 32 tracked and a mix of pending, action-needed, approved, and closed outcomes; include two to four chronological events on typical cases. Leave known pending cases available to track and to attach to a change-of-address request.
- [x] **Filing fixtures.** Seed 24 catalog references across common benefit categories, with four fully supported filing choices, 24 resumable drafts at different steps, and at least 12 prior submissions linked to case receipts. Each reference item without a local filing flow has an explicit informational state.
- [x] **Address and lookup fixtures.** Seed 24 address requests over a realistic multi-year interval and 24 case checks with a mix of matched and unknown receipts. Use fixed IDs, fixed dates and only fictional contacts and addresses. Provide featured fixture IDs and their exact entry values in `SCHEMA.md` or `TEST.md` for reproducible acceptance runs.

## Out of scope

Authentication, account creation, paper-case identity verification, payment processing, external filing, real account or applicant data, email and SMS delivery, live agency updates, and eligibility or legal guidance. Start signed in as the fictional applicant Maya Rivera.
