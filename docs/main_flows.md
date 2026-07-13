# APMS Core Business Activity Diagrams

This document indexes the three core **student** business flows for APMS. The flows are expressed as UML Activity Diagrams with two swimlanes:

| Position | Lane |
|----------|------|
| **Left** | Student |
| **Right** | APMS System |

**Business source:** [SRS.md](./SRS.md) §3.1-3.8

**Diagram source:** [diagrams/](./diagrams/)

## Rendering

- Open the `.puml` file in VS Code with the [PlantUML](https://marketplace.visualstudio.com/items?itemName=jebbs.plantuml) extension, or
- Paste the content into [plantuml.com/plantuml](https://www.plantuml.com/plantuml/uml)
- Export PNG/SVG for slides or reports.

PlantUML activity swimlanes (`|Lane name|`) keep the two vertical lanes aligned. The first declared lane (`Student`) appears on the left.

```text
+---------------------+---------------------+
|       Student       |     APMS System     |
|       (left)        |       (right)       |
+---------------------+---------------------+
|  [student action]   |  [system action]    |
|          |          |          ^          |
|          +----------+----------+          |
+---------------------+---------------------+
```

---

## Activity 1 - System Access and Academic Profile Setup

**SRS:** FR-001-FR-012, BR-002

The student authenticates with a Google account. APMS verifies whether the email is allowed to access the system. If access is allowed, the account is created or synchronized. When the student requests access to business functions, APMS checks whether the academic profile is completed. If not, the system provides active Curriculum options, the student submits the selected Curriculum, and APMS validates that it is active before saving the academic profile and marking it as **Completed**. The academic profile does not require semester or current-subject selection; specific courses are assigned during document upload or document update.

**File:** [diagrams/apms-activity-1.puml](./diagrams/apms-activity-1.puml)

---

## Activity 2 - Learning Document Management

**SRS:** FR-013-FR-034, FR-061; BR-006-BR-010, BR-015, BR-027

The student accesses their personal document collection. APMS returns documents grouped by the courses/course slots associated with the Curriculum in the academic profile. The student may submit a document upload request with a file and a required course. APMS accepts only PDF, DOCX, or PPTX files, enforces the 50 MB file limit and storage quota, and verifies that the selected course belongs to the profile Curriculum. A valid document is created with default **private** visibility, processed in the background, and returned in the user document list grouped by course.

The flow also captures repeatable document operations: organization through folder/title/tags/star state, read-only sharing with users or email recipients, private/public visibility changes, trash, restore, and permanent deletion. Share invites expire after 7 days, and items in trash are permanently purged after 30 days.

**File:** [diagrams/apms-activity-2.puml](./diagrams/apms-activity-2.puml)

---

## Activity 3 - Knowledge Access and AI-Assisted Learning

**SRS:** FR-035-FR-045, FR-062; BR-005

The student requests knowledge access from documents. APMS limits results to documents the student can read: owned documents, shared documents, or public documents. The student may request a public document listing, run semantic document search, or start an AI assistant conversation session. Public discovery can prioritize documents from the academic profile Curriculum or return the broader public listing with academic filters. Semantic search runs only within readable scope.

For AI assistant sessions, the student defines context and assistant mode, then submits a question. APMS enforces the 50-message daily limit, generates concise conversational answers with source citations, and includes follow-up suggestions in Q&A mode.

**File:** [diagrams/apms-activity-3.puml](./diagrams/apms-activity-3.puml)
