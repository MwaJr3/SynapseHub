# PostgreSQL + pgvector

PostgreSQL stores relational document ownership, collections, metadata, conversations and chunks together with vector and lexical indexes. Keeping these together reduces synchronization complexity for modest workloads, while PostgreSQL transactions and RLS add useful controls. Large-scale vector-specific workloads may need a different architecture.

## Distance

For vectors `a` and `b`, cosine similarity is `(a·b)/(|a||b|)`; cosine distance is `1 - similarity`. In pgvector, `<=>` returns cosine distance, so **lower is nearer**. The UI reports `1 - distance`. Inner product is `a·b`; pgvector `<#>` returns its *negative* to enable ascending index scans. With unit-normalized vectors, ordering by cosine and inner product is equivalent; without normalization, inner product also rewards magnitude. This implementation uses cosine and documents inner product for evaluation rather than offering it as a production mode.

The column is `vector(1536)` for OpenAI `text-embedding-3-small`'s default dimension. The deterministic mock uses 1536 too, but is a token-hash demonstration—not a semantic model. The stored `embedding_model` is an additional required filter. Different embedding spaces must not be mixed; model changes require re-embedding. A single cross-model HNSW index can reduce filtered ANN recall at scale even though the SQL never returns a mismatched model; consider per-model partitions/indexes and re-measure.

## Index choice

The schema uses HNSW (`m=16`, `ef_construction=64`) and a GIN full-text index. HNSW supports incremental inserts and strong query speed/recall for a growing corpus, at the cost of longer builds and greater RAM/disk consumption. Deletes and churn require regular maintenance. IVFFlat typically uses less memory and builds faster, but trains clustered lists from representative data; it is less attractive for a tiny or rapidly changing initial dataset and may require re-training/reindexing as the distribution changes. Both are approximate and involve recall/latency tuning; IVFFlat uses probes, HNSW uses `ef_search`. No index guarantees an answer is correct.

SQL applies tenant, collection, status and archive filters independently of similarity; vector searches additionally require the matching embedding model. Keyword-only text search does not compare or require vectors. Approximate indexes can under-return after filters: test filtered recall against exact scans, tune search parameters, and consider partitioning. Check actual plans with `EXPLAIN (ANALYZE, BUFFERS)` on a representative server. `npm run benchmark` runs a tiny deterministic PGlite HNSW/exact comparison and verifies the HNSW plan; its output is a local smoke test, not a scalable-load benchmark or a promised latency/recall figure.
