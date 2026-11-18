# Bitbucket Cloud research

Bitbucket Cloud brings Git repository browsing, pull request review and CI results into the same workspace. The three workflows share a repository, branch and commit context. The sandbox covers the end-to-end path from creating a repository to changing a file, merging a PR and inspecting or running a pipeline. [Bitbucket Cloud](https://www.atlassian.com/software/bitbucket) · [Bitbucket Pipelines](https://www.atlassian.com/software/bitbucket/features/pipelines)

## User workflows

| Persona | Common session |
| --- | --- |
| Developer | Find a repository, switch branches, inspect history, create a branch, commit a file and open a pull request. |
| Reviewer | Open assigned work, find a file in a diff, leave feedback with line context, create a task and submit a review decision. |
| Maintainer | Inspect unresolved tasks and approvals, confirm a merge or decline, and verify the destination branch history. |
| Build engineer | Find a failed build by branch or trigger, inspect a failing step, retry it or rerun the entire build, and stop an active run. |

## Implementation inventory

| Area | Priority | Required behavior |
| --- | --- | --- |
| App shell | P0 | React/Vite setup on 5478, workspace navigation, For you, search, contextual Create, route handling, empty states and keyboard-accessible controls. |
| Harbor runtime | P0 | Load before route rendering, isolate by `sid`, save successful user actions once, serve offline, accept injected fixture shapes, and provide schema and browser evidence. |
| Repository directory and Source | P1 | Discover by workspace, project, name, visibility or star. Browse branches, files, README and commit history. |
| Repository lifecycle | P1 | Create with or without a README, edit repository details, star/unstar, delete through confirmation, branch from an existing head, and commit a text file. |
| Pull request lists and forms | P1 | Find open, merged or declined PRs. Select branches and reviewers, preview the diff, and create or edit a PR. |
| Pull request review | P1 | Read Overview, Files changed and Commits. Comment or reply, resolve/reopen a thread, complete a task, submit a review decision, merge or decline. |
| Pipeline history and details | P1 | Filter by branch, type, status and trigger, then follow a run into its summary, steps, logs and earlier attempts. |
| Pipeline controls | P1 | Set up and enable/disable, run by branch or commit, stop, retry failed steps and rerun the entire pipeline. |
| Project navigation and shortcuts | P2 | Add a project drill-down and documented shortcuts for search, help and PR tabs. |

## Views and interactions

### Workspace and repositories

The current navigation organizes the app around a top search field, Create, a workspace sidebar and the For you landing page. The repository directory uses rows with a summary, project context and build or activity metadata. Source pairs a branch selector and breadcrumb with file rows and a README panel. The repository form needs workspace/project, name, privacy and README choices. The original sandbox layout uses a workspace rail and a visible repository tab strip. [Current navigation](https://www.atlassian.com/blog/bitbucket/bitbucket-new-navigation-is-here) · [Repository directory guide](https://www.atlassian.com/software/bitbucket/guides/basics/bitbucket-interface) · [Repository creation](https://support.atlassian.com/bitbucket-cloud/docs/create-a-repository-in-bitbucket-cloud/)

Branch creation starts from a selected branch. The Source editor supports adding or editing text and then confirming a commit message. Repository settings provides metadata changes and the Manage repository delete action. Star controls tie the repository banner to the workspace's Starred list. [Branch creation](https://support.atlassian.com/bitbucket-cloud/docs/branch-a-repository/) · [Editing source](https://support.atlassian.com/bitbucket-cloud/docs/add-edit-and-commit-to-source-files/) · [Starring](https://support.atlassian.com/bitbucket-cloud/docs/work-on-a-repository/) · [Repository deletion](https://support.atlassian.com/bitbucket-cloud/docs/delete-a-repository/)

### Pull requests

The list leads with a summary and status, with filters for state, author or reviewer. Creation starts with the source/destination pair and previews the changes, then collects the title, description, reviewers and close-branch preference. An open PR uses Overview for description and discussion, Files changed for the diff, and Commits for source-side history. Place review and merge controls near the PR heading. [PR creation](https://support.atlassian.com/bitbucket-cloud/docs/create-a-pull-request-to-merge-your-change/) · [PR navigation and activity](https://www.atlassian.com/blog/bitbucket/new-pull-request-experience)

An inline comment should be reachable from both the diff and the activity feed. Review decisions, unresolved tasks and merge checks determine the feedback shown near the merge action. Decline is a terminal state. The confirmation dialog should show the selected merge strategy and effect on the source branch. [Review actions](https://support.atlassian.com/bitbucket-cloud/docs/review-code-in-a-pull-request/) · [Review and decline](https://support.atlassian.com/bitbucket-cloud/docs/review-a-pull-request/) · [Merge checks and strategies](https://support.atlassian.com/bitbucket-cloud/docs/merge-a-pull-request/)

### Pipelines

Use the October 2026 list and result screenshots for the hierarchy. The history view leads with the pipeline name and places number, actor, commit, branch and definition beneath it. Status, start time and duration are independently scannable. A run detail shows the summary and step list alongside expandable, line-numbered output. The manual run form uses a target, an eligible pipeline picker and declared inputs for custom definitions. [Pipeline refresh](https://www.atlassian.com/blog/bitbucket/a-fresh-look-for-bitbucket-pipelines) · [Pipelines history](https://support.atlassian.com/bitbucket-cloud/docs/view-your-pipeline/) · [Manual runs](https://support.atlassian.com/bitbucket-cloud/docs/pipeline-triggers/)

Retried steps retain the build number and expose a second set of step logs. Rerunning the whole pipeline creates another numbered build. The sandbox writes these changes from explicit actions using fixture results, which makes the log view and verification deterministic. [Rerun semantics](https://support.atlassian.com/bitbucket-cloud/docs/view-your-pipeline/) · [Previous pipeline runs](https://www.atlassian.com/blog/development/quickly-diagnose-issues-by-viewing-previous-pipeline-runs)

### Responsive and keyboard behavior

Target the desktop browser first. Use the responsive rail and panel rules in DESIGN.md for narrow browser windows. The layout for smaller widths is a sandbox design decision. The shortcut help, search focus and PR tab keys are documented by Atlassian. [Bitbucket keyboard shortcuts](https://support.atlassian.com/bitbucket-cloud/docs/keyboard-shortcuts/)

## Verified visual references

These files are Atlassian-published research references. The January 2026 images show the navigation rollout and the October 2026 images show refreshed Pipelines. Older images supply form and interaction examples. The implementation uses [DESIGN.md](../DESIGN.md) for visual specifications and keeps screenshot files in the research directory.

| Local image | Visible details | Publisher |
| --- | --- | --- |
| [workspace-navigation.png](screenshots/reference/workspace-navigation.png) | Dark workspace shell with search and Create in the bar, For you active in the sidebar, and a searchable Recent flyout above repository cards. Illustration overlay. | [January 2026 navigation](https://www.atlassian.com/blog/bitbucket/bitbucket-new-navigation-is-here) |
| [repository-navigation.png](screenshots/reference/repository-navigation.png) | Dark Source page with branch selector, file filter, file list, README and a metadata panel. The older sidebar appears as an inset for comparison. | [January 2026 navigation](https://www.atlassian.com/blog/bitbucket/bitbucket-new-navigation-is-here) |
| [repository-directory.png](screenshots/reference/repository-directory.png) | Older repository directory with rows, build dots, last updated and a focused project/owner/watching filter bar. | [Interface guide](https://www.atlassian.com/software/bitbucket/guides/basics/bitbucket-interface) |
| [repository-create.png](screenshots/reference/repository-create.png) | Older form with vertically stacked owner, project, name, privacy, README and submit controls. | [Getting started guide](https://www.atlassian.com/software/bitbucket/guides/basics/four-starting-steps) |
| [pull-request-list.png](screenshots/reference/pull-request-list.png) | Dark workspace PR list with status pills, branch labels, activity and search. Cropped navigation illustration. | [January 2026 navigation](https://www.atlassian.com/blog/bitbucket/bitbucket-new-navigation-is-here) |
| [pull-request-create.png](screenshots/reference/pull-request-create.png) | Annotated create page with branch cards, title, description, reviewer and close-branch inputs, and a lower diff/commits area. | [Getting started guide](https://www.atlassian.com/software/bitbucket/guides/basics/four-starting-steps) |
| [pull-request-overview.png](screenshots/reference/pull-request-overview.png) | Activity crop with avatars, timestamps, a requested-changes pill, inline code context and a task checkbox. | [Pull request redesign](https://www.atlassian.com/blog/bitbucket/new-pull-request-experience) |
| [pull-request-diff.png](screenshots/reference/pull-request-diff.png) | Light PR detail with three tabs, reviewer actions, path headers, numbered gutters and green/red diff rows. | [Pull request redesign](https://www.atlassian.com/blog/bitbucket/new-pull-request-experience) |
| [pipeline-history.webp](screenshots/reference/pipeline-history.webp) | Refreshed light history table with filters above rows and distinct colored status labels. | [October 2026 Pipelines refresh](https://www.atlassian.com/blog/bitbucket/a-fresh-look-for-bitbucket-pipelines) |
| [pipeline-result.webp](screenshots/reference/pipeline-result.webp) | Refreshed light build result with status summary, step list and expandable command rows. | [October 2026 Pipelines refresh](https://www.atlassian.com/blog/bitbucket/a-fresh-look-for-bitbucket-pipelines) |
| [pipeline-logs.webp](screenshots/reference/pipeline-logs.webp) | Earlier pipeline result showing a light step panel and dark monospace log output. | [Pipelines features](https://www.atlassian.com/software/bitbucket/features/pipelines) |
| [pipeline-run-form.png](screenshots/reference/pipeline-run-form.png) | Dialog for a preselected branch, a custom pipeline picker, two text variables and Run/Close actions. | [Manual pipeline triggers](https://support.atlassian.com/bitbucket-cloud/docs/pipeline-triggers/) |
| [pipeline-rerun.png](screenshots/reference/pipeline-rerun.png) | Failed run summary and dropdown choices for retrying failed steps and the entire pipeline. | [Pipeline details](https://support.atlassian.com/bitbucket-cloud/docs/view-your-pipeline/) |

## Data model and scope

Workspace and project records group repositories. Repo IDs scope branches, commits, pull requests and pipeline definitions and runs. PR comments, tasks, decisions and activity point back to the PR, while pipeline runs capture their target and definition so older logs remain readable. [Record shapes and writes](data_model.md)

The app starts as Riley Chen. Use fixed English fixtures and local assets so tasks have reproducible search results and work offline. Authentication, live integrations, actual Git operations and CI execution fall outside the sandbox. Use the primary checklist in [TODO.md](../TODO.md) for supported actions.
