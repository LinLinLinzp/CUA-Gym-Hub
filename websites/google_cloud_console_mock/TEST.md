# Google Cloud Console Mock — Test Report

> Round: 2  
> Date: 2026-11-18  
> Server: http://127.0.0.1:5484  
> Tested by: playwright agent

WORKFLOWS: PASS

## Summary

| Metric | Count |
|---|---:|
| Routes tested | 9 |
| Desktop views captured | 10 |
| Mutation checkpoints tested | 19 |
| Mutation checkpoints passed | 19 |
| New structured activity records | 20 |
| Open bugs | 0 |

## ✅ Passing Tests

The workflow suite used installed Chromium via `PILOT_PLAYWRIGHT`, isolated session IDs, and a browser clock fixed at 2026-11-18 14:00 UTC. After each mutation it read `/go?sid=…` and verified the resource snapshot, activity and state diff. Creation metadata below refers to `createdAt` and `actorId`. Update metadata refers to `updatedAt` and `updatedBy`. Each new activity row has an ID, actor, timestamp, resource reference and relevant project or account scope.

| SEED workflow and browser action | Fields observed through `/go` |
|---|---|
| IAM grant access | Appended an `iamBindings` row with `id`, `projectId`, `principalType`, normalized `principal`, `roleId`, `source: direct`, `status: active`, and creation metadata. Appended an `iam.grant` activity with principal, role and status. |
| IAM edit and revoke | Replacement set the old binding's `status` to `revoked` with update metadata and appended a new binding with the same creation fields as a grant. `iam.revoke` and `iam.grant` appeared in the same snapshot. The row menu then revoked the replacement binding and added another `iam.revoke` activity. |
| VMs create | Appended a `vmInstances` row with `id`, `name`, `projectId`, `region`, `zone`, `machineType`, `bootImage`, `bootDiskGb`, `internalIp`, `externalIp: null`, `status: RUNNING`, and creation metadata. Appended `vm.create`. |
| VMs stop, start, reset and delete | Stop set `vmInstances.status` to `TERMINATED`, start restored `RUNNING`, reset kept `RUNNING` and set `lastResetAt`, and delete set `DELETED` and removed the row from the active list. Each recorded update metadata and its corresponding `vm.stop`, `vm.start`, `vm.reset` or `vm.delete` activity. |
| Buckets create and configure | Appended a `buckets` row with `id`, `name`, `projectId`, `locationType`, `location`, `storageClass`, `accessMode`, `publicAccessPrevention`, `status: active`, and creation metadata. Configuration changed `storageClass` from `STANDARD` to `COLDLINE` and added update metadata. Appended `bucket.create` and `bucket.update` respectively. |
| Buckets upload objects and delete | Upload added a `storageObjects` row with `id`, `bucketId`, `name`, `sizeBytes`, `contentType`, `status: active`, and creation metadata. Object deletion set `status: deleted` and update metadata. The bucket could be deleted after object removal and exact-name confirmation. Bucket deletion set its own `status: deleted` and update metadata. Appended `object.upload`, `object.delete` and `bucket.delete`. |
| Billing account and reports | Account selection and date, project and service filters made no state changes. The values table matched an independent sum of the relevant `billingCosts` rows. An injected project with historical USD and current EUR usage displayed separate Overview totals and opened Reports scoped to the project and month to date. Switching accounts exposed the corresponding historic total and preserved scope through reload. |
| Billing budgets create, edit and delete | Creation added a `budgets` row with `id`, `billingAccountId`, `name`, `projectIds`, `period: monthly`, `amount`, `currency`, Actual and Forecasted `thresholds`, `status: active`, and creation metadata. Editing changed `name`, `amount`, `projectIds`, `thresholds` and update metadata. Named deletion set `status: deleted` and update metadata. Appended `budget.create`, `budget.update` and `budget.delete` respectively. |
| Billing change, disable and enable | Each action updated `projects.billingAccountId` to the destination ID or null and added update metadata. The three `project.billing_change` activities stored `previousBillingAccountId` and the new `billingAccountId`. Historic `billingCosts` stayed identical. |

## Harbor and browser checks

- Verified one baseline `set` and 19 `set_current` snapshots during the workflow suite. The 19 snapshots added 20 structured activity rows. The seed baseline was unchanged. Separate API tests verified the current snapshot, reset to the baseline, and isolation between session IDs.
- Validation failures, duplicate IAM grants and upload paths, cancelled dialogs, scope changes, report filters, search, sorting, pagination and 5.5 seconds idle produced no additional business snapshots.
- Loaded every route against an empty injected world and verified the VM and bucket missing-record paths. A separate world presented a 240-VM list and sparse single bucket, IAM binding, budget and billing-account records. Verified pagination and session isolation.
- Verified direct links, inferred project scope, detail reloads, preserved session IDs, resource and breadcrumb links, sorting, hover and keyboard row-menu behavior, Escape, dialog focus restoration, and keyboard navigation at a 375 px viewport.
- Captured and inspected all major views against the site's original design guide. Verified report labels and values align with each chart track, tables scroll within their container on mobile, and the budget dialog footer remains reachable.
- No page or browser console errors in the final runs and no external requests in the workflow suite. `npm run build` passed, the original favicon was included in `dist`, and `src/utils/dataManager.js` matched the Harbor template byte for byte.

## ❌ Bugs for Dev Agent

No open findings. The parent runner handles Docker dynamic certification.

## Round History

### Round 1 → Round 2

- Fixed currency aggregation in Overview and verified the Reports link carries project and date scope.
- Fixed the budget edit picker so a previously linked project remains available after deselection.
- Fixed report chart row alignment and added a local favicon to resolve the browser's missing-resource error.

## Harbor Docker dynamic certification

The repository certifier passed the production bundle in run `170000`. The local evidence is `factory/build/dyn_certify/170000/results.json`.

| Render | Sync | Idle | Hydrate |
| --- | --- | --- | --- |
| Pass | Pass (1 baseline POST) | Pass (0 idle POSTs) | Pass |
Injection reached `projects → 0 → name`.
