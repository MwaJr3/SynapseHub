# Audio and ML strategy

This document explains the two-level separation design, the implemented algorithms, what the optional neural adapters add, and the limits that the product must communicate honestly.

## 1. Design goals

1. **Never fake separation.** Every exported stem is produced by an actual algorithm from the uploaded signal.
2. **Prefer partial truth over a complete-looking lie.** Missing/insufficient evidence is reported; no empty soprano/alto/tenor/bass file is manufactured.
3. **Keep every output synchronized.** All stems retain the original sample timeline.
4. **Expose uncertainty.** Voice classification is probabilistic and Unknown is a valid first-class result.
5. **Separate product interfaces from model availability.** Demucs, future RoFormer/MDX models, CREPE and the DSP engine all sit behind stable internal contracts.
6. **Run anywhere.** The product remains useful on CPU through the DSP engine when GPU models or downloadable weights are unavailable.

## 2. Why the hierarchy matters

Music source separation and individual vocal-line separation are different problems.

- **Level 1** separates broad sources whose spectro-temporal patterns differ substantially: vocals, drums, bass and accompaniment.
- **Level 2** attempts to divide one already-imperfect vocal stem into overlapping human voices with shared harmonics, vibrato, formants, consonants, room response and bleed.

Level 2 is therefore gated and experimental. A clean quartet with separated ranges may work well; a dense reverberant choir singing in unison may not contain recoverable individual lines at all.

## 3. Engine abstraction

`backend/app/engines.py` defines the separation boundary used by the pipeline. Engines report:

- engine/model identity and version;
- supported stems;
- quality/profile behaviour;
- availability and the reason when unavailable;
- produced stem arrays/paths plus warnings and provenance.

Implemented or represented adapters include:

| Engine | Status in this build | Role |
|---|---|---|
| Built-in DSP | Implemented and tested | CPU-safe exact-sum soft-mask baseline; visible fall-safe. |
| Demucs | Subprocess adapter implemented | Preferred neural Level-1 engine when package, runtime and weights are genuinely available. |
| Spleeter | Registry/adapter placeholder with availability note | Future alternative; never presented as runnable until wired and verified. |
| MDX / RoFormer family | Registry/adapter placeholder | Future high-quality neural engines behind the same contract. |
| Custom models | Extension point | Deployment-specific models can be added without changing job/UI contracts. |

The model registry is the source of truth for UI availability and admin enable/disable controls.

## 4. Engine selection

### Auto

1. Attempt the configured/available neural engine.
2. If it cannot run, record the reason.
3. Fall back to the DSP engine and mark the result accordingly.

Auto mode optimizes for a usable result while keeping provenance honest.

### DSP

Always run the built-in DSP engine. This is deterministic, CPU-friendly and useful as a baseline, but will generally have more bleed than Demucs.

### Demucs

Require Demucs. If the executable/package or model weights cannot run, fail clearly instead of silently relabelling DSP output as Demucs.

## 5. Level-1 DSP engine

The DSP engine transforms the mix into overlapping STFT frames, estimates source-weighted spectral evidence, and partitions energy with complementary soft masks.

Key properties:

- Long inputs are processed in chunks to bound memory.
- Harmonic/percussive cues help distinguish sustained pitched content from transients.
- Vocal-band, harmonicity, stereo/centre and temporal evidence contribute to vocal/accompaniment weighting.
- Low-frequency sustained energy informs the bass stem.
- Percussive transient evidence informs drums.
- Residual energy is assigned to `other` so the component set remains complete.
- `instrumental` is derived as `mix − vocals`.
- The masks partition the same complex spectrum, so the component stems sum back to the original mix subject only to numerical/file precision.

The exact-sum property is an engineering invariant, not a claim that every source is perfectly isolated. Shared spectral bins are shared by the masks and can still bleed across stems.

### Profiles

- **Vocals + instrumental:** fastest and least speculative split.
- **Full:** vocals/instrumental plus drums, bass and other accompaniment available from the active engine.
- **Extended:** additionally requests piano/guitar only when an engine can actually provide them.
- **Choir:** full separation plus Level-2 voice analysis/reconstruction.

A profile is a request, not permission to invent an unsupported stem.

## 6. Level-2 vocal analysis

`backend/app/vocal.py` performs the vocal-line analysis on the separated vocal stem.

### 6.1 Pitch salience grid

The analysis evaluates a dense MIDI/frequency grid against the original vocal spectrum. It does **not** destructively cancel accepted voices before looking for the next one; destructive cancellation erased real chord tones whose fundamentals coincide with another singer's harmonics.

Salience combines evidence such as:

