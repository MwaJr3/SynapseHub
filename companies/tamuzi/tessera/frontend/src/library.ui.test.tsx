// @vitest-environment jsdom
/**
 * The Library screen, rendered for real.
 *
 * Three behaviours carry the risk here and are therefore tested as they appear on
 * screen rather than in the API:
 *
 * * deleting a concept takes two steps, because the first request is the server
 *   reporting what would go with it;
 * * a finished session is shown as a record with no editing controls;
 * * an open session states plainly that a reflection is required to close it, and
 *   that abandoning the session is allowed without one.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LearningSession, LibraryResponse, Note, NotesResponse } from './api';
import { ApiError, api } from './api';
import { LibraryPage } from './library';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      library: vi.fn(),
      knowledge: vi.fn(),
      notes: vi.fn(),
      sessions: vi.fn(),
      createConcept: vi.fn(),
      deleteConcept: vi.fn(),
      relations: vi.fn(),
      relate: vi.fn(),
      unrelate: vi.fn(),
      createNote: vi.fn(),
      deleteNote: vi.fn(),
      startSession: vi.fn(),
      updateSession: vi.fn(),
      finishSession: vi.fn(),
    },
  };
});

const STATS = {
  concepts_own: 1,
  notes: 1,
  sessions_open: 1,
  sessions_finished: 0,
  minutes_recorded: 0,
  note: 'Counts of what you recorded. They are not a measure of what you learned.',
};

const CONCEPT = {
  id: 'own.photosynthesis',
  title: 'Photosynthesis',
  subject: 'Biology',
  summary: 'Light into sugar.',
  explanation: '',
  difficulty: 3,
  own: true,
};

function library(overrides: Partial<LibraryResponse> = {}): LibraryResponse {
  return {
    concepts: [CONCEPT],
    relations: [
      { id: 'prerequisite', label: 'is a prerequisite of', meaning: 'You need this first.', gates: 'true' },
      { id: 'contrasts_with', label: 'contrasts with', meaning: 'Often confused.', gates: 'false' },
    ],
    activities: [
      { id: 'priming', label: 'Priming' },
      { id: 'retrieval', label: 'Retrieval' },
    ],
    stats: STATS,
    ...overrides,
  };
}

function emptyNotes(): NotesResponse {
  return { notes: [], query: '', terms: [], explanation: '' };
}

function openSession(overrides: Partial<LearningSession> = {}): LearningSession {
  return {
    id: 's1',
    concept_id: CONCEPT.id,
    concept_title: CONCEPT.title,
    objective: 'Explain the light reactions',
    stopping_condition: 'Two clean explanations, or 25 minutes',
    planned_minutes: 25,
    activities: [],
    reflection: '',
    evidence: '',
    status: 'open',
    minutes_spent: null,
    started_at: '2026-10-26T09:00:00+00:00',
    finished_at: null,
    covered: [],
    ...overrides,
  };
}

function note(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    concept_id: CONCEPT.id,
    concept_title: CONCEPT.title,
    title: 'Light reactions',
    body: 'Water splits; ATP and NADPH are made.',
    source_ref: 'Lecture 4',
    created_at: '2026-10-26T09:00:00+00:00',
    updated_at: '2026-10-26T09:00:00+00:00',
    score: 0,
    matched: [],
    ...overrides,
  };
}

function mockReady(options: {
  notes?: Note[];
  sessions?: LearningSession[];
  library?: LibraryResponse;
} = {}) {
  vi.mocked(api.library).mockResolvedValue(options.library ?? library());
  vi.mocked(api.knowledge).mockResolvedValue({ concepts: [] } as never);
  vi.mocked(api.notes).mockResolvedValue(
    options.notes ? { ...emptyNotes(), notes: options.notes } : emptyNotes(),
  );
  vi.mocked(api.sessions).mockResolvedValue({
    sessions: options.sessions ?? [],
    stats: STATS,
  });
  vi.mocked(api.relations).mockResolvedValue({ relations: [] });
}

async function renderLibrary() {
  render(<LibraryPage onOpenConcept={() => {}} />);
  await waitFor(() => expect(api.library).toHaveBeenCalled());
  await waitFor(() => expect(screen.queryByText('Loading your library…')).toBeNull());
}

beforeEach(() => {
  mockReady({ notes: [note()], sessions: [openSession()] });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('LibraryPage — deleting a concept', () => {
  it('asks before destroying anything and repeats what the server said would go', async () => {
    await renderLibrary();

    vi.mocked(api.deleteConcept).mockRejectedValueOnce(
      new ApiError('deleting this concept also removes 1 note(s), 1 session(s) and 0 relation(s).', 409),
    );

    await userEvent.click(screen.getByRole('button', { name: /Delete Photosynthesis/ }));

    const dialog = await screen.findByRole('alertdialog', { name: /Confirm deletion/ });
    expect(within(dialog).getByText(/1 note\(s\)/)).toBeTruthy();
    // The first request carried confirm=false; nothing was removed.
    expect(api.deleteConcept).toHaveBeenCalledWith(CONCEPT.id);

    vi.mocked(api.deleteConcept).mockResolvedValueOnce({
      deleted: CONCEPT.id,
      removed: { notes: 1, sessions: 1, relations: 0 },
    });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Delete it' }));

    await waitFor(() => expect(api.deleteConcept).toHaveBeenLastCalledWith(CONCEPT.id, true));
  });

  it('can be called off, leaving the concept alone', async () => {
    await renderLibrary();
    vi.mocked(api.deleteConcept).mockRejectedValueOnce(new ApiError('confirm=true required', 409));

    await userEvent.click(screen.getByRole('button', { name: /Delete Photosynthesis/ }));
    const dialog = await screen.findByRole('alertdialog', { name: /Confirm deletion/ });
    await userEvent.click(within(dialog).getByRole('button', { name: 'Keep it' }));

    expect(screen.queryByRole('alertdialog', { name: /Confirm deletion/ })).toBeNull();
    expect(api.deleteConcept).toHaveBeenCalledTimes(1);
  });
});

describe('LibraryPage — sessions', () => {
  it('shows a finished session as a record with no editing controls', async () => {
    mockReady({
      sessions: [
        openSession({
          id: 's1',
          status: 'completed',
          reflection: 'Explaining it aloud exposed a gap in the Calvin cycle.',
          minutes_spent: 22,
          finished_at: '2026-10-26T09:30:00+00:00',
          covered: ['retrieval'],
        }),
      ],
    });
    await renderLibrary();

    expect(screen.getByText(/Explaining it aloud exposed a gap/)).toBeTruthy();
    expect(screen.getByText('completed')).toBeTruthy();
    // No way to reopen or edit it from here.
    expect(screen.queryByRole('button', { name: /Finish/ })).toBeNull();
    expect(screen.queryByLabelText(/Reflection/)).toBeNull();
  });

  it('closes an open session with the reflection the learner typed', async () => {
    await renderLibrary();

    const box = screen.getByLabelText(/Reflection/);
    await userEvent.type(box, 'Two clean explanations.');
    vi.mocked(api.finishSession).mockResolvedValueOnce(
      openSession({ status: 'completed', reflection: 'Two clean explanations.' }),
    );

    await userEvent.click(screen.getByRole('button', { name: /Finish — done as planned/ }));
    await waitFor(() =>
      expect(api.finishSession).toHaveBeenCalledWith('s1', {
        outcome: 'completed',
        reflection: 'Two clean explanations.',
        minutes_spent: 25,
      }),
    );
  });

  it('offers stopping without finishing, and says that option needs no reflection', async () => {
    await renderLibrary();
    expect(screen.getByText(/A session you worked in needs a reflection; one you abandoned does not/)).toBeTruthy();
    expect(screen.getByRole('button', { name: /Stop without finishing/ })).toBeTruthy();
  });
});

describe('LibraryPage — notes and search', () => {
  it('explains a search by naming the words that matched', async () => {
    mockReady({ notes: [note({ score: 6, matched: ['light'] })] });
    await renderLibrary();

    expect(screen.getByText('Matched: light')).toBeTruthy();
  });

  it('says plainly when nothing matched instead of showing an empty list', async () => {
    mockReady({ notes: [] });
    await renderLibrary();

    expect(screen.getByText('No notes yet.')).toBeTruthy();

    vi.mocked(api.notes).mockResolvedValue({
      ...emptyNotes(),
      query: 'entropy',
      terms: ['entropy'],
      explanation: 'Notes are ranked by how many of your search terms they contain.',
    });
    await userEvent.type(screen.getByLabelText('Search your notes'), 'entropy{Enter}');

    await waitFor(() => expect(screen.getByText('No note matched those words.')).toBeTruthy());
  });
});
