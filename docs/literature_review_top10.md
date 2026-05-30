# Literature Review and Research Framing for APMS

## I. Project Context

APMS (Academic Personal Management System) addresses a practical educational knowledge-management problem: students accumulate large volumes of course materials (PDF, DOCX, PPTX), but semantic search and grounded question answering over personal document collections remain difficult and time-consuming. The system is positioned as a design-and-integration contribution—a reliable retrieval-augmented generation (RAG) pipeline for real academic use—not as a new foundation-model contribution.

The planned AI stack binds generation to each user's own documents:

- **Embedding:** Amazon Titan Embeddings v2 (1536-dimensional vectors stored in MongoDB Atlas Vector Search).
- **Generation:** Amazon Bedrock — Claude 3 Haiku, with a strict system instruction to answer only from retrieved context.
- **Retrieval:** Top-5 chunk retrieval (as designed) with `ownerId` filtering for multi-tenant isolation.
- **Citations:** Structured metadata (`documentTitle`, `pageNumber`, `excerpt`) attached to assistant messages.

The central design tension is reducing **hallucination** (fluent but ungrounded or incorrect answers) while preserving acceptable latency, security isolation, and feasibility on managed cloud services. The RAG chat pipeline is specified in project design documents but not yet fully implemented in the API layer. Prior literature on RAG in education, chunking, prompt grounding, and citation quality informs how APMS evaluates these trade-offs under RO1.

## II. Research Objectives and Research Questions

### Primary Objective

- **RO1 — Design Objective:** Design and evaluate a practical RAG-based academic personal knowledge system on a managed AWS stack (Titan Embeddings + Claude 3 Haiku + Atlas Vector Search), with decisions on chunking, prompting, and citation design justified by prior literature and measurable outcomes.

### Research Questions (from project framing)

- **RQ1:** How effectively can the combination of Amazon Titan Embeddings and Claude 3 Haiku minimize hallucinations in an academic RAG chatbot?
- **RQ1.1:** Can a specific chunking strategy (e.g., character-based vs. semantic/structure-aware) for learning materials (PDF, DOCX) significantly improve retrieval precision?
- **RQ1.2:** To what extent does enforcing strict system prompts (e.g., “Only use the provided context to answer…”) prevent the LLM from hallucinating?
- **RQ1.3:** How accurately can the assistant generate precise metadata for citations (document title, page number) based on the retrieved chunks?

None of the ten journal papers below evaluate citation title/page accuracy directly; RQ1.3 will be addressed primarily through APMS empirical evaluation, with related support from chunking and faithfulness-oriented metrics in the literature.

### Expected Output

A highly optimized RAG pipeline that bounds the LLM to the student's own document context can reduce hallucinated responses. Proper chunking strategies, combined with rigorous system instructions, are expected to yield more accurate academic answers and transparent, verifiable citations for every response—aligned with the literature reviewed in Section III.

## III. 10-Paper Detailed Review

### 1) ISFJ-RAG: Interventional Suppression of Hallucinations via Counter-Factual Joint Decoding Retrieval-Augment Generation

- **Maps to RQ:** RQ1
- **DOI:** `10.3390/bdcc10020056`
- **Venue/Year:** Big Data and Cognitive Computing, 2026, 10(2), 56
- **Indexing:** Scopus, WoS (ESCI)
- **Quartile Evidence (Scopus/WoS):** BDCC reports Scopus categories including Q1 (e.g., Computer Science Applications, Information Systems) and Q2 (Artificial Intelligence).
- **Source URL:** https://www.mdpi.com/2504-2289/10/2/56
- **Research Problem:** RAG mitigates LLM hallucinations by injecting external knowledge, but retrieval noise and attention bias still spread factual errors—especially for factual, multi-hop, and unanswerable questions. Existing methods struggle to suppress high-confidence hallucinations in long-chain reasoning because they do not decouple knowledge-bias effects from causal reasoning paths.
- **Approach / System Design:** ISFJ-RAG uses counterfactual joint decoding with a structural causal model (SCM) and a dual-decoder architecture: a total causal effect decoder (query + knowledge) and a knowledge bias effect decoder (knowledge only). Individual treatment effects (ITEs) subtract estimated hallucination bias from the generation distribution at each decoding step.
- **Experimental Setup:** Evaluated on the RAGEval benchmark (DragonBall dataset): factual, multi-hop, and unanswerable questions; 300 samples; BGE-Large retrieval (TopK = 5); metrics include completeness, hallucination rate, and irrelevance.
- **Key Results:** Per the abstract: generation completeness 86.89% (+5.49%); hallucination rate 10.39% (−2.5%); irrelevance rate 4.44% (−2.99%) versus baselines (Table 2 reports 85.17% completeness for the 7B ISFJ configuration).
- **Limitations or Scope:** Dual-decoder intervention adds architectural complexity; experiments use a specific embedding/retrieval stack rather than Titan/Haiku; plug-and-play at decode time may not map directly to all managed API constraints.

