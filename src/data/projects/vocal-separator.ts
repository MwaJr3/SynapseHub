import type { PortfolioProject } from '@/types';

/**
 * AI Music & Vocal Part Separator — standalone full-stack application in
 * `vocal-separator/`. It is intentionally not part of the 60-record Frontend
 * Mentor challenge manifest. The case-study language mirrors the product's
 * core rule: estimated/reconstructed audio is labelled as such, unavailable
 * models are reported unavailable, and insufficient vocal evidence produces
 * Unknown or no exported part rather than a fabricated stem.
 */
export const vocalSeparator: PortfolioProject = {
  id: 'project-11-vocal-separator',
  slug: 'vocal-separator',
  name: 'AI Music & Vocal Part Separator',
  shortDescription:
    'A private full-stack audio workspace that separates synchronized music stems, analyses detected vocal lines with probabilities and confidence gates, and turns evidence-backed parts into a choir practice mixer.',
  longDescription:
    'The Vocal Separator treats source separation as a hierarchy. Level 1 creates broad music stems through a Demucs adapter when that engine is genuinely available or through an exact-sum DSP engine otherwise. Level 2 then examines the vocal stem with polyphonic pitch salience, voice-leading track formation, range/tessitura statistics and harmonic soft-mask reconstruction. The interface exposes model provenance, quality warnings, class probabilities and withheld-part reasons so a singer or director can inspect the evidence before trusting or exporting a reconstructed part.',
  primaryCategory: 'audio-ai',
  categories: ['audio-ai', 'full-stack', 'music-technology'],
  technologies: [
    'React',
    'TypeScript',
    'Vite',
    'FastAPI',
    'Python',
    'NumPy/SciPy DSP',
    'SQLAlchemy',
    'PostgreSQL',
    'Redis',
    'Docker',
    'Demucs adapter',
  ],
  featureTags: ['stem separation', 'choir practice', 'pitch tracking', 'signed downloads', 'confidence gates'],
  features: [
    {
      title: 'Hierarchical separation instead of one opaque button',
      description:
        'Broad music stems are separated first; individual vocal-line analysis runs afterwards on the vocal stem and can abstain independently of the Level-1 result.',
      importance:
        'A useful vocal/instrumental split should not be discarded merely because a dense choir passage cannot support reliable SATB reconstruction.',
    },
    {
      title: 'Exact-sum DSP fallback with visible provenance',
      description:
        'When Demucs code or weights are unavailable, Auto mode uses a real chunked STFT soft-mask engine whose component stems sum back to the mix and records that fallback in the job report.',
      importance:
        'The product remains runnable on CPU without pretending that a missing neural model produced the result.',
    },
    {
      title: 'Evidence-gated voice parts',
      description:
        'Persistent pitch tracks must pass voiced-duration and confidence gates before harmonic-mask reconstruction. Ambiguous lines return Unknown with probabilities; unsupported parts are withheld rather than exported as empty files.',
      importance:
        'Alto, contralto and tenor overlap substantially. Abstention is safer than a complete-looking set of invented choir parts.',
    },
    {
      title: 'Synchronized practice mixer',
      description:
        'Stems share one transport with solo, mute, gain, pan, A/B original comparison, presets, loop regions, tempo control, waveform seeking and an estimated multi-voice pitch roll.',
      importance:
        'Separation is most useful when singers can rehearse a phrase against the ensemble and immediately compare it with the original mix.',
    },
    {
      title: 'Owner-bound signed media URLs',
      description:
        'Browser playback and downloads use short-lived HMAC capability tokens. The API verifies both the signature and that the token user owns the parent job before streaming a stem or ZIP.',
      importance:
        'Audio elements cannot attach bearer headers, but private uploads still need cryptographic, owner-scoped access control.',
    },
    {
      title: 'Corrections without rewriting inference',
      description:
        'Users can relabel stems and save their own voice classification while the original system classification and probabilities remain visible.',
      importance:
        'Human musical knowledge can improve the workspace without destroying model provenance or auditability.',
    },
  ],
  visualLabel: 'Illustrative synchronized stem-mixer and detected-voice preview',
  previews: [
    {
      id: 'vocal-separator-mixer',
      view: 'primary',
      alt: 'Illustrative preview of the Vocal Separator mixer with synchronized original, vocal, instrumental and reconstructed voice-part stems.',
      caption:
        'Stem mixer: synchronized playback, quality evidence, signed downloads and experimental voice-part labelling.',
      isIllustrative: true,
    },
    {
      id: 'vocal-separator-voices',
      view: 'detail',
      alt: 'Illustrative preview of detected voice cards showing pitch range, probabilities, confidence and a practice-stem action.',
      caption:
        'Voice analysis: range, probabilities, confidence and practice actions; Unknown remains a valid result.',
      isIllustrative: true,
    },
  ],
  architecture: [
    {
      id: 'web',
      label: 'React/Vite workspace (auth, upload, job progress, mixer, pitch roll)',
      layer: 'client',
      connectsTo: ['api'],
    },
    {
      id: 'api',
      label: 'FastAPI owner-scoped API with JWT auth and signed media routes',
      layer: 'api',
      connectsTo: ['db', 'queue', 'storage'],
    },
    {
      id: 'queue',
      label: 'Bounded inline queue locally; Redis worker in Compose',
      layer: 'worker',
      connectsTo: ['pipeline'],
    },
    {
      id: 'pipeline',
      label: 'Staged validation, decode, Level-1 separation, vocal analysis, quality and export pipeline',
      layer: 'ai',
      connectsTo: ['engines', 'storage'],
    },
    {
      id: 'engines',
      label: 'SeparationModel registry: exact-sum DSP, Demucs adapter and future model adapters',
      layer: 'ai',
    },
    {
      id: 'db',
      label: 'SQLAlchemy data layer (SQLite locally, PostgreSQL in Docker)',
      layer: 'data',
    },
    {
      id: 'storage',
      label: 'Traversal-protected originals, stems, analysis artifacts and ZIP exports',
      layer: 'integration',
    },
  ],
  caseStudy: {
    problem:
      'Choir singers often receive only one mixed recording, while consumer stem tools either stop at vocals/instrumental or imply that individual parts can be recovered perfectly. The product needed to separate what can be separated, inspect vocal evidence honestly, and make partial results useful for rehearsal.',
    users: [
      'Choir singers learning an individual line',
      'Music directors preparing part-dominant practice material',
      'Producers and remixers who need synchronized stems',
      'Researchers evaluating separation and classification evidence',
    ],
    constraints: [
      'A stereo mix may not contain enough information to identify every singer',
      'No fabricated stems for unavailable models or insufficient vocal evidence',
      'All generated stems must remain synchronized to the original timeline',
      'Private audio must remain owner-scoped even through browser media elements',
      'The sandbox could install ML packages but could not download Demucs/CREPE weights',
      'Audio processing must remain bounded on a small CPU/RAM environment',
    ],
    workflow: [
      {
        title: 'Upload',
        description:
          'Create a private project and upload audio that is validated by content signature, codec, size and decoded duration.',
      },
      {
        title: 'Configure',
        description:
          'Choose a stem profile, quality preset, engine mode and whether to attempt individual vocal analysis.',
      },
      {
        title: 'Separate',
        description:
          'Watch persisted stage progress while the worker creates Level-1 stems and, where justified, reconstructed voice parts.',
      },
      {
        title: 'Inspect',
        description:
          'Review waveforms, quality warnings, model provenance, pitch tracks, ranges, probabilities and withheld-part reasons.',
      },
      {
        title: 'Practice and refine',
        description:
          'Solo a part, loop a phrase, adjust tempo, compare with the original, relabel stems or save a classification correction.',
      },
      {
        title: 'Export',
        description:
          'Download individual WAV/FLAC/MP3 stems or a ZIP containing only existing stems plus reports and analysis metadata.',
      },
    ],
    engineeringDecisions: [
      {
        title: 'Model abstraction with a real DSP baseline',
        description:
          'The pipeline talks to a separation contract rather than hard-coding Demucs. The DSP engine provides a tested CPU path and Auto mode records when it is used.',
      },
      {
        title: 'Original-spectrum multi-pitch salience',
        description:
          'Pitch candidates are evaluated without destructively cancelling accepted voices, because real chord tones often coincide with harmonics of lower singers. Fundamental prominence and ±1-semitone peak dominance suppress ghost candidates.',
      },
      {
        title: 'Voice-leading instead of frame-local labels',
        description:
          'Candidates are linked into persistent lines using pitch/temporal continuity and material-overlap rules before range estimation or classification.',
      },
      {
        title: 'Probabilistic classification with abstention',
        description:
          'The classifier uses the full line—range, tessitura, pitch distribution, continuity and weak timbral evidence—and returns Unknown when competing voice types remain too plausible.',
      },
      {
        title: 'Capability tokens plus database ownership',
        description:
          'Signed URLs are resource- and user-bound, then checked against the parent job owner in the database, preventing cross-owner token replay.',
      },
      {
        title: 'Chunked, memory-bounded DSP',
        description:
          'Long files are processed in STFT chunks with complex64 data and bounded workers so the baseline behaves predictably on small machines.',
      },
    ],
    testing: [
      'Backend pytest suite: 8 tests passed, including exact-sum/sample-aligned DSP stems and the authenticated upload-to-export API flow.',
      'Synthetic SATB fixture: estimated/maximum simultaneous voices 4/4; all true voices appeared in 100% of steady middle-of-note frames.',
      'Synthetic soprano reconstruction improved from 1.68 dB in the vocal mix to 13.35 dB in the extracted stem.',
      'Signed stream, download and ZIP URLs were verified without Authorization headers; malformed tokens returned 403.',
      'The standalone React/TypeScript web app production build passed after adding Node types and strengthening pitch-payload narrowing.',
    ],
    limitations: [
      'Level-2 outputs are experimental reconstructions, not recovered studio multitracks.',
      'Dense unison choirs, heavy reverb and overlapping harmonics may yield Unknown or withheld parts.',
      'DSP separation has more bleed than a properly deployed neural model.',
      'Demucs/CREPE require verified weights; package installation alone does not make them available.',
      'Local file storage is single-node; multi-host production should use private object storage.',
    ],
    futureImprovements: [
      'GPU worker pool with pre-seeded, checksum-verified Demucs/RoFormer weights',
      'Singer-embedding diarization for same-range voices',
      'Editable pitch tracks with split/merge/reassign tools before reconstruction',
      'Saved rehearsal loops, section markers and part-specific practice bundles',
      'Object storage, resumable uploads, quotas and scheduled retention enforcement',
    ],
  },
  featured: false,
  status: 'in-progress',
  displayOrder: 11,
  relatedSlugs: ['workniche', 'learnpulse', 'reachlearn'],
  demoRequirements:
    'Run the standalone app from vocal-separator/: start the FastAPI backend on port 8000 and the Vite web app on port 5174, or use docker compose up --build. See vocal-separator/README.md for local Python/Node commands and honest engine-availability notes.',
};
