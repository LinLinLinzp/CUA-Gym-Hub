# Semrush workflow research

Semrush Projects groups work by website. Position Tracking monitors search positions for a chosen set of terms, target geography and device. Site Audit stores crawl settings and technical SEO reports. The planned workspace supports a portfolio manager checking several domains, an SEO specialist managing keyword campaigns and a technical SEO specialist prioritizing crawl findings. [Projects guide](https://www.semrush.com/kb/243-managing-a-project) · [Projects API overview](https://developer.semrush.com/api/v3/projects/overview/)

| Priority | Feature | Workflow and planned view |
| --- | --- | --- |
| P0 | Account shell and routing | A pre-signed-in workspace with text brand, horizontal navigation, reliable deep links and Harbor session state. |
| P1 | Projects directory | Search and filter by owner and tag, see the status of each tool and pin priority sites. A project overview acts as the entry point for either tool. |
| P1 | Project management | Create from a domain, edit name and tags, and confirm deletion with linked tool records. |
| P1 | Tracking setup | Choose a target and add keywords in two steps. The target context remains visible in reports. |
| P1 | Tracking reports | Read visibility, traffic, average position and position bands. Filter the keyword table, manage keyword tags and maintain competitors. |
| P1 | Audit setup | Set scope, limit, source and crawl rules, then start an audit from the project. |
| P1 | Audit reports | Read Site Health, errors, warnings and notices. Open check details and inspect affected pages. |
| P1 | Audit maintenance | Exclude or restore check types, save settings, rerun and select a past report. |
| P2 | Reporting depth | Download local CSVs and compare runs. |

Project setup is deliberately initiated from the project overview. Semrush documents both automatically configured first projects and manual setup for subsequent projects. A manual entry point makes the configuration fields and resulting records observable on every new project in this workspace. Keep the project domain stable after creation and store more specific tracking and crawl scopes on their respective records. [Projects guide](https://www.semrush.com/kb/243-managing-a-project) · [Position Tracking setup](https://www.semrush.com/kb/548-configuring-position-tracking) · [Site Audit setup](https://www.semrush.com/kb/539-configuring-site-audit)

On Position Tracking, distinguish the target from the keyword list and each keyword's observed results. Preserve a campaign's original device and location, allow a separate campaign for another target, and use tags as persistent groupings that can drive read-only filters. Use seeded fixed observations for ranking metrics and show ranking as unavailable on newly added terms without observations. [Position Tracking setup](https://www.semrush.com/kb/548-configuring-position-tracking) · [Position Tracking overview](https://www.semrush.com/kb/549-position-tracking-overview-manual) · [Position Tracking reports](https://www.semrush.com/kb/1191-track-your-rankings) · [Tags report](https://www.semrush.com/kb/1126-position-tracking-tags)

On Site Audit, keep the audit configuration distinct from the evidence collected on a run. Explicit reruns generate deterministic results from local fixtures. Issue check keys identify recurring check types across runs and each issue row identifies its own set of affected pages. The original report snapshots remain accessible through run history. [Site Audit API overview](https://developer.semrush.com/api/v4/projects/site-audit/overview/) · [Site Audit overview](https://www.semrush.com/kb/540-site-audit-overview) · [Issues report](https://www.semrush.com/kb/541-site-audit-issues-report)

`DESIGN.md` specifies the original layout. `data_model.md` specifies the proposed normalized state, fixed seed and mutation records. Visuals use local CSS or canvas with the design tokens. The workspace uses synthetic users, domains, rankings and crawl results. Authentication, scheduling execution and external data services are outside this build.
