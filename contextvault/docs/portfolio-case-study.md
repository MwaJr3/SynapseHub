# Case study: ContextVault

**ContextVault — AI Retrieval-Augmented Knowledge Platform**

> A production-oriented RAG system using PostgreSQL + pgvector to transform private document collections into searchable, citation-grounded knowledge bases.

## The problem

Large document collections are difficult to interrogate reliably. Sending an entire document to a language model can exceed context limits, increase cost and blur citation boundaries. A generic chat interface also says little about where an answer came from or whether a user was allowed to see its evidence.

## The engineering approach

ContextVault separates the document lifecycle from the request path: validation, extraction, structure-aware chunking, versioned embeddings and atomic indexing run as recoverable jobs. PostgreSQL holds both relational ownership metadata and pgvector embeddings. Search filters authorization before retrieval, combines vector and lexical signals when requested, and exposes the retrieved passages and scores next to the answer. Citations point to real retrieved chunks and can be inspected in context.

A dedicated playground makes top-K, threshold, ranking and chunking choices visible. A small fictional evaluation set measures document-level retrieval behavior and citation reference validity without claiming that those numbers prove faithfulness. Owner-scoped queries, composite relationships and PostgreSQL RLS demonstrate layered isolation; tests exercise a non-bypass database role and cross-user denial. Structured timing and usage records make individual pipeline stages inspectable.

## Technical highlights

Next.js · React · TypeScript · PostgreSQL · pgvector · HNSW · full-text / hybrid search · embeddings · RAG · OpenAI / self-hosted / mock providers · background workers · S3-compatible storage · authentication · authorization / RLS · evaluation · Vitest · Playwright · Docker · observability.

## Honest boundaries

The built-in mock uses deterministic lexical hashing and extractive answers, not semantic AI. Citation-reference checks do not prove that an answer is faithful, and prompt-injection defenses are not absolute. The application is a production-oriented reference that still requires a hardened identity provider, malware scanning, parser isolation, operational monitoring, retention controls and security review before sensitive production use. See [security](security.md) and [evaluation](evaluation.md).
