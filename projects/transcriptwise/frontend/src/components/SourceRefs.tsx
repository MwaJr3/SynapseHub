import { useState } from 'react'
import { ArrowUpRight, Clock3, Link2 } from 'lucide-react'
import type { Transcript } from '../lib/types'
import { formatTime } from '../lib/utils'
export function SourceRefs({
  refs,
  transcript,
  onSegment,
}: {
  refs: string[]
  transcript?: Transcript
  onSegment?: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  if (!refs.length || !transcript) return null
  return (
    <div className="source-refs" aria-label="Source references">
      {(expanded ? refs : refs.slice(0, 3)).map((ref) => {
        const segment = transcript.segments.find((s) => s.id === ref)
        if (!segment) return null
        const label = segment.start !== null ? formatTime(segment.start) : `Source ${ref.replace(/^s0*/, '')}`
        const url =
          transcript.video_id && /^[a-zA-Z0-9_-]{11}$/.test(transcript.video_id) && segment.start !== null
            ? `https://www.youtube.com/watch?v=${transcript.video_id}&t=${Math.floor(segment.start)}s`
            : null
        return url ? (
          <a
            href={url}
            key={ref}
            target="_blank"
            rel="noreferrer"
            title="Open this point in the source video"
          >
            <Clock3 size={11} />
            {label}
            <ArrowUpRight size={10} />
          </a>
        ) : (
          <button key={ref} onClick={() => onSegment?.(ref)} title="View the source transcript passage">
            {segment.start !== null ? <Clock3 size={11} /> : <Link2 size={11} />}
            {label}
          </button>
        )
      })}
      {!expanded && refs.length > 3 && (
        <button onClick={() => setExpanded(true)}>+{refs.length - 3} sources</button>
      )}
      {expanded && refs.length > 3 && <button onClick={() => setExpanded(false)}>Show less</button>}
    </div>
  )
}