- energy at the candidate fundamental;
- harmonically related partials;
- fundamental prominence relative to the local spectrum;
- penalties/gates for candidates that are merely harmonics of a stronger accepted candidate;
- local peak dominance across approximately ±1 semitone.

The stricter harmonic gate is important in consonant SATB writing: real voices often land at octaves, fifths and thirds, where their fundamentals are also partials of lower voices. These candidates are accepted only when their own fundamental evidence is materially strong relative to the related accepted candidate.

### 6.2 Multi-pitch frame selection

Each frame may retain multiple pitch candidates. Candidate selection is based on salience peaks rather than choosing only the global maximum, allowing simultaneous notes to survive for track formation.

The system estimates the likely maximum number of simultaneous voices from the distribution of candidate counts, instead of requiring the user to declare SATB/SSAA/TTBB in advance.

### 6.3 Track fragment linking

Frame candidates become note/line fragments and are linked using voice-leading and continuity constraints:

- pitch proximity;
- temporal continuity and short-gap tolerance;
- overlap rules that distinguish genuinely simultaneous lines from boundary smearing;
- fragment duration/voiced evidence;
- merging of fragments that materially belong to the same persistent line.

A strict "any shared frame means a different singer" rule was rejected because STFT windows smear adjacent notes from the same singer across shared frames. The implemented merge rules require material overlap before treating fragments as necessarily simultaneous.

### 6.4 Persistent voice tracks

Linked fragments form persistent voice tracks. Tracks with too little voiced duration remain analysis-limited and do not automatically become downloadable parts.

Current export gates include minimum voiced evidence and a minimum classification/track confidence. These gates are product safeguards, not proof that an exported mask is a studio-isolated singer.

### 6.5 Range and statistics

For each track the system reports:

- lowest/highest estimated notes;
- mean/median and percentile pitch statistics;
- voiced seconds;
- frame-level pitch track for visualization;
- stem availability or the reason it was withheld.

## 7. Voice-part classification

The classifier produces probabilities over:

- Soprano (C4–C6)
- Mezzo-soprano (A3–A5)
- Alto / contralto (F3–F5)
- Tenor (C3–C5)
- Baritone (G2–G4)
- Bass (E2–E4)
- Unknown when evidence is insufficient

The ranges are the six standard vocal ranges from the project's reference chart ("The Standard 6 Vocal Ranges"), kept in `VOCAL_RANGE_CHART` in `backend/app/vocal.py`. They bound what a part may plausibly sing; the classifier still scores the *tessitura* of the whole line inside them. Results and corrections saved with the older labels still load: `contralto` is read as Alto and `bass_baritone` as Baritone. Each voice also reports `chart_fit`, the share of its notes inside every range, because the ranges overlap by design and "which ranges could sing this" is often the honest answer.

It does **not** equate "currently highest note" with soprano or "currently lowest note" with bass. Classification uses the persistent line as a whole, including:

- pitch range and distribution;
- median/central tessitura;
- continuity and amount of evidence;
- harmonic/timbral spectral-centroid evidence relative to pitch;
- relationships among simultaneously detected tracks;
- overlap between plausible voice categories.

Alto, mezzo-soprano and tenor overlap heavily in real music. If the highest-probability class is not reliable enough, the product displays **Unknown** while still showing the probability distribution. A user can save a correction, but it is stored separately and does not rewrite the system inference.

## 8. Voice-line reconstruction

For eligible tracks, reconstruction builds time-frequency harmonic soft masks around the track's estimated fundamental trajectory:

1. Follow the track pitch over time.
2. Weight bins near expected harmonics according to distance/strength/confidence.
3. Compete/partition energy among simultaneous tracks where masks overlap.
4. Limit the mask to voiced portions of the track.
5. Inverse-transform and align the result to the original timeline.

The result is a **reconstruction** because shared harmonics, consonants, breath, reverb and unvoiced sounds cannot be uniquely assigned from pitch alone.

Voice-part stems start muted in the mixer because they subdivide the aggregate vocals stem; playing both at full gain would double-count reconstructed vocal energy.

## 9. CREPE / torchcrepe strategy

CREPE-class models are excellent monophonic pitch estimators but do not by themselves solve polyphonic choir separation. The codebase probes for an available CREPE backend as a future enhancement to confidence/salience for dominant lines.

In restricted environments, the Python package may install while model weights remain unreachable. The UI/health endpoint therefore distinguishes package presence from genuine end-to-end availability and the DSP analysis remains operational without it.

## 10. Quality and confidence signals

`backend/app/quality.py` calculates reference-free indicators such as:

