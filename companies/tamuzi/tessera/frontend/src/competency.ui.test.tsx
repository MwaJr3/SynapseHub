// @vitest-environment jsdom
/**
 * The competency screen, rendered for real.
 *
 * The tests that matter are the ones a logic test cannot see:
 *
 * * a concept with no evidence is drawn as "not measured" and an em dash — never
 *   as a 0% bar, because an empty bar is a claim about ability that nothing supports;
 * * the stored mastery and the evidence appear as two separate numbers, and a
 *   disagreement between them is stated with its size;
 * * a gap carries the reason and the next step that the server computed, not a
 *   bare label;
 * * opening the observations fetches them once, and the panel reports the weight
 *   each one carried.
 */
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { CompetencyDetail, CompetencyOverview, CompetencyRow } from './api';
import { api, ApiError } from './api';
import { CompetencyPage } from './competency';

vi.mock('./api', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./api')>();
  return {
    ...actual,
    api: {
      competency: vi.fn(),
      competencyDetail: vi.fn(),
    },
  };
});

function row(overrides: Partial<CompetencyRow> = {}): CompetencyRow {
  return {
    concept_id: 'py.variables',
    title: 'Variables and names',
    subject: 'Python',
    verdict: 'no_evidence',
    verdict_reason: 'No graded attempt on this concept yet. Unmeasured is not the same as weak, so no score is shown.',
    evidence: {
      observations: 0,
      auto: 0,
      self: 0,
      effective: 0,
      score: null,
      confidence: 0,
      recent_score: null,
      last_observed_at: null,
      first_observed_at: null,
      formats: {},
    },
    mastery: null,
    disagreement: null,
    gaps: [],
    primary_gap: null,
    ...overrides,
  };
}

function overview(overrides: Partial<CompetencyOverview> = {}): CompetencyOverview {
  const concepts = [row()];
  return {
    as_of: '2026-10-27T10:00:00+00:00',
    policy:
      'A verdict comes only from graded attempts. Mastery is the scheduler\u2019s stored estimate and is shown beside it, never merged with it.',
    thresholds: {
      half_life_days: 30,
      secure_min_effective: 3,
      secure_min_score: 0.8,
      developing_min_effective: 1.5,
      developing_min_score: 0.6,
      disagreement_gap: 0.25,
    },
    counts: {
      concepts: 1,
      with_evidence: 0,
      without_evidence: 1,
      observations: 0,
      server_graded: 0,
      self_graded: 0,
    },
    verdicts: { no_evidence: 1, emerging: 0, developing: 0, secure: 0 },
    coverage_note: '0 of 1 visible concepts have at least one graded attempt. 1 have none and are reported as unmeasured.',
    calibration: {
      answered: 0,
      accuracy: null,
      mean_confidence: null,
      overconfidence: null,
      buckets: [],
      reason: 'No multiple-choice answers yet, so there is no confidence to compare with anything.',
    },
    gaps: [],
    gaps_total: 0,
    concepts,
    ...overrides,
  };
}

const MEASURED: CompetencyRow = row({
  verdict: 'developing',
  verdict_reason: '1.0 weighted observation averaging 0.70.',
  evidence: {
    observations: 2,
    auto: 1,
    self: 1,
    effective: 1.5,
    score: 0.7,
    confidence: 0.39,
    recent_score: 0.7,
    last_observed_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    first_observed_at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
    formats: { multiple_choice: { attempts: 1, mean_score: 1 }, free_recall: { attempts: 1, mean_score: 0.4 } },
  },
  mastery: {
    value: 0.62,
    retained: 0.58,
    scale_min: 0,
    scale_max: 1,
    tier: 'developing',
    reps: 3,
    lapses: 1,
    stability_days: 4.2,
    last_reviewed_at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
    next_review_at: new Date(Date.now() + 86_400_000).toISOString(),
    source: 'scheduler state; it only moves on graded evidence',
  },
  disagreement: {
    contested: true,
    gap: 0.31,
    direction: 'optimistic',
    reason: 'The stored mastery (62% of its scale) is 31 points above the weighted score of the answers (70%).',
  },
});

