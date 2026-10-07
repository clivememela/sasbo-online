import { useCallback, useEffect, useId, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

import DataState from '../../components/common/DataState.jsx';
import TableScroller from '../../components/table/TableScroller.jsx';
import { useAuth } from '../../auth/useAuth';
import { PERMISSIONS } from '../../auth/permissions';
import { WORKPLACE_OUT_OF_SCOPE, committeeLine } from '../../config/monthEnd.js';
import { EMPTY, MONTHS, formatInt, parseDate } from '../../lib/format.js';
import reportError from '../../lib/reportError.js';
import { locationService } from '../../services/locationService.js';

/**
 * ONE BRANCH'S LOCATION LISTING, from SASBO's workplaces (October build, 5 Oct Show & Tell): the branch, the members
 * at it, and its complement and last visits -- what an organiser prints before a visit. It is `LocationListing`'s
 * layout for a workplace found by its R/A number, which knows no IBT number, cost code, telephone or address -- the
 * workplaces carry none -- and does know its area, region and committee.
 *
 * 🔒 THE MEMBERS ARE A READ OF THEIR OWN, AND NEED `MEMBERS_VIEW` ("listings that show members", held until sign-in):
 * a user who may not see them is told so in one sentence, under the branch, and the rest of the listing still prints.
 */

/** The most of a branch's members one listing prints: five of the server's largest pages. */
export const MEMBERS_PAGE_SIZE = 200;
export const MEMBERS_MAX_PAGES = 5;

/** `2024-03-01` as a listing prints it: `Mar 2024`. */
const monthOf = (iso) => {
  const date = parseDate(iso);
  return date ? `${MONTHS[date.m - 1]} ${date.y}` : EMPTY;
};

/** A member's name as the legacy listing printed it: surname, initials, title. */
const nameOf = (member) => [member.surname, member.initials, member.title].filter(Boolean).join(', ') || EMPTY;

const flag = (on) => (on ? 'Y' : '');

/** A subscription, two decimals; nothing where none is on record. */
const amountOf = (value) => (value == null || value === '' ? '' : Number(value).toFixed(2));

const NOT_A_PAGE = Object.assign(new Error('The members could not be read from this server.'), { retryable: false });

/**
 * The members at one branch, every page of them up to the ceiling, or the sentence that says why they are not shown.
 * `limiter` queues the reads of a batch print so twenty branches never ask at once; `onSettled(id, total)` tells the
 * page this branch is ready to print -- with the members' total, or `null` where none could be listed.
 */
export function BranchMembers({ workplace, limiter, onSettled }) {
  const { status: authStatus, can } = useAuth();
  const location = useLocation();
  const allowed = can(PERMISSIONS.MEMBERS_VIEW);
  const [attempt, setAttempt] = useState(0);
  const [read, setRead] = useState({});
  const question = `${workplace.id}|${attempt}`;

  useEffect(() => {
    if (!allowed) {
      onSettled?.(workplace.id, null);
      return undefined;
    }
    let current = true;
    const asked = `${workplace.id}|${attempt}`;
    const ask = limiter ?? ((task) => task());
    (async () => {
      try {
        const members = [];
        let total = 0;
        for (let page = 0; page < MEMBERS_MAX_PAGES; page += 1) {
          const body = await ask(() => locationService.getBranchMembers(workplace.id, page, MEMBERS_PAGE_SIZE));
          if (!Array.isArray(body?.members)) throw NOT_A_PAGE;
          members.push(...body.members);
          total = Number.isFinite(body.totalElements) ? body.totalElements : members.length;
          if (members.length >= total || body.members.length < MEMBERS_PAGE_SIZE) break;
        }
        if (!current) return;
        setRead({ asked, members, total });
        onSettled?.(workplace.id, total);
      } catch (error) {
        if (!current) return;
        reportError('BranchMembers.read', error);
        setRead({ asked, failure: error });
        onSettled?.(workplace.id, null);
      }
    })();
    return () => {
      current = false;
    };
  }, [allowed, workplace.id, attempt, limiter, onSettled]);

  if (!allowed) {
    const next = encodeURIComponent(`${location.pathname}${location.search}`);
    return (
      <p role="status" className="my-4 rounded-md border border-line bg-surface-2 px-4 py-3 text-sm text-ink">
        {authStatus === 'signed-in' ? (
          'You need permission to see the members at this branch. Ask your administrator if you should have it.'
        ) : (
          <>
            Sign in to see the members at this branch.{' '}
            <Link className="no-print font-medium text-brand-ink underline" to={`/login?next=${next}`}>Sign in</Link>
          </>
        )}
      </p>
    );
  }

  const pending = read.asked !== question;
  if (pending) {
    return <DataState state="loading" layout="row" compact className="my-4 p-0" title="Loading the members at this branch…" />;
  }
  if (read.failure) {
    const outside = read.failure?.body?.code === WORKPLACE_OUT_OF_SCOPE;
    return (
      <DataState
        state="error"
        layout="row"
        compact
        className="my-4 p-0"
        title={outside ? 'This branch is outside your region or area.' : 'The members at this branch could not be loaded.'}
        message={outside ? null : read.failure?.message}
        error={outside ? { retryable: false } : read.failure}
        onRetry={outside ? undefined : () => setAttempt((n) => n + 1)}
      />
    );
  }
  if (read.members.length === 0) {
    return <p className="my-4 text-sm text-ink-muted">No members are on record at this branch.</p>;
  }
  return (
    <>
      <TableScroller label={`Members at ${workplace.name}`} className="my-4">
        <table className="w-full border-collapse text-sm">
          <caption className="sr-only">Members at {workplace.name}</caption>
          <thead>
            <tr className="border-b border-line-strong bg-surface-2 text-left text-xs uppercase tracking-wide text-ink-muted">
              <th scope="col" className="whitespace-nowrap px-2 py-2">Mem No</th>
              <th scope="col" className="px-2 py-2">Name of Member</th>
              <th scope="col" className="px-2 py-2 text-right">Subscr</th>
              <th scope="col" className="px-2 py-2">Emp Num</th>
              <th scope="col" className="px-2 py-2 text-center">Email</th>
              <th scope="col" className="px-2 py-2 text-center">ID</th>
              <th scope="col" className="px-2 py-2 text-center">Cell</th>
              <th scope="col" className="whitespace-nowrap px-2 py-2">Joined</th>
              <th scope="col" className="px-2 py-2 text-center">Susp</th>
            </tr>
          </thead>
          <tbody>
            {read.members.map((member) => (
              <tr key={member.id} className="border-b border-line text-ink">
                <td className="whitespace-nowrap px-2 py-1.5 tabular-nums">{member.membershipNumber}</td>
                <td className="whitespace-nowrap px-2 py-1.5 font-semibold">{nameOf(member)}</td>
                <td className="px-2 py-1.5 text-right tabular-nums">{amountOf(member.monthlySubscription)}</td>
                <td className="px-2 py-1.5 tabular-nums">{member.employeeNumber ?? ''}</td>
                <td className="px-2 py-1.5 text-center">{flag(member.email)}</td>
                <td className="px-2 py-1.5 text-center">{flag(member.identity)}</td>
                <td className="px-2 py-1.5 text-center">{flag(member.cell)}</td>
                <td className="whitespace-nowrap px-2 py-1.5">{monthOf(member.joinedOn)}</td>
                <td className="px-2 py-1.5 text-center">{flag(member.suspended)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </TableScroller>
      {read.total > read.members.length && (
        <p className="text-sm text-ink-muted">
          The first {formatInt(read.members.length)} of {formatInt(read.total)} members are listed.
        </p>
      )}
    </>
  );
}

/** A visit's month, as the branch list prints its ten: `Aug 2026`. */
const lastVisitedOf = (visits) => (visits?.length ? visits.map((visit) => monthOf(visit.visitedOn)).join(', ') : EMPTY);

export default function WorkplaceListing({ listing, limiter, onSettled }) {
  const headingId = useId();
  const [membership, setMembership] = useState(null);
  const w = listing.workplace;

  // One identity for the life of the listing: the members' read depends on it, and a new function each render would
  // read them again each render.
  const settled = useCallback((id, total) => {
    setMembership(total);
    onSettled?.(id, total);
  }, [onSettled]);

  return (
    <article aria-labelledby={headingId} className="print-branch mt-4 rounded-lg bg-surface p-6 shadow-(--shadow-1)">
      <div className="print-branch-head mb-4 border-b border-line-strong pb-3">
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-ink-muted">SASBO Finance Union — Location Listing</p>
        <h3 id={headingId} className="mt-1 text-base font-semibold text-ink">
          {w.name} <span className="font-normal text-ink-muted">· R/A {w.raNumber}</span>
        </h3>
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-1.5 rounded-lg border border-line bg-surface-2 p-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
        {[
          ['Bank', w.employer ?? w.employerPrinted],
          ['R/A No', w.raNumber],
          ['Branch', w.name],
          ['Area', w.area],
          ['Region', w.region],
          ['Committee', committeeLine(w)],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-1.5 text-ink">
            <dt className="shrink-0 font-semibold">{label}:</dt>
            <dd>{value ?? EMPTY}</dd>
          </div>
        ))}
      </dl>
      <BranchMembers workplace={w} limiter={limiter} onSettled={settled} />
      <dl className="space-y-1 border-t border-line pt-4 text-sm">
        {[
          ['Complement', w.staffComplement == null ? EMPTY : formatInt(w.staffComplement)],
          ['Membership', membership == null ? EMPTY : formatInt(membership)],
          ['Last Visited', lastVisitedOf(listing.lastVisited)],
        ].map(([label, value]) => (
          <div key={label} className="flex gap-2 text-ink">
            <dt className="min-w-[160px] shrink-0 font-semibold">{label}:</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </article>
  );
}