### 2) MDKAG: Retrieval-Augmented Educational QA Powered by a Multimodal Disciplinary Knowledge Graph

- **Maps to RQ:** RQ1
- **DOI:** `10.3390/app15169095`
- **Venue/Year:** Applied Sciences, 2025, 15(16), 9095
- **Indexing:** Scopus, WoS (SCIE)
- **Quartile Evidence (Scopus/WoS):** Applied Sciences reports JCR Q1 (Engineering, Multidisciplinary) and additional categories in Q2/Q3.
- **Source URL:** https://www.mdpi.com/2076-3417/15/16/9095
- **Research Problem:** Integrating massive multimodal instructional resources for interactive educational QA remains difficult; text-only RAG can hallucinate when retrieval or entity coverage is insufficient.
- **Approach / System Design:** MDKAG combines RAG with a multimodal disciplinary knowledge graph (MDKG): ERNIE 3.0 entity extraction from textbooks, slides, and videos; graph-adjacent passage retrieval; LLM answer generation; and an answer-verification module checking semantic overlap and entity coverage, with incremental graph updates when new concepts appear.
- **Experimental Setup:** Three university courses; compared against text-only RAG and knowledge-augmented generation (KAG) baselines.
- **Key Results:** Up to 23% hallucination reduction and up to 11% answer accuracy improvement over baselines; improved entity coverage (e.g., 0.7124 vs. 0.6239) and relevance scores versus text-only RAG.
- **Limitations or Scope:** Requires multimodal ingestion and graph maintenance; heavier than document-only vector RAG; domain and modality coverage affect verification quality.

### 3) Structure-Aware Chunking for Complex Tables in Retrieval-Augmented Generation Systems

- **Maps to RQ:** RQ1.1
- **DOI:** `10.28991/ESJ-2026-010-01-09`
- **Venue/Year:** Emerging Science Journal, 2026, 10(1), 184–205
- **Indexing:** Scopus
- **Quartile Evidence (Scopus/WoS):** Emerging Science Journal — Scopus-indexed; Scimago SJR 2024 Q1 (Multidisciplinary).
- **Source URL:** https://www.ijournalse.org/index.php/ESJ/article/view/3380
- **Research Problem:** Standard text-centric chunking breaks semantic structure in table-rich academic documents (multi-column, multi-row, nested headers), harming retrieval and downstream answer quality in RAG.
- **Approach / System Design:** Custom structure-aware chunking for university course documents: Camelot table extraction, logic preserving academic term, subject name, credit hour, and category in coherent chunks; evaluated with RAGAS against standard parsing/chunking baselines.
- **Experimental Setup:** University course documents with complex tables; RAGAS metrics (answer accuracy, retrieval relevance, contextual precision) versus baseline chunking pipelines.
- **Key Results:** Highest answer accuracy 0.73; substantial gains in retrieval relevance and contextual precision over baselines.
- **Limitations or Scope:** Focused on table-heavy syllabi-style PDFs; Camelot and custom rules may not generalize to all DOCX/PPTX layouts without adaptation. Does not measure citation metadata (title/page) accuracy.

### 4) Enhancing Retrieval-Augmented Generation with Entity Linking for Educational Platforms

- **Maps to RQ:** RQ1.1
- **DOI:** `10.3390/bdcc10040120`
- **Venue/Year:** Big Data and Cognitive Computing, 2026, 10(4), 120
- **Indexing:** Scopus, WoS (ESCI)
- **Quartile Evidence (Scopus/WoS):** BDCC categories include Q1 (Computer Science Applications, Information Systems) and Q2 (Artificial Intelligence).
- **Source URL:** https://www.mdpi.com/2504-2289/10/4/120
- **Research Problem:** Dense retrieval by semantic similarity alone can return plausible but factually wrong passages in specialized educational domains where terminological ambiguity is high.
- **Approach / System Design:** ELERAG integrates Wikidata-based entity linking with hybrid reranking (Reciprocal Rank Fusion, weighted-score reranking, Cross-Encoder, and combined pipelines) to fuse semantic and factual signals before generation.
- **Experimental Setup:** Custom Italian university course dataset and SQuAD-it; compared ELERAG against baseline RAG, weighted reranking, standalone Cross-Encoder, and RRF + Cross-Encoder.
- **Key Results:** On the academic dataset (retrieval-stage, Table 1), ELERAG + RRF achieves Exact Match 56.5% and MRR 0.779 (vs. baseline Exact Match 52.2%, MRR 0.652); Cross-Encoder remains strongest on general-domain SQuAD-it—demonstrating domain mismatch effects.
- **Limitations or Scope:** Italian-language academic corpus and Wikidata coverage; entity linking pipeline adds preprocessing cost; cross-encoders may still dominate on general web-like text.

