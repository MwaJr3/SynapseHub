import { useEffect, useMemo, useRef } from 'react';
import type { PitchData, PitchPoint, Voice } from '../types';
import { prettyName } from '../lib/utils';

const COLORS = ['#67e8f9', '#f472b6', '#a3e635', '#facc15', '#c084fc', '#fb923c', '#38bdf8'];
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

function isTrackRecord(value: unknown): value is Record<string, PitchPoint[]> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalize(data: PitchData | null | undefined): Record<string, PitchPoint[]> {
  if (!data) return {};
  if ('pitch_tracks' in data && isTrackRecord(data.pitch_tracks)) {
    return data.pitch_tracks;
  }
  return data as Record<string, PitchPoint[]>;
}

function noteName(midi: number): string {
  const rounded = Math.round(midi);
  return `${NOTE_NAMES[((rounded % 12) + 12) % 12]}${Math.floor(rounded / 12) - 1}`;
}

interface PitchRollProps {
  data: PitchData | null;
  voices: Voice[];
  currentTime: number;
  duration: number;
}

export function PitchRoll({ data, voices, currentTime, duration }: PitchRollProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const tracks = useMemo(() => normalize(data), [data]);
  const voiceById = useMemo(() => new Map(voices.map((voice) => [voice.voice_id, voice])), [voices]);
  const entries = Object.entries(tracks).filter(([, points]) => points.length > 0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const left = 54;
    const right = 16;
    const top = 18;
    const bottom = 30;
    const plotWidth = width - left - right;
    const plotHeight = height - top - bottom;
    const allPoints = entries.flatMap(([, points]) => points);
    const maxTime = Math.max(duration, ...allPoints.map((point) => point.time), 1);
    const minMidiRaw = Math.min(...allPoints.map((point) => point.midi), 48);
    const maxMidiRaw = Math.max(...allPoints.map((point) => point.midi), 72);
    const minMidi = Math.floor(minMidiRaw - 3);
    const maxMidi = Math.ceil(maxMidiRaw + 3);
    const yFor = (midi: number) =>
      top + ((maxMidi - midi) / Math.max(1, maxMidi - minMidi)) * plotHeight;
    const xFor = (time: number) => left + (time / maxTime) * plotWidth;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#08111f';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '11px system-ui, sans-serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    for (let midi = Math.ceil(minMidi / 12) * 12; midi <= maxMidi; midi += 12) {
      const y = yFor(midi);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.18)';
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(width - right, y);
      ctx.stroke();
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(noteName(midi), left - 8, y);
    }

    ctx.textAlign = 'center';
    for (let tick = 0; tick <= 6; tick += 1) {
      const time = (maxTime / 6) * tick;
      const x = xFor(time);
      ctx.strokeStyle = 'rgba(148, 163, 184, 0.08)';
      ctx.beginPath();
      ctx.moveTo(x, top);
      ctx.lineTo(x, height - bottom);
      ctx.stroke();
      ctx.fillStyle = '#64748b';
      ctx.fillText(`${time.toFixed(0)}s`, x, height - 12);
    }

    entries.forEach(([, points], voiceIndex) => {
      const color = COLORS[voiceIndex % COLORS.length];
      const stride = points.length > 6000 ? Math.ceil(points.length / 6000) : 1;
      ctx.lineWidth = 2;
      let penDown = false;
      let previousTime = -Infinity;
      for (let i = 0; i < points.length; i += stride) {
        const point = points[i];
        const x = xFor(point.time);
        const y = yFor(point.midi);
        if (!penDown || point.time - previousTime > 0.28) {
          ctx.stroke();
          ctx.beginPath();
          ctx.strokeStyle = color;
          ctx.globalAlpha = 0.35 + Math.min(0.65, Math.max(0, point.confidence));
          ctx.moveTo(x, y);
          penDown = true;
        } else {
          ctx.lineTo(x, y);
        }
        previousTime = point.time;
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });

    const playhead = xFor(Math.min(currentTime, maxTime));
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playhead, top);
    ctx.lineTo(playhead, height - bottom);
    ctx.stroke();
  }, [currentTime, duration, entries]);

  if (!entries.length) {
    return <p className="muted">No pitch track was produced for this job.</p>;
  }

  return (
    <div className="pitch-roll-wrap">
      <canvas
        ref={canvasRef}
        className="pitch-roll"
        width={1180}
        height={360}
        aria-label="AI-estimated pitch tracks by detected voice"
      />
      <div className="pitch-legend">
        {entries.map(([voiceId], index) => {
          const voice = voiceById.get(voiceId);
          const label = voice
            ? `${voiceId.replace('_', ' ')} · ${prettyName(voice.user_classification || voice.classification)}`
            : voiceId;
          return (
            <span key={voiceId}>
              <i style={{ background: COLORS[index % COLORS.length] }} /> {label}
            </span>
          );
        })}
      </div>
      <p className="fine-print">
        AI-estimated notes, not a guaranteed transcription. Line opacity follows frame-level pitch confidence.
      </p>
    </div>
  );
}
