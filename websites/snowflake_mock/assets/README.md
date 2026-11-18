# Snowflake workflow research

The account console is a pre-signed-in environment for managing compute, working with SQL, and administering account roles. The sample account is Northwind Analytics. Morgan Chen is the default administrator. All account data is synthetic.

## Users and workflows

| Persona | Common task | Destination |
| --- | --- | --- |
| Data platform operator | Locate a suspended warehouse, resume it, or resize a busy warehouse | Warehouses |
| Analyst | Create or find a SQL worksheet, select execution context, and inspect results | Worksheets |
| Security administrator | Create a team role, attach it to the hierarchy, grant warehouse access, and review assignments | Roles |

## Feature inventory

| Priority | Surface | Planned interactions |
| --- | --- | --- |
| P0 | Account shell | Overview, global navigation, deep links, loading and empty states, session persistence and recovery |
| P1 | Warehouses inventory | Search, status and size filters, sort, inspect configuration |
| P1 | Warehouse administration | Create, resize, configure cluster and auto suspend behavior, resume, suspend, drop |
| P1 | Worksheet library | Search, sort, open, create, rename, delete |
| P1 | SQL editor | Edit and save SQL and execution context, run an individual statement, inspect results and errors, revisit runs |
| P1 | Roles inventory | Search and filter roles, inspect owner, relationships, users, and privileges |
| P1 | Role administration | Create and edit custom roles, grant to users or parent roles, assign warehouse privileges, revoke, drop |
| P2 | Query history | Optional read-only account view derived from the same run records |

## Product behavior references

- Warehouses are compute resources. Snowflake exposes status, size, clusters, running and queued queries, owner, and controls to change size or warehouse status. Warehouse creation distinguishes auto resume, auto suspend, and initial state. [Working with warehouses](https://docs.snowflake.com/en/user-guide/warehouses-tasks) · [CREATE WAREHOUSE](https://docs.snowflake.com/en/sql-reference/sql/create-warehouse) · [SHOW WAREHOUSES](https://docs.snowflake.com/en/sql-reference/sql/show-warehouses)
- A SQL worksheet carries an execution context. Snowflake’s public documentation now places SQL files in Workspaces, where Windows users still run a selection with Ctrl+Enter and can set role, warehouse, database, and schema. The build brief calls for a dedicated Worksheets destination. [Legacy Worksheet retirement](https://docs.snowflake.com/en/release-notes/bcr-bundles/un-bundled/bcr-2260) · [Workspaces](https://docs.snowflake.com/en/user-guide/ui-snowsight/workspaces) · [Historic worksheet behavior](https://docs.snowflake.com/en/user-guide/ui-snowsight-worksheets)
- Account roles can be assigned to users and other roles. A parent role inherits privileges from its granted child roles. `SHOW GRANTS` distinguishes grants to a role from grants of a role, and query history connects runs to the selected context. [Configure access control](https://docs.snowflake.com/en/user-guide/security-access-control-configure) · [GRANT ROLE](https://docs.snowflake.com/en/sql-reference/sql/grant-role) · [SHOW GRANTS](https://docs.snowflake.com/en/sql-reference/sql/show-grants) · [Query history](https://docs.snowflake.com/en/sql-reference/account-usage/query_history)

## Layout and state

The overview shows linked counts for the three working areas. Warehouses and Roles use searchable table views with dedicated details. Warehouse detail pairs compute settings with an activity panel. Role detail groups grants by direction and target. Worksheets uses a searchable library and a separate editor route with a context toolbar and results below. [Original design specification](../DESIGN.md)

Warehouses, worksheets, roles, and users use stable IDs. Grants express access relationships. Query runs retain context and results. Activity records retain actor, subject, and field changes. Account identity and catalog fixtures support select controls and local SQL responses. [State shapes and seed](data_model.md)

Sign-in, account management, Git, external sharing, billing, and production compute are outside the scope of the three briefed workflows.
