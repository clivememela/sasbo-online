import PageTitle from '../../components/common/PageTitle.jsx';
import { Page } from '../../components/common/Sheet.jsx';
import DodGuard from './DodGuard.jsx';
import AcbTerminationReport from './AcbTerminationReport.jsx';
import { DOD_READ } from './dodRules.js';

/**
 * Debit Order Deductions -> Endings to confirm: the members three unpaids have reached, each membership ended only when
 * a staff member confirms it (Stephne, DOD-22), with a short letter to the member (DOD-24). It was a sheet at the foot
 * of Manage Re-Debits on main (`cbd11dc`, 03.5, with Terminate refused until sign-in); confirming each ending is now a
 * task of its own, so it has its own screen and menu entry. Never shown to an organiser (DOD-14).
 */
export default function DodEndings() {
  return (
    <Page>
      <PageTitle
        title="Endings to confirm"
        subtitle="Members at three unpaids. Each membership ends only when a staff member confirms it, and the member is sent a short letter."
      />
      <DodGuard permissions={DOD_READ}>
        <AcbTerminationReport />
      </DodGuard>
    </Page>
  );
}
