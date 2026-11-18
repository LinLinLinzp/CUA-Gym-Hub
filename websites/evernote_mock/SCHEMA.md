# evernote_mock Schema

**Base URL**: `http://localhost:5409/`
**Go Endpoint**: `GET /go?sid=<sid>` → `{initial_state, current_state, state_diff}`
**Inject**: `POST /post?sid=<sid>` with body `{"action":"set","state":{...}}`
**Reset**: `POST /post?sid=<sid>` with body `{"action":"reset"}`

The API restores the stored baseline on reset. Inject before opening the app in a fresh browser context or use a fresh SID, because the template reuses loaded local state for cached sessions. Array values replace seed arrays. Object fields merge with the defaults. Null fields at an object merge boundary retain the seeded value.

## State Schema

The table describes `current_state`. IDs are strings. Actor fields contain `user.id` and timestamp fields use ISO datetimes. A missing actor or timestamp is allowed in injected records. Updates retain fields outside the documented schema.

| Key | Type | Description |
| --- | --- | --- |
| `user` | object | `id`, `name`, `email` are strings. |
| `preferences` | object | `defaultNotebookId`, `defaultTaskNoteId`, `updatedBy`, `updatedAt` are strings or null. |
| `notebooks` | array | `id`, `name`, `status` (active or deleted), `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `deletedAt` and `deletedBy` (nullable). |
| `notes` | array | `id`, `notebookId`, `title`, `content` (plain text), `tags` (string array), `status` (active or trashed), `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, `trashedAt` and `trashedBy` (nullable), optional `sourceNoteId`. |
| `tasks` | array | `id`, `noteId`, `title`, `description`, `dueDate` (YYYY-MM-DD or null), `flagged` (boolean), `status` (open, completed or deleted), `completedAt`, `completedBy`, `deletedAt`, `deletedBy` (nullable), `createdBy`, `createdAt`, `updatedBy`, `updatedAt`, optional `sourceTaskId`. |

Missing status reads as active for notebooks and notes and open for tasks. The effective default notebook is the active configured notebook or the first active notebook by name and ID. Dangling references remain in storage. A task with a known trashed parent is hidden until the parent is restored. A task with a missing parent remains visible and can be relinked.

### Default IDs

- Account `usr_maya`
- Default notebook `nb_inbox`
- Default task note `note_things_to_do`

<details>
<summary>notebooks (24)</summary>

```text
nb_inbox, nb_weekly_planning, nb_office_move
nb_vendor_reviews, nb_team_rituals, nb_process_library
nb_people_operations, nb_finance, nb_customer_support
nb_it_requests, nb_compliance, nb_facilities
nb_web_refresh, nb_spring_launch, nb_partner_enablement
nb_training_pilot, nb_inventory_audit, nb_accessibility_reviews
nb_meeting_archive, nb_templates, nb_client_handoffs
nb_research, nb_travel_planning, nb_onboarding
```

</details>

<details>
<summary>notes (56)</summary>

```text
note_things_to_do, note_monday_operations_brief, note_incoming_requests
note_monday_priorities, note_november_capacity_check, note_quarter_end_decisions
note_move_day_runbook, note_floor_plan_feedback, note_move_budget_assumptions
note_old_seating_proposal, note_vendor_scorecard, note_renewal_decision_log
note_courier_comparison, note_superseded_vendor_shortlist, note_retro_discussion_guide
note_monday_standup_format, note_monthly_demo_roster, note_purchase_approvals
note_document_naming_guide, note_access_request_workflow, note_interview_panel_notes
note_manager_onboarding_checklist, note_benefits_session_questions, note_november_spend_review
note_invoice_exception_list, note_december_forecast_notes, note_call_escalation_guide
note_queue_coverage_handoff, note_support_snippets_review, note_laptop_refresh_checklist
note_guest_wi_fi_instructions, note_archived_device_inventory, note_records_retention_review
note_control_owner_reminders, note_audit_evidence_checklist, note_loading_dock_access
note_reception_handover, note_quiet_room_booking, note_content_migration_decisions
note_homepage_review, note_release_checklist, note_launch_timeline
note_demo_rehearsal_notes, note_partner_event_budget, note_partner_handout_outline
note_office_hours_questions, note_retired_partner_checklist, note_pilot_session_plan
note_training_feedback_themes, note_stockroom_count_plan, note_inventory_reconciliation
note_replacement_supplies_estimate, note_keyboard_review_findings, note_forms_accessibility_follow_up
note_review_notes_for_mobile, note_october_operations_minutes
```