const DETAIL: CompetencyDetail = {
  ...MEASURED,
  observation_log: [
    {
      id: 'o1',
      source: 'retrieval',
      format: 'free_recall',
      score: 0.4,
      weight: 0.5,
      graded_by: 'self',
      at: new Date(Date.now() - 3 * 86_400_000).toISOString(),
      recency: 0.93,
    },
    {
      id: 'o2',
      source: 'quiz',
      format: 'multiple_choice',
      score: 1,
      weight: 1,
      graded_by: 'auto',
      at: new Date(Date.now() - 9 * 86_400_000).toISOString(),
      recency: 0.81,
    },
  ],
  what_would_change_it: [
    'Reach 3.0 recency-weighted observations at 0.80 or better, with at least one answer the server graded.',
  ],
  next_interval_days: 5.1,
};

beforeEach(() => {
  vi.mocked(api.competency).mockResolvedValue(overview());
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

async function renderPage(data: CompetencyOverview = overview()) {
  vi.mocked(api.competency).mockResolvedValue(data);
  render(<CompetencyPage />);
  await screen.findByRole('heading', { name: 'What you have shown, and what is unknown' });
}

describe('CompetencyPage', () => {
  it('draws an unmeasured concept as not measured, never as 0%', async () => {
    await renderPage();

    const item = screen.getByText('Variables and names').closest('li')!;
    expect(within(item).getByText('Not measured')).toBeTruthy();
    // Both the weighted score and the stored mastery are em dashes: there is
    // nothing to average and no model state to report.
    expect(within(item).getAllByText('—').length).toBe(2);
    expect(within(item).queryByText('0%')).toBeNull();
    expect(within(item).getByText('never')).toBeTruthy();
  });

  it('states the coverage instead of implying a score', async () => {
    await renderPage();
    expect(screen.getByTestId('coverage-note').textContent).toContain('reported as unmeasured');
    expect(screen.getByText(/An unmeasured concept is not scored zero/)).toBeTruthy();
  });

  it('keeps mastery and evidence in separate columns', async () => {
    await renderPage(overview({ concepts: [MEASURED], verdicts: { no_evidence: 0, emerging: 0, developing: 1, secure: 0 } }));

    const item = screen.getByText('Variables and names').closest('li')!;
    // Evidence: 70%. Mastery: 62%. Two numbers, two labels, no blend of the two.
    expect(within(item).getByText('70%')).toBeTruthy();
    expect(within(item).getByText('62%')).toBeTruthy();
    expect(within(item).getByText('Weighted score')).toBeTruthy();
    expect(within(item).getByText('Stored mastery')).toBeTruthy();
  });

  it('reports a disagreement between the model and the answers, with its size', async () => {
    await renderPage(overview({ concepts: [MEASURED] }));
    expect(screen.getByTestId('disagreement-py.variables').textContent).toContain('31 points above');
  });

  it('opens the observations on request and shows what each one weighed', async () => {
    vi.mocked(api.competencyDetail).mockResolvedValue(DETAIL);
    await renderPage(overview({ concepts: [MEASURED] }));

    await userEvent.click(screen.getByRole('button', { name: 'Why?' }));
    const panel = await screen.findByRole('region', { name: 'Evidence for Variables and names' });
    expect(api.competencyDetail).toHaveBeenCalledWith('py.variables');

    expect(within(panel).queryByText('self graded only')).toBeNull();
    expect(within(panel).getByText('free recall')).toBeTruthy();
    expect(within(panel).getByText('0.5')).toBeTruthy();
    expect(within(panel).getAllByText('you').length).toBe(1);
    expect(within(panel).getAllByText('server').length).toBeGreaterThan(0);
    expect(within(panel).getByText(/3.0 recency-weighted observations/)).toBeTruthy();

    // Closing is free: no second request for the same concept.
    await userEvent.click(screen.getByRole('button', { name: 'Hide the numbers' }));
    await waitFor(() => expect(screen.queryByRole('region', { name: /Evidence for/ })).toBeNull());
    expect(api.competencyDetail).toHaveBeenCalledTimes(1);
  });

  it('shows a gap with the reason and the next step, not just a label', async () => {
    const gap = {
      kind: 'no_evidence',
      severity: 0.35,
      reason: 'No graded attempt on this concept. It is unmeasured, not weak.',
      action: 'Answer one multiple-choice question or one review prompt on it.',
      type: 'concept' as const,
      concept_id: 'py.variables',
      label: 'Variables and names',
    };
    await renderPage(overview({ gaps: [gap], gaps_total: 1 }));

    const item = screen.getByTestId('gap-0');
    expect(within(item).getByText('No graded attempt on this concept. It is unmeasured, not weak.')).toBeTruthy();
    expect(within(item).getByText(/Answer one multiple-choice question/)).toBeTruthy();
    expect(screen.getByText('showing 1 of 1')).toBeTruthy();
  });

  it('lists the unscored baseline axes inside the gap that names them', async () => {
    const gap = {
      kind: 'unmeasured_axes',
      severity: 0.5,
      reason: '10 of 10 baseline axes have no score (Mindset, Retrieval). Nothing has been estimated in their place.',
      action: 'Record a result from the instrument, or reassess the report you have.',
      type: 'axes' as const,
      axes: [
        { axis: 'dimension', name: 'mindset', label: 'Mindset', instrument: 'icanstudy-dimensions' },
        { axis: 'process', name: 'retrieval', label: 'Retrieval', instrument: 'icanstudy-processes' },
      ],
    };
    await renderPage(overview({ gaps: [gap], gaps_total: 1 }));

    const axes = screen.getByRole('list', { name: 'Axes without a score' });
    expect(within(axes).getByText(/Mindset/)).toBeTruthy();
    expect(within(axes).getByText(/icanstudy-processes/)).toBeTruthy();
  });

  it('shows nothing to calibrate when nothing has been answered', async () => {
    await renderPage();
    expect(screen.getByText(/No multiple-choice answers yet/)).toBeTruthy();
    expect(screen.queryByText('Mean confidence')).toBeNull();
  });

  it('computes the calibration panel from the numbers it was given', async () => {
    await renderPage(
      overview({
        calibration: {
          answered: 4,
          accuracy: 0.5,
          mean_confidence: 0.75,
          overconfidence: 0.25,
          buckets: [
            { confidence: 3, answered: 1, accuracy: 1 },
            { confidence: 5, answered: 3, accuracy: 0.33 },
          ],
          reason: 'Confidence is what you said before answering, accuracy is what happened.',
        },
      }),
    );
    expect(screen.getByText('More sure than right')).toBeTruthy();
    expect(screen.getByText('+25')).toBeTruthy();
    expect(screen.queryByText('4 / 5')).toBeNull();
    expect(screen.getByText('5 / 5')).toBeTruthy();
    expect(screen.getByText('3 / 5')).toBeTruthy();
  });

  it('reports a failed load instead of an empty screen', async () => {
    vi.mocked(api.competency).mockRejectedValue(new ApiError('not signed in', 401));
    render(<CompetencyPage />);
    expect(await screen.findByText('Something went wrong')).toBeTruthy();
    expect(screen.getByText('not signed in')).toBeTruthy();
  });

  it('offers an empty state when there is nothing to measure', async () => {
    await renderPage(
      overview({
        concepts: [],
        counts: {
          concepts: 0,
          with_evidence: 0,
          without_evidence: 0,
          observations: 0,
          server_graded: 0,
          self_graded: 0,
        },
        verdicts: { no_evidence: 0, emerging: 0, developing: 0, secure: 0 },
      }),
    );
    expect(screen.getByText('No concepts yet')).toBeTruthy();
  });
});