- RMS/peak levels;
- silence ratio;
- clipped-sample ratio;
- energy share;
- correlation/bleed proxies;
- sample alignment;
- Level-1 reconstruction residual where the exact-sum property applies.

These are inspection aids, not ground-truth SI-SDR scores. The UI presents them with warnings rather than a single misleading "quality percentage."

## 11. Synthetic validation

The deterministic test fixture in `backend/tests/synth.py` creates an eight-second SATB arrangement with:

- known note spans;
- harmonic voices and vibrato;
- accompaniment;
- a combined vocal mix;
- per-voice references for metric calculation.

Verified results on that fixture include:

- estimated voices: 4;
- maximum simultaneous voices: 4;
- all four true voices present in 100% of steady middle-of-note analysis frames;
- soprano SNR improvement from 1.68 dB in the vocal mix to 13.35 dB in the reconstructed stem;
- DSP Level-1 reconstruction residual more than 60 dB below the mix in the exact-sum test.

These tests validate the signal-processing mechanics. They do not establish equal performance on commercial recordings, live choirs, heavy effects or dense unison passages.

## 12. Failure modes to expect

| Condition | Likely behaviour |
|---|---|
| Dense choir/unison | Fewer distinguishable lines; Unknown/withheld parts. |
| Heavy reverb | Fragmented tracks, smeared boundaries, lower confidence. |
| Strong accompaniment bleed in vocals | Piano/guitar harmonics may create spurious candidates; quality warnings should be heeded. |
| Overlapping ranges | Wider class probabilities; alto/mezzo-soprano/tenor ambiguity; `chart_fit` shows every range that could sing the line. |
| Vibrato/extended techniques | Pitch paths may wobble or split without adequate continuity. |
| Consonant-heavy passages | Harmonic masks capture pitched vowels better than unvoiced speech sounds. |
| Very short excerpts | Insufficient voiced seconds for responsible part export. |
| Distorted/clipped input | Extra harmonics and degraded salience/classification. |

## 13. Production model roadmap

1. **GPU Demucs/RoFormer workers** with pre-seeded verified weights and benchmark gates.
2. **Neural vocal diarization** using singer embeddings to distinguish same-range voices.
3. **Polyphonic transcription models** trained/evaluated on choral mixtures.
4. **Learned voice-part classifier** calibrated on professionally labelled choir stems.
5. **Mask refinement networks** conditioned on pitch tracks and speaker/singer embeddings.
6. **Dataset evaluation harness** with SDR/SIR/SAR, pitch accuracy, track purity/completeness and calibration metrics.
7. **Human review tools** for splitting/merging tracks and editing masks before export.

No future model should bypass the existing evidence gates merely because it is neural; it must improve measured separation and calibration on held-out material.

## 14. Every-voice-part mode and next model backends

**Every-voice-part mode (`all_voice_parts`).** The default path withholds a line whose classifier
confidence is below the gate. Choir material often has several lines whose ranges overlap (alto vs
tenor, tenor vs baritone), so the gate removes exactly the lines a person wants. The mode keeps the gate
for the *label* but not for the *export*: lines are assigned to the six chart parts by a dynamic program
over lines sorted by median pitch, scoring `log(classifier probability) + log(chart range fit)` under the
constraint that a lower line is never a higher part, with a small bonus for covering a new part. Lines
the classifier already trusts act as anchors. Lines placed only by this procedure are labelled
`best_guess` everywhere (API, stem chip, voice card). Lines under 1.2 s are never assigned. This is a
heuristic over pitch evidence, not a trained SATB model; it cannot tell two singers on one pitch apart.

**Candidate backends (all MIT-licensed, so they may be integrated, unlike AGPL StemDeck):**

| Repo | Role | Status here |
|---|---|---|
| `BS-RoFormer` (lucidrains) | Architecture for band-split RoFormer vocal/stem separation | Not integrated: needs a trained checkpoint, which the sandbox cannot download. Plan: new `RoformerAdapter` in `engines.py`, checkpoint path from config, `available()` false without it. |
| `mdx-net` (KINoAI) | ONNX/PyTorch first-pass vocal/instrument model | Not integrated: same reason. Plan: `MdxAdapter` already registered as unavailable. |
| `crepe` | Monophonic pitch tracker (needs TensorFlow) | Not integrated: our tracker is polyphonic. Plan: use CREPE/torchcrepe only to refine a *single* isolated line's contour. |

**Intended chain once weights are available** (each stage optional, each recorded in the report):
music removal (RoFormer vocals) → de-reverb → lead/backing split → pitch-guided part assignment
(this mode) → optional per-part masks refined by the model. Ensembling two models by averaging
magnitudes is only worth doing after a listening/bleed comparison on the same song.

