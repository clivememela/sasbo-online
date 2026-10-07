import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { monthLabel } from '../../config/monthEnd.js';
import reportError from '../../lib/reportError.js';
import { failureOf, takenNewestFirst } from './monthEndRules.js';
import useMonths from './useMonths.js';

/**
 * THE MONTH A SENDING SCREEN WORKS ON -- a TAKEN month, and only a taken one: a pack or a file is made from a month's
 * newest take, never from the open month (`contracts/monthend-api.md`). Chosen from the server's months (MD55), kept in
 * the address (`?month=`) so the page can be sent to somebody as it is, and the newest taken when none is asked.
 *
 * `noneTaken` is the server saying no month has been taken at all -- the screens' empty state, asked of nobody.
 */
export default function useTakenMonth(context) {
  const { months, pending, failure, retry } = useMonths(context);
  const [params, setParams] = useSearchParams();
  const asked = params.get('month') ?? '';
  const taken = months ? takenNewestFirst(months) : [];
  const month = asked || taken[0]?.month || '';
  const choices = [
    ...taken.map((record) => ({ value: record.month, label: `${monthLabel(record.month)} — taken` })),
    // A month asked for that was not taken is kept as a choice by its name alone: the server says what it is.
    ...(asked && !taken.some((record) => record.month === asked) ? [{ value: asked, label: monthLabel(asked) }] : []),
  ];
  return {
    month,
    choices,
    pending,
    failure,
    retry,
    noneTaken: Boolean(months) && taken.length === 0 && !asked,
    choose: (value) => setParams({ month: value }, { replace: true }),
  };
}

/**
 * ONE READ OF A MONTH'S ANSWER, KEPT WHILE IT IS READ AGAIN -- after a pack is produced, a file made, an e-mail sent --
 * so a refresh never blanks the screen to *loading*. `pending` is the first read of a month; `refreshing` a later one,
 * the answer in hand still shown. An answer that is not `shapeOf`'s is *not available* (MV-36), never an empty list.
 *
 * @param {(month: string) => Promise<unknown>} read  a service read, defined once at module level
 * @param {string} month
 * @param {(answer: unknown) => object|null} shapeOf
 * @param {string} context   what a failure is reported as
 * @param {string} notAvailable  the sentence for an answer of another shape, or a server without the route
 */
export function useMonthAnswer(read, month, shapeOf, context, notAvailable) {
  const [attempt, setAttempt] = useState(0);
  const [got, setGot] = useState({ month: null, attempt: -1, answer: null, failure: null });
  useEffect(() => {
    if (!month) return undefined;
    let current = true;
    read(month)
      .then((body) => {
        const answer = shapeOf(body);
        if (current) setGot({ month, attempt, answer, failure: answer ? null : failureOf(null, notAvailable) });
      })
      .catch((error) => {
        reportError(context, error);
        if (!current) return;
        // A refresh that fails keeps the answer in hand -- and says it could not be read again.
        setGot((was) => ({ month, attempt, answer: was.month === month ? was.answer : null,
          failure: failureOf(error, notAvailable) }));
      });
    return () => {
      current = false;
    };
  }, [read, month, attempt, shapeOf, context, notAvailable]);

  const fresh = got.month === month && got.attempt === attempt;
  const answer = got.month === month ? got.answer : null;
  return {
    answer,
    failure: fresh ? got.failure : null,
    pending: Boolean(month) && !fresh && !answer,
    refreshing: Boolean(month) && !fresh && Boolean(answer),
    reload: () => setAttempt((n) => n + 1),
  };
}
