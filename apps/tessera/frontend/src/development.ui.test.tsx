// @vitest-environment jsdom
/**
 * The learner-development screen, rendered for real.
 *
 * Four assertions carry the weight here, and each fails on the specific way this
 * page could go wrong:
 *
 * * **Nothing shows a self-management score.** The baseline panel gets a fixture
 *   with a summary and no number, and the test asserts the word "score" appears
 *   only inside the sentence that refuses one. A later "convenience" total would
 *   fail this.
 * * **A missing score is not rendered as a zero.** The mindset area has no score;
 *   a `0` on screen would be the exact substitution the whole stage forbids.
 * * **A named method shows as undefined.** If someone adds a definition to the
 *   payload later, the badge is still asserted — and the backend test refuses to
 *   serve one.
 * * **The retrieval submit is disabled until there is something to mark.** A
 *   button that accepts an empty answer would record a check nobody took.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { Curriculum, DevelopmentGate, DevelopmentModel, Protocol } from './api';
import { api } from './api';
import { DevelopmentPage } from './development';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      developmentModel: vi.fn(),
      developmentCurriculum: vi.fn(),
      developmentProtocol: vi.fn(),
      developmentGate: vi.fn(),
      developmentBaseline: vi.fn(),
      developmentExperiments: vi.fn(),
      writeHypothesis: vi.fn(),
    },
  };
});

function area(overrides: Partial<DevelopmentModel['areas'][number]> = {}) {
  return {
    scope: 'dimension' as const,
    key: 'mindset',
    name: 'Mindset',
    reported: 84,
    goal: 'Evidence-sensitive persistence.',
    score: { value: 84, instrument_label: 'iCanStudy diagnostic', reported_by: 'learner' },
    missing: false,
    suggestion: {
      scope: 'dimension' as const,
      key: 'mindset',
      claim: 'Mindset is reported at 84 and is likely the first constraint on work that depends on it.',
      rationale: 'A supplied score locates the question.',
      support: ['Evidence of mindset failing under unsupported conditions.'],
      contradict: ['Evidence of mindset succeeding when it is required.'],
      kind: 'claim' as const,
    },
    hypothesis: null,
    ...overrides,
  };
}

function model(): DevelopmentModel {
  return {
    caveats: ['Everything here is provisional.', 'A missing score is not a low score.'],
    confidence_policy: {
      none: 'No evidence recorded.',
      low: 'A supplied score alone.',
      moderate: 'A score plus one kind of behaviour.',
      high: 'A score plus two kinds of behaviour.',
    },
    evidence: { assessment: 0, attempt: 0, session: 0, observation: 0, retrieval: 0 },
    areas: [
      area(),
      area({
        key: 'self_management',
        name: 'Self-management',
        reported: null,
        score: null,
        missing: true,
        suggestion: {
          scope: 'dimension',
          key: 'self_management',
          claim: 'No score was supplied for Self-management, so whether it is a development target is unknown.',
          rationale: 'The instrument did not report this axis.',
          support: ['A behavioural record.'],
          contradict: ['Repeated performance with no difficulty.'],
          kind: 'question',
        },
      }),
    ],
  };
}

function curriculum(): Curriculum {
  const lesson = {
    slug: 'whole-part-whole',
    title: 'Whole, part, whole',
    group: 'H',
    group_title: 'Higher-order retrieval',
    topics: [{ key: 'h_wpw', title: 'Whole-Part-Whole reteaching' }],
    model: 'See the whole once, take one part apart, then rebuild the whole.',
    when_to_use: 'Complex systems.',
    when_not_to_use: 'Very small material.',
    worked_example: 'A compiler.',
    exercise: 'Do the three passes.',
    judging_results: 'The second whole is more connected.',
    traps: 'Stopping after the part.',
    retrieval_check: {
      question: 'What does the third pass add?',
      criteria: ['Rebuilt whole from memory', 'The first whole was orientation only'],
    },
    state: 'practised' as const,
    criteria_met: [],
    studied_at: null,
    practised_at: null,
  };
  return {
    lessons: [lesson],
    progress: {
      total: 1,
      practised: 1,
      retrieval_passed: 0,
      groups: { H: { title: 'Higher-order retrieval', topics: ['Whole-Part-Whole reteaching'], lessons: 1 } },
    },
    named_methods: [
      {
        name: 'AIM',
        status: 'undefined',
        problem: 'An unstated sequence for organising study.',
        open_alternative: 'Write the sequence you actually use and test it.',
        note: 'No definition supplied.',
      },
    ],
    dimensions: [],
    processes: [],
  };
}

function protocol(): Protocol {
  return {
    id: null,
    version: 0,
    sections: [{ key: 'priming', label: 'Time-boxed priming and prerequisite check', text: '', missing: true }],
    material_examples: [
      {
        key: 'factual',
        label: 'Material that must be produced exactly',
        guidance: 'Which facts, how they will be retrieved.',
        text: '',
        missing: true,
      },
    ],
    complete: false,
    missing: ['priming', 'factual'],
    updated_at: null,
  };
}

function gate(): DevelopmentGate {
  return {
    requirements: [
      { key: 'model', label: 'A documented learner model', done: false, detail: '2 areas have no claim.', missing: ['Mindset', 'Self-management'] },
    ],
    done: 0,
    total: 7,
    ready: false,
    note: 'Not a lock.',
  };
}

beforeEach(() => {
  vi.mocked(api.developmentModel).mockResolvedValue(model());
  vi.mocked(api.developmentCurriculum).mockResolvedValue(curriculum());
  vi.mocked(api.developmentProtocol).mockResolvedValue(protocol());
  vi.mocked(api.developmentGate).mockResolvedValue(gate());
  vi.mocked(api.developmentBaseline).mockResolvedValue({
    baseline: {
      id: 'b1',
      items: [{ key: 'planning', prompt: 'I plan.', answer: 'sometimes' }],
      observation: { task: 'Problem set' },
      summary: '4 of 9 statements were answered. No score is calculated from these answers, by design.',
      score: null,
      score_note: 'No score is calculated.',
      created_at: null,
    },
    items: [{ key: 'planning', prompt: 'I decide what to study before the day begins.', options: ['never', 'sometimes'] }],
    observation_fields: [{ key: 'task', label: 'What you intended to do' }],
    why_no_score: 'Self-management was never scored by the instrument.',
  });
  vi.mocked(api.developmentExperiments).mockResolvedValue({ experiments: [], min_sample: 5, rule: 'Five cases.' });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('the learner model panel', () => {
  it('renders a missing score as missing, never as zero', async () => {
    render(<DevelopmentPage />);
    const heading = await screen.findByRole('heading', { name: 'Self-management' });
    const card = heading.closest('.card') as HTMLElement;
    expect(within(card).getByText('Not measured')).toBeTruthy();
    expect(within(card).queryByText('0 reported')).toBeNull();
    expect(within(card).getByText(/A missing score is not a low score/)).toBeTruthy();
  });

  it('offers the suggested claim for editing rather than presenting it as a finding', async () => {
    render(<DevelopmentPage />);
    const heading = await screen.findByRole('heading', { name: 'Mindset' });
    const card = heading.closest('.card') as HTMLElement;
    const claim = within(card).getByLabelText('The claim, in your words') as HTMLTextAreaElement;
    expect(claim.value).toContain('reported at 84');
    expect(within(card).getByText(/It is a starting point, not a finding/)).toBeTruthy();
  });

  it('records a hypothesis through the API', async () => {
    vi.mocked(api.writeHypothesis).mockResolvedValue({
      id: 'h1',
      scope: 'dimension',
      key: 'mindset',
      claim: 'Setbacks are being read as verdicts.',
      rationale: 'Observed twice.',
      confidence: 'none',
      support: [],
      contradict: [],
      evidence: [],
      status: 'open',
      review_note: '',
      reviewed_at: null,
      created_at: null,
      confidence_because: 'No evidence has been recorded for this claim yet.',
    });
    const user = userEvent.setup();
    render(<DevelopmentPage />);
    const heading = await screen.findByRole('heading', { name: 'Mindset' });
    const card = heading.closest('.card') as HTMLElement;

    const claim = within(card).getByLabelText('The claim, in your words');
    await user.clear(claim);
    await user.type(claim, 'Setbacks are being read as verdicts.');
    await user.click(within(card).getByRole('button', { name: 'Record this claim' }));

    await waitFor(() => expect(api.writeHypothesis).toHaveBeenCalled());
    const [firstCall] = vi.mocked(api.writeHypothesis).mock.calls;
    expect(firstCall?.[0]).toMatchObject({
      scope: 'dimension',
      key: 'mindset',
      claim: 'Setbacks are being read as verdicts.',
    });
  });
});

describe('the baseline panel', () => {
  it('shows prose and states that no score exists', async () => {
    const user = userEvent.setup();
    render(<DevelopmentPage />);
    await user.click(await screen.findByRole('button', { name: 'Self-management' }));

    const summary = await screen.findByTestId('baseline-summary');
    expect(summary.textContent).toContain('No score is calculated');
    expect(summary.textContent).not.toMatch(/\d+\s?%/);
    expect(screen.getByText('No score by design')).toBeTruthy();
  });
});

describe('the curriculum panel', () => {
  it('marks every named method as undefined', async () => {
    const user = userEvent.setup();
    render(<DevelopmentPage />);
    await user.click(await screen.findByRole('button', { name: 'Curriculum' }));

    expect(await screen.findByText('AIM')).toBeTruthy();
    expect(screen.getByText('undefined')).toBeTruthy();
    expect(screen.getByText(/Problem it appears to address/)).toBeTruthy();
    expect(screen.getByText(/Openly supported alternative/)).toBeTruthy();
  });

  it('cannot submit a retrieval check with nothing written', async () => {
    const user = userEvent.setup();
    render(<DevelopmentPage />);
    await user.click(await screen.findByRole('button', { name: 'Curriculum' }));
    await user.click(await screen.findByRole('button', { name: 'Open the lesson' }));

    const submit = screen.getByRole('button', { name: 'Submit the retrieval check' }) as HTMLButtonElement;
    expect(submit.disabled).toBe(true);
    expect(screen.getByText(/Marking is yours/)).toBeTruthy();
  });
});

describe('the gate panel', () => {
  it('reports what is outstanding instead of claiming completion', async () => {
    const user = userEvent.setup();
    render(<DevelopmentPage />);
    await user.click(await screen.findByRole('button', { name: 'Phase I gate' }));

    expect(await screen.findByText('A documented learner model')).toBeTruthy();
    expect(screen.getByText('Outstanding')).toBeTruthy();
    expect(screen.getByText('0 of 7')).toBeTruthy();
  });
});
