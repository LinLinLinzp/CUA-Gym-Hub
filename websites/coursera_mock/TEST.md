# Coursera Mock — Test Report

> Round: 2
> Date: 2026-11-18
> Server: http://localhost:5370
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested | 10 |
| Elements tested (interaction and contract groups below) | 18 |
| ✅ Passed | 18 |
| ❌ Failed | 0 |
| ⚠️ Skipped (out of scope) | 0 |

Chromium used the installed Node Playwright package. The run covered all nine app routes and the unknown-route fallback. `npm run build` passed. Harbor's localized Docker check is handled by the parent runner.

---

## ✅ Passing Tests

- **Workspace navigation** — Rail, Coursera home, pinned resume and outline links preserved `sid`. Keyboard skip focused the main region. Each deep-linked section exposed one current navigation item.
- **My Learning** — All four status pills returned the expected rows. Searching by title narrowed results and an unmatched query displayed the empty state.
- **Explore** — Search by issuer and title, topic and level filters, and both alternate sorts returned the expected fixture courses in order.
- **Course enrollment** — The course page opened from the catalog. Canceling with Escape restored focus. Confirming Enroll exposed the reading and the Continue learning link.
- **Reading completion** — Mark complete advanced progress. Refresh preserved the completed reading, and Next activity opened the quiz. An outline activity title also led directly to its reading.
- **Quiz validation** — Missing answers triggered the required-answer message. Canceling a filled confirmation preserved the form and wrote no attempt.
- **Failed quiz** — Submitting incorrect choices graded the attempt at 0%. The result, original submitted answers, and history appeared.
- **Withdrawal** — Confirming Unenroll paused access. Opening the quiz directly showed Enrollment required.
- **Re-enrollment** — Confirming Re-enroll reused the enrollment and restored access, the reading, and the failed attempt.
- **Assignment desk** — Course and status filters narrowed the list. The failed row opened Review or retake, the passed row opened Review quiz, and an unmatched combination showed the empty state.
- **Passing retake** — Retake opened an unselected form. Correct answers scored 100%, retained the earlier failure, and made Finish course available.
- **Course completion** — Finishing issued a credential and replaced the finish action with access to the certificate. Sequential stale and simultaneous confirmation from two same-session tabs each produced one business save and preserved the first verification code.
- **Accomplishments** — Searching by issuer or title, sorting by oldest issue date, and opening a certificate by its title or action displayed the expected credential.
- **PDF download** — Chromium downloaded the file. The PDF rendered with the learner, course, issuer, date and verification code. The recorded filename matched the browser download.
- **Verification link** — The clipboard contained the complete same-origin session URL. Opening and refreshing it showed the matching certificate. Forced clipboard failure displayed a selectable URL and recorded zero writes. The notice could be dismissed.
- **Session and persistence** — The main session sent one baseline and nine business writes. An untouched session had an empty diff. Reset restored the first baseline. An idle tab made zero writes while an external test update to its session remained visible in `/go`.
- **Injected state** — Empty, one-record sparse, and 300-course worlds rendered. Invalid actions were unavailable, a sparse mutation retained injected metadata, and searchable courses deep-linked and refreshed.
- **Responsive and recovery** — Nine views were checked visually against the original local design. The main views fit the tested 320–1440 px widths. Unknown and missing-record routes offered recovery links. Close confirmation and button hover gave visible feedback. Chromium reported no console or page errors in the regression run and made zero external HTTP requests.

### Seed workflows and observed /go fields

Each accepted action produced one whole-state `set_current` and the expected top-level diff. IDs and cross-record references matched, timestamps were ISO strings, and the initial snapshot remained intact. This lifecycle used the seeded **Reading a Film Scene** course.

| SEED workflow | Browser action | Fields added or changed in `/go` |
|---|---|---|
| Enrollments | Enroll | Added `enrollments[]` with `id`, `learnerId`, `courseId`, `status: "in_progress"`, `progressPercent: 0`, `createdAt`, `updatedAt`. |
| Enrollments | Mark reading complete | Added `lessonCompletions[]` with `id`, `learnerId`, `enrollmentId`, `courseId`, `lessonId`, `status: "completed"`, `createdAt`. Changed `enrollments[].progressPercent` from 0 to 50 and updated `updatedAt`. |
| Assignments | Submit an incorrect quiz | Added `assignmentAttempts[]` with `id`, `learnerId`, `enrollmentId`, `courseId`, `assignmentId`, `answers[{questionId, optionId}]`, `attemptNumber: 1`, `scorePercent: 0`, `status: "failed"`, `createdAt`. Updated `enrollments[].updatedAt`. Progress stayed at 50. |
| Enrollments | Unenroll | Changed `enrollments[].status` to `withdrawn` and wrote `withdrawnAt` and `updatedAt`. |
| Enrollments | Re-enroll | Changed `enrollments[].status` to `in_progress` and set `withdrawnAt: null`, `reenrolledAt`, and `updatedAt` on the original record. |
| Assignments | Retake and pass | Added a second `assignmentAttempts[]` entry with the same fields, a distinct `id`, the new `answers`, `attemptNumber: 2`, `scorePercent: 100`, `status: "passed"`, and a new `createdAt`. Changed `enrollments[].progressPercent` from 50 to 100 and updated `updatedAt`. |
| Certificates | Finish course | Changed `enrollments[].status` to `completed` and set `completedAt` and `updatedAt`. Progress was already 100. Added `certificates[]` with `id`, `learnerId`, `enrollmentId`, `courseId`, `courseTitle`, `learnerName`, `issuerName`, `verificationCode`, `status: "issued"`, `createdAt`. |
| Certificates | Download PDF | Added `certificateActions[]` with `id`, `learnerId`, `certificateId`, `courseId`, `type: "download"`, `status: "completed"`, `createdAt`, `fileName`. |
| Certificates | Copy verification link | Added `certificateActions[]` with `id`, `learnerId`, `certificateId`, `courseId`, `type: "copy_link"`, `status: "completed"`, `createdAt`, `verificationPath` including `sid`. |
| All three | Browse, filter, open records, refresh, cancel, fail validation, open verification | No business writes. |

---

## ❌ Bugs for Dev Agent

No open bugs found in the tested coverage.

## Visual Alignment Feedback

Desktop captures of all nine views and a mobile dashboard capture were compared with `DESIGN.md`. The original geometric artwork, workspace layout, record typography, and printed certificate rendered as expected. The mobile artwork fit its container after the overflow fix.

## Round History

### Round 1 → Round 2

- AUDIT-001 · Fixed. Both stale and simultaneous same-session finish attempts left the original credential verifiable and sent one business write total.
- AUDIT-002 · Fixed. The wordmark uses the rail text token and record titles use 17/24 px at weight 650.
- AUDIT-003 · Fixed. Active rail links expose `aria-current` on direct course, reading, quiz, certificate and verification routes.
- BUG-001 · Found and fixed during responsive testing. Fixed-width artwork no longer overflows the course outline at 320 px.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `110268`. The local evidence is `factory/build/dyn_certify/110268/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `courses → 0 → title`.
