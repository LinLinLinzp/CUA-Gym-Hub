# Coursera workflow research

The workspace serves a signed-in learner managing a course library, assessments and earned credentials. The primary learner explores culture courses, resumes lessons and checks overdue work. A returning learner uses Accomplishments to retrieve credentials after completing a course.

## Public product references

- Course discovery is organized around subject and skill. Course pages show learning outcomes, modules and coursework before enrollment. Use these conventions for the search catalog and course outline. [Coursera course catalog](https://www.coursera.org/browse) · [Example course structure](https://www.coursera.org/learn/training-and-learning-online)
- Course progress connects an outline with the next recommended reading or assignment. Grades pair assessment status with a next action. Coursera's teaching guidance describes repeated attempts as a way to master course material. [Progress tracking](https://blog.coursera.org/new-progress-tracking-features-on-coursera/) · [Grades view](https://blog.coursera.org/updates-to-your-learning-experience-on-coursera/) · [Assessment retakes](https://blog.coursera.org/how-to-integrate-mastery-learning-into-course-design/)
- Learners retrieve course certificates through Accomplishments and can download them as PDFs or share a verification URL. Adapt this into an offline certificate and local verification view backed by the active session. [Coursera certificate overview](https://www.coursera.org/articles/what-is-coursera) · [Certificate and verification details](https://www.coursera.org/learn/olympic-games)

## Feature inventory

| Priority | Screen or interaction | Layout and behavior |
| --- | --- | --- |
| P0 | Learner shell | A navigation rail with a study workspace and visible account identity. On mobile, navigation moves into the header. |
| P0 | Harbor state and routes | Shared baseline load, session-aware navigation, central business saves and usable direct links. |
| P1 | My Learning | Feature the next course, followed by searchable enrollment rows with status, progress and actions. |
| P1 | Explore and enrollment | Search and filters above an illustrated course grid. The course detail groups key facts, syllabus and enrollment CTA. |
| P1 | Course outline and readings | Show requirement status and progress above an ordered outline. Use a single-column article and explicit completion action for each reading. |
| P1 | Assignments and results | Show a filterable desk of coursework. The quiz detail shows the current attempt, feedback and prior results. |
| P1 | Accomplishments and verification | Show a searchable credential list, original printable certificate and a stable verification view. |
| P2 | Resume shortcuts | Show the next learning requirement and a due-soon assignment where data supports them. |

The catalog, learner, instructors, issuers, reading text, quiz prompts and artwork are synthetic. Course completion uses an explicit Finish course action so the learner can verify the requirements before issuing the certificate. Enrollment has a single local path and access depends on the synthetic course data. Authentication, commerce and public account interactions fall outside the learner workflow. See [DESIGN.md](../DESIGN.md) for the original visual direction and [data_model.md](data_model.md) for record definitions.
