# Connecting real project evidence and external destinations

Every project record lives in `src/data/challengeManifest.ts`. External links are optional record fields; set them only after confirming the destination belongs to that specific Mwangala implementation.

```ts
{
  id: 'fm-01',
  slug: 'poll-creator-app',
  // ...verified challenge details...
  liveDemoUrl: 'https://your-real-deployment.example',
  repositoryUrl: 'https://github.com/your-account/your-real-repository',
  // ...
}
```

The URLs above are an example format only; replace them with real addresses. Do not derive a repository or demo URL from a project name. The UI validates HTTPS URLs and only renders actions when a valid value is present. A missing live demo does not affect the internal case-study route or original challenge attribution.

## Add screenshots

1. Capture the running implementation at relevant viewport sizes and states.
2. Check that captures contain no secrets or personal data.
3. Add files under `public/screenshots/<project-slug>/`.
4. Reference each image in the record's `screenshots` list with useful alt text and an accurate caption.
5. Do not use challenge design previews as evidence of Mwangala's implementation. The current CSS artwork is explicitly labelled as representative illustration.

## Add implementation notes

Fill in the existing record fields from the actual application: `technologies`, `features`, `responsive`, `accessibilityNotes`, `engineeringHighlights`, and `lessonsLearned`. Document actual QA activities, not intended tests. Original challenge objectives are kept in the challenge brief summary; they should not be confused with Mwangala's implementation decisions.

Run `npm run check` after editing. `validateChallengeManifest()` and the test suite catch missing/duplicate source records and malformed challenge links. Avoid adding secrets or private credentials to client-exposed `VITE_*` variables.
