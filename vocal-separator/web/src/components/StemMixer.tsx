import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type { JobResults, PitchData, Stem, Voice } from '../types';
import {
  confidenceClass,
  confidenceText,
  formatTime,
  percent,
  prettyName,
  sortStems,
  withDownloadFormat,
} from '../lib/utils';
import { PitchRoll } from './PitchRoll';
import { Waveform } from './Waveform';

interface StemControl {
  gain: number;
  pan: number;
  muted: boolean;
  solo: boolean;
}

interface StemNodes {
  source: MediaElementAudioSourceNode;
  gain: GainNode;
  pan: StereoPannerNode;
}

interface StemMixerProps {
  results: JobResults;
  token: string;
  pitchData: PitchData | null;
  practiceStemId: number | null;
  practiceNonce: number;
  onRefresh: () => Promise<void>;
  onNotice: (message: string) => void;
  onError: (message: string) => void;
}

const WAVE_COLORS: Record<string, string> = {
  original: '#e2e8f0',
  vocals: '#67e8f9',
  instrumental: '#38bdf8',
  drums: '#fb923c',
  bass: '#f472b6',
  piano: '#c084fc',
  guitar: '#facc15',
  other: '#94a3b8',
  soprano: '#67e8f9',
  mezzo_soprano: '#a78bfa',
  alto: '#f472b6',
  tenor: '#a3e635',
  baritone: '#facc15',
  bass_voice: '#fb923c',
  lead_vocal: '#22d3ee',
  backing_vocals: '#818cf8',
};

function defaultControl(stem: Stem): StemControl {
  return {
    gain: 0.9,
    pan: 0,
    // Voice-part stems are subdivisions of the aggregate vocal stem. Starting
    // them muted prevents the same reconstructed voice energy from being
    // intentionally double-counted in the default full mix.
    // Practice mixes are alternatives to the full mix, so they start muted too.
    muted: stem.kind === 'voice_part' || stem.kind === 'minus_one' || stem.name === 'original',
    solo: false,
  };
}

