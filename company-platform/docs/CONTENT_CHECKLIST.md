# Content checklist

Use this when adding or editing any public record. The rule behind every item:
say what is true, label what is not verified, invent nothing.

## Products

- [ ] One canonical record per product (`products` table) — never duplicate
      product data between company pages, cards, and case studies.
- [ ] Exactly one operating company per product.
- [ ] Category tags come only from the required category list.
- [ ] Purpose and summary describe what the software does, not what it aspires to.
- [ ] `status` matches reality; `statusNote` explains the status honestly
      ("built" must not read as "deployed").
- [ ] Technology tags match the actual implementation.
- [ ] `liveDemoUrl` / `repositoryUrl` are real URLs or empty — never
      placeholder-looking links. Buttons render only when configured.
- [ ] `visualLabel` labels the visual honestly ("Illustrative concept visual…"
      until genuine screenshots exist).

## Case studies

- [ ] All 16 required sections are present and project-specific — no
      copy-pasted paragraphs between products.
- [ ] Problem names concrete users; constraints are real conditions.
- [ ] Engineering decisions reflect the implementation, or are explicitly
      marked as current design choices.
- [ ] Testing sections list actual test areas and status — never invent
      coverage percentages, counts, benchmarks, or "all tests passed" claims.
- [ ] Limitations separate confirmed limits from future work (future work goes
      in Future improvements and is labelled proposed).
- [ ] `verificationNote` flags every implementation detail that requires
      verification before publication.
- [ ] Contributors render only from approved contribution records with
      published profiles — authorship is never inferred from membership.

## People profiles

- [ ] Public pages show published fields only; drafts and review notes are
      never rendered publicly (they 404).
- [ ] Education, certifications, experience come from the member's verified
      records — never pre-filled or assumed.
- [ ] External links are the member's own configured URLs; unconfigured
      buttons are hidden, never `#`.
- [ ] The personal portfolio is linked, never absorbed: "Visit Personal
      Portfolio" opens the configured URL in a new tab with
      `rel="noopener noreferrer"`.
- [ ] Resumes are private until explicitly published; withdrawal or
      unpublishing disables downloads immediately.

## Voice

- [ ] No fear-based security claims, no educational-impact claims without
      evidence, no metrics, no testimonials, no invented dates.
- [ ] Company pages never imply shared ownership, staff, liability, or
      data controllership.
- [ ] Working-name and pending-verification notices stay until resolved.
