# Kaggle workflow research

## Purpose and personas

Kaggle brings competition challenges, notebooks, and datasets together. A competition entrant reviews rules, obtains data, submits predictions, and checks the result. An analyst looks for datasets and notebooks and makes a private copy for experimentation. A dataset maintainer publishes a collection, updates metadata, and releases a new version. The synthetic Morgan Lee account supports all three roles. [Kaggle competitions documentation](https://www.kaggle.com/docs/competitions) · [Kaggle notebooks documentation](https://www.kaggle.com/docs/notebooks) · [Official Kaggle dataset commands](https://github.com/Kaggle/kaggle-cli/blob/main/docs/datasets.md)

## Feature inventory

| Priority | Feature | View and interaction |
|---|---|---|
| P0 | Account shell | Horizontal top bar, home hero, three catalog links, workspace with the user's own participation and resources. On small screens the navigation wraps onto its own row. |
| P0 | Routed state | Shared loaded state, neutral boot view, scoped deep links, friendly empty and missing-record views, and verifiable offline persistence. |
| P1 | Competition discovery and participation | Catalog cards followed by the detail title and Overview, Data, Rules, Leaderboard and My Submissions tabs. Rules acceptance unlocks file downloads and CSV submission. The submissions table shows timestamp, file, description and score. [Kaggle competitions documentation](https://www.kaggle.com/docs/competitions) · [Official Kaggle competition commands](https://github.com/Kaggle/kaggle-cli/blob/main/docs/competitions.md) |
| P1 | Notebook discovery and authoring | Catalog links to a read view with version history. The editor uses a wide ordered cell stack beside a dataset input rail. Copy & Edit creates a private notebook, and Save Version snapshots its ordered cells and attached data. [Kaggle notebooks documentation](https://www.kaggle.com/docs/notebooks) |
| P1 | Dataset discovery and authoring | Searchable catalog. Detail lays out description, license, files, preview and history. Create and version forms collect local files, and an owner can update metadata. File lists and downloads follow the selected version. [Official Kaggle dataset commands](https://github.com/Kaggle/kaggle-cli/blob/main/docs/datasets.md) |
| P1 | Verifier coverage | Check explicit mutations after reload, invalid and canceled forms, empty/sparse/large worlds, scoped sessions and idle behavior. |
| P2 | Catalog and preview enhancements | Keyboard shortcut to focus search and column summaries for available preview rows. |

## Data and artwork

The data model uses a signed-in account, synthetic catalog owners, three catalogs and linked participation, submission, version and activity records. Typical linked examples include Harbor Ferry Demand (competition), Harbor Ferry Ridership (dataset) and Weekday Demand Baseline (notebook). [Data model](data_model.md)

The UI uses its own layout, colors, and locally authored visuals. Public documentation informs workflow names and interactions. [Design system](../DESIGN.md)

## Phase scope

Authentication, live compute, external APIs and production uploads are outside this offline training scenario. Notebook examples use local output, competition scoring uses deterministic fixtures, and file handling uses the Harbor runtime's local endpoints.