### 5) Retrieval-Augmented Generation (RAG) Chatbots for Education: A Survey of Applications

- **Maps to RQ:** RQ1 (landscape)
- **DOI:** `10.3390/app15084234`
- **Venue/Year:** Applied Sciences, 2025, 15(8), 4234
- **Indexing:** Scopus, WoS (SCIE)
- **Quartile Evidence (Scopus/WoS):** Applied Sciences includes Q1–Q3 categories by field; eligible under Q1–Q3 filter.
- **Source URL:** https://www.mdpi.com/2076-3417/15/8/4234
- **Research Problem:** Five years after RAG was introduced, educational adoption of RAG chatbots needs synthesis—purposes, knowledge scope, models used, and how evaluation is reported—especially regarding hallucination as a barrier to adoption.
- **Approach / System Design:** Survey of 47 papers on RAG chatbots in education; categorizes chatbot character, support target, thematic knowledge scope, underlying LLM, and evaluation style.
- **Experimental Setup:** Literature review (peer-reviewed, preprints, theses); not a single-system benchmark.
- **Key Results:** Positions RAG as addressing the main adoption barrier (hallucinations) for educational chatbots; maps domains (e.g., computer science, databases, programming) and notes limited studies verifying whether chatbots achieve their stated educational aims.
- **Limitations or Scope:** Secondary synthesis; heterogeneous primary study quality; not all included works are journal articles.

### 6) Retrieval-Augmented Generation for Educational Application: A Systematic Survey

- **Maps to RQ:** RQ1 (landscape)
- **DOI:** `10.1016/j.caeai.2025.100417`
- **Venue/Year:** Computers and Education: Artificial Intelligence, 2025, 8, 100417
- **Indexing:** Scopus, WoS (open access journal)
- **Quartile Evidence (Scopus/WoS):** CAEAI — Scopus Q1 (Education; Computer Science Applications; Artificial Intelligence per Scimago/CiteScore 2024).
- **Source URL:** https://www.sciencedirect.com/science/article/pii/S2666920X25000578
- **Research Problem:** LLMs in education face hallucination, static internal knowledge, limited explainability, and personalization gaps; a systematic view of how RAG is applied across educational scenarios is needed.
- **Approach / System Design:** Comprehensive review of RAG in education: workflow (indexing, retrieval, generation), retriever types, generation optimization, and applications (interactive learning, content generation/assessment, large-scale deployment).
- **Experimental Setup:** Systematic review synthesizing 51 studies across educational goals and application scenarios; 45 articles directly cited after domain and quality filtering; maps applications to research themes including educational QA, chatbots, tutoring, and adaptive paths.
- **Key Results:** Identifies RAG as improving factual accuracy and enabling dynamic knowledge updates; discusses ongoing challenges—hallucination mitigation, retrieval completeness/timeliness, cost, and multimodal support.
- **Limitations or Scope:** Survey-level conclusions; implementation details vary widely across primary studies.

### 7) A Comparative Performance Analysis of Locally Deployed Large Language Models Through a Retrieval-Augmented Generation Educational Assistant Application for Textual Data Extraction

- **Maps to RQ:** RQ1.2
- **DOI:** `10.3390/ai6060119`
- **Venue/Year:** AI, 2025, 6(6), 119
- **Indexing:** Scopus, WoS (ESCI)
- **Quartile Evidence (Scopus/WoS):** AI (MDPI) — CiteScore Q2 (Artificial Intelligence); JCR-listed categories within Q1–Q3 scope.
- **Source URL:** https://www.mdpi.com/2673-2688/6/6/119
- **Research Problem:** Academic advising chatbots must avoid hallucinated prerequisites or course details; purely parametric LLMs risk misleading students when institutional data is authoritative.
- **Approach / System Design:** RAG chatbot for university course catalogs: structured data extraction, embedding storage (ChromaDB), semantic retrieval (k = 5), and prompt augmentation that explicitly instructs the model to answer only from retrieved context with a fallback when information is insufficient.
- **Experimental Setup:** Comparative evaluation of multiple locally deployed LLMs on course-catalog QA; expert scoring of relevance and handling of fallback responses.
- **Key Results:** Larger models achieve higher relevance but longer latency; strict context-only prompting and fallback policies reduce speculative answers; RAG grounding is emphasized as essential for trustworthy advising.
- **Limitations or Scope:** Course-catalog structured data rather than arbitrary PDF syllabi; local open-weight models, not Bedrock Titan/Haiku; domain-specific to one institution's catalog format.

