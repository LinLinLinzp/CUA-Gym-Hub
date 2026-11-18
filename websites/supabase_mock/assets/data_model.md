# Planned persisted state

Each array below is a top-level key and is replaced by a Harbor injection when supplied. Preserve extra fields. IDs are opaque strings. All times are ISO 8601 strings. Use explicit nulls for optional values written by the app and handle missing optional values on read. Creation and edit timestamps come from the task clock. The default seed uses fixed dates.

## Records

| Key | Shape and example values |
| --- | --- |
| project | Object with string id `proj_trailhead`, name `Trailhead`, and organization `Summit Fieldworks`. |
| currentUser | Object with string id `operator_rowan`, name `Rowan Ellis`, email `rowan@example.com`. Operator IDs are independent of project Auth user IDs. |
| tables[] | String id `table_inspections`, schema `public`, name `inspections`, description `Field inspection reports`, boolean rlsEnabled `true`, columns array, and string actorId, createdAt, updatedAt. |
| tables[].columns[] | String id `col_inspection_title`, name `title`, type `text`, booleans nullable and primaryKey, and defaultValue (typed JSON value or null). Optional defaultExpression supports the specific generated values `identity`, `uuid`, and `now()`. |
| rows[] | String id `row_inspection_001`, tableId `table_inspections`, values object such as `{"col_inspection_title":"Bridge inspection","col_inspection_passed":true}`, and string actorId, createdAt, updatedAt. Key values by column ID. Store boolean and finite safe numbers as their native types, dates and UUIDs as strings, and JSON as parsed JSON values. Represent large bigint inputs as decimal strings to preserve precision. |
| authUsers[] | String id `auth_amelia`, email `amelia@example.com`, provider such as `email` or `github`, status `invited`, `unconfirmed`, `active` or `banned`, and string actorId, createdAt, updatedAt. Nullable timestamp strings invitedAt, confirmedAt, lastSignInAt, bannedAt. On unban derive active, invited, or unconfirmed from confirmation and invitation timestamps. |
| buckets[] | String id `bucket_field_reports`, name `field-reports`, boolean public, number or null maxFileSizeBytes `5242880`, string array allowedMimeTypes such as `["application/pdf","image/*"]`, and string actorId, createdAt, updatedAt. Empty restrictions array allows any type. |
| objects[] | String id `obj_weekly_report`, bucketId `bucket_field_reports`, path `reports/weekly.csv`, kind `file` or `folder`, nullable sizeBytes (number), mimeType (string), url (string), and string actorId, createdAt, updatedAt. Paths are bucket-relative and normalized without leading or trailing slash. Folder records support empty folders. Derive parent display from paths and support injected file paths whose folder records are absent. File URL is an original local asset or the returned Harbor URL. |
| policies[] | String id `policy_inspections_read`, targetType `table` or `bucket`, targetId `table_inspections`, name `Members can read inspections`, command `SELECT`, `INSERT`, `UPDATE`, `DELETE` or `ALL`, string array roles such as `["authenticated"]`, nullable usingExpression and checkExpression strings, and string actorId, createdAt, updatedAt. Bucket rules represent policy text scoped to that bucket on `storage.objects`. |
| activity[] | String id, action such as `object.moved`, entityType such as `object`, entityId, actorId, and createdAt. Use JSON objects related and details. For a move, related contains bucketId and details contains fromPath and toPath. For a delete, preserve the affected ID, identifying values, and any cascading row or policy IDs in details. For a bulk action, record all affected IDs if supported. |

Link dependent rows, objects and policies by ID so renames preserve relationships. Within each operation use the same timestamp and actor for the affected records and the activity entry. Retain activity entries after the referenced entity is deleted. Use the action families `table.*`, `column.*`, `row.*`, `auth_user.*`, `bucket.*`, `object.*`, and `policy.*`. Document the exact implemented action names and detail fields in SCHEMA.md.

## Defaults for createInitialData()

Return a fresh object containing project, currentUser, tables, rows, authUsers, buckets, objects, policies, and an empty activity array. Use readable fixed IDs and fixed timestamps or derive them deterministically from an index and a fixed reference date. Suggested distribution follows.

- 24 tables across `public`, `operations`, and `reporting` include inspections, work orders, field crews, and route summaries. Supply at least 120 rows overall, at least 30 each for inspections and work orders, plus empty and single-row tables. Use multiple column types with nulls and booleans.
- 40 project users include active, invited, unconfirmed, and banned records. Use synthetic names, addresses at example.com, and a mix of providers. Ensure status and date combinations agree.
- 24 buckets include public and private, restricted and unrestricted, busy and empty. Seed at least 90 objects with multiple levels of folder paths. Give seeded files original local content with byte sizes and types consistent with their metadata.
- 32 policies mix table and bucket targets, commands, and roles. Include an RLS-enabled table with no policy and targets with several rules. Store the policy expressions as strings.