export function StemMixer({
  results,
  token,
  pitchData,
  practiceStemId,
  practiceNonce,
  onRefresh,
  onNotice,
  onError,
}: StemMixerProps) {
  const stems = useMemo(() => sortStems(results.stems), [results.stems]);
  const voicesById = useMemo(
    () => new Map(results.voices.map((voice) => [voice.voice_id, voice])),
    [results.voices],
  );
  const stemSignature = stems.map((stem) => stem.id).join(',');
  const fallbackDuration = Number(
    results.audio_file.meta.duration ?? results.report.input?.duration ?? 0,
  );

  const [controls, setControls] = useState<Record<number, StemControl>>({});
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(fallbackDuration);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [loopStart, setLoopStart] = useState(0);
  const [loopEnd, setLoopEnd] = useState(fallbackDuration);
  const [referenceOriginal, setReferenceOriginal] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [activePracticeId, setActivePracticeId] = useState<number | null>(null);
  const [labelDrafts, setLabelDrafts] = useState<Record<number, string>>({});
  const [savingStemId, setSavingStemId] = useState<number | null>(null);
  const [graphReady, setGraphReady] = useState(false);

  const audioRefs = useRef(new Map<number, HTMLAudioElement>());
  const streamUrlsRef = useRef(new Map<number, string>());
  const audioContextRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef(new Map<number, StemNodes>());
  const controlsRef = useRef(controls);
  controlsRef.current = controls;

  const leaderId = stems.find((stem) => stem.name === 'original')?.id ?? stems[0]?.id;

  useEffect(() => {
    setControls((previous) => {
      const next: Record<number, StemControl> = {};
      stems.forEach((stem) => {
        next[stem.id] = previous[stem.id] ?? defaultControl(stem);
        if (!streamUrlsRef.current.has(stem.id)) {
          streamUrlsRef.current.set(stem.id, stem.stream_url);
        }
      });
      return next;
    });
    setLabelDrafts((previous) => {
      const next: Record<number, string> = {};
      stems.forEach((stem) => {
        next[stem.id] = previous[stem.id] ?? stem.user_label ?? '';
      });
      return next;
    });
    if (duration <= 0 && fallbackDuration > 0) {
      setDuration(fallbackDuration);
      setLoopEnd((value) => (value > 0 ? value : fallbackDuration));
    }
    // Stem IDs are the identity boundary for control defaults; label-only
    // refreshes should not reset the user's mix.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stemSignature]);

  useEffect(() => {
    if (practiceStemId === null) return;
    const stem = stems.find((item) => item.id === practiceStemId);
    if (stem) practiceStem(stem);
    // Practice requests are intentionally nonce-driven: clicking the same
    // voice twice re-solos it even if the user changed the mix in between.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [practiceNonce]);

  useEffect(
    () => () => {
      audioRefs.current.forEach((element) => element.pause());
      nodesRef.current.forEach(({ source, gain, pan }) => {
        try {
          source.disconnect();
          gain.disconnect();
          pan.disconnect();
        } catch {
          // The browser may already have torn the graph down.
        }
      });
      if (audioContextRef.current?.state !== 'closed') {
        void audioContextRef.current?.close().catch(() => undefined);
      }
    },
    [],
  );

  function isAudible(stem: Stem): boolean {
    if (referenceOriginal) return stem.name === 'original';
    const anySolo = stems.some((item) => controls[item.id]?.solo);
    if (anySolo) return Boolean(controls[stem.id]?.solo);
    return !controls[stem.id]?.muted;
  }

  function applyElementSettings(element: HTMLAudioElement, stem: Stem) {
    const control = controlsRef.current[stem.id] ?? defaultControl(stem);
    const audible = referenceOriginal
      ? stem.name === 'original'
      : stems.some((item) => controlsRef.current[item.id]?.solo)
        ? control.solo
        : !control.muted;
    const effectiveGain = audible ? control.gain : 0;
    const nodes = nodesRef.current.get(stem.id);
    element.playbackRate = playbackRate;
    const pitchAware = element as HTMLAudioElement & { preservesPitch?: boolean };
    if ('preservesPitch' in pitchAware) pitchAware.preservesPitch = true;
    if (nodes) {
      element.volume = 1;
      nodes.gain.gain.value = effectiveGain;
      nodes.pan.pan.value = control.pan;
    } else {
      element.volume = Math.min(1, Math.max(0, effectiveGain));
    }
  }

  useEffect(() => {
    audioRefs.current.forEach((element, stemId) => {
      const stem = stems.find((item) => item.id === stemId);
      if (stem) applyElementSettings(element, stem);
    });
  });

  function ensureGraph() {
    if (!window.AudioContext) return;
    try {
      audioContextRef.current ??= new window.AudioContext();
      const context = audioContextRef.current;
      stems.forEach((stem) => {
        const element = audioRefs.current.get(stem.id);
        if (!element || nodesRef.current.has(stem.id)) return;
        const source = context.createMediaElementSource(element);
        const gain = context.createGain();
        const pan = context.createStereoPanner();
        source.connect(gain).connect(pan).connect(context.destination);
        nodesRef.current.set(stem.id, { source, gain, pan });
        applyElementSettings(element, stem);
      });
      setGraphReady(true);
    } catch {
      // Native element volume remains available if a browser refuses to
      // create a media graph; pan is simply unavailable in that fallback.
      setGraphReady(false);
    }
  }

  function seek(time: number, updateState = true) {
    const safe = Math.max(0, duration > 0 ? Math.min(duration, time) : time);
    audioRefs.current.forEach((element) => {
      try {
        element.currentTime = safe;
      } catch {
        // Metadata may not have loaded for every preview yet.
      }
    });
    if (updateState) setCurrentTime(safe);
    return safe;
  }

  async function togglePlay() {
    if (playing) {
      audioRefs.current.forEach((element) => element.pause());
      setPlaying(false);
      return;
    }
    ensureGraph();
    try {
      await audioContextRef.current?.resume();
      seek(currentTime, false);
      const attempts = [...audioRefs.current.values()].map((element) => element.play());
      const settled = await Promise.allSettled(attempts);
      if (settled.every((item) => item.status === 'rejected')) {
        throw new Error('The browser could not start audio playback.');
      }
      setPlaying(true);
    } catch (error) {
      setPlaying(false);
      onError(error instanceof Error ? error.message : 'Playback failed to start.');
    }
  }

  useEffect(() => {
    if (!playing) return;
    let frame = 0;
    const tick = () => {
      const leader =
        (leaderId ? audioRefs.current.get(leaderId) : undefined) ??
        audioRefs.current.values().next().value;
      if (leader) {
        const t = leader.currentTime;
        setCurrentTime(t);
        audioRefs.current.forEach((element) => {
          if (element !== leader && Math.abs(element.currentTime - t) > 0.15) {
            try {
              element.currentTime = t;
            } catch {
              // Ignore transient seek failures while streams buffer.
            }
          }
        });
        if (loopEnabled && loopEnd > loopStart && t >= loopEnd) {
          seek(loopStart);
        } else if (leader.ended) {
          audioRefs.current.forEach((element) => element.pause());
          setPlaying(false);
          return;
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [playing, leaderId, loopEnabled, loopEnd, loopStart]);

  function updateControl(stemId: number, patch: Partial<StemControl>) {
    setControls((previous) => ({
      ...previous,
      [stemId]: { ...(previous[stemId] ?? { gain: 0.9, pan: 0, muted: false, solo: false }), ...patch },
    }));
    if (patch.solo || patch.muted === false) setReferenceOriginal(false);
  }

  function soloOnly(stemIds: number[]) {
    const wanted = new Set(stemIds);
    setControls((previous) => {
      const next: Record<number, StemControl> = {};
      stems.forEach((stem) => {
        next[stem.id] = {
          ...(previous[stem.id] ?? defaultControl(stem)),
          solo: wanted.has(stem.id),
          muted: wanted.has(stem.id) ? false : (previous[stem.id]?.muted ?? false),
        };
      });
      return next;
    });
    setReferenceOriginal(false);
  }

  function applyPreset(name: string) {
    setActivePracticeId(null);
    if (name === 'original') {
      setReferenceOriginal(true);
      return;
    }
    if (name === 'vocals') {
      const vocals = stems.find((stem) => stem.name === 'vocals');
      if (vocals) soloOnly([vocals.id]);
      return;
    }
    if (name === 'rhythm') {
      soloOnly(stems.filter((stem) => ['drums', 'bass'].includes(stem.name)).map((stem) => stem.id));
      return;
    }
    if (name === 'voice-parts') {
      soloOnly(stems.filter((stem) => stem.kind === 'voice_part').map((stem) => stem.id));
      return;
    }

    const hasComponents = stems.some((stem) => ['drums', 'bass', 'other'].includes(stem.name));
    setControls((previous) => {
      const next: Record<number, StemControl> = {};
      stems.forEach((stem) => {
        const base = previous[stem.id] ?? defaultControl(stem);
        let muted = stem.name === 'original' || stem.kind === 'voice_part' || stem.kind === 'minus_one';
        if (name === 'instrumental') {
          muted =
            stem.name === 'original' ||
            stem.name === 'vocals' ||
            stem.kind === 'voice_part' ||
            stem.kind === 'minus_one' ||
            (stem.name === 'instrumental' && hasComponents);
        }
        next[stem.id] = { ...base, solo: false, muted };
      });
      return next;
    });
    setReferenceOriginal(false);
  }

  function practiceStem(stem: Stem) {
    soloOnly([stem.id]);
    setActivePracticeId(stem.id);
    setShowNotes(true);
    onNotice(
      `Practice mode: soloing the reconstructed ${stem.user_label || prettyName(stem.name)} stem. Use loop and tempo controls to rehearse a phrase.`,
    );
  }

  async function makePracticeMix(stem: Stem) {
    setSavingStemId(stem.id);
    try {
      await api.createMinusOne(token, results.id, stem.name);
      await onRefresh();
      onNotice(`Practice mix ready: everything except ${prettyName(stem.name)}. It appears at the end of the stem list.`);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not build the practice mix.');
    } finally {
      setSavingStemId(null);
    }
  }

  async function saveLabel(stem: Stem) {
    setSavingStemId(stem.id);
    try {
      await api.patchStem(token, stem.id, { user_label: labelDrafts[stem.id] ?? '' });
      await onRefresh();
      onNotice('Stem label saved. The underlying AI/DSP identity remains shown separately.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not save the stem label.');
    } finally {
      setSavingStemId(null);
    }
  }

  async function deleteStem(stem: Stem) {
    if (!window.confirm(`Delete the ${prettyName(stem.name)} stem permanently?`)) return;
    setSavingStemId(stem.id);
    try {
      await api.deleteStem(token, stem.id);
      await onRefresh();
      onNotice('Stem deleted.');
    } catch (error) {
      onError(error instanceof Error ? error.message : 'Could not delete the stem.');
    } finally {
      setSavingStemId(null);
    }
  }

  const activePractice = stems.find((stem) => stem.id === activePracticeId);

  return (
    <section className="panel mixer-panel" id="stem-mixer">
      <div className="panel-heading mixer-heading">
        <div>
          <p className="eyebrow">Synchronized stem mixer</p>
          <h2>{results.audio_file.filename}</h2>
          <p className="muted">
            Separated files are AI/DSP reconstructions—not the original multitrack recording.
            Voice-part stems start muted because they subdivide the aggregate vocals stem.
          </p>
        </div>
        <span className={`status-pill ${playing ? 'is-live' : ''}`}>
          {playing ? 'Playing' : 'Paused'}
        </span>
      </div>

      <div className="transport card-inset">
        <div className="transport-main">
          <button className="button primary transport-play" type="button" onClick={() => void togglePlay()}>
            {playing ? '❚❚ Pause' : '▶ Play'}
          </button>
          <button className="button ghost" type="button" onClick={() => seek(0)}>
            ↺ Start
          </button>
          <button
            className={`button ${referenceOriginal ? 'primary' : 'ghost'}`}
            type="button"
            aria-pressed={referenceOriginal}
            onClick={() => setReferenceOriginal((value) => !value)}
          >
            A/B original
          </button>
          <span className="time-readout">
            {formatTime(currentTime)} <span>/</span> {formatTime(duration)}
          </span>
          <label className="compact-field grow">
            <span>Seek</span>
            <input
              type="range"
              min={0}
              max={Math.max(duration, 0.01)}
              step={0.05}
              value={Math.min(currentTime, duration || 0)}
              onChange={(event) => seek(Number(event.target.value))}
            />
          </label>
        </div>

        <div className="transport-grid">
          <label className="compact-field">
            <span>Tempo (pitch preserved)</span>
            <select
              value={playbackRate}
              onChange={(event) => setPlaybackRate(Number(event.target.value))}
            >
              {[0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1].map((rate) => (
                <option key={rate} value={rate}>
                  {Math.round(rate * 100)}%
                </option>
              ))}
            </select>
          </label>
          <label className="check-field">
            <input
              type="checkbox"
              checked={loopEnabled}
              onChange={(event) => setLoopEnabled(event.target.checked)}
            />
            Loop phrase
          </label>
          <label className="compact-field">
            <span>Loop start (s)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={loopStart}
              onChange={(event) => setLoopStart(Number(event.target.value))}
            />
          </label>
          <label className="compact-field">
            <span>Loop end (s)</span>
            <input
              type="number"
              min={0}
              step={0.1}
              value={loopEnd}
              onChange={(event) => setLoopEnd(Number(event.target.value))}
            />
          </label>
          <button className="button small ghost" type="button" onClick={() => setLoopStart(currentTime)}>
            Set start here
          </button>
          <button className="button small ghost" type="button" onClick={() => setLoopEnd(currentTime)}>
            Set end here
          </button>
          <label className="check-field">
            <input
              type="checkbox"
              checked={showNotes}
              onChange={(event) => setShowNotes(event.target.checked)}
            />
            Show estimated notes
          </label>
        </div>

        <div className="preset-row" aria-label="Mixer presets">
          <span>Presets:</span>
          <button type="button" className="chip-button" onClick={() => applyPreset('music')}>Full music mix</button>
          <button type="button" className="chip-button" onClick={() => applyPreset('vocals')}>Vocals only</button>
          <button type="button" className="chip-button" onClick={() => applyPreset('instrumental')}>Instrumental</button>
          <button type="button" className="chip-button" onClick={() => applyPreset('rhythm')}>Drums + bass</button>
          <button type="button" className="chip-button" onClick={() => applyPreset('voice-parts')}>Voice parts</button>
          <button type="button" className="chip-button" onClick={() => applyPreset('original')}>Original</button>
        </div>
        <p className="fine-print">
          {graphReady
            ? 'Web Audio graph active: gain and stereo pan are available per stem.'
            : 'Pan activates after the first Play press creates the Web Audio graph; volume works immediately.'}
        </p>
      </div>

      {activePractice && (
        <div className="practice-banner" role="status">
          <strong>Practice: {activePractice.user_label || prettyName(activePractice.name)}</strong>
          <span>Solo is active. Set a loop phrase, slow the tempo, and follow the estimated pitch line below.</span>
          <button type="button" className="button small ghost" onClick={() => applyPreset('music')}>
            Exit practice
          </button>
        </div>
      )}

      {showNotes && (
        <div className="pitch-section">
          <div className="subsection-heading">
            <h3>Estimated pitch lines</h3>
            <span>Voice identity colours follow the analysis below</span>
          </div>
          <PitchRoll data={pitchData} voices={results.voices} currentTime={currentTime} duration={duration} />
        </div>
      )}

      <div className="stem-list">
        {stems.map((stem) => {
          const control = controls[stem.id] ?? defaultControl(stem);
          const voice: Voice | undefined = stem.voice_id ? voicesById.get(stem.voice_id) : undefined;
          const audible = isAudible(stem);
          const displayName = stem.user_label || prettyName(stem.name);
          const streamUrl = streamUrlsRef.current.get(stem.id) ?? stem.stream_url;
          const quality = stem.quality ?? {};
          const qualityWarnings = quality.warnings ?? [];
          return (
            <article key={stem.id} className={`stem-row ${audible ? 'is-audible' : 'is-muted'}`}>
              <audio
                ref={(element) => {
                  if (element) audioRefs.current.set(stem.id, element);
                  else audioRefs.current.delete(stem.id);
                }}
                src={streamUrl}
                preload="metadata"
                onLoadedMetadata={(event) => {
                  const elementDuration = event.currentTarget.duration;
                  if (Number.isFinite(elementDuration) && elementDuration > 0) {
                    setDuration((previous) => Math.max(previous, elementDuration));
                    setLoopEnd((previous) => (previous > 0 ? previous : elementDuration));
                  }
                  applyElementSettings(event.currentTarget, stem);
                }}
              />

              <div className="stem-identity">
                <div className="stem-title-row">
                  <h3>{displayName}</h3>
                  <span className="kind-chip">{stem.kind.replace('_', ' ')}</span>
                </div>
                <p className="muted small-text">
                  Source identity: {prettyName(stem.name)}
                  {stem.voice_id ? ` · ${stem.voice_id.replace('_', ' ')}` : ''}
                </p>
                <div className="badge-row">
                  <span className={`quality-chip quality-${quality.quality ?? 'unknown'}`}>
                    {quality.quality ? `${quality.quality} quality` : 'quality n/a'}
                  </span>
                  {voice && (
                    <span className={`confidence-chip ${confidenceClass(voice.confidence)}`}>
                      {percent(voice.confidence)} · {confidenceText(voice.confidence, voice.confidence_label)}
                    </span>
                  )}
                  {stem.kind === 'voice_part' && <span className="experimental-chip">Experimental</span>}
                  {stem.kind === 'minus_one' && <span className="experimental-chip">Practice mix</span>}
                </div>
                <div className="stem-actions">
                  <button
                    type="button"
                    className={control.solo ? 'button small primary' : 'button small ghost'}
                    aria-pressed={control.solo}
                    onClick={() => updateControl(stem.id, { solo: !control.solo })}
                  >
                    Solo
                  </button>
                  <button
                    type="button"
                    className={control.muted ? 'button small danger-outline' : 'button small ghost'}
                    aria-pressed={control.muted}
                    onClick={() => updateControl(stem.id, { muted: !control.muted })}
                  >
                    {control.muted ? 'Muted' : 'Mute'}
                  </button>
                  {stem.kind === 'voice_part' && (
                    <button type="button" className="button small ghost" onClick={() => practiceStem(stem)}>
                      Practice
                    </button>
                  )}
                  {stem.name !== 'original' && stem.kind !== 'minus_one' && (
                    <button
                      type="button"
                      className="button small ghost"
                      disabled={savingStemId === stem.id}
                      title="Build a practice mix of the song without this part"
                      onClick={() => makePracticeMix(stem)}
                    >
                      Minus-one
                    </button>
                  )}
                </div>
              </div>

              <div className="stem-wave">
                <Waveform
                  peaks={quality.waveform}
                  currentTime={currentTime}
                  duration={duration}
                  color={WAVE_COLORS[stem.name] ?? '#93c5fd'}
                  dimmed={!audible}
                  label={displayName}
                  onSeek={seek}
                />
                <div className="download-row">
                  <a className="download-link" href={stem.download_url}>↓ WAV</a>
                  <a className="download-link" href={withDownloadFormat(stem.download_url, 'flac')}>↓ FLAC</a>
                  <a className="download-link" href={withDownloadFormat(stem.download_url, 'mp3')}>↓ MP3</a>
                </div>
              </div>

              <div className="stem-controls">
                <label>
                  <span>Gain {Math.round(control.gain * 100)}%</span>
                  <input
                    type="range"
                    min={0}
                    max={1.5}
                    step={0.01}
                    value={control.gain}
                    onChange={(event) => updateControl(stem.id, { gain: Number(event.target.value) })}
                  />
                </label>
                <label>
                  <span>
                    Pan {control.pan === 0 ? 'C' : control.pan < 0 ? `L${Math.round(-control.pan * 100)}` : `R${Math.round(control.pan * 100)}`}
                  </span>
                  <input
                    type="range"
                    min={-1}
                    max={1}
                    step={0.01}
                    value={control.pan}
                    disabled={!graphReady}
                    title={graphReady ? 'Stereo pan' : 'Press Play once to activate Web Audio pan'}
                    onChange={(event) => updateControl(stem.id, { pan: Number(event.target.value) })}
                  />
                </label>
              </div>

              <details className="stem-details">
                <summary>Evidence, label & file controls</summary>
                <dl className="metric-grid">
                  <div><dt>RMS</dt><dd>{quality.rms_dbfs !== undefined ? `${quality.rms_dbfs} dBFS` : '—'}</dd></div>
                  <div><dt>Peak</dt><dd>{quality.peak ?? '—'}</dd></div>
                  <div><dt>Silence</dt><dd>{percent(quality.silence_ratio)}</dd></div>
                  <div><dt>Bleed proxy</dt><dd>{quality.bleed_proxy ?? '—'}</dd></div>
                  <div><dt>Clipped</dt><dd>{percent(quality.clipped_ratio, 3)}</dd></div>
                  <div><dt>Energy share</dt><dd>{percent(quality.energy_share, 1)}</dd></div>
                </dl>
                {qualityWarnings.length > 0 && (
                  <ul className="warning-list compact">
                    {qualityWarnings.map((warning) => <li key={warning}>{warning}</li>)}
                  </ul>
                )}
                {stem.kind === 'voice_part' && (
                  <p className="fine-print">
                    Experimental separation — audible bleed may be present. A downloadable part exists only because
                    this line passed the current evidence/confidence gate.
                  </p>
                )}
                <div className="inline-form">
                  <label>
                    <span>Display label</span>
                    <input
                      value={labelDrafts[stem.id] ?? ''}
                      placeholder={prettyName(stem.name)}
                      onChange={(event) =>
                        setLabelDrafts((previous) => ({ ...previous, [stem.id]: event.target.value }))
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="button small"
                    disabled={savingStemId === stem.id}
                    onClick={() => void saveLabel(stem)}
                  >
                    Save label
                  </button>
                  <button
                    type="button"
                    className="button small danger-outline"
                    disabled={savingStemId === stem.id}
                    onClick={() => void deleteStem(stem)}
                  >
                    Delete stem
                  </button>
                </div>
              </details>
            </article>
          );
        })}
      </div>
    </section>
  );
}
