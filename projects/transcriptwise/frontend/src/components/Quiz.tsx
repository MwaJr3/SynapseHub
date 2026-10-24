import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, Check, CircleHelp, ListChecks, RotateCcw } from 'lucide-react'
import { toast } from 'sonner'
import { post, request } from '../lib/api'
import type { Question, QuizResult, Transcript } from '../lib/types'
import { cx, dateLabel, message } from '../lib/utils'
import { EmptyState, Notice, Spinner } from './ui'
import { RichText } from './RichText'
import { SourceRefs } from './SourceRefs'
import { useRefreshWorkspace } from './GuideEditors'

export function Quiz({
  analysisId,
  questions,
  transcript,
  onSegment,
  onGenerate,
}: {
  analysisId: string
  questions: Question[]
  transcript?: Transcript
  onSegment: (id: string) => void
  onGenerate: () => void
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<QuizResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const refresh = useRefreshWorkspace()
  const { data: history } = useQuery({
    queryKey: ['quiz-attempts', analysisId],
    queryFn: () =>
      request<
        {
          id: string
          score: number | null
          result: Omit<QuizResult, 'id' | 'created_at'>
          created_at: string
        }[]
      >(`/analyses/${analysisId}/quiz/attempts`),
  })
  if (!questions.length)
    return (
      <EmptyState
        icon={<CircleHelp size={30} />}
        title="A little recall goes a long way."
        description="Revision questions haven’t been generated for this guide. Create a source-based set to test your understanding."
        action={
          <button className="button primary" onClick={onGenerate}>
            Generate revision questions <ArrowRight size={15} />
          </button>
        }
      />
    )
  const answered = questions.filter((q) => answers[q.id]?.trim()).length
  const submit = async () => {
    if (answered < questions.length) {
      toast.info('Answer every question first, then compare your understanding with the source.')
      return
    }
    setBusy(true)
    setError('')
    try {
      setResult(await post<QuizResult>(`/analyses/${analysisId}/quiz/attempts`, { answers }))
      refresh()
    } catch (e) {
      setError(message(e))
    } finally {
      setBusy(false)
    }
  }
  return (
    <div className="quiz">
      <div className="learning-section-intro">
        <span className="learning-section-symbol">
          <ListChecks size={21} />
        </span>
        <div>
          <h3>A little retrieval. A lot of learning.</h3>
          <p>Answer without looking, then check your thinking against the source.</p>
        </div>
      </div>
      {result ? (
        <>
          <div className="quiz-result-banner">
            <span className="result-check">
              <Check size={23} />
            </span>
            <div>
              <h3>
                {result.score === null
                  ? 'Now, compare your understanding.'
                  : `${result.correct_count} of ${result.objective_count} objective answers correct`}
              </h3>
              <p>
                {result.score === null
                  ? 'These open-ended questions need your judgment. Review each model answer below.'
                  : `${result.score}% on automatically graded questions. Review open answers yourself.`}
              </p>
            </div>
            <button
              className="button secondary small"
              onClick={() => {
                setResult(null)
                setAnswers({})
              }}
            >
              <RotateCcw size={14} />
              Practice again
            </button>
          </div>
          <p className="small-text muted">{result.notice}</p>
          <div className="question-list">
            {result.questions.map((q, i) => (
              <article className="question-review" key={q.id}>
                <div className="question-number">{String(i + 1).padStart(2, '0')}</div>
                <div>
                  <div
                    className={cx(
                      'badge',
                      q.correct === true ? 'success' : q.correct === false ? 'error' : 'neutral',
                    )}
                  >
                    {q.correct === null ? 'SELF-ASSESSMENT' : q.correct ? 'CORRECT' : 'REVISIT THIS ONE'}
                  </div>
                  <h3>{q.question}</h3>
                  <div className="submitted-answer">
                    <span>Your response</span>
                    <p>{q.submitted}</p>
                  </div>
                  <div className="expected-answer">
                    <span>Source-based answer</span>
                    <RichText>{q.answer}</RichText>
                    {q.explanation && <p className="muted">{q.explanation}</p>}
                  </div>
                  <SourceRefs refs={q.refs} transcript={transcript} onSegment={onSegment} />
                </div>
              </article>
            ))}
          </div>
        </>
      ) : (
        <>
          <div className="quiz-meter">
            <span>
              {answered} of {questions.length} answered
            </span>
            <span>No rush. Understanding is the goal.</span>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              submit()
            }}
          >
            <div className="question-list">
              {questions.map((q, i) => (
                <fieldset className="quiz-question" key={q.id}>
                  <legend>
                    <span className="question-number">{String(i + 1).padStart(2, '0')}</span>
                    <span>
                      {q.question}
                      <small>
                        {q.kind === 'multiple_choice'
                          ? 'CHOOSE ONE'
                          : q.kind === 'true_false'
                            ? 'TRUE OR FALSE'
                            : q.kind === 'application'
                              ? 'PUT IT INTO PRACTICE'
                              : 'IN YOUR OWN WORDS'}
                      </small>
                    </span>
                  </legend>
                  {q.kind === 'multiple_choice' || q.kind === 'true_false' ? (
                    <div className="quiz-options">
                      {(q.kind === 'true_false' ? ['True', 'False'] : q.options).map((option, n) => (
                        <label className={cx(answers[q.id] === option && 'selected')} key={option}>
                          <input
                            type="radio"
                            name={q.id}
                            value={option}
                            checked={answers[q.id] === option}
                            onChange={() => setAnswers({ ...answers, [q.id]: option })}
                          />
                          <span className="answer-letter">{String.fromCharCode(65 + n)}</span>
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <textarea
                      aria-label={`Your answer to question ${i + 1}`}
                      placeholder="Think it through. Explain it in your own words…"
                      rows={4}
                      maxLength={5000}
                      value={answers[q.id] || ''}
                      onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    />
                  )}
                </fieldset>
              ))}
            </div>
            {error && <Notice variant="error">{error}</Notice>}
            <div className="quiz-submit">
              <p>
                Answers stay hidden until you submit.
                <br />
                Open responses are self-assessed, not AI-graded.
              </p>
              <button className="button primary" disabled={busy || answered !== questions.length}>
                {busy ? (
                  <Spinner label="Checking answers…" small />
                ) : (
                  <>
                    Check my understanding
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </>
      )}
      {!!history?.length && (
        <details className="quiz-history">
          <summary>
            Previous practice · {history.length} {history.length === 1 ? 'attempt' : 'attempts'}
          </summary>
          {history.map((attempt) => (
            <button
              key={attempt.id}
              onClick={() =>
                setResult({ ...attempt.result, id: attempt.id, created_at: attempt.created_at } as QuizResult)
              }
            >
              <span>Practice on {dateLabel(attempt.created_at)}</span>
              <span>
                {attempt.score === null ? 'Self-assessed' : `${attempt.score}% objective score`}
                <ArrowRight size={13} />
              </span>
            </button>
          ))}
        </details>
      )}
    </div>
  )
}
