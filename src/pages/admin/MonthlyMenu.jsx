import { ChartNoAxesCombined, Users } from 'lucide-react';
import { useOutletContext, useSearchParams } from 'react-router-dom';

import Criteria from '../../components/common/Criteria.jsx';
import { NavigationList } from '../../components/common/NavigationCard.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import { Page } from '../../components/common/Sheet.jsx';
import Button from '../../components/form/Button.jsx';
import SelectInput from '../../components/form/SelectInput.jsx';
import { monthLabel } from '../../config/monthEnd.js';
import MonthEndPack from './MonthEndPack.jsx';
import {
  LISTINGS, LISTING_WAITS, MONTH_CRITERION, STATISTICS, TAKE_AGAIN_WAITS, TAKE_WAITS, defaultMonth, monthChoices,
  monthStateOf,
  statisticHref, takenSentence,
} from './monthEndRules.js';
import useMonths from './useMonths.js';

/**
 * THE MONTH END PAGE -- month end `04.1`, at the Monthly Menu's address (MD38): *Admin → Month end*, a card on Admin
 * Membership between Daily and A.C.B., and a leaf of the rail's Admin Menu with nothing under it (BR8).
 *
 * 🔴 IT LISTS WHAT IS BUILT, AND NOTHING ELSE. The nine legacy rows this page carried were nine dead ends -- *Key File
 * Setup* to *Print Membership Summary*, not one with a route. They are gone. What is here (screens.md §0.3):
 *
 *   the month        chosen ONCE, at the top, from the server's months (MD55): a taken month says who took it and
 *                    when, the open month that its figures are read live. The browser's clock decides nothing;
 *   the statistics   six links, each opening its screen for the chosen month (`?month=`), with its plain name and the
 *                    legacy title as its second line;
 *   the pack         the two workbooks, prepared as a job and saved from here (`MonthEndPack`);
 *   the listings     four rows, disabled with their reason -- each names members and refuses until sign-in, so the
 *                    page says so WITHOUT ASKING: the listing route is never called;
 *   *Take the month* for the open month, disabled with its reason, as A.C.B.'s *Approve* is -- the take refuses every
 *                    caller (`IDENTITY_REQUIRED`), so it is never called either.
 *
 * `MonthlyMenu.test.jsx` holds the page, the rail, the Admin page and the route together, and forbids a row that links
 * to the page it is on.
 */
export default function MonthlyMenu({ pollDelaysMs }) {
  const { setSelectedCardHref } = useOutletContext() || {};

  // The months, asked once -- and again only when a person asks (*Try again*).
  const { months, pending, failure, retry } = useMonths('MonthlyMenu.months');

  // The month a person chose -- in the address, as a statistic's screen carries it back here; until they choose, the
  // newest month taken (or the open month, before any is taken).
  const [params, setParams] = useSearchParams();
  const chosen = params.get('month') ?? '';
  const month = chosen || (months ? defaultMonth(months) : '');
  const state = months && month ? monthStateOf(months, month) : null;
  const open = state?.state === 'OPEN';
  const taken = state?.state === 'TAKEN';

  return (
    <Page>
      <PageTitle
        title="Month end"
        subtitle="The month’s statistics, the pack of workbooks made from them, and the listings that wait for sign-in."
      />

      <Criteria className="mt-6" label="The month">
        <SelectInput
          className={MONTH_CRITERION}
          label="Month"
          value={month}
          options={months ? monthChoices(months, chosen) : []}
          loading={pending}
          loadError={failure}
          onRetryLoad={retry}
          onChange={(value) => setParams({ month: value }, { replace: true })}
        />
        {open && (
          <Button variant="primary" disabled aria-describedby="month-end-take-why">Take {monthLabel(month)}</Button>
        )}
        {/* 04.11, MM51: a taken month can be taken again, to correct it -- disabled with its reason, as the take is. */}
        {taken && (
          <Button disabled aria-describedby="month-end-take-why">Take {monthLabel(month)} again</Button>
        )}
      </Criteria>
      {state && (
        <p className="mt-2 max-w-prose text-sm text-ink-muted" data-month-state={state.state}>
          {{
            OPEN: `${monthLabel(month)} is the open month: its figures are read live, as they stand now, until it is taken.`,
            TAKEN: `${monthLabel(month)}: ${takenSentence(state)} Its figures are the month as it stood then.`,
            NOT_TAKEN: `${monthLabel(month)} was not taken, and a past month is read only from what was taken.`,
            NOT_BEGUN: `${monthLabel(month)} has not begun yet.`,
          }[state.state]}
        </p>
      )}
      {(open || taken) && (
        <p id="month-end-take-why" className="mt-1 max-w-prose text-sm text-ink-muted">
          {open ? TAKE_WAITS : TAKE_AGAIN_WAITS}
        </p>
      )}

      <h2 className="mt-8 text-lg font-semibold text-ink">Statistics</h2>
      <NavigationList
        className="mt-3"
        cards={STATISTICS.map((statistic) => ({
          title: statistic.name,
          desc: statistic.legacy,
          href: statisticHref(statistic.key, month),
          icon: ChartNoAxesCombined,
        }))}
        // The rail keeps Month end marked while a statistic of it is open.
        onSelect={() => setSelectedCardHref?.('/admin/monthly-menu')}
      />

      <MonthEndPack month={month} open={open} pollDelaysMs={pollDelaysMs} />

      <h2 className="mt-8 text-lg font-semibold text-ink">Listings of members</h2>
      <p className="mt-0.5 max-w-prose text-sm text-ink-muted" data-listings-wait="">{LISTING_WAITS}</p>
      <NavigationList
        className="mt-3"
        cards={LISTINGS.map((listing) => ({ title: listing.name, desc: listing.legacy, icon: Users, note: 'Waits for sign-in' }))}
      />
    </Page>
  );
}