</details>

<details>
<summary>tasks (40)</summary>

```text
task_check_vendor_references, task_confirm_loading_dock_access, task_send_november_follow_up_summary
task_circulate_the_operations_brief, task_reserve_the_planning_room, task_check_reception_coverage
task_record_the_dispatch_deadlines, task_label_spare_desks, task_review_the_overtime_estimate
task_archive_the_marked_floor_plan, task_request_evening_staffing_details, task_compare_delivery_windows
task_file_the_july_call_notes, task_collect_retro_topics, task_share_the_standup_outline
task_confirm_demo_presenters, task_check_approval_limits, task_update_sample_file_names
task_check_the_approval_handoff, task_book_the_interview_panel, task_confirm_onboarding_access
task_summarize_benefits_questions, task_confirm_the_vendor_credit, task_request_purchase_order_numbers
task_reassign_the_delivery_fee, task_verify_the_escalation_contact, task_publish_the_queue_rota
task_review_the_password_reset_snippet, task_reserve_two_spare_chargers, task_test_a_guest_pass
task_file_signed_contract_copies, task_verify_the_account_review_owners, task_record_the_duty_phone
task_verify_policy_redirects, task_reserve_a_review_day, task_draft_the_permissions_section
task_print_the_intake_exercise, task_schedule_the_stockroom_count, task_retest_dialog_focus
task_send_the_lift_booking_details
```

</details>

## Minimal Inject Example

```json
{
  "notebooks": [],
  "notes": [],
  "tasks": []
}
```

This payload renders an empty workspace using the seeded account identity. Creation flows can add the first notebook, note or task.

## Observable State Changes (for LLM evaluation)

Each row describes one whole-state commit. Update metadata means `updatedBy` and `updatedAt`. All records written by one commit use the same actor and timestamp.

| User action | Persisted fields |
| --- | --- |
| Create notebook | Append complete notebook with active status. If no active notebook existed, set `preferences.defaultNotebookId` and preference update metadata. |
| Rename notebook | Set `notebooks[].name` and update metadata. |
| Set default notebook | Set `preferences.defaultNotebookId` and preference update metadata. |
| Delete notebook | Set `notebooks[].status` to deleted and set `deletedAt`, `deletedBy` and update metadata. Trash active child notes using the fields below. |
| Create note | Append complete note with active status and chosen `notebookId`. If the flow creates a notebook, append it and set the default notebook preference in the same commit. |
| Save note edit or leave editor with changed text | Set `notes[].title`, `content` and update metadata. |
| Move note | Set `notes[].notebookId` and update metadata. |
| Add or remove tag | Set `notes[].tags` and update metadata. |
| Duplicate note with tasks | Append complete active note retaining the content and tags, with a fresh ID, a title ending in ` (copy)` and `sourceNoteId`. Append one new task per open or completed source task with its own fresh ID, the new `noteId` and `sourceTaskId`. Copies preserve task status and completion metadata. If there is no active notebook, append the new destination and set the default notebook preference in the same commit. |
| Trash note | Set `notes[].status` to trashed and set `trashedAt`, `trashedBy` and update metadata. |
| Restore note | Set `notes[].status` to active, set `notebookId`, clear `trashedAt` and `trashedBy`, and stamp update metadata. When needed, append a new notebook and set the default notebook preference in the same commit. |
| Create task | Append complete open task with selected `noteId`. If resolving a fallback, reuse or append Things to do and set `preferences.defaultTaskNoteId` with update metadata. A new fallback notebook also sets `defaultNotebookId` in the same commit. |
| Edit task | Set changed fields among `title`, `description`, `noteId`, `dueDate`, `flagged` and stamp update metadata. |
| Flag or unflag task in list | Set `tasks[].flagged` and update metadata. |
| Complete or reopen task | Set `tasks[].status` to completed or open, set or clear `completedAt` and `completedBy`, and stamp update metadata. |
| Delete task | Set `tasks[].status` to deleted and set `deletedAt`, `deletedBy` and update metadata. |
| Set default task note | Set `preferences.defaultTaskNoteId` and preference update metadata. |

Navigation, search, filters, grouping, help, canceled forms and no-op edits leave business state unchanged. The first load uses the Harbor baseline write.
