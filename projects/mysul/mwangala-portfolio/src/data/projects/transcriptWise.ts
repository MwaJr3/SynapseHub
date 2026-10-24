import type { Project } from '@/types/project';
import { projectLinks } from '@/config/projectLinks';

const links = projectLinks('transcriptwise');

export const transcriptWise: Project = {
  id: 'prj-transcriptwise',
  slug: 'transcriptwise',
  name: 'TranscriptWise',
  tagline: 'Turn video transcripts into knowledge you can use.',
  summary:
    'An intelligent learning platform that turns YouTube transcripts — retrieved, pasted or uploaded — into structured learning guides, concept explanations, quizzes and flashcards.',
  description: [
    'TranscriptWise moves a learner through a full progression: video → transcript → understanding → knowledge → application → retention. It retrieves transcripts through supported, authorized methods, accepts pasted text or .txt/.srt/.vtt uploads as first-class alternatives, and then analyses the material into a coherent learning guide.',
    'The analysis engine is more than a summariser. It produces a defined set of sections — overview, key takeaways, detailed breakdown, concepts explained, procedures, facts and evidence, actionable advice, applications, quotations, critical thinking, revision questions, an action plan, prerequisites and further research — each validated against a schema before it is stored or shown.',
    'Two commitments shape the whole design. First, honesty: the application never presents a sample transcript as the transcript of a requested video, never fabricates a quotation or a timestamp, and never claims a fact was verified when it was not. Second, provenance: generated material keeps its link back to the source segment it came from.',
  ],
  categories: [
    'Learning Technology',
    'AI Engineering',
    'Data Processing',
    'Full-Stack Engineering',
  ],
  filters: ['education', 'ai-data', 'full-stack', 'developer-tools'],
  tech: [
    'Python',
    'FastAPI',
    'Pydantic',
    'SQLAlchemy',
    'Alembic',
    'PostgreSQL',
    'Provider-independent LLM layer',
    'Structured output validation',
    'React',
    'TypeScript',
    'Tailwind CSS',
    'pytest',
    'Vitest',
  ],
  keyTech: ['Python', 'FastAPI', 'React', 'TypeScript', 'LLM integration'],
  featured: true,
  order: 9,
  status: 'Complete — full-stack application in projects/transcriptwise (merged via PR #16); live retrieval depends on external availability',
  year: '2026',
  role: 'Product design, retrieval architecture, prompt engineering, analysis pipeline, frontend',
  accent: 'sky',
  capabilities: [
    'Provider-independent AI layer with schema-validated structured output',
    'Segment-aware processing of long transcripts with preserved timestamps',
  ],
  features: [
    {
      title: 'Three input methods, equal standing',
      body: 'Paste a YouTube URL, paste transcript text, or upload a .txt, .srt or .vtt file. Files are validated by content and structure, not by extension alone; subtitle timestamps are parsed into segments and preserved through cleanup, analysis and export.',
    },
    {
      title: 'Authorized transcript retrieval',
      body: 'URL validation and video-id extraction support watch, youtu.be, Shorts and embed formats. Metadata (title, channel, thumbnail, duration, available languages) is retrieved where supported and reported as unavailable where it is not. Server-side requests are restricted to supported domains to limit SSRF exposure.',
    },
    {
      title: 'Explicit retrieval states',
      body: 'Validating, retrieving metadata, checking availability, retrieving, ready, unavailable, not authorized, unsupported language, rate limited, temporary failure, invalid input and manual-transcript-required are distinct states, each with its own message and a recovery action. A failure never claims that captions do not exist unless that is what the retrieval result actually said.',
    },
    {
      title: 'Transcript review and cleanup',
      body: 'Before analysis, the transcript is shown with metadata, length, language and timestamp coverage. Users can edit it, remove sections, or run a formatting cleanup. The original is preserved separately from the edited version and is never overwritten silently.',
    },
    {
      title: 'Analysis configuration',
      body: 'Learning objective (nine options), explanation level (beginner, intermediate, advanced), output depth (quick summary, standard guide, comprehensive guide), output language, and toggles for quizzes, flashcards, exercises, assumptions and external research. Sensible defaults mean a transcript can be analysed without touching a setting.',
    },
    {
      title: 'Fourteen structured output sections',
      body: 'Overview, key takeaways, detailed breakdown, concepts explained, processes and procedures, facts and evidence, actionable advice, practical applications, important quotes, critical thinking and limitations, revision questions, personal learning plan, prerequisites, and further research. Sections with no supported content are omitted rather than padded.',
    },
    {
      title: 'Attribution labels throughout',
      body: 'Every significant statement is categorised as a faithful paraphrase, a direct quotation, an extracted fact, an AI-generated explanation, an illustrative example, a recommended application or an externally verified finding. Source claims and added explanation are never blended silently.',
    },
    {
      title: 'Timestamps and source traceability',
      body: 'Segments carry stable identifiers, insights reference them, and where a source URL exists a timestamp becomes a link to that point in the video. When a reliable link is not possible the timestamp is shown as plain text rather than pretending to be clickable.',
    },
    {
      title: 'Long-transcript strategy',
      body: 'Transcripts beyond a configured size are segmented along topic boundaries, analysed per segment, merged with duplicate detection, outlined transcript-wide, then written into the final guide and validated against the processed source. Truncation is never presented as full coverage; partial analyses disclose their scope.',
    },
    {
      title: 'Quizzes, flashcards and application tasks',
      body: 'Revision questions across recall, conceptual, explanation, application, comparison and critical-thinking types with answers and rationale; flashcards with source references and difficulty, reviewed with easy/hard/needs-practice feedback; and practical activities with objective, instructions, expected result and evaluation criteria.',
    },
    {
      title: 'Learning workspace and library',
      body: 'Ten-section results workspace, editable notes, per-section regeneration that leaves the rest of the guide intact, saved analyses with folders, tags and search, and progress indicators that report activity rather than claiming mastery.',
    },
    {
      title: 'Export and portability',
      body: 'Copy any section, copy the full guide, export Markdown, print a clean view, and export structured JSON so saved analyses are not locked to one interface or one model provider.',
    },
  ],
  demonstrates: [
    'Provider-independent LLM integration with validated structured output',
    'Prompt engineering as a versioned, testable application component',
    'Segmentation and merge strategies for inputs larger than a context window',
    'Provenance modelling across parsing, analysis and export',
    'Untrusted-input handling and prompt-injection resistance',
    'Full-stack product design across retrieval, analysis, storage and UI',
  ],
  caseStudyFocus:
    'Turning an unreliable, repetitive spoken transcript into dependable learning material without inventing anything — the retrieval contract, the schema-validated analysis pipeline, long-transcript handling, and the attribution system that keeps source claims separate from model output.',
  visualDirection:
    'A reading-first study workspace: restrained typography, comfortable line length, clear section navigation, dark technical surfaces for transcript and code, light surfaces for long-form notes.',
  preview: {
    visual: 'transcriptwise',
    alt: 'Representative TranscriptWise preview: a transcript source panel with timestamped segments, an analysis configuration row, and a learning-guide section with attribution labels.',
    screenshotNote:
      'Hand-drawn representative preview built from the implemented feature set, not a screenshot of a deployed instance. Set preview.screenshot to replace it.',
  },
  liveUrl: links.live,
  repoUrl: links.repo,
  needsAuthorReview: [
    'limitations — confirm the retrieval method you settled on and its current availability',
    'testing — replace described coverage with your verified results, especially any live-retrieval checks',
  ],
  caseStudy: {
    problem: [
      'Educational video is one of the largest sources of technical explanation available, and one of the least efficient to learn from. Extracting a single procedure can mean watching forty minutes, pausing constantly, and rewriting speech into notes.',
      'Raw transcripts do not fix this. They are repetitive, unformatted, full of filler, and hard to navigate — and a beginner reading a transcript of an advanced lecture still will not understand it, because the missing part is explanation, not text.',
      'Generic summaries make a different mistake: they shorten without explaining, drop the qualifications that made a claim correct, and lose the connection back to the point in the video where something was said.',
    ],
    whoBenefits: [
      'Students converting lecture and tutorial videos into study notes',
      'Self-directed learners in programming, science, engineering and business',
      'Professionals upskilling from video content',
      'Researchers organising material from video sources',
      'Content creators extracting and structuring research',
    ],
    objectives: [
      'Provide a reliable end-to-end path from a video or transcript to usable learning material.',
      'Explain, not merely shorten — understanding before summarisation.',
      'Never claim retrieval, analysis or verification that did not happen.',
      'Keep every generated statement traceable to source material or clearly labelled as added explanation.',
      'Support retention and application through questions, flashcards and practical tasks.',
      'Work with no external service configured, using pasted or uploaded transcripts.',
    ],
    solution: [
      'The system is four separable layers with a normalised representation between each: retrieval, transcript normalisation, analysis orchestration, and presentation.',
      'Retrieval is an interface, not an implementation. Any provider returns the same `NormalisedTranscript` — source id, source URL, metadata, text, language, timestamped segments, retrieval method, status, errors and retrieval time. Missing metadata stays distinguishable from retrieved-and-empty, and a failed retrieval returns a state and a recovery path, never a substitute transcript.',
      'Normalisation parses subtitle formats into segments with stable identifiers, applies optional cleanup while preserving meaning and timestamp association, and keeps the original alongside the edited version.',
      'Analysis orchestration is where the reliability work happens. The specification lives in versioned prompt modules, not in a route handler. The transcript is treated strictly as data — wrapped, delimited and explicitly subordinated to the application instructions, so text inside it cannot alter behaviour or exfiltrate configuration. Output is requested as structured JSON and validated against a Pydantic schema; invalid output triggers a bounded repair-and-retry, after which the failure is reported with whatever was recoverable.',
      'Long transcripts follow a map-reduce path: segment along topic boundaries, analyse each segment into structured insights, merge with duplicate detection, build a transcript-wide outline, write the final guide from the merged structure, then validate the result against the processed source. Progress reporting maps to real pipeline stages.',
    ],
    workflow: {
      title: 'Video to retention',
      steps: [
        { label: 'Supply', detail: 'URL, pasted text or subtitle file' },
        { label: 'Retrieve', detail: 'Metadata and transcript, or an explicit failure state' },
        { label: 'Review', detail: 'Edit and clean, original preserved' },
        { label: 'Configure', detail: 'Objective, level, depth, language, extras' },
        { label: 'Segment', detail: 'Topic-boundary chunks for long transcripts' },
        { label: 'Analyse', detail: 'Schema-validated structured sections' },
        { label: 'Merge', detail: 'Deduplicate, outline, write the guide' },
        { label: 'Learn', detail: 'Quiz, flashcards, notes, save, export' },
      ],
      caption:
        'Each stage reports real state. Progress steps correspond to actual pipeline stages — there are no decorative percentages.',
    },
    architecture: {
      summary:
        'FastAPI backend with a retrieval interface, a prompt and analysis pipeline, schema validation and a relational store; React frontend with an input flow, transcript review and a ten-section learning workspace.',
      layers: [
        {
          layer: 'Retrieval & normalisation',
          items: [
            'YouTube URL validation and video-id extraction (watch, youtu.be, Shorts, embed)',
            'Metadata retrieval where supported, with unavailable reported as unavailable',
            'Provider interface returning a normalised transcript with status and errors',
            '.txt / .srt / .vtt parsing with timestamp segments and structure validation',
            'Outbound requests restricted to supported domains',
          ],
        },
        {
          layer: 'Analysis pipeline',
          items: [
            'Versioned prompt modules per output section and per configuration',
            'Segmentation, per-segment analysis, merge, outline, final rewrite',
            'Pydantic schema validation of model output with bounded repair/retry',
            'Attribution labelling: paraphrase, quote, fact, AI explanation, example, verified finding',
            'Transcript treated as untrusted data, isolated from application instructions',
          ],
        },
        {
          layer: 'AI provider layer',
          items: [
            'Provider-independent interface configured by environment',
            'Credentials held server-side only',
            'Model and prompt-version metadata stored with each analysis',
            'A clearly labelled development fallback when no provider is configured',
          ],
        },
        {
          layer: 'Persistence (SQLAlchemy, Alembic, PostgreSQL)',
          items: [
            'Users, sources, transcripts, segments, analyses, guides, notes',
            'Quizzes, questions, flashcards, review records, folders, tags',
            'Processing tasks with real status and progress',
            'Preferences and audit records; SQLite supported for local development',
          ],
        },
        {
          layer: 'Frontend (React, TypeScript)',
          items: [
            'Input method selection, retrieval status, transcript review and editor',
            'Analysis configuration with sensible defaults',
            'Ten-section workspace with per-section copy, edit and regenerate',
            'Quiz runner, flashcard review, library, settings, export controls',
          ],
        },
      ],
      security: [
        'Provider keys and database credentials live in server configuration and never reach the client bundle.',
        'Transcript text is untrusted input: it cannot override application rules, reveal configuration, or trigger actions, and it is never rendered as HTML.',
        'Server-side URL fetching is restricted to supported domains and validated video identifiers, limiting SSRF exposure.',
        'Uploads are validated by content, structure, size and encoding, and processed within configured limits.',
        'Authorisation is enforced server-side on every read, update, export and delete; guest analyses have a documented retention period.',
        'Rate limiting protects both retrieval and expensive model calls.',
      ],
    },
    decisions: [
      {
        title: 'Prompts are versioned modules, not string literals in routes',
        context:
          'The analysis specification is long — fourteen sections, attribution rules, level and depth variations, and explicit prohibitions on invention. Inlining it in a handler makes it untestable and impossible to change safely.',
        decision:
          'Prompts live in dedicated versioned modules. Each analysis records the prompt version and model used, and prompt behaviour is covered by tests that assert on required structure and on refusal to follow instructions embedded in the transcript.',
        tradeoff:
          'More files and a versioning discipline to maintain. It makes the most fragile part of the system — model behaviour — the most inspectable, and it lets a guide generated three months ago be reproduced or explained.',
      },
      {
        title: 'Structured output with schema validation and bounded repair',
        context:
          'Free-text model output cannot be reliably rendered into fourteen sections, stored, searched, regenerated per section, or exported. It also cannot be checked.',
        decision:
          'The model returns JSON validated against Pydantic schemas: required fields, allowed enums, source references, attribution categories and content types. Invalid output triggers one bounded repair attempt with the validation errors, then fails visibly with any recoverable partial result preserved.',
        tradeoff:
          'Schema rigidity can reject a slightly unusual but useful response, and retries cost latency and tokens. In exchange, everything downstream — storage, per-section regeneration, export, tests — can rely on the shape of the data, and hallucinated structure is caught before it reaches a user.',
      },
      {
        title: 'Map-reduce for long transcripts instead of truncation',
        context:
          'A three-hour lecture transcript exceeds practical context limits. Truncating is easy and produces a guide that silently covers only the first part of the video.',
        decision:
          'Segment along topic and timestamp boundaries, analyse each segment into structured insights, merge with duplicate detection, build a transcript-wide outline, then write the final guide. Segment failures are disclosed and the analysis is labelled partial rather than comprehensive.',
        tradeoff:
          'More model calls, higher cost and latency, and cross-segment context must be reconstructed during merge — a nuance introduced in minute 90 can be missed by a segment-local pass. It is the only approach that does not misrepresent coverage, and the outline stage is what restores global coherence.',
      },
    ],
    testing: {
      summary:
        'Tests isolate the parts that must not be wrong: parsing, retrieval states, schema validation, injection resistance and authorisation. No unit test depends on live YouTube retrieval or a paid model call.',
      items: [
        {
          title: 'URL and video-id tests',
          body: 'Watch, youtu.be, Shorts and embed URLs resolve to the correct identifier; playlists, channels, malformed and non-YouTube URLs are rejected with a specific reason.',
        },
        {
          title: 'Parsing tests',
          body: '.srt and .vtt timestamp extraction, out-of-order and overlapping cues, malformed cue blocks, unknown encodings, empty files and oversized uploads.',
        },
        {
          title: 'Retrieval-state tests',
          body: 'A mocked provider returning each state (unavailable, unauthorized, rate limited, temporary failure) produces the correct user-facing message and recovery action, and never a substitute transcript.',
        },
        {
          title: 'Analysis validation tests',
          body: 'Valid output is accepted; each class of invalid output (missing section, bad enum, fabricated timestamp, unlabelled quote) is rejected and triggers the bounded repair path exactly once.',
        },
        {
          title: 'Injection-resistance tests',
          body: 'Transcripts containing instruction-override attempts, requests for configuration, and embedded markup are analysed as data: output structure is unchanged and no system content is disclosed.',
        },
        {
          title: 'Authorisation and lifecycle tests',
          body: 'Guest versus authenticated access, ownership enforcement across library operations, guest-analysis retention, and the full create → analyse → edit → save → reopen → export → delete integration flow.',
        },
      ],
    },
    challenges: [
      {
        problem:
          "Retrieval is inherently unreliable and largely outside the application's control. Captions may be absent, disabled, age-restricted, in an unsupported language, or blocked by rate limiting — and each of those is a different fact requiring a different message.",
        approach:
          'Retrieval returns a typed status rather than raising a generic error. Twelve explicit states map to twelve user-facing messages, each with a recovery action, and the two fallback input methods are offered in the same view rather than on a different page.',
        reasoning:
          'The honest failure is a usable path. Telling someone "we could not retrieve this; paste the transcript or upload the .srt" keeps them moving, whereas a generic error ends the session — and guessing at a reason they cannot verify destroys trust.',
        lesson:
          'Model external-service failure as part of your domain, with as many states as you can distinguish. "Something went wrong" is a design failure, not an error handler.',
      },
      {
        problem:
          "Model output drifts. It invents plausible quotations, assigns timestamps to insights that have none, blends its own explanations into the speaker's claims, and pads thin sections to look comprehensive.",
        approach:
          'Four controls: schema validation rejecting missing or malformed structure; timestamp validation against the actual segment list; a required attribution category on every significant statement; and an explicit instruction that a section with no supported content must be omitted or marked as such, with the validation layer enforcing it.',
        reasoning:
          'Each control targets one observed failure mode rather than adding a general "be accurate" instruction, which has no measurable effect. Validation is the only control that actually prevents bad output from being stored.',
        lesson:
          'You cannot prompt your way to reliability. Ask for structure, then verify it — and treat anything the verifier cannot check as a claim you should not be making.',
      },
      {
        problem:
          'A transcript is untrusted text that arrives inside a prompt, which makes it a prompt-injection vector by construction.',
        approach:
          'The transcript is passed inside clearly delimited data blocks, the application instructions state that content inside those blocks is material to analyse and never instructions to follow, and injection attempts are covered by tests asserting that output structure and system content are unaffected.',
        reasoning:
          'Perfect injection resistance is not achievable, so the design goal is bounded damage: the model has no tools, no credentials and no access to other users\' records, so the worst case is a degraded analysis rather than a compromise.',
        lesson:
          'Reduce what an injection could possibly achieve. Capability limitation is a stronger control than instruction hardening.',
      },
    ],
    demonstration: {
      summary:
        'The core workflow — supply a transcript, configure the analysis, receive a structured learning guide, revise with quizzes and flashcards, save and export — runs without YouTube access and without a paid provider being configured.',
      steps: [
        {
          title: 'Supply a transcript',
          body: 'Paste transcript text, upload a .srt or .vtt file, or paste a YouTube URL to attempt retrieval. Retrieval failures show their specific state and offer the manual path immediately.',
        },
        {
          title: 'Review and clean',
          body: 'Inspect the transcript with metadata, length, language and timestamp coverage. Edit or clean it; the original stays available and unchanged.',
        },
        {
          title: 'Configure and analyse',
          body: 'Choose objective, explanation level, output depth and extras, then run the analysis. Progress reflects real pipeline stages, including segmentation for long transcripts.',
        },
        {
          title: 'Work through the guide',
          body: 'Navigate the ten-section workspace, follow timestamps back to the source, edit notes, regenerate a single section, take the quiz, review flashcards, then export as Markdown, print view or structured JSON.',
        },
      ],
      accessNote:
        'An AI provider key is required for live analysis and is configured server-side. Where no provider is configured, the application says so explicitly rather than returning fabricated learning material; a clearly labelled development fallback exists for exercising the interface.',
    },
    limitations: [
      'Transcript retrieval depends on availability, video permissions and the supported retrieval method. Many public videos have no retrievable transcript, and the application reports that honestly instead of substituting content.',
      'A retrieval method requiring credentials or elevated permissions must be configured before it works; this is documented rather than worked around.',
      'Analysis requires a configured language-model provider. Without one, no learning material is generated — the application will not synthesise a plausible-looking guide.',
      'Output quality depends on the model and on transcript quality. Auto-generated captions with heavy recognition errors propagate into the analysis.',
      'Attribution labels reduce but cannot eliminate the risk of model-added explanation being read as a source claim; critical material should be checked against the video.',
      'External research, when enabled, cites only what was actually retrieved. Unverified claims are labelled as items to investigate rather than as findings.',
      'Long-transcript processing multiplies model calls, so cost and latency scale with transcript length; partial analyses disclose their scope rather than claiming full coverage.',
      'Spaced-repetition scheduling, where implemented, uses a documented simple interval algorithm rather than a calibrated memory model.',
    ],
  },
};
