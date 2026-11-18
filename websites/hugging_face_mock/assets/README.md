# Product behavior and implementation handoff

Hugging Face Hub uses repositories for models, datasets and interactive Spaces. This workspace centers on an already signed-in account. A model publisher can maintain a model card and settings. A dataset steward can manage dataset metadata, preview data and review access. A demo maintainer can create and manage a Space. A researcher can discover repositories and request gated access. [Repository management](https://huggingface.co/docs/huggingface_hub/guides/repository)

## Feature inventory

| Priority | View and audience | Behavior | Layout |
| --- | --- | --- | --- |
| P0 | Account overview | Navigate to owned work, catalogs, and access | Navy rail, ivory canvas, linked totals, recent rows |
| P0 | Catalogs | Search, filter, sort and open repositories | Utility toolbar above a compact results list |
| P1 | Models | Open model card and files, create a model, change metadata and visibility, like | Card and metadata column on Overview, separate Files and Settings views |
| P1 | Datasets | Browse formats and splits, preview rows, create and edit metadata, save a text fixture | Dataset Card with split selector and sample table, separate Files and Settings views |
| P1 | Spaces | Browse SDKs, create a Space, edit hardware for compute SDKs, pause and restart | Original local preview with status, separate Settings and Files views |
| P1 | Request access | Read public card, agree to sharing account details, request access, follow status | Request panel before gated files, plus Sent list |
| P1 | Review access | Set gating, review incoming requests, approve, reject or return to pending | Repository Settings link to Access with a resource filter |
| P1 | Access tokens | Create a synthetic token with role or permission selection, reveal once, revoke | Token table, reveal and confirmation dialogs |
| P2 | Keyboard and activity | Shortcut to catalog search and read-only activity filters | Search hint and optional full activity list |

## Product details behind the workflows

- Model and dataset cards give users context about the repository. Their metadata supports discovery fields such as task and license. Dataset examples can be previewed as local fixture rows with split counts. [Model cards](https://huggingface.co/docs/hub/model-cards), [Dataset cards](https://huggingface.co/docs/hub/datasets-cards)
- Model and dataset gating has automatic and manual approval modes. A manual request starts pending, while automatic approval immediately grants file access. Review uses the pending, accepted, and rejected statuses. Moving an accepted request to pending preserves the existing submission for review. [Gated models](https://huggingface.co/docs/hub/models-gated), [Gated datasets](https://huggingface.co/docs/hub/datasets-gated)
- Spaces are repositories with app previews and SDK settings. The workspace models Gradio, Docker, and Static and keeps pause, restart, and hardware controls on compute-backed Spaces. Use application state to represent the consequences of these clicks. [Spaces overview](https://huggingface.co/docs/hub/spaces-overview), [Manage your Space](https://huggingface.co/docs/huggingface_hub/guides/manage-spaces)
- The Access Tokens view uses the role terminology Read, Write, and Fine-grained. Token metadata belongs to the signed-in account, and any dummy value shown in the UI is a local fixture. [User access tokens](https://huggingface.co/docs/hub/security-tokens)

## State and scope

Repository types have separate collections and stable keys. Access requests reference a repository type, repository ID and requester ID. The activity collection links user-driven actions to the affected records. The data model specifies the fixtures and fields for the implementation, and the resulting SCHEMA.md will be the verifier reference.

Use the original account workspace design in DESIGN.md and local CSS artwork. This project starts with a synthetic signed-in identity and uses the Harbor state API for local persistence. Authentication, payments, and external service operations are outside the workspace scope.
