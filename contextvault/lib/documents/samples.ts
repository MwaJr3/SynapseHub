export const SAMPLE_COLLECTIONS = [
  {name:'Research Library',description:'Ideas, papers, and notes for deeper research.',color:'violet'},
  {name:'Engineering',description:'Technical guides and systems thinking.',color:'blue'},
  {name:'Security & Trust',description:'Security practices and responsible AI.',color:'orange'},
];
export const SAMPLES = [
  {collection:0, filename:'RAG Architecture Guide.md', tags:['AI','Research'], text:`# RAG Architecture Guide

This fictional guide explains the fundamentals of retrieval-augmented generation (RAG) for a knowledge workspace.

## Retrieval-augmented generation

Retrieval-augmented generation combines a search system with a language model. When a user asks a question, the system retrieves relevant passages from a selected collection and includes them as evidence in the model's prompt. The model can then answer with references to those passages rather than relying only on its training data.

RAG does not eliminate hallucinations. A model can still misinterpret evidence, follow a malicious instruction, or cite a passage that does not support a claim. Source inspection and evaluation remain essential.

## The retrieval pipeline

Documents are validated, extracted, normalized and split into meaningful chunks. An embedding model converts each chunk into a vector, which is indexed in PostgreSQL with pgvector. At query time, the same embedding model encodes the question; a similarity search returns candidate chunks, and the best evidence is placed in a bounded context window.

Hybrid retrieval combines vector similarity with keyword search. It can recover exact names or technical terms that semantic retrieval may miss, while still finding passages phrased differently from the question.

## Grounded answers

A grounded answer should cite the actual retrieved passages and acknowledge when the evidence is insufficient. Citations let a reader inspect the original document, section and page when available. Similarity scores measure proximity between vectors; they are not probabilities that an answer is correct.
`},
  {collection:0, filename:'Research Methods Handbook.md', tags:['Research','Methods'], text:`# Research Methods Handbook

This sample handbook is fictional and demonstrates a research collection.

## Formulating a question

Begin with a specific, answerable research question. Identify the concepts, population, and boundaries of the investigation before collecting sources. A narrow question makes it easier to decide which evidence is relevant.

## Evaluating evidence

Compare multiple independent sources and record their provenance. Check the date, methodology and potential conflicts of interest. A useful research note separates the source's direct claims from the researcher's interpretation.

## Synthesis

Group related findings by theme and note where sources disagree. A synthesis should represent uncertainty and gaps instead of turning incomplete evidence into a confident conclusion. Keep a citation beside each claim so the reader can inspect its context.
`},
  {collection:0, filename:'AI Knowledge Systems.md', tags:['AI','Knowledge'], text:`# AI Knowledge Systems

A fictional overview of knowledge systems for demonstration.

## Knowledge collections

A knowledge collection is an explicit scope for a set of documents. Selecting a collection before asking a question reduces irrelevant context and helps enforce access controls. Each document belongs to an owner and a collection.

## Context windows

Sending an entire document to a language model can be expensive and slow, and the document may exceed the model's context window. Retrieving small relevant chunks reduces unnecessary tokens and provides more precise citations. Chunk size and overlap should be evaluated against the structure of the documents.

## Conversation context

Follow-up questions may use pronouns such as “it” or “those”. A bounded summary of recent conversation can help rewrite the search query, but each answer should retrieve fresh evidence from the selected collection. Long histories should not be sent to the model without a limit.
`},
  {collection:1, filename:'PostgreSQL & pgvector.md', tags:['PostgreSQL','Database'], text:`# PostgreSQL and pgvector

This fictional technical guide describes PostgreSQL and pgvector for a sample workspace.

## PostgreSQL as a knowledge database

PostgreSQL stores relational records, transactions, access policies and full-text indexes. The pgvector extension adds a vector type and distance operators, allowing embeddings to live alongside their document metadata. This reduces the need to synchronize a separate vector database for modest workloads.

## Similarity search

Cosine distance measures the angle between two vectors and is written with the pgvector operator <=>. Smaller cosine distance means greater similarity. Inner product uses the <#> operator, which returns the negative inner product so that ascending index scans can be used. For normalized vectors, cosine similarity and inner product induce equivalent rankings.

## Vector indexes

HNSW builds a graph that supports fast approximate nearest-neighbor search and incremental inserts, but it uses more memory and takes longer to build. IVFFlat builds clustered lists, generally requires less memory, and needs representative data for training. Both trade recall for speed; measure filtered recall and latency for the actual workload.

## Row-level security

PostgreSQL row-level security (RLS) can restrict rows based on the authenticated user's tenant context. Application authorization and RLS complement one another: the application checks access, while database policies add a defense if a query accidentally omits an owner filter.
`},
  {collection:1, filename:'Distributed Systems Notes.md', tags:['Systems','Engineering'], text:`# Distributed Systems Notes

Fictional notes for the engineering collection.

## Background jobs

Long-running document processing belongs in a worker rather than an HTTP request. A durable job queue records attempts, leases, and errors. Exponential backoff reduces pressure on a failing provider, and an expired lease allows another worker to recover a job after a crash.

## Idempotency

Workers may execute the same job more than once. Idempotent processing replaces a document's chunks atomically and marks it ready only after all embeddings are indexed. If processing fails, partial work should not be visible as a ready document.

## Observability

Track extraction, embedding, retrieval and generation latency separately. Structured logs can include document IDs and durations without recording private document contents. Metrics and traces are useful for debugging, but they should respect data retention and access policies.
`},
  {collection:2, filename:'Security Fundamentals.md', tags:['Security','AI'], text:`# Security Fundamentals

This fictional document describes principles for a secure knowledge assistant.

## Tenant isolation

Each request must authenticate the user and authorize access to the selected collection before retrieving any chunks. The retrieval query must filter by owner and collection. PostgreSQL row-level security provides a second layer of protection when correctly configured with a non-bypass application role.

## Prompt injection

A document may contain instructions intended to change an assistant's behavior. Treat retrieved content as untrusted data, not as system instructions. Separate system rules, user questions and source material, and avoid granting the language model unnecessary tools or access. These controls reduce risk but do not make a model immune to prompt injection.

## Safe uploads

Validate file extension, content type, signature and size before processing. Store binaries outside the database, never execute uploaded files, and process parsers in an isolated worker. Malware scanning, resource limits and retention policies are important production controls.
`},
];
