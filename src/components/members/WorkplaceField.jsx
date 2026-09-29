import { useEffect, useState } from 'react';

import reportError from '../../lib/reportError';
import { cn } from '../../lib/utils';
import { workplaceService } from '../../services/workplaceService';
import { Button, SearchableSelect, TextInput } from '../form';
import LoadFailureFrame from '../form/LoadFailureFrame';
import { FILLABLE, NOT_AVAILABLE, WORKPLACE_SEARCH, notHere, workplaceResults } from '../../utils/workplaces';

/** card.css `.field__label`: the small capitals every label on these screens wears. */
const LABEL = 'text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted';
const SAID = 'text-sm text-ink-muted';

/**
 * THE MEMBER'S WORKPLACE -- month end `01.3`, on capture's and the record's Employment tab.
 *
 * The employer is chosen from SASBO's list, then the workplace is found BY THE SERVER, by its name or its R/A number
 * (MR-PERF-12): nothing is asked below the second character, one question goes after a pause in typing, and an answer
 * that arrives after a newer question is DROPPED -- each question's effect is cleaned up when the next one is typed,
 * and only an answer stamped with the current question is shown. It is never a list of 5,507.
 *
 * Choosing one shows its R/A number, area and committee -- read-only, with where they came from (MD28) -- and hands the
 * row to the page, which holds only its id (the save names a workplace by `workplaceId` and nothing else, BR66).
 *
 * THE OFFER is the page's to compute (`workplaceFill`, `utils/workplaces.js`) and this control's to ask: *Fill "Bank
 * Where Employed" and "Bank Branch" from this workplace?* Never done silently; declining leaves both as they are.
 *
 * FOUR STATES, from `source` (`useWorkplaceSource`): loading -- the employer field says so; ready; not available --
 * with the sentence that says why, never an empty control; failed -- with Try again, never "none". A member with no
 * workplace is a value, said as one: *No workplace on record*.
 *
 * @param {object}   [source]   `useWorkplaceSource`'s answer. Without one the control only SHOWS (the record, read).
 * @param {object}   [current]  what to show as the member's workplace: `{ workplace }` · `{ none }` · `{ loading }` ·
 *                              `{ why }` · `{ error, retry }` -- or nothing, before a capture has chosen one
 * @param {Function} [onChoose] `(workplace) => void`, when a found workplace is chosen
 * @param {Function} [onRemove] `() => void` -- capture only, where no workplace is a member's to have yet
 * @param {object}   [fill]     the fields the offer would fill, `{ bankName?, branch? }`, with `onFill` and `onDecline`
 * @param {string}   [error]    the save's refusal of the workplace (WORKPLACE_UNKNOWN), in the server's words
 */
