# Product research and interface handoff

## Account purpose

Duolingo groups language lessons into units and awards XP for activities. A learner can manage several courses from one account. Daily habits, periodic goals, and shared challenges create reasons to return. The account starts with synthetic learner Avery Chen, who has Spanish in progress, several other courses, goals, and a current partner challenge. [Learning overview](https://blog.duolingo.com/duolingo-101-how-to-learn-a-language-on-duolingo/), [Course management](https://blog.duolingo.com/add-new-course/)

The primary users are a learner adding or returning to a language, a regular learner reviewing a practice target, and a social learner trying to complete a shared challenge. An account hub gives all three a route from the Overview without entering a lesson first.

## Feature inventory

| Priority | Feature | Interaction and view |
| --- | --- | --- |
| P0 | Account shell and routes | Text wordmark, account summary, horizontal navigation, stable deep links, keyboard navigation and mobile stacking |
| P0 | Harbor persistence | Load the session world, save on explicit actions, and expose the state through the template endpoints |
| P1 | Course catalog and enrollment | Search, filter and sort. Add, switch and remove with confirmation. Review progress in Courses |
| P1 | Lesson completion | Answer a short original practice prompt and finish explicitly for recorded XP and qualifying learning progress |
| P1 | Goals | Set and edit a target, read periodic progress, filter history, and archive with confirmation |
| P1 | Friends Quest pairing | Filter challenges and choose an eligible friend from the roster before joining |
| P1 | Friends Quest follow-through | Track both contributors, send a preset nudge, and claim a completed reward once |
| P2 | Recent activity | Read a compact history drawn from persisted events on the Overview |

Course enrollment and removal are grounded in Duolingo's public course management guide. The local lesson is a self-contained way to drive verifiable progress. It uses original prompts, stable IDs, and a short response and feedback view. [Course management](https://blog.duolingo.com/add-new-course/)

Duolingo has used daily learning targets and recurring quests to encourage regular practice. The custom XP and lesson goal form is a sandbox interaction that makes target editing, historical progress, and archive behavior accessible from one account view. [Daily learning goals](https://blog.duolingo.com/how-streaks-keep-duolingo-learners-committed-to-their-language-goals/), [Learning and quest design](https://blog.duolingo.com/time-spent-learning-well/)

Friends Quests use shared weekly targets, including XP and perfect lessons, and support reminders. Duolingo's later overview describes partner choice in addition to random matching. The sandbox offers explicit choice, deterministic partner history, and a local reward claim. [Quest mechanics](https://blog.duolingo.com/friends-quests/), [Social feature overview](https://blog.duolingo.com/friends-social-features/)

## Views and records

Overview is an account snapshot with an active course and next lesson, the strongest current goal, and the current shared quest. Courses combines active enrollments with a catalog. Learn keeps a single short lesson in view. Goals presents target and period information above its filterable history. Friends Quests uses a shared progress card, challenge cards, and a searchable history. The original layout, typography and local illustration are defined in [DESIGN.md](../DESIGN.md).

The main relationships join courses to enrollments and lesson attempts, goals to progress rows, and friends to quest participation and nudges. The developer-facing [data model](data_model.md) defines those relationships and the exact writes. Completions can advance goals and quests together. Browsing and filtering stay in the UI.

The account operates offline on synthetic data. Authentication, external messages, payments, real account access, and proprietary visuals are outside the build scope.
