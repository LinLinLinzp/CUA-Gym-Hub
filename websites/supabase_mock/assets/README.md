# Supabase workflow research

Trailhead is a synthetic project for a field operations team. The default dashboard operator, Rowan Ellis, maintains the database, manages project users, organizes attachments, and configures access. The public documentation establishes feature terminology and behavior. DESIGN.md provides the original visual direction.

| Priority | View | Operator task and proposed layout |
| --- | --- | --- |
| P0 | Overview | Open Tables, Authentication, Storage, or Policies from a shared top navigation or project summary card. Derive all counts from persisted records. |
| P1 | Tables | Filter a left-hand list by schema or name. Open a table to inspect and mutate typed rows or edit columns. Use an editor drawer for creation and edits. Supabase's Table Editor supports typed columns and enables RLS by default for new tables. |
| P1 | Authentication | Search an account directory and inspect user details. Create or record an invitation for a project user. This workflow changes the project's user inventory. The documentation describes invitations as creating unconfirmed users. |
| P1 | Storage | Browse buckets in a master list and open a folder-based object view with breadcrumbs. Use the access label and restrictions in the bucket header. Bucket visibility and upload restrictions are bucket-level settings. |
| P1 | Policies | Use target groups and command filters to find policies. Open a drawer for role and expression fields with a statement preview. USING describes which existing rows qualify, and WITH CHECK describes which new row values qualify. |

The project and current operator are injected context. Tables own columns and reference rows by table ID. Buckets reference objects by bucket ID. Policies link to a table or bucket. Activity records identify mutations and link to affected IDs. See [record definitions](data_model.md).

Local admin practice covers status changes without live authentication services, file management via Harbor's local API, and editing policy text without a database engine. Billing, infrastructure and deployment are outside the seed workflows.

## Public references

- [Tables and data](https://supabase.com/docs/guides/database/tables)
- [Managing Auth users](https://supabase.com/docs/guides/auth/users)
- [Storage bucket fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals)
- [Storage quickstart](https://supabase.com/docs/guides/storage/quickstart)
- [Postgres Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

