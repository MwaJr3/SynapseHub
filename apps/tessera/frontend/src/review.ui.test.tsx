// @vitest-environment jsdom
/**
 * The review screen, rendered for real.
 *
 * What these tests protect, and why each one would fail on a plausible mistake:
 *
 * * the answer key is not on screen before submitting — the obvious "improvement"
 *   of showing the source straight away would turn recall into reading;
 * * self-graded formats make the learner tick criteria, and an empty tick list is
 *   accepted as an honest zero rather than being blocked by the form;
 * * the recovery banner appears only for a real backlog, and says nothing was
 *   reset.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { PracticePrompt, PracticeResult, ReviewItem, ReviewQueue, ReviewStats } from './api';
import { api } from './api';
import { ReviewPage } from './review';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      reviewQueue: vi.fn(),
      reviewPrompt: vi.fn(),
      submitPractice: vi.fn(),
      reviewStats: vi.fn(),
    },
  };
});

function item(overrides: Partial<ReviewItem> = {}): ReviewItem {
  return {
    concept_id: 'py.variables',
    title: 'Variables and names',
    subject: 'Python',
    mastery: 0.42,
    tier: 'developing',
    retained: 0.3,
    predicted_recall: 0.62,
    stability_days: 2.5,
    difficulty: 3.1,
    reps: 2,
    lapses: 1,
    last_reviewed_at: '2026-10-20T09:00:00+00:00',
    next_review_at: '2026-10-24T09:00:00+00:00',
    overdue_days: 3.2,
    available_formats: ['cloze', 'free_recall'],
    suggested_format: 'cloze',
    reasons: [
      'Recall probability is estimated at 62%, below your 90% target.',
      'Overdue by 3.2 days.',
    ],
    ...overrides,
  };
}

function queue(overrides: Partial<ReviewQueue> = {}): ReviewQueue {
  const due = [item()];
  return {
    due,
    today: due,
    overdue_count: due.length,
    recovery: {
      active: false,
      reason: '1 review(s) overdue, which is an ordinary day\'s work.',
      today_target: due.length,
      remaining_after_today: 0,
      spread_days: 0,
    },
    upcoming: [],
    target_retention: 0.9,
    empty_state: null,
    policy: 'Ordered by how far overdue each concept is.',
    ...overrides,
  };
}

function stats(): ReviewStats {
  return {
    summary: {
      total: 2,
      by_format: [
        { format: 'cloze', attempts: 1, mean_score: 1, auto_graded: 1, self_graded: 0 },
        { format: 'free_recall', attempts: 1, mean_score: 0.5, auto_graded: 0, self_graded: 1 },
      ],
      note: 'Self-graded attempts are shown separately because they are weaker evidence.',
    },
    prediction: [],
    note: 'Predicted recall is the scheduler\'s own estimate.',
  };
}

function prompt(overrides: Partial<PracticePrompt> = {}): PracticePrompt {
  return {
    prompt_id: 'py.variables#cloze#0',
    concept_id: 'py.variables',
    concept_title: 'Variables and names',
    format: 'cloze',
    prompt: 'Binding attaches a name to an _____.',
    choices: [],
    graded_by: 'auto',
    evidence_weight: 1,
    instructions: 'Fill the blank from memory.',
    criteria: [],
    criteria_hidden: false,
    available_formats: ['cloze', 'free_recall'],
    attempts_on_concept: 2,
    suggested_format: 'cloze',
    ...overrides,
  };
}

function result(overrides: Partial<PracticeResult> = {}): PracticeResult {
  return {
    attempt: {
      id: 'ra1',
      concept_id: 'py.variables',
      concept_title: 'Variables and names',
      format: 'cloze',
      prompt: 'Binding attaches a name to an _____.',
      answer: 'object',
      expected: 'object',
      score: 1,
      correct: true,
      graded_by: 'auto',
      evidence_weight: 1,
      latency_ms: 3000,
      session_id: null,
      created_at: '2026-10-27T09:00:00+00:00',
    },
    explanation: 'Exactly the source term: “object”. Source fingerprint ab12cd34.',
    model: {
      concept_id: 'py.variables',
      correct: true,
      evidence_weight: 1,
      mastery: 0.51,
      mastery_delta: 0.09,
      tier: 'developing',
      stability_days: 3.1,
      interval_days: 3.1,
      retrievability_before: 0.62,
      next_review_at: '2026-10-30T09:00:00+00:00',
      reps: 3,
      lapses: 1,
    },
    next: {
      next_review_at: '2026-10-30T09:00:00+00:00',
      interval_days: 3.1,
      reasons: ['Score 1.00 with weight 1.0 (server-graded).', 'Stability is now 3.10 days.'],
    },
    ...overrides,
  };
}

async function renderReview(overrides: Partial<ReviewQueue> = {}) {
  vi.mocked(api.reviewQueue).mockResolvedValue(queue(overrides));
  vi.mocked(api.reviewStats).mockResolvedValue(stats());
  render(<ReviewPage onOpenConcept={() => {}} />);
  await waitFor(() => expect(api.reviewQueue).toHaveBeenCalled());
}

beforeEach(() => {
  vi.mocked(api.reviewPrompt).mockResolvedValue(prompt());
  vi.mocked(api.submitPractice).mockResolvedValue(result());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('ReviewPage — the queue', () => {
  it('shows why an item is due, using the sentences the server produced', async () => {
    await renderReview();
    await userEvent.click(screen.getByText('Why is this here?'));
    expect(screen.getByText(/Recall probability is estimated at 62%/)).toBeTruthy();
    expect(screen.getByText('Overdue by 3.2 days.')).toBeTruthy();
  });

  it('shows the recovery banner only when there is a real backlog', async () => {
    await renderReview();
    expect(screen.queryByText(/Welcome back/)).toBeNull();
    cleanup();

    await renderReview({
      recovery: {
        active: true,
        reason: '30 reviews are overdue. Today\'s plan is 6 of them. Nothing has been reset.',
        today_target: 6,
        remaining_after_today: 24,
        spread_days: 4,
      },
      overdue_count: 30,
      due: Array.from({ length: 30 }, (_, index) => item({ concept_id: `c${index}`, title: `Item ${index}` })),
      today: [item()],
    });

    expect(screen.getByText(/Welcome back/)).toBeTruthy();
    expect(screen.getByText(/Nothing has been reset/)).toBeTruthy();
  });

  it('says a concept has nothing to practise instead of offering a broken prompt', async () => {
    await renderReview({
      today: [item({ available_formats: [], suggested_format: null })],
      due: [item({ available_formats: [], suggested_format: null })],
    });

    expect(await screen.findByText('This concept has nothing to practise yet.')).toBeTruthy();
    // No prompt request was made, so no 409 was provoked.
    expect(api.reviewPrompt).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: 'Open the concept' })).toBeTruthy();
  });

  it('explains an empty queue instead of showing a blank panel', async () => {
    await renderReview({
      due: [],
      today: [],
      overdue_count: 0,
      empty_state:
        'Nothing is scheduled yet: reviews appear after you have answered something.',
      upcoming: [{ concept_id: 'py.variables', title: 'Variables and names', next_review_at: null, in_hours: null }],
    });
    expect(screen.getByText(/reviews appear after you have answered something/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Variables and names' })).toBeTruthy();
  });
});

describe('ReviewPage — answering', () => {
  it('does not put the expected answer on screen before submitting', async () => {
    await renderReview();
    await waitFor(() => expect(api.reviewPrompt).toHaveBeenCalled());

    // The prompt text is shown; the key is only in the response, which the UI has
    // not received because it never asks for `reveal`.
    expect(screen.getByText(/Binding attaches a name to an _____/)).toBeTruthy();
    expect(screen.queryByText(/The source:/)).toBeNull();
    expect(api.reviewPrompt).toHaveBeenCalledWith('py.variables', 'cloze', 0, false);
  });

  it('submits the typed answer and reports the result with the next review date', async () => {
    await renderReview();
    const input = await screen.findByLabelText('The missing word');
    await userEvent.type(input, 'object');
    await userEvent.click(screen.getByRole('button', { name: /Check my answer/ }));

    await waitFor(() => expect(api.submitPractice).toHaveBeenCalled());
    const payload = vi.mocked(api.submitPractice).mock.calls[0]![0];
    // The client sends what the learner produced, never a score: grading is the
    // server's job and a self-reported score would be worthless evidence.
    expect(payload.prompt_id).toBe('py.variables#cloze#0');
    expect(payload.answer).toBe('object');
    expect(Object.keys(payload).sort()).toEqual(['answer', 'latency_ms', 'prompt_id']);
    // No score field exists to be filled in by the client.
    expect(Object.keys(payload)).not.toContain('score');
    expect(Object.keys(payload)).not.toContain('correct');

    expect(await screen.findByText(/Recalled — score 1.00/)).toBeTruthy();
    expect(screen.getByText(/The source:/)).toBeTruthy();
    expect(screen.getByText(/Next review/)).toBeTruthy();
  });

  it('advances the progress bar only once an answer was recorded', async () => {
    await renderReview();
    const bar = screen.getByRole('progressbar', { name: /Reviews answered today/ });
    expect(bar.getAttribute('aria-valuenow')).toBe('0');

    const input = await screen.findByLabelText('The missing word');
    await userEvent.type(input, 'object');
    await userEvent.click(screen.getByRole('button', { name: /Check my answer/ }));

    await waitFor(() => expect(bar.getAttribute('aria-valuenow')).toBe('1'));
  });
});

describe('ReviewPage — self-graded recall', () => {
  const recallPrompt = prompt({
    prompt_id: 'py.variables#free_recall#0',
    format: 'free_recall',
    graded_by: 'self',
    evidence_weight: 0.5,
    prompt: 'Write everything you can remember about Variables and names.',
    criteria: [],
    criteria_hidden: true,
    instructions: 'Write everything you remember without looking.',
  });

  it('withholds the criteria until the learner says they have finished writing', async () => {
    vi.mocked(api.reviewPrompt).mockResolvedValue(recallPrompt);
    await renderReview({
      today: [item({ suggested_format: 'free_recall', available_formats: ['free_recall'] })],
    });

    const reveal = await screen.findByRole('button', {
      name: /show me the source lines/i,
    });
    expect((screen.getByRole('button', { name: /Check my answer/ }) as HTMLButtonElement).disabled).toBe(
      true,
    );

    vi.mocked(api.reviewPrompt).mockResolvedValue({
      ...recallPrompt,
      criteria: ['Binding attaches a name to an object.', 'Rebinding is not mutation.'],
      criteria_hidden: false,
    });
    await userEvent.click(reveal);

    await waitFor(() =>
      expect(screen.getByText('Binding attaches a name to an object.')).toBeTruthy(),
    );
    expect(api.reviewPrompt).toHaveBeenLastCalledWith('py.variables', 'free_recall', 0, true);
  });

  it('sends an empty tick list rather than blocking an honest zero', async () => {
    vi.mocked(api.reviewPrompt).mockResolvedValue({
      ...recallPrompt,
      criteria: ['Binding attaches a name to an object.', 'Rebinding is not mutation.'],
      criteria_hidden: false,
    });
    vi.mocked(api.submitPractice).mockResolvedValue(
      result({
        attempt: {
          ...result().attempt,
          grade_placeholder: undefined,
          format: 'free_recall',
          graded_by: 'self',
          evidence_weight: 0.5,
          score: 0,
          correct: false,
          answer: '',
          expected: 'Binding attaches a name to an object.',
        } as never,
        explanation: 'None of the source points were produced. That is useful information, not a failure.',
      }),
    );
    await renderReview({
      today: [item({ suggested_format: 'free_recall', available_formats: ['free_recall'] })],
    });

    await userEvent.click(await screen.findByRole('button', { name: /Check my answer/ }));
    await waitFor(() => expect(api.submitPractice).toHaveBeenCalled());
    expect(vi.mocked(api.submitPractice).mock.calls[0]![0].checked).toEqual([]);
    expect(await screen.findByText(/Not this time — score 0.00/)).toBeTruthy();
  });

  it('says the learner graded it, rather than implying the server checked', async () => {
    vi.mocked(api.reviewPrompt).mockResolvedValue({
      ...recallPrompt,
      criteria: ['One point.'],
      criteria_hidden: false,
    });
    vi.mocked(api.submitPractice).mockResolvedValue(
      result({
        attempt: {
          ...result().attempt,
          format: 'free_recall',
          graded_by: 'self',
          evidence_weight: 0.5,
          score: 1,
        },
      }),
    );
    await renderReview({
      today: [item({ suggested_format: 'free_recall', available_formats: ['free_recall'] })],
    });

    await userEvent.click(await screen.findByLabelText('One point.'));
    await userEvent.click(screen.getByRole('button', { name: /Check my answer/ }));

    expect(await screen.findByText('you graded this')).toBeTruthy();
    expect(within(screen.getByText('you graded this').closest('div') as HTMLElement).queryByText('checked by the server')).toBeNull();
  });
});
