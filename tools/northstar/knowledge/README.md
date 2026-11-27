# Northstar knowledge acquisition

This directory holds source-attributed knowledge proposals that may enrich the 76-pattern baseline. It is a staging and governance layer, not an automatic write path into engine/patternKnowledge.ts.

## Lifecycle

1. Acquire a source the project is permitted to use.
2. Analyze it at chapter, section, page or timestamp level; distinguish the source's own claims from interpretation.
3. Extract atomic, reusable records. Do not copy long passages.
4. Classify the knowledge and assign an evidence status.
5. Compare it with P01–P76 and other staged records.
6. Propose a disposition: new, enrichment, refinement, duplicate, contextual exception, conflict, obsolete, or not suitable.
7. Review the source locator, interpretation, implementation consequences and conflicts.
8. Approve explicitly before integrating into canonical engine data.

## Record location

Place one JSON file per proposal under knowledge/records/. Use knowledge/schema.json. IDs are stable and namespaced, for example NK-BOOK-CH03-001.

Every record must include a stable ID, title, classification and atomic statement; source type and source title; a source locator (chapter, section, page, video timestamp or URL fragment); evidence status and proposed integration disposition; review status; and related canonical pattern IDs where applicable.

Add creator, publisher, edition, publication date, ISBN/DOI, URL and access date when known. Never invent missing bibliographic details. Omit unknown optional fields rather than guessing. Keep quoted excerpts short (maximum 500 characters) and prefer locators plus paraphrase.

## Evidence labels

| Label | Meaning |
|---|---|
| source-stated | The source explicitly makes the claim |
| source-supported | The claim is a close, clearly supported interpretation |
| externally-verified | Independently checked against an authoritative source |
| analytical-synthesis | A reasoned synthesis across multiple claims or sources |
| implementation-inference | A proposed implementation consequence, not a source quote |
| unverified | Not yet verified; do not present as established fact |

## Integration dispositions

| Disposition | Meaning |
|---|---|
| new | Adds a genuinely new reusable principle or pattern |
| enrichment | Adds useful detail to an existing record |
| refinement | Narrows, clarifies or corrects existing guidance |
| duplicate | Same underlying knowledge; retain provenance, do not duplicate |
| contextual-exception | Valid only under stated conditions |
| conflict | Tension with existing guidance requiring explicit resolution |
| obsolete | Superseded or version-sensitive guidance |
| not-suitable | Interesting source material that should not become engine guidance |

## Validation

Run npm run ux:knowledge:validate or node tools/northstar/scripts/validate-knowledge.mjs validate path/to/records. Validation checks record fields, source locators, dates, excerpt size, canonical pattern references, duplicate record IDs, and related-record references. Missing related records are warnings; malformed or duplicated records are errors.

Validation is not approval. The validator does not establish that a source is accurate, resolve a conflict, or promote a record. A record may use reviewStatus: approved only when reviewer and reviewedAt are present. Integration into the canonical pattern catalogue remains a deliberate, reviewed code change.

## Copyright and source handling

Do not reproduce books or articles in full. Use concise summaries, original analysis, short excerpts only where necessary, and precise bibliographic locators. Respect the source's licence and the user's rights to process supplied materials.
