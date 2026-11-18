# Blackboard workflow research

The site represents an instructor's teaching account. Dr. Elena Morales starts in Courses and can manage course access, record and release grades, and communicate with all students in a course. Courses, people, and teaching materials are synthetic. Use the public documentation for terminology and interaction behavior. DESIGN.md defines the original interface and its local course artwork.

## What the product documentation establishes

- The course catalog groups courses by term and shows identity information such as title, code, and instructor. Favorites bring frequently used courses to the top. Course Settings controls student access and distinguishes Open, Closed, and Complete. [Blackboard LMS Course FAQ](https://help.anthology.com/blackboard/student/en/getting-started/blackboard-course-faq.html) · [Blackboard Course Settings](https://help.anthology.com/blackboard/instructor/en/course-and-content-management/set-up-courses/course-settings.html)
- Blackboard's Ultra documentation uses Gradebook, while Original uses Grade Center. Use the seed's Grade Center label for the original instructor workspace and model the documented grid and item-list workflow. A student/item cell opens grade details and the item header exposes posting. Entering a grade and releasing it are distinct, with individual and item-wide posting supported. A manual point-bearing item appears in grading views and has no corresponding course content row. [Navigate the Gradebook](https://help.anthology.com/blackboard/instructor/en/grading/gradebook/navigate-the-gradebook.html) · [Post Grades](https://help.anthology.com/blackboard/instructor/en/grading/grading-assessments/post-grades.html) · [Gradable Items Column](https://help.anthology.com/blackboard/instructor/en/grading/grading-setup/grade-columns/gradable-items-column.html) · [Original Assign Grades](https://help.anthology.com/blackboard/instructor/en/original-course-view/grading/grading-tasks/assign-grades.html)
- Instructor announcements address the whole course. The public guide supports composing, drafting, posting, scheduling with an optional hide time, searching, sorting, editing, copying, and deleting. The site uses message text and records posting intent locally; the scheduled display reflects the current clock during rendering. [Blackboard Announcements](https://help.anthology.com/blackboard/instructor/en/interact-with-students/announcements.html)

## Feature inventory and screen transitions

| Priority | View | Main controls and transitions |
| --- | --- | --- |
| P0 | Global shell | Text brand, instructor identity, and links to Courses, Grade Center, and Announcements. Deep links and reloads preserve the Harbor session. |
| P1 | Courses index | Search and filter by term, access, or favorites. Open the course from its card, toggle favorite, or open Course Settings. |
| P1 | Course workspace | Read course overview and roster, change access in Settings, and open the course-scoped Grade Center and Announcements. |
| P1 | Grade Center | Global course queue links to course Grades and Gradable Items. Open a cell or item student row to enter points and feedback, add a manual item, or post an eligible grade or an eligible item batch. |
| P1 | Announcements | Browse globally or by course. Open a detail, create a draft, post, schedule, edit, copy, or delete. |
| P2 | Per-student summary | Read the selected student's grades and feedback for that course from a roster or grid entry. |

Course references connect roster enrollments, content, gradable items, and announcements. Each grade joins one enrolled student to one gradable item, while activity records identify user actions and related entity ids for Harbor verifiers. See data_model.md for entities, fixture sizes, and field-level write rules.

Authentication and institution administration fall outside the signed-in instructor scenario. Real email, media, uploads, integrations, and remote assets fall outside the offline runtime.
