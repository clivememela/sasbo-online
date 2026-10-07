import { useEffect, useRef, useState } from 'react';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import Table from '../../components/table/Table.jsx';
import { Button } from '../../components/form';
import reportError from '../../lib/reportError.js';
import saveFile from '../../lib/saveFile.js';
import { dodService } from '../../services/dodService.js';
import { messageOf } from '../../services/parseApiError.js';
import { LETTER_TEMPLATE_LABEL } from './acbRunRules.js';
import { readFailure } from './dodRules.js';

/**
 * When each letter goes -- the server's reason-to-letter table (`contracts/dod-api.md` §6), in an administrator's words.
 * Keyed by the server's `letterTemplates`, which `dodLetters.test.js` holds this to, so a new letter is never nameless.
 */
export const LETTER_WHEN = Object.freeze({
  RE_DEBIT: 'Not provided for: the debit is presented again',
  PAYMENT_STOPPED: 'The member stopped the payment: never re-debited',
  NO_AUTHORITY: 'No authority to debit: never re-debited',
  ACCOUNT_CLOSED: 'The account is closed: new banking details are asked for',
  RETURN_DEBIT: 'The account is frozen, or its number is invalid',
  MEMBERSHIP_ENDED: 'A staff member confirms an ending after the third unpaid',
});

const LETTERS = Object.keys(LETTER_WHEN).map((template) => ({ template, name: LETTER_TEMPLATE_LABEL[template] ?? template }));

/**
 * Debit Order Deductions -> Letters: a specimen of each letter to members, rendered by the server on the letterhead
 * with invented details from the address to the account -- for the letters review SASBO asked for (DOD-30, DOD-33: "a
 * modern layout", "show it to us"). Nothing reaches a member until that review switches sending on. The specimens are
 * public; the PDF is fetched, then shown from the browser's own copy, so the frame is never another site's page.
 */
export default function DodLetters() {
  const [chosen, setChosen] = useState(null);
  const [specimen, setSpecimen] = useState({ state: 'idle', url: null, file: null, error: null });
  const ticket = useRef(0);

  // The browser's copy is let go when another letter is shown, and when the screen is left.
  useEffect(() => () => { if (specimen.url) URL.revokeObjectURL?.(specimen.url); }, [specimen.url]);

  const show = async (letter) => {
    const mine = ++ticket.current;
    setChosen(letter);
    setSpecimen({ state: 'loading', url: null, file: null, error: null });
    try {
      const file = await dodService.letterSpecimen(letter.template);
      if (mine !== ticket.current) return;
      setSpecimen({ state: 'ready', url: URL.createObjectURL(file.blob), file, error: null });
    } catch (err) {
      reportError('DodLetters.specimen', err);
      if (mine === ticket.current) setSpecimen({ state: 'error', url: null, file: null, error: err });
    }
  };

  const columns = [
    { key: 'name', header: 'Letter', priority: 'essential', cell: (l) => <span className="font-medium">{l.name}</span> },
    { key: 'when', header: 'When it goes', priority: 'essential', nowrap: false, cell: (l) => LETTER_WHEN[l.template] },
    {
      key: 'show', header: 'Specimen', priority: 'essential',
      cell: (l) => (
        <Button onClick={() => show(l)} aria-pressed={chosen?.template === l.template} aria-label={`Show the ${l.name} letter`}>
          Show
        </Button>
      ),
    },
  ];

  return (
    <Page>
      <PageTitle title="Letters" subtitle="A specimen of each debit order letter, with invented details, as a member would receive it" />
      <p className="mt-4 max-w-prose text-sm text-ink-muted">
        Letters are not being sent yet: nothing reaches a member until SASBO has reviewed them.
      </p>
      <div className="max-w-5xl">
        <Sheet className="mt-4">
          <Table caption="The letters to members" columns={columns} rows={LETTERS} rowKey="template" dense />
        </Sheet>
        {chosen && (
          <Sheet className="mt-6" aria-labelledby="dod-specimen-heading">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-6 py-4">
              <h2 id="dod-specimen-heading" className="text-base font-semibold text-ink">{chosen.name} letter</h2>
              {specimen.state === 'ready' && (
                <Button onClick={() => saveFile(specimen.file, `specimen-${chosen.template.toLowerCase()}.pdf`)}>Download</Button>
              )}
            </div>
            <div className="p-4">
              {specimen.state === 'loading' && <p role="status" className="text-sm text-ink-muted">Loading the specimen…</p>}
              {specimen.state === 'error' && (
                <div role="alert" className="flex flex-wrap items-center gap-3 text-sm text-status-suspended">
                  {readFailure(specimen.error, `The specimen could not be loaded. ${messageOf(specimen.error)}`)}
                  {specimen.error?.retryable !== false && <Button size="sm" onClick={() => show(chosen)}>Try again</Button>}
                </div>
              )}
              {specimen.state === 'ready' && (
                <iframe title={`Specimen of the ${chosen.name} letter`} src={specimen.url}
                  className="h-[70dvh] min-h-96 w-full rounded-md border border-line bg-surface" />
              )}
            </div>
          </Sheet>
        )}
      </div>
    </Page>
  );
}
