/** Opening reference and line matcher.
 *
 * Only the names, ECO codes and move lines are reference data; every `idea`
 * note here was written for Tessera. The Lichess explorer is linked from the
 * sources page, never scraped, so nothing on this screen is third-party text.
 */
import { useState } from 'react';

import { api, ApiError, type OpeningMatchResponse, type OpeningSummary } from './api';
import { Badge, Card, EmptyState, ErrorNote, SectionTitle } from './ui';
import { groupByFamily, parseUciLine } from './utils';

const muted = 'text-[color:var(--muted)]';

export function OpeningsPanel({ openings }: { openings: OpeningSummary[] }) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<OpeningMatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const parsed = parseUciLine(query);

  async function identify(moves: string[]) {
    if (moves.length === 0) return;
    setPending(true);
    setError(null);
    try {
      setResult(await api.openingMatchByMoves(moves));
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'The matcher could not be reached.');
      setResult(null);
    } finally {
      setPending(false);
    }
  }

  if (openings.length === 0) {
    return (
      <EmptyState
        title="No openings loaded"
        body="The opening reference is empty on this deployment. It is filled from an operator-supplied file, so nothing was guessed on your behalf."
      />
    );
  }

  return (
    <div className="grid gap-4">
      <Card>
        <SectionTitle hint="Two move orders that reach the same position identify the same opening — that is a transposition, not a coincidence.">
          Identify a line
        </SectionTitle>
        <p className={`text-sm ${muted}`}>
          Type the moves in coordinates (from-square, then to-square). Letters and move numbers are fine; notation
          like <span className="font-mono">Nf3</span> cannot be resolved without a board and will be ignored rather
          than guessed at.
        </p>
        <form
          className="mt-3 flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void identify(parsed.moves);
          }}
        >
          <label className="grid gap-1 text-sm" htmlFor="opening-line">
            <span className="font-medium">Move line</span>
            <input
              id="opening-line"
              className="input w-72 font-mono"
              placeholder="e2e4 c7c5 g1f3 d7d6 d2d4"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              aria-describedby="opening-line-note"
            />
          </label>
          <button type="submit" className="btn btn-primary" disabled={pending || parsed.moves.length === 0}>
            {pending ? 'Checking…' : 'Identify'}
          </button>
        </form>
        <p id="opening-line-note" className={`mt-2 text-xs ${muted}`} role="status">
          {parsed.note ?? `${parsed.moves.length} move${parsed.moves.length === 1 ? '' : 's'} read.`}
        </p>

        {error ? <div className="mt-3"><ErrorNote message={error} /></div> : null}

        {result ? (
          <div className="mt-3" role="status" aria-live="polite">
            {result.matched ? (
              <ul className="grid gap-2">
                {result.matches.map((match) => (
                  <li key={`${match.eco}-${match.moves_san}`} className="flex flex-wrap items-center gap-2 text-sm">
                    <Badge>{match.eco}</Badge>
                    <span className="font-medium">{match.name}</span>
                    <span className={`font-mono text-xs ${muted}`}>{match.moves_san}</span>
                  </li>
                ))}
                {result.matches.length > 1 ? (
                  <li className={`text-xs ${muted}`}>
                    More than one catalogued opening fits this prefix. The exact line is listed first and the others
                    are lines it can become.
                  </li>
                ) : null}
              </ul>
            ) : (
              <p className={`text-sm ${muted}`}>{result.message}</p>
            )}
          </div>
        ) : null}
      </Card>

      {groupByFamily(openings).map((group) => (
        <section key={group.family} aria-labelledby={`family-${group.family}`}>
          <h3 id={`family-${group.family}`} className="mb-2 text-sm font-semibold uppercase tracking-wide">
            {group.family}
          </h3>
          <ul className="grid gap-3 md:grid-cols-2">
            {group.items.map((opening) => (
              <li key={opening.id}>
                <Card>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h4 className="font-semibold">{opening.name}</h4>
                    <Badge>{opening.eco}</Badge>
                  </div>
                  <p className={`mt-1 font-mono text-xs ${muted}`}>{opening.moves_san}</p>
                  <p className={`mt-2 text-sm ${muted}`}>{opening.idea}</p>
                  <p className={`mt-2 text-xs ${muted}`}>
                    {opening.plies} plies catalogued. Reference line, original note.
                  </p>
                  <button
                    type="button"
                    className="btn mt-3"
                    onClick={() => {
                      setQuery(opening.moves_uci);
                      void identify(opening.moves_uci.split(' '));
                    }}
                  >
                    Check this line
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
