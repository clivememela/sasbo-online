// ⚠️ ONLY THE ICONS THIS PAGE ACTUALLY RENDERS. Ten more were imported here and used
// nowhere but inside the commented-out card blocks below -- so a grep for each name found two
// hits and concluded it was live, while eslint (which reads code, not comments) called all ten
// dead. eslint was right. Anyone restoring one of those cards restores its icon import with it.
import { Building2, Landmark, LucideCopyCheck, LucideMails, UserRoundPen } from "lucide-react";
import { NavigationList } from '../../components/common/NavigationCard.jsx';
import { Page } from '../../components/common/Sheet.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import {useOutletContext} from "react-router-dom";

const maintenance_cards = [
    /*{
        title: 'Union Details',
        icon: FileBadge,
        desc: 'Maintain Union Details',
        color: 'text-red-600 dark:text-red-400'
    },*/
    /* 🗣️ SASBO, 18 Sep 2026 -- "in maintenance there was an option where we could edit the member",
       and Bank/Branch was "not linking. It's not active." Editing a member happens on the member's own
       record (the register at /members: open the member, then Edit), and /banks has had working add and
       edit all along; this card had simply never been given its href. `navigation.js` mirrors both. */
    {
        title: 'Edit Member',
        icon: UserRoundPen,
        href: '/members',
        desc: 'Find a member and edit their record'
    },
    {
        title: 'Bank/Branch',
        icon: Landmark,
        href: '/banks',
        desc: 'Maintain Bank/Branch'
    },
    /*{
        title: 'Reginal Branch Menu',
        icon: LucideTable,
        desc: 'Maintain Reginal Branch Menu',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Province Table',
        icon: LucideTable,
        desc: 'Maintain Province Table' ,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Committee',
        icon: LucideLocate,
        desc: 'Maintain Committees',
        color: 'text-red-600 dark:text-red-400'
    },*/
    {
        title: 'Recruitment Channel',
        icon: LucideCopyCheck,
        desc: 'Maintain Recruitment Channels',
        href: '/admin/maintenance/recruitment-channel'
    },
    {
        title: 'Subscriptions',
        icon: LucideMails,
        href: '/admin/maintenance/subscriptions',
        desc: 'Maintain Subscription Table'
    },
    /* Month end `01.5` (MD61): SASBO's workplaces, a page at a time. The rail's Maintenance says the same, in
       `navigation.js`, and `Maintenance.test.jsx` holds the two together (MR-ROB-37). */
    {
        title: 'Workplaces',
        icon: Building2,
        href: '/admin/maintenance/workplaces',
        desc: 'Find a workplace by its name or R/A number'
    },
    /*{
        title: 'Recruiters',
        icon: LucideUserKey,
        desc: 'Maintain Recruiters',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Pensioner Area Table',
        icon: LucideTreePalm,
        desc: 'Maintain Pensioner Area Table',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Clear Figures',
        icon: LucideBrushCleaning,
        desc: 'Clear Figures (Year End)',
        color: 'text-red-600 dark:text-red-400'
    }
    {
        title: 'Suspencion/Rejection Table',
        icon: LucideFileX,
        desc: 'Maintain Suspension/Rejection Table',
        color: 'text-red-600 dark:text-red-400'
        icon: LucideMails,
    },
    {
        title: 'Users',
        icon: LucideUsers,
        desc: 'Maintain Users',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Increase/Decrease Subs',
        icon: LucideArrowUpDown,
        desc: 'Maintain Increase/Decrease Subs',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Document Type',
        icon: LucideFileText,
        desc: 'Maintain Document Type',
        color: 'text-red-600 dark:text-red-400'
    },*/
];

export default function Maintenance() {
    const { setSelectedCardHref, setSideBarOpen } = useOutletContext() || {};
    return (

        <Page>
            <PageTitle title="Maintenance" subtitle="Select a function to maintain" />
            <NavigationList
                cards={maintenance_cards}
                onSelect={() => {
                    setSelectedCardHref?.('');
                    setSideBarOpen?.(true);
                }}
            />
        </Page>
    );
}