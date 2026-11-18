# Moodle workflow research

This instructor account brings course management, assignment review and course gradebooks into one workspace. Elena Park is the synthetic instructor. A course-scoped learner workspace lets an enrolled synthetic student enter a draft and submit online text, giving the instructor a complete review path.

## Research findings

- **Courses.** Moodle's My courses supports finding, filtering and starring courses. Course settings include full and short names, category, dates and visibility. A teacher can enrol users manually from Participants. Surface those actions through the course catalog, settings form and roster. [My courses](https://docs.moodle.org/503/en/My_courses) · [Course settings](https://docs.moodle.org/503/en/Course_settings) · [Manual enrolment](https://docs.moodle.org/503/en/Manual_enrolment)
- **Assignments.** An instructor adds an activity to a course and configures its instructions and availability. Learners can submit text, and instructors can read the submission and enter a mark and feedback. Use a focused learner page for the draft and submission steps and a roster-based grading flow for the instructor. [Assignment activity](https://docs.moodle.org/503/en/Assignment_activity) · [Assignment settings](https://docs.moodle.org/503/en/Assignment_settings)
- **Grades.** Assessed activities create gradebook items. The grader report lets an instructor find students, review marks, and override an activity result. Moodle distinguishes activity-linked items from manual items. Keep the base mark and override available independently in the planned data model. [Grader report](https://docs.moodle.org/503/en/grader_report) · [Grade items](https://docs.moodle.org/503/en/Grade_items)

## Screen inventory

| Priority | View | Layout and main interaction |
| --- | --- | --- |
| P0 | Dashboard and account shell | Plum rail with global navigation and account identity. Main area shows the grading queue and upcoming assignments with links to their source views. |
| P1 | My courses and Course Settings | Search and filters above a card grid. The detail page shows section headings and assignment rows beneath course tabs. The settings screen uses a single-column form. |
| P1 | Participants | Searchable roster table. An enrolment dialog lists eligible students and confirms the selection. Row actions offer suspension or restoration. |
| P1 | Assignments and assignment detail | Searchable assignment list with course, due date and visibility. Detail links to Settings and Submissions. Create and edit use the same labelled fields. |
| P1 | Learner workspace and Submissions | Learner sees instructions, availability, an online text field and status or feedback. Instructor sees a filterable roster and opens a grading editor with text, points and feedback. |
| P1 | Gradebook and Setup | Course selector leads to a horizontally scrollable grader report. Item creation uses a short form. Cell actions open grade editing with override status. |
| P2 | Gradebook export | Generate a CSV from local course data on demand. |

The planned state model links courses to categories and sections, participants to enrolments, submissions to assignments and students, and grades to grade items. Assignment and gradebook views share one grade record. See [data_model.md](data_model.md) for seed coverage and write rules.

The visual direction is specified in [DESIGN.md](../DESIGN.md). All graphics come from local CSS. The phase covers one instructor account and synthetic learners, with online text as the supported submission type. Authentication, external integrations and communication services are outside the course and assessment workflows.
