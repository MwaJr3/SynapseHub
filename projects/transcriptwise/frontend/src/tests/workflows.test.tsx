import { render, screen, waitFor, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'
import { RichText } from '../components/RichText'
import { InputComposer } from '../components/InputComposer'
import { ThemeProvider } from '../lib/theme'
import { ThemeMenu } from '../components/Shell'
import { Review } from '../pages/Review'
import { Library } from '../pages/Library'
import { Quiz } from '../components/Quiz'
import { SectionEditor } from '../components/GuideEditors'
import { AuthDialog } from '../components/AuthDialog'
import { EXAMPLE_TEXT } from '../lib/utils'

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  patch: vi.fn(),
  request: vi.fn(),
  acceptSession: vi.fn(),
  openAuth: vi.fn(),
}))
const session = {
  user: {
    id: 'u1',
    email: null,
    display_name: 'Curious learner',
    is_guest: true,
    preferences: {},
    expires_at: null,
  },
  capabilities: {
    ai_provider: 'local',
    max_upload_bytes: 2000000,
    max_transcript_chars: 300000,
    guest_retention_days: 7,
    unsaved_retention_days: 30,
    youtube_authorized: false,
  },
  csrf_token: 'test',
}
vi.mock('../lib/api', () => ({
  post: mocks.post,
  patch: mocks.patch,
  request: mocks.request,
  getSession: vi.fn(),
  setSessionToken: vi.fn(),
}))
vi.mock('../lib/session', () => ({ useSession: () => ({ session, acceptSession: mocks.acceptSession }) }))
vi.mock('../lib/ui', () => ({ useAuthDialog: () => mocks.openAuth }))
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }))
const transcript = {
  id: 'source-1',
  title: 'Learning from the source',
  source_type: 'paste',
  source_url: null,
  video_id: null,
  metadata: {},
  language: 'en',
  text: EXAMPLE_TEXT,
  original_text: EXAMPLE_TEXT,
  version: 1,
  segments: [
    {
      id: 's00001',
      text: 'Active  recall is the practice of retrieving information from memory. You should check your answer against the original source.',
      start: 0,
      end: 10,
    },
  ],
  original_segments: [{ id: 's00001', text: EXAMPLE_TEXT, start: 0, end: 10 }],
}
function mount(ui: ReactNode, initial = '/') {
  const query = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  })
  return render(
    <QueryClientProvider client={query}>
      <ThemeProvider>
        <MemoryRouter initialEntries={[initial]}>{ui}</MemoryRouter>
      </ThemeProvider>
    </QueryClientProvider>,
  )
}
beforeEach(() => {
  vi.clearAllMocks()
  mocks.post.mockResolvedValue({})
  mocks.patch.mockResolvedValue({})
  mocks.request.mockResolvedValue({ items: [], total: 0, folders: [], tags: [] })
})