export default function WorkplaceField({ source, current, onChoose, onRemove, fill = {}, onFill, onDecline, error, className }) {
  const [employer, setEmployer] = useState('');
  const [term, setTerm] = useState('');
  const [settled, setSettled] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [answer, setAnswer] = useState(null);

  const search = term.trim();
  const question = employer && search.length >= WORKPLACE_SEARCH.from ? JSON.stringify([employer, search]) : null;

  // The pause: a question is only asked once typing has stopped on it.
  useEffect(() => {
    if (!question) return undefined;
    const timer = setTimeout(() => setSettled(question), WORKPLACE_SEARCH.pauseMs);
    return () => clearTimeout(timer);
  }, [question]);

  // What is being asked NOW -- nothing while the typing has moved past the last question that settled.
  const asked = question && settled === question ? `${question}${attempt}` : null;

  useEffect(() => {
    if (!asked) return undefined;
    let left = false;
    const [wanted, text] = JSON.parse(question);
    workplaceService.getWorkplaces({ employer: wanted, search: text, page: 0, size: WORKPLACE_SEARCH.size })
      .then((page) => {
        if (!left) setAnswer({ asked, ...workplaceResults(page) });
      })
      .catch((failure) => {
        if (left) return;
        if (!notHere(failure)) reportError('workplaces.search', failure);
        setAnswer({ asked, ...(notHere(failure) ? { why: NOT_AVAILABLE.NOT_HERE } : { failure }) });
      });
    // 🔑 THE TICKET: a newer question cleans this one up, and its answer -- however late -- is dropped.
    return () => {
      left = true;
    };
  }, [asked, question]);

  const found = answer?.asked === asked ? answer : null;
  const rows = found?.page?.content ?? [];
  const total = found?.page?.totalElements ?? rows.length;
  const said = !asked || found?.failure ? ''
    : !found ? 'Searching…'
      : found.why ? `Not available. ${found.why}`
        : !total ? `No workplace matches “${search}”.`
          : total > rows.length ? `${total} found — the first ${rows.length} are shown. Type more to narrow them.`
            : `${total} found.`;

  const workplace = current?.workplace;
  const offered = Object.keys(fill);
  const Group = source ? 'fieldset' : 'div';
  const Title = source ? 'legend' : 'p';

  return (
    <Group className={cn('grid min-w-0 gap-y-3.5', className)}>
      <Title className={LABEL}>Workplace</Title>

      {workplace ? (
        <div className="grid gap-1.5 border-y border-line py-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-base font-medium text-ink">{workplace.name}</p>
            {onRemove && <Button variant="ghost" size="sm" onClick={onRemove} aria-label={`Remove ${workplace.name}`}>Remove</Button>}
          </div>
          <dl className="grid grid-cols-3 gap-3 max-sm:grid-cols-1">
            {[
              ['R/A number', workplace.raNumber],
              ['Area', workplace.area],
              ['Committee', [workplace.committee, workplace.committeeName].filter(Boolean).join(' · ')],
            ].map(([name, value]) => (
              <div key={name} className="min-w-0">
                <dt className={LABEL}>{name}</dt>
                <dd className="text-base font-medium text-ink tabular-nums [overflow-wrap:anywhere]">{value || '—'}</dd>
              </div>
            ))}
          </dl>
          <p className="text-xs text-ink-muted">From SASBO’s list of workplaces. {source?.workplacesFrom ?? current.from}</p>
        </div>
      ) : current?.failure ? (
        <LoadFailureFrame failed label="The member’s workplace" loadError={current.failure} onRetryLoad={current.retry} />
      ) : current && (
        <p className={current.none ? 'text-base font-medium text-ink' : SAID} role={current.none ? undefined : 'status'}>
          {current.none ? 'No workplace on record' : current.why ? `Not available. ${current.why}` : 'Loading…'}
        </p>
      )}

      {error && <p role="alert" className="text-xs text-status-suspended">{error}</p>}

      {offered.length > 0 && (
        <div className="rounded-lg border border-line-strong bg-surface-2 p-3 text-sm text-ink-muted">
          <p className="font-medium text-ink">Fill {offered.map((key) => `"${FILLABLE[key]}"`).join(' and ')} from this workplace?</p>
          <p>{offered.map((key) => fill[key]).join(' · ')}</p>
          <div className="mt-2 flex gap-2">
            <Button variant="primary" size="sm" onClick={onFill}>Fill</Button>
            <Button size="sm" onClick={onDecline}>No thanks</Button>
          </div>
        </div>
      )}

      {source && (source.state === 'failed' ? (
        <LoadFailureFrame failed label="SASBO’s workplaces" loadError={source.error} onRetryLoad={source.retry} />
      ) : source.state === 'unavailable' ? (
        <p className={SAID} role="status">Not available. {source.why}</p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3.5 max-sm:grid-cols-1">
            <SearchableSelect
              label="Employer"
              options={source.employers}
              optionValue="id"
              optionLabel="name"
              value={employer}
              onChange={setEmployer}
              loading={source.state === 'loading'}
              hint={source.employersFrom}
            />
            <TextInput
              label="Find the workplace"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              disabled={!employer}
              maxLength={WORKPLACE_SEARCH.maxLength}
              hint={employer ? 'By its name or R/A number.' : 'Choose the employer first.'}
            />
          </div>
          {rows.length > 0 && (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {rows.map((row) => (
                <li key={row.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setTerm('');
                      onChoose?.(row);
                    }}
                    className="touch-size flex w-full flex-wrap items-center justify-between gap-x-3 px-3 py-2 text-left text-ink hover-hover:hover:bg-brand-soft focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-ring"
                  >
                    <span className="font-medium">{row.name}</span>
                    <span className="text-xs text-ink-muted tabular-nums">R/A {row.raNumber} · Area {row.area || '—'}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {found?.failure && (
            <LoadFailureFrame
              failed
              label={`The workplaces for “${search}”`}
              loadError={found.failure}
              onRetryLoad={() => setAttempt((n) => n + 1)}
            />
          )}
          <p className="text-xs text-ink-muted" role="status">{said}</p>
        </>
      ))}
    </Group>
  );
}
