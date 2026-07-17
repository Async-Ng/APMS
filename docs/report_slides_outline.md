# APMS Report Slide Outline

This document defines the content outline for a concise 6-slide report deck for **APMS - Academic Personal Management System**. The deck presents APMS as a structured academic document workspace with controlled access, semantic search, RAG Chat, and verifiable source citations.

## Slide 1 - APMS: Personal Academic Document Hub

**Title:** APMS - Academic Personal Management System
**Subtitle:** Organize learning materials by curriculum and course, search inside documents, and ask AI with verifiable citations.

**Key points:**
- APMS helps students store, organize, and reuse learning documents in one workspace.
- Documents are connected to the student's academic profile and course structure.
- The system supports PDF, DOCX, and PPTX learning materials.
- AI answers are grounded in documents the user is allowed to read.
- Citations can open the original source location when metadata is available.

**Visual suggestion:** APMS name/logo with three signals: document management, semantic search, and source citation.

## Slide 2 - Problem And Objectives

**Current problems:**
- Learning materials are scattered across personal drives, chat groups, and classroom channels.
- Students need a clearer way to organize documents by curriculum and course.
- Searching inside PDF, DOCX, and PPTX files is slow and manual.
- Shared materials need controlled read access, not uncontrolled file forwarding.
- AI answers are hard to trust if the source cannot be checked.

**APMS objectives:**
- Bring academic documents into one structured workspace.
- Require course-based document organization so materials remain searchable and meaningful.
- Support personal documents, read-only sharing, and public discovery.
- Provide semantic search and RAG Chat over readable documents.
- Reduce unsupported AI answers by using evidence checks and source citations.

## Slide 3 - Users And System Scope

**Primary users:**
- **Student:** signs in, completes an academic profile, uploads documents, manages Drive items, shares materials, searches content, and asks AI questions.
- **Administrator:** manages users, quotas, access emails, curricula, semesters, subjects, and course slots.

**In scope:**
- Google/Cognito sign-in with allowed domains and approved exception emails.
- Academic profile based on curriculum selection.
- Upload and processing for PDF, DOCX, and PPTX files.
- Personal Drive, shared documents, public discovery, starred items, and trash.
- Semantic search and RAG Chat with source citations.
- Citation opening to the correct document, page/slide, and chunk when metadata is available.

**Out of scope:**
- Editing the original file content inside APMS.
- Real-time collaborative editing.
- Grade management or LMS/FAP replacement.
- Forum discussions, comments, or classroom social features.

## Slide 4 - Key Business Rules

**Rules to highlight:**
- Users can access APMS only through allowed school domains or approved exception emails.
- Students must complete a valid curriculum-based academic profile.
- Each uploaded document must be attached to a valid course slot in the student's curriculum.
- Supported file types are PDF, DOCX, and PPTX; each file can be up to 50 MB.
- The default storage quota is 500 MB per user.
- New documents start as personal materials; owners can share read-only, publish for discovery, or move items to trash.
- Trash is a soft-delete area with automatic cleanup after 30 days.
- AI Chat is limited to 50 messages per user per day.
- AI answers must use readable sources; displayed citation markers must resolve to valid citations.

**Visual suggestion:** A two-column table: `Business rule` / `Meaning for users`.

## Slide 5 - Three Main Business Flows

**Flow overview:**
- **Flow 1 - System Access & Academic Profile:** Google sign-in -> access check -> user sync -> curriculum selection -> Drive access.
- **Flow 2 - Learning Document Lifecycle:** Upload document -> validate file, quota, and course -> store file and metadata -> extract, chunk, and embed -> ready in Drive -> share, publish, or trash.
- **Flow 3 - Search & RAG Chat With Citations:** Search or ask a question -> check read access -> retrieve and rerank sources -> pass evidence gate -> generate answer with citations -> open the cited source.

**Main diagrams for the slide:**
- `docs/diagrams/apms-main-flow-1-access-profile-activity.png`
- `docs/diagrams/apms-main-flow-2-document-lifecycle-activity.png`
- `docs/diagrams/apms-main-flow-3-search-rag-citation-activity.png`

**Detailed diagrams for backup explanation:**
- Flow 1 sub-flows: `apms-subflow-1a-login-access-activity.png`, `apms-subflow-1b-academic-profile-activity.png`, `apms-subflow-1c-admin-catalog-access-activity.png`
- Flow 2 sub-flows: `apms-subflow-2a-upload-processing-activity.png`, `apms-subflow-2b-drive-management-activity.png`, `apms-subflow-2c-share-public-trash-activity.png`
- Flow 3 sub-flows: `apms-subflow-3a-semantic-search-activity.png`, `apms-subflow-3b-rag-chat-answer-activity.png`, `apms-subflow-3c-citation-deep-link-activity.png`

**Speaker note:** The main diagrams show the end-to-end business flows. The sub-flow diagrams are appendix material for explaining operational details if the council asks for a deeper walkthrough.

## Slide 6 - Conclusion And Future Work

**Conclusion:**
- APMS gives students a structured workspace for academic documents.
- Curriculum and course-based organization makes learning materials easier to manage and retrieve.
- Access control supports personal documents, read-only sharing, and public discovery.
- Semantic search and RAG Chat turn uploaded materials into searchable knowledge.
- Citation deep links make AI answers easier to verify from the original source.
- Evidence checks reduce the risk of unsupported AI responses.

**Future work:**
- Expand automated testing for API, web, mobile, and RAG quality.
- Improve exact highlight behavior for PDF and DOCX citations.
- Refine PPTX citation viewing and slide-level navigation.
- Add dashboards for document, search, and AI usage insights.
- Optimize embedding and chat performance and cost.
- Continue improving mobile and administrative experiences.

## Internal Presentation Notes

- Keep the main deck to exactly 6 slides.
- Each slide should use 4-6 concise points; avoid dense paragraphs.
- Use the 3 main UML Activity diagrams on Slide 5.
- Use the 9 sub-flow diagrams only as appendix/detail slides when more explanation is needed.
- Use the C4 C2 Container Diagram (`docs/diagrams/apms-c2-container.png`) as an architecture backup, not as a replacement for the business-flow slide.
- Do not add fake metrics, testimonials, or unverified claims.
- Do not describe Drive, Library, and Forum as separate APMS products.
- Avoid code-style field names, enum values, or API routes in visible slide content.
- Keep the tone clear, professional, and suitable for a project defense session.

## Assumptions

- This file is a content outline, not a generated PowerPoint file.
- The primary report deck remains 6 slides.
- Diagram sources stay editable in draw.io under `docs/diagrams/`.