describe('transcript input', () => {
  it('switches between all three real input methods', async () => {
    const user = userEvent.setup()
    mount(<InputComposer />)
    expect(screen.getByLabelText('YouTube video URL')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Paste transcript' }))
    expect(screen.getByLabelText('Transcript text')).toBeVisible()
    await user.click(screen.getByRole('tab', { name: 'Upload file' }))
    expect(screen.getByText('Drop your transcript here')).toBeVisible()
  })
  it('supports keyboard movement between input tabs', async () => {
    const user = userEvent.setup()
    mount(<InputComposer />)
    screen.getByRole('tab', { name: 'YouTube link' }).focus()
    await user.keyboard('{ArrowRight}')
    expect(screen.getByRole('tab', { name: 'Paste transcript' })).toHaveAttribute('aria-selected', 'true')
  })
  it('validates unsupported video URLs without a backend request', async () => {
    const user = userEvent.setup()
    mount(<InputComposer />)
    await user.type(screen.getByLabelText('YouTube video URL'), 'https://evil.example/watch?v=aaaaaaaaaaa')
    await user.click(screen.getByRole('button', { name: 'Get transcript' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Other websites are not supported')
    expect(mocks.post).not.toHaveBeenCalled()
  })
  it('submits real pasted text and navigates to review', async () => {
    const user = userEvent.setup()
    mocks.post.mockResolvedValue(transcript)
    mount(
      <Routes>
        <Route path="/" element={<InputComposer />} />
        <Route path="/review/:id" element={<p>Transcript review opened</p>} />
      </Routes>,
    )
    await user.click(screen.getByRole('tab', { name: 'Paste transcript' }))
    await user.type(
      screen.getByLabelText('Transcript text'),
      'Active recall is retrieving information from memory. A learner should answer a question without looking, and then check against the original source.',
    )
    await user.click(screen.getByRole('button', { name: 'Review transcript' }))
    expect(await screen.findByText('Transcript review opened')).toBeVisible()
    expect(mocks.post.mock.calls[0][0]).toBe('/transcripts/text')
    expect(mocks.post.mock.calls[0][1].text).toContain('Active recall')
  })
  it('rejects text too short for meaningful analysis', async () => {
    const user = userEvent.setup()
    mount(<InputComposer />)
    await user.click(screen.getByRole('tab', { name: 'Paste transcript' }))
    await user.type(screen.getByLabelText('Transcript text'), 'too short')
    await user.click(screen.getByRole('button', { name: 'Review transcript' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('at least 80 characters')
  })
  it('uploads an actual File as multipart data', async () => {
    const user = userEvent.setup()
    mocks.request.mockResolvedValue(transcript)
    mount(
      <Routes>
        <Route path="/" element={<InputComposer />} />
        <Route path="/review/:id" element={<p>File ready for review</p>} />
      </Routes>,
    )
    await user.click(screen.getByRole('tab', { name: 'Upload file' }))
    const file = new File([EXAMPLE_TEXT], 'lesson.txt', { type: 'text/plain' })
    await user.upload(screen.getByLabelText('Choose transcript file'), file)
    await user.click(screen.getByRole('button', { name: 'Review transcript' }))
    expect(await screen.findByText('File ready for review')).toBeVisible()
    expect(mocks.request.mock.calls[0][1].body.get('file').name).toBe('lesson.txt')
  })
  it('rejects unsupported and oversized files', async () => {
    const user = userEvent.setup()
    mount(<InputComposer />)
    await user.click(screen.getByRole('tab', { name: 'Upload file' }))
    fireEvent.change(screen.getByLabelText('Choose transcript file'), {
      target: { files: [new File(['x'], 'lesson.pdf')] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('.txt, .srt, or .vtt')
    fireEvent.change(screen.getByLabelText('Choose transcript file'), {
      target: { files: [new File(['x'.repeat(2000001)], 'lesson.txt')] },
    })
    expect(await screen.findByRole('alert')).toHaveTextContent('too large')
  })
  it('shows provider errors instead of a fabricated result', async () => {
    const user = userEvent.setup()
    mocks.post.mockRejectedValue(new Error('The server could not parse this source.'))
    mount(<InputComposer />)
    await user.click(screen.getByRole('button', { name: 'Try an example' }))
    await user.click(screen.getByRole('button', { name: 'Review transcript' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('could not parse')
  })
  it('offers honest manual fallback without inserting an example transcript', async () => {
    const user = userEvent.setup()
    mocks.post.mockResolvedValue({ id: 'retrieval-1' })
    mocks.request.mockResolvedValue({
      id: 'retrieval-1',
      status: 'failed',
      error_code: 'access_not_authorized',
      message: 'Caption access was not authorized. Paste or upload a transcript.',
      result: null,
    })
    mount(<InputComposer />)
    await user.type(screen.getByLabelText('YouTube video URL'), 'https://youtu.be/dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Get transcript' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('not authorized')
    await user.click(screen.getByRole('button', { name: 'Paste transcript instead' }))
    expect(screen.getByLabelText('Transcript text')).toHaveValue('')
  })
  it('clears manually provided text on request', async () => {
    const user = userEvent.setup()
    mount(<InputComposer />)
    await user.click(screen.getByRole('button', { name: 'Try an example' }))
    expect(screen.getByLabelText('Transcript text')).not.toHaveValue('')
    await user.click(screen.getByRole('button', { name: 'Clear', exact: true }))
    expect(screen.getByLabelText('Transcript text')).toHaveValue('')
  })
})

describe('review and learning workspace', () => {
  it('preserves segment IDs and timestamps through source edits and selected preferences', async () => {
    const user = userEvent.setup()
    mocks.request.mockResolvedValue(transcript)
    mocks.patch.mockImplementation(async (_path, body) => ({ ...transcript, ...body, version: 2 }))
    mocks.post.mockResolvedValue({ analysis: { id: 'a1' }, task: { id: 't1' } })
    mount(
      <Routes>
        <Route path="/review/:id" element={<Review />} />
        <Route path="/guide/:id" element={<p>Learning guide started</p>} />
      </Routes>,
      '/review/source-1',
    )
    const field = await screen.findByLabelText('Transcript segment 1 at 00:00')
    await user.clear(field)
    await user.type(
      field,
      'Active recall is retrieving information from memory. Check your answer with the source, and keep important qualifications.',
    )
    await user.click(screen.getByLabelText('Advanced'))
    await user.click(screen.getByLabelText(/Deep dive/))
    await user.selectOptions(screen.getByLabelText('What’s your learning goal?'), 'exam')
    await user.click(screen.getByRole('button', { name: 'Create learning guide' }))
    expect(await screen.findByText('Learning guide started')).toBeVisible()
    expect(mocks.patch.mock.calls[0][1].segments[0]).toMatchObject({ id: 's00001', start: 0, end: 10 })
    expect(mocks.post.mock.calls[0][1].config).toMatchObject({
      level: 'advanced',
      depth: 'comprehensive',
      objective: 'exam',
    })
  })
  it('cleans whitespace without removing wording or original source', async () => {
    const user = userEvent.setup()
    mocks.request.mockResolvedValue(transcript)
    mount(
      <Routes>
        <Route path="/review/:id" element={<Review />} />
      </Routes>,
      '/review/source-1',
    )
    await screen.findByLabelText('Transcript segment 1 at 00:00')
    await user.click(screen.getByRole('button', { name: 'Clean up' }))
    expect(screen.getByLabelText('Transcript segment 1 at 00:00')).toHaveValue(
      transcript.segments[0].text.replace('  ', ' '),
    )
    await user.click(screen.getByRole('tab', { name: 'Original', exact: true }))
    expect(document.querySelector('pre.original-preview')).toBeVisible()
    expect(document.querySelector('pre.original-preview')?.textContent).toBe(EXAMPLE_TEXT)
  })
  it('keeps answers hidden until submission and separates self-assessment', async () => {
    const user = userEvent.setup()
    const questions = [
      {
        id: 'q1',
        kind: 'multiple_choice',
        question: 'What should you do before checking notes?',
        options: ['Recall the idea', 'Only reread'],
        answer: 'Recall the idea',
        explanation: 'The source recommends active recall.',
        refs: ['s00001'],
      },
      {
        id: 'q2',
        kind: 'short_answer',
        question: 'Explain why checking the source matters.',
        options: [],
        answer: 'Compare your response with the source to correct missing qualifications.',
        explanation: 'Open responses need your own judgment.',
        refs: ['s00001'],
      },
    ]
    mocks.request.mockResolvedValue([])
    mocks.post.mockResolvedValue({
      id: 'attempt1',
      score: 100,
      correct_count: 1,
      objective_count: 1,
      notice: 'Open responses are self-assessed.',
      questions: questions.map((q) => ({
        ...q,
        submitted: 'My answer',
        correct: q.id === 'q1' ? true : null,
      })),
    })
    mount(<Quiz analysisId="a1" questions={questions as never} onSegment={vi.fn()} onGenerate={vi.fn()} />)
    expect(screen.queryByText(questions[1].answer)).not.toBeInTheDocument()
    await user.click(screen.getByLabelText(/Recall the idea/))
    await user.type(
      screen.getByLabelText('Your answer to question 2'),
      'It prevents me from confusing confidence with accuracy.',
    )
    await user.click(screen.getByRole('button', { name: 'Check my understanding' }))
    expect(await screen.findByText(questions[1].answer)).toBeVisible()
    expect(screen.getByText('SELF-ASSESSMENT')).toBeVisible()
  })
  it('edits only the selected section and marks user changes', async () => {
    const user = userEvent.setup()
    const section = {
      key: 'overview',
      title: 'Overview',
      items: [
        {
          id: 'i1',
          heading: 'A source idea',
          body: 'Original source text.',
          provenance: 'source_claim',
          refs: ['s00001'],
          details: [],
        },
      ],
    }
    const guide = {
      id: 'a1',
      revision: 3,
      title: 'Learning',
      config: { level: 'beginner' },
      guide: { sections: [section] },
    }
    mount(<SectionEditor guide={guide as never} section={section as never} open onClose={vi.fn()} />)
    const content = screen.getByLabelText('Content')
    await user.clear(content)
    await user.type(content, 'My revised note.')
    await user.click(screen.getByRole('button', { name: 'Save section' }))
    await waitFor(() => expect(mocks.patch).toHaveBeenCalled())
    const body = mocks.patch.mock.calls[0][1]
    expect(body).not.toHaveProperty('guide')
    expect(body.section.items[0]).toMatchObject({
      body: 'My revised note.',
      provenance: 'user_note',
      refs: ['s00001'],
    })
  })
})

describe('library, accounts and appearance', () => {
  it('searches the library through the server and displays a real empty state', async () => {
    const user = userEvent.setup()
    mount(<Library />)
    expect(await screen.findByText('Your next discovery starts here.')).toBeVisible()
    await user.type(screen.getByRole('searchbox', { name: 'Search your library' }), 'physics')
    await waitFor(() => expect(mocks.request).toHaveBeenCalledWith(expect.stringContaining('q=physics')))
    expect(await screen.findByText('No guides found. New directions, perhaps?')).toBeVisible()
  })
  it('persists a functional dark theme and can return to light', async () => {
    const user = userEvent.setup()
    mount(<ThemeMenu />)
    await user.click(screen.getByLabelText('Change color theme'))
    await user.click(screen.getByRole('button', { name: 'Dark', exact: true }))
    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('tw-theme')).toBe('dark')
    await user.click(screen.getByLabelText('Change color theme'))
    await user.click(screen.getByRole('button', { name: 'Light', exact: true }))
    expect(document.documentElement).not.toHaveClass('dark')
  })
  it('validates registration and accepts a returned secure session', async () => {
    const user = userEvent.setup()
    const success = vi.fn()
    mocks.post.mockResolvedValue({
      ...session,
      csrf_token: 'rotated',
      user: { ...session.user, is_guest: false },
    })
    mount(<AuthDialog open mode="register" onClose={vi.fn()} onSuccess={success} />)
    const dialog = screen.getByRole('dialog')
    await user.type(within(dialog).getByLabelText('Email address'), 'learner@example.com')
    await user.type(within(dialog).getByLabelText('Password'), 'short')
    await user.click(within(dialog).getByRole('button', { name: 'Create your account' }))
    expect(await screen.findByText('Use at least 10 characters.')).toBeVisible()
    await user.clear(within(dialog).getByLabelText('Password'))
    await user.type(within(dialog).getByLabelText('Password'), 'a-strong-password')
    await user.click(within(dialog).getByRole('button', { name: 'Create your account' }))
    await waitFor(() => expect(success).toHaveBeenCalled())
    expect(mocks.acceptSession).toHaveBeenCalledWith(expect.objectContaining({ csrf_token: 'rotated' }))
  })
})

describe('untrusted content and status recovery', () => {
  it('does not execute raw HTML or load tracking images from Markdown', () => {
    mount(
      <RichText>
        {
          '<script>alert("xss")</script>\n\n![Tracking pixel](https://untrusted.example/pixel)\n\n[unsafe](javascript:alert(1))'
        }
      </RichText>,
    )
    expect(document.querySelector('script')).not.toBeInTheDocument()
    expect(document.querySelector('img')).not.toBeInTheDocument()
    expect(document.querySelector('a')).not.toBeInTheDocument()
    expect(screen.getByText('[Image omitted: Tracking pixel]')).toBeVisible()
  })
  it('recovers from a failed retrieval status request instead of spinning forever', async () => {
    const user = userEvent.setup()
    mocks.post.mockResolvedValue({ id: 'lost-status' })
    mocks.request.mockRejectedValue(new Error('The task could not be reached.'))
    mount(<InputComposer />)
    await user.type(screen.getByLabelText('YouTube video URL'), 'https://youtu.be/dQw4w9WgXcQ')
    await user.click(screen.getByRole('button', { name: 'Get transcript' }))
    expect(await screen.findByText('The retrieval status could not be checked')).toBeVisible()
    await user.click(screen.getByRole('button', { name: 'Paste transcript instead' }))
    expect(screen.getByLabelText('Transcript text')).toHaveValue('')
  })
})
