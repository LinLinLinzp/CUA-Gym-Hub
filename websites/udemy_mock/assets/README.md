# Udemy Account Research

The signed-in account supports a learner building skills from their enrolled courses and an instructor managing curriculum and responding to students. The synthetic account, Morgan Ellis, fills both roles. Give each workflow a visible entry point from the shared shell so the user can move from learning to course management without signing in again.

## Workflow evidence and planned views

| Priority | View | Product behavior and planned layout |
| --- | --- | --- |
| P0 | Account shell | A persistent header switches between My learning and Instructor. Each view has a stable URL and supports refresh. Harbor supplies the session and initial dataset. |
| P1 | My learning | Use search and filters above the enrolled course list, with a separate archived view and dedicated list pages. Archive and restore from course actions. A resume panel surfaces a course with an explicit resume action. [Course settings](https://support.udemy.com/hc/en-us/sections/206458568-Course-Settings) · [Organizing courses with lists](https://support.udemy.com/hc/en-us/articles/230381388-Organizing-Your-Udemy-Courses-With-Lists) |
| P1 | Course workspace | Use a local lesson surface and adjacent sectional outline. Show course progress and resume from the saved lecture. Expose overview, curriculum and discussions as labeled tabs. [Course player](https://support.udemy.com/hc/en-us/sections/206457187-Course-player) |
| P1 | Learner Q&A | Offer course-scoped search and explicit Ask a question, Follow replies and Reply actions. Thread detail shows lecture context and gives the top answer a clear position and label. [How to ask a course question](https://support.udemy.com/hc/en-us/articles/229233387-How-to-Ask-a-Question-About-a-Course-You-re-Taking) |
| P1 | Instructor courses and curriculum | Filter owned courses by status, open a draft form or manage an existing course, and build sections and lessons from the course workspace. The local submit action moves a ready draft to In review. [Instructor courses](https://support.udemy.com/hc/en-us/articles/229233167-Access-the-Instructor-View-and-Course-Page) · [Course management](https://support.udemy.com/hc/en-us/articles/230048607-How-to-Navigate-the-Course-Management-Dashboard) |
| P1 | Instructor Q&A | Show a queue and a thread reading pane with course and lecture context. Unread tracks instructor attention. Unanswered tracks the absence of a top answer. The shared thread record keeps the learner and instructor views in sync. [Instructor Q&A dashboard](https://support.udemy.com/hc/en-us/articles/229606328-Instructor-Q-A-Dashboard) |
| P2 | Instructor performance | Present fixed course-level data with course/date filters, small metrics and an accessible table. [Instructor performance and student engagement](https://support.udemy.com/hc/en-us/sections/206457207-Student-engagement) |

## Local data and artwork

Course, section, lecture, enrollment and list records support library organization and progress. Questions and answers share IDs across the two roles, while follows and instructor read states are keyed by account. See [data_model.md](data_model.md) for the fixture, ownership and update rules. [DESIGN.md](../DESIGN.md) defines the original layout, color tokens and CSS artwork system.

Authentication, commerce, external media, live notifications and the real course review service sit outside the local signed-in scenario. Seeded drafts and published courses support testing both authoring and learner-facing views on localhost.