### 8) Multi-Layered Framework for LLM Hallucination Mitigation in High-Stakes Applications: A Tutorial

- **Maps to RQ:** RQ1, RQ1.2
- **DOI:** `10.3390/computers14080332`
- **Venue/Year:** Computers, 2025, 14(8), 332
- **Indexing:** Scopus, WoS (ESCI)
- **Quartile Evidence (Scopus/WoS):** Computers — Scopus Q2 (e.g., Computer Networks and Communications; Human-Computer Interaction).
- **Source URL:** https://www.mdpi.com/2073-431X/14/8/332
- **Research Problem:** LLMs produce fluent but incorrect statements; in regulated or high-stakes settings, single mitigation techniques are insufficient and difficult to operationalize in production pipelines.
- **Approach / System Design:** Three-layer reference architecture: (1) input governance, (2) evidence-grounded generation via RAG with verifiable sources, (3) post-response verification; plus structured prompt design, fine-tuning options, supervisory agent for uncertainty/escalation, and security surfaces (prompt injection, retrieval poisoning).
- **Experimental Setup:** Tutorial and framework synthesis with financial-services pilot lessons; evaluation metrics and operational trade-offs for production deployment.
- **Key Results:** Argues layered controls outperform isolated techniques; provides implementation playbook (confidence thresholds, escalation, provenance, fidelity evaluation).
- **Limitations or Scope:** Financial-domain emphasis; not an educational benchmark study; some components (fine-tuning, supervisory agents) exceed minimal managed-RAG scope.

### 9) A Survey on Hallucination in Large Language Models: Principles, Taxonomy, Challenges, and Open Questions

- **Maps to RQ:** RQ1 (foundations)
- **DOI:** `10.1145/3703155`
- **Venue/Year:** ACM Transactions on Information Systems, 2024
- **Indexing:** Scopus, WoS (SCIE)
- **Quartile Evidence (Scopus/WoS):** ACM TOIS — Q1 in Computer Science / Information Systems (Scimago/JCR).
- **Source URL:** https://dl.acm.org/doi/10.1145/3703155
- **Research Problem:** LLM hallucinations undermine reliability in information retrieval and open-ended use; a unified taxonomy, detection landscape, and mitigation map are needed for the LLM era beyond task-specific NLG.
- **Approach / System Design:** Taxonomy distinguishing **factuality** hallucination (vs. verifiable world facts) and **faithfulness** hallucination (instruction, context, or logical inconsistency); surveys causes (data, training, inference), detection methods/benchmarks, and mitigations including RAG—with analysis of RAG limitations.
- **Experimental Setup:** Comprehensive survey (not empirical system evaluation).
- **Key Results:** Links faithfulness to context inconsistency—directly relevant to strict “use only provided context” policies; catalogs RAG as a major inference-time mitigation while noting RAG systems can still hallucinate.
- **Limitations or Scope:** General LLM focus, not education-specific; breadth limits depth on any single pipeline (e.g., Titan + Haiku).

### 10) A Retrieval-Augmented Generation Framework for a Study Program Accreditation Question-Answering System

- **Maps to RQ:** RQ1 (academic domain)
- **DOI:** `10.48084/etasr.16326`
- **Venue/Year:** Engineering, Technology & Applied Science Research, 2026
- **Indexing:** Scopus
- **Quartile Evidence (Scopus/WoS):** ETASR reports Scopus Quartile Ranking 2024 = Q2.
- **Source URL:** https://www.etasr.com/index.php/ETASR/article/view/16326
- **Research Problem:** Accreditation documents are complex; students and staff face repetitive interpretation work and need grounded explanations from authoritative materials.
- **Approach / System Design:** Indonesian accreditation QA system using RAG: retrieve authoritative accreditation passages and generate context-aware explanations with an LLM.
- **Experimental Setup:** Case study on LAM INFOKOM accreditation materials; metrics include MRR, BERTScore, and manual accuracy assessment.
- **Key Results:** MRR 0.88, BERTScore F1 0.76, manual accuracy 83.67%.
- **Limitations or Scope:** Indonesian language and accreditation domain; retrieval/generation stack not specified as Titan/Haiku; smaller domain corpus than open-ended student drives.
