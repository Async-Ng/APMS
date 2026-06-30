# Literature Review - Top 10 RAG References For APMS

APMS addresses a practical educational knowledge-management problem: students collect large volumes of course materials, but finding relevant content and asking grounded questions across those materials is still slow. The current APMS implementation uses Vertex AI Gemini for embeddings/generation and MongoDB Atlas Vector Search for retrieval.

## Current Project Framing

- **Embedding:** Vertex AI `gemini-embedding-001`, stored as 1024-dimensional vectors.
- **Generation:** Gemini chat model with grounded context and citations.
- **Retrieval:** MongoDB Atlas Vector Search over extracted document chunks.
- **Access control:** Retrieval must respect owner, direct share, and public-document rules.
- **Document model:** Uploads are course-bound through `courseSlotId`; documents are `private` or `public`.

## Research Objectives

- **RO1:** Design and evaluate a practical RAG-based academic knowledge system using Gemini, Atlas Vector Search, and course-aware document access.
- **RO2:** Evaluate whether source-grounded responses with citations reduce unsupported answers for student study workflows.
- **RO3:** Evaluate how chunking, metadata, course mapping, and visibility rules affect retrieval quality and user trust.

## Research Questions

- **RQ1:** How well can Gemini embeddings plus Atlas Vector Search retrieve course-relevant chunks from student documents?
- **RQ2:** How effectively do grounded Gemini responses reduce hallucination compared with ungrounded prompting?
- **RQ3:** How do course metadata and public/private access rules affect retrieval precision and privacy?

## Top 10 Literature Themes

| # | Theme | Relevance to APMS |
| --- | --- | --- |
| 1 | Retrieval-augmented generation | Establishes why external retrieval is needed when model memory is insufficient or stale. |
| 2 | RAG hallucination reduction | Supports the decision to require retrieved context and citations. |
| 3 | Educational RAG systems | Frames APMS as a learning-support system, not a generic chatbot. |
| 4 | Chunking strategies | Informs page-aware and structure-aware chunk generation for PDFs, DOCX, PPTX, and scanned materials. |
| 5 | Citation quality | Guides response design so answers point back to document/page/chunk evidence. |
| 6 | Semantic search evaluation | Provides metrics such as relevance, recall, precision, and answer faithfulness. |
| 7 | Access-aware retrieval | Supports strict filtering so private/share-only data is never exposed as public context. |
| 8 | Metadata-enhanced retrieval | Supports using major, semester, subject, and course mapping as retrieval/filter signals. |
| 9 | Multimodal document extraction | Motivates Gemini vision support for image-heavy or scanned academic documents. |
| 10 | Human trust in AI tutors | Reinforces transparent citations, refusal when context is insufficient, and clear uncertainty. |

## Design Implications For APMS

- Retrieval should be evaluated separately from generation.
- Public discovery should improve recall without weakening private access boundaries.
- Course metadata should be treated as first-class retrieval context.
- Chat should prefer “I do not have enough context” over unsupported answers.
- Evaluation should include real course documents, not only generic benchmark passages.

## Historical Note

Older APMS drafts discussed Amazon Bedrock, Claude, and Titan. Those are no longer the current implementation stack and should only be read as historical planning context.
