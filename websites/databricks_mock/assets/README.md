# Databricks workspace research

This signed-in workspace supports three linked activities. Analysts write and run notebooks, data engineers turn notebook tasks into repeatable jobs, and compute owners configure and operate shared clusters. A notebook can keep its compute attachment while a job chooses its own execution compute. These links are central to the workflow and should be easy to discover in details and selectors.

## Findings and implementation scope

| Priority | Area | Behavior and intended views |
| --- | --- | --- |
| P0 | Workspace shell | Horizontal section navigation, overview with counts and recent activity, stable deep links and session preservation |
| P0 | Harbor | Fixed baseline, user-triggered persistence, injected-world support, neutral loading state, offline assets and `/go` verification |
| P1 | Notebooks | Searchable list and ordered editor. Create, rename, select a default language, edit or reorganize cells, attach compute, run a cell or all runnable cells, view outputs and delete |
| P1 | Jobs | Searchable list and tabbed detail. Create and edit notebook tasks, parameters and dependencies, configure or pause a schedule, run now, inspect task snapshots and cancel eligible runs or delete the job |
| P1 | Compute | Searchable cluster list and detail view with configuration and event history. Create or edit size/runtime, start, restart, terminate and delete eligible clusters |
| P2 | Notebook duplication | Copy notebook and cell configuration, assign new IDs, and preserve source output history |

## Workflow references

- Notebook editing centers on an ordered set of code and Markdown cells. Workspace discovery leads to an editor where the user chooses compute, runs one cell or a group, and reviews output. The planned visible Save changes control gives the local editor a clear persistence boundary. [Basic notebook editing](https://docs.databricks.com/aws/en/notebooks/basic-editing) · [Notebook compute](https://docs.databricks.com/aws/en/notebooks/notebook-compute) · [Run notebooks](https://docs.databricks.com/aws/en/notebooks/run-notebook)
- A notebook task pairs a saved notebook with task parameters and execution compute. Job runs expose run-level and task-level results. Scheduled triggers can be configured and paused. The planned local implementation stores schedules and captures manual runs in a single user-initiated transition. [Lakeflow Jobs quickstart](https://docs.databricks.com/aws/en/jobs/jobs-quickstart) · [Schedules and triggers](https://docs.databricks.com/aws/en/jobs/triggers) · [Monitor jobs](https://docs.databricks.com/aws/en/jobs/monitor)
- Classic compute has identifiable runtime and sizing configuration, plus lifecycle and event views. The planned cluster model includes single-node, fixed-size and autoscaling configurations. It stores auto-termination minutes and exposes explicit start, restart and terminate actions. [Compute configuration](https://docs.databricks.com/aws/en/compute/configure) · [Manage classic compute](https://docs.databricks.com/aws/en/compute/clusters-manage)

## Data and boundaries

Use linked notebook, job and cluster records, with separate notebook runs, job runs, cluster events and general activity so historical detail can survive deletion. The [state model](data_model.md) defines IDs, timestamps and seed coverage. The [design guide](../DESIGN.md) defines the original visual system, including its local CSS artwork.

The workspace is already signed in. Leave account setup and cloud provisioning outside the exercise. Local fixtures supply sample execution results so the app works offline with synthetic data and without running user-supplied programs. Scope details and acceptance checks are in [TODO.md](../TODO.md).
