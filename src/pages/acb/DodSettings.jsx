import PageTitle from '../../components/common/PageTitle.jsx';
import { Page } from '../../components/common/Sheet.jsx';
import { PERMISSIONS } from '../../auth/permissions';
import DodGuard from './DodGuard.jsx';
import DodCodes from './DodCodes.jsx';
import DodCalendar from './DodCalendar.jsx';
import DodRates from './DodRates.jsx';
import DodBankDay from './DodBankDay.jsx';

/**
 * Debit Order Deductions -> Settings (DOD_SETTINGS: the Chief Financial Officer and a system administrator,
 * `contracts/permissions.md`): the bank's return codes, the non-working days, the subscription rates, and moving a
 * bank's members to a new debit day. Each section loads and fails on its own, so one that cannot be read leaves the
 * others usable.
 */
export default function DodSettings() {
  return (
    <Page>
      <PageTitle title="Settings" subtitle="Debit order settings: the bank's return codes, non-working days, rates and debit days" />
      <DodGuard permissions={[PERMISSIONS.DOD_SETTINGS]}>
        <div className="max-w-5xl">
          <DodCodes />
          <DodCalendar />
          <DodRates />
          <DodBankDay />
        </div>
      </DodGuard>
    </Page>
  );
}
