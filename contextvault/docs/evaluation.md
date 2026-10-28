# Evaluation

`samples/evaluation.json` contains six **fictional** examples with a question, expected document/section/evidence, and answer characteristics. It is intentionally tiny and hand-authored, covers only the included sample corpus, and is not representative of general workloads. It is useful for regression checks, not a universal model or product quality score.

The developer Evaluation page runs the actual selected-collection pipeline. If an expected source is selected, it reports:

- **Retrieval precision:** returned chunks from that expected document / total returned chunks.
- **Document recall:** 1 if at least one chunk from that expected document was returned, otherwise 0. This is not chunk-level recall and assumes the selected document is the only ground truth.
- **Citation reference validity:** whether used citation labels resolve to retrieved chunks. It does not judge whether the evidence entails the associated claim.
- **Expected phrase found:** a case-insensitive substring check when provided; not completeness or correctness.
- Actual retrieval/generation/total latency and provider-reported tokens when available. Estimated costs are not asserted.

Faithfulness, completeness and contextual relevance require human review or a separately validated evaluator; they are deliberately not fabricated. `npm run evaluate` runs the sample cases and reports document precision/recall, expected-section hits and label validity. Use a fixed model version and configuration when comparing runs, inspect failures, add negative and adversarial cases, establish real ground-truth chunk labels, and compare ANN results with exact retrieval. Privacy-sensitive evaluation content needs the same access controls and retention treatment as conversations.

## Retrieval comparison

The developer playground can run keyword, vector and hybrid retrieval side by side against the same question and filters without generating an answer. One query embedding is shared by the latter two, and the configured embedding endpoint receives the question. Ranked passages can be expanded for inspection. The comparison is exploratory: its differing score types and request timings are not quality scores or a controlled benchmark, and it does not replace labeled evaluation or human assessment. Keyword results remain available when the embedding endpoint fails.
