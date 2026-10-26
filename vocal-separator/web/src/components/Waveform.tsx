import { useEffect, useRef } from 'react';

interface WaveformProps {
  peaks?: number[];
  currentTime: number;
  duration: number;
  color?: string;
  dimmed?: boolean;
  label: string;
  onSeek: (time: number) => void;
}

export function Waveform({
  peaks = [],
  currentTime,
  duration,
  color = '#67e8f9',
  dimmed = false,
  label,
  onSeek,
}: WaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = dimmed ? 'rgba(15, 23, 42, 0.55)' : 'rgba(15, 23, 42, 0.9)';
    ctx.fillRect(0, 0, width, height);

    const values = peaks.length ? peaks : Array.from({ length: 160 }, () => 0.04);
    const step = width / values.length;
    const progress = duration > 0 ? Math.min(1, Math.max(0, currentTime / duration)) : 0;

    values.forEach((peak, index) => {
      const x = index * step;
      const amplitude = Math.max(1, Math.min(1, Math.abs(peak)) * (height * 0.44));
      const played = x / width <= progress;
      ctx.fillStyle = dimmed
        ? 'rgba(100, 116, 139, 0.45)'
        : played
          ? color
          : 'rgba(148, 163, 184, 0.55)';
      ctx.fillRect(x, height / 2 - amplitude, Math.max(1, step * 0.72), amplitude * 2);
    });

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(progress * width, 0, 2, height);
  }, [color, currentTime, dimmed, duration, peaks]);

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
    if (duration > 0) onSeek(ratio * duration);
  }

  return (
    <canvas
      ref={canvasRef}
      className="waveform"
      width={900}
      height={92}
      role="button"
      tabIndex={0}
      aria-label={`Seek within ${label}`}
      onClick={handleClick}
      onKeyDown={(event) => {
        if (event.key === 'ArrowRight') onSeek(Math.min(duration, currentTime + 5));
        if (event.key === 'ArrowLeft') onSeek(Math.max(0, currentTime - 5));
      }}
    />
  );
}
