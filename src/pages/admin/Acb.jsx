import {
    LucideCalendarRange,
    LucideCalendarCog,
    LucideHandCoins,
    LucideListChecks,
    LucideMails,
    LucidePiggyBank,
    LucideUserX,
} from 'lucide-react';
import PageTitle from "../../components/common/PageTitle.jsx";
import { NavigationList } from "../../components/common/NavigationCard.jsx";
import { Page } from '../../components/common/Sheet.jsx';

/** Any of the three Debit Order permissions -- what reading a run or its unpaids takes (`contracts/dod-api.md` §1). */
const DOD_READ = ['DOD_PREPARE', 'DOD_FILE', 'DOD_SETTINGS'];

/**
 * Debit Order Deductions -- the module once called A.C.B. (SASBO's name since the 5 Oct Show & Tell; "ACB should be
 * replaced by Debit Order", Stephne, DOD-39). Its screens keep their names for now (DOD-37: "For now Yes."), and the
 * address stays `/admin/acb`, which deep links and the decks use.
 *
 * Each card carries the access keys the rail reads (`navAccess.js`): the runs, the unpaids, the endings and the counts
 * are never shown to an organiser (DOD-14); Settings is shown, marked, to anyone it would refuse. Credits stays an
 * option, as SASBO asked, though they no longer run credits (Q10, 2026-09-18; DOD-29: it can follow later).
 */
const cards = [
    {
        title: "Runs",
        desc: "Debit Order Runs: prepare, approve, the bank file, the bank's returns and closing",
        href: "/admin/acb/runs",
        icon: LucideCalendarRange,
        permission: DOD_READ,
        hideWithout: true,
    },
    {
        title: "Debits",
        desc: "Manage Re-Debits: each unpaid's decision, suspensions, held letters and banking",
        href: "/admin/acb/debits",
        icon: LucidePiggyBank,
        permission: DOD_READ,
        hideWithout: true,
    },
    {
        title: "Endings to confirm",
        desc: "Members at three unpaids, each ending confirmed by a staff member",
        href: "/admin/acb/endings",
        icon: LucideUserX,
        permission: DOD_READ,
        hideWithout: true,
    },
    {
        title: "Unpaid counts",
        desc: "Each member's unpaids captured by hand, and the opening arrears position",
        href: "/admin/acb/unpaid-counts",
        icon: LucideListChecks,
        permission: 'DOD_PREPARE',
        hideWithout: true,
    },
    {
        title: "Settings",
        desc: "The bank's return codes, rates, non-working days and moving a bank's debit day",
        href: "/admin/acb/settings",
        icon: LucideCalendarCog,
        permission: 'DOD_SETTINGS',
    },
    {
        title: "Letters",
        desc: "A specimen of each letter to members, with invented details",
        href: "/admin/acb/letters",
        icon: LucideMails,
        permission: 'DOD_PREPARE',
    },
    {
        title: "Credits",
        desc: "No longer run by SASBO — kept as an option, as they asked",
        icon: LucideHandCoins,
    },
];

export default function Acb() {
    return (
        <Page>
            <PageTitle title="Debit Order Deductions" subtitle="The monthly debit order run, from preparing it to the bank's returns" />
            <NavigationList cards={cards} />
        </Page>
    );
}
