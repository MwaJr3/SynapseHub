import {
  ArrowRight,
  BookOpen,
  ChevronDown,
  ExternalLink,
  FileText,
  Keyboard,
  Link2,
  LockKeyhole,
  Sparkles,
  Upload,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Notice, PageHeader } from '../components/ui'
import { useSession } from '../lib/session'

export function Help() {
  const { session } = useSession()
  const questions = [
    [
      'Why can’t every YouTube transcript be retrieved?',
      'Public visibility is not permission to download captions through the official API. This app uses YouTube oEmbed for public metadata and the official captions API for authorized tracks. The configured Google account needs the required permissions. An unavailable request does not prove captions do not exist. Paste or upload a transcript you have permission to use instead.',
    ],
    [
      'Is the local engine actually AI?',
      'No. The no-key local engine selects relevant source sentences, extracts explicit definitions, organizes excerpts, and creates source-based study prompts. It does not provide language-model explanations or translation. This mode is labeled throughout the application. Configure an OpenAI-compatible provider on the server to enable the full AI learning engine.',
    ],
    [
      'Can I edit my transcript after creating a guide?',
      'A transcript becomes a locked source snapshot once a guide uses it, so citations do not quietly change underneath existing notes. Before analysis you can edit segments, clean whitespace, remove passages, or restore the original. For later source changes, create a new transcript and guide. Generated sections and personal notes remain editable.',
    ],
    [
      'What do the provenance labels mean?',
      '“From the source” is a statement made in the transcript, not independently verified evidence. “Source paraphrase” rewrites source material. “AI-added explanation” and “Illustrative example” are additions. “Additional recommendation” is a suggested activity or next step. “User-edited note” is content changed by you. Source references let you inspect the underlying passage.',
    ],
    [
      'What happens if a long analysis fails halfway through?',
      'Every validated source-chunk result is saved as a checkpoint. You can read a clearly marked partial guide and retry the failed task. The initial analysis continues from its completed chunks instead of reprocessing them. Regeneration is applied only when the entire replacement succeeds; the existing section stays available if it fails.',
    ],
    [
      'How are quizzes and flashcards evaluated?',
      'Multiple-choice and true/false answers are graded against validated stored answers. Open-ended responses are self-assessed using a source-based model answer, not automatically declared correct. Flashcard ratings set a simple next-review date. Neither activity counts nor review ratings are proof of mastery.',
    ],
    [
      'How do I export or print?',
      'Open a guide and choose Export for Markdown, Word (.docx), or a structured JSON archive. Copy the whole guide or individual sections. Print view opens a clean document; use your browser’s Print command to print or save a PDF. Server-generated PDF and PDF transcript import are not supported.',
    ],
    [
      'Where do my guides go when I create an account?',
      `Registering converts this browser’s guest workspace into your account. Signing into an existing account carries this browser’s guest content into that account. You still choose which guides to mark as saved. Guest data expires after ${session.capabilities.guest_retention_days} days; unsaved account guides expire after ${session.capabilities.unsaved_retention_days} days without an edit. Saved guides stay until deletion.`,
    ],
  ]
  return (
    <div className="workspace-page help-page">
      <PageHeader
        eyebrow="LET CURIOSITY LEAD"
        title="A little help getting started."
        description="The shortest path from a transcript to a useful understanding."
      />
      <div className="help-journey">
        {[
          [
            Link2,
            '01',
            'Bring a source',
            'Paste a transcript, upload TXT/SRT/VTT, or request authorized YouTube captions.',
          ],
          [
            FileText,
            '02',
            'Review & personalize',
            'Check the source, keep useful timestamps, and choose your learning preferences.',
          ],
          [
            Sparkles,
            '03',
            'Make it yours',
            'Explore the guide, add your own notes, practice recall, and take a useful next step.',
          ],
        ].map(([Icon, number, title, body]) => {
          const ItemIcon = Icon as typeof Link2
          return (
            <section key={number as string}>
              <span className="how-icon peach">
                <ItemIcon size={21} />
                <span>{number as string}</span>
              </span>
              <h2>{title as string}</h2>
              <p>{body as string}</p>
            </section>
          )
        })}
      </div>
      <Notice title="Start with a real source, or try the labeled example.">
        The example transcript was written for this application. It is never substituted for a requested
        video.
        <div className="notice-actions">
          <Link className="text-button" to="/new?sample=1">
            Try the example transcript <ArrowRight size={13} />
          </Link>
        </div>
      </Notice>
      <div className="help-content">
        <section>
          <div className="section-heading">
            <h2>A few good questions.</h2>
            <BookOpen size={21} />
          </div>
          <div className="faq-list">
            {questions.map(([question, answer]) => (
              <details key={question}>
                <summary>
                  {question}
                  <ChevronDown size={16} />
                </summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
        <aside>
          <div className="panel help-side-panel">
            <Upload size={23} />
            <h3>Keep your files simple.</h3>
            <p>
              UTF-8 .txt, .srt, and .vtt files are supported. The limit is{' '}
              {session.capabilities.max_upload_bytes / 1_000_000} MB and{' '}
              {session.capabilities.max_transcript_chars.toLocaleString()} normalized characters.
            </p>
            <p>
              Renaming a PDF or Word file to .txt does not convert it. Malformed subtitle files need valid
              timestamps and blank lines between cues.
            </p>
          </div>
          <div className="panel help-side-panel">
            <Keyboard size={23} />
            <h3>A little less clicking.</h3>
            <dl>
              <dt>Ctrl / ⌘ + K</dt>
              <dd>Start a new learning guide</dd>
              <dt>← / → in input tabs</dt>
              <dd>Switch input methods</dd>
              <dt>Space in flashcard study</dt>
              <dd>Reveal or hide the answer</dd>
              <dt>Esc in a dialog</dt>
              <dd>Close and return to the workspace</dd>
            </dl>
          </div>
          <div className="help-api-link">
            <LockKeyhole size={16} />
            <div>
              <strong>Building on TranscriptWise?</strong>
              <p>Explore the versioned API and its validated request models.</p>
              <a className="text-button" href="/docs" target="_blank" rel="noreferrer">
                Interactive API docs <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
