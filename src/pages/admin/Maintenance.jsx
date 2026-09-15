// ⚠️ ONLY THE THREE ICONS THIS PAGE ACTUALLY RENDERS. Ten more were imported here and used
// nowhere but inside the commented-out card blocks below -- so a grep for each name found two
// hits and concluded it was live, while eslint (which reads code, not comments) called all ten
// dead. eslint was right. Anyone restoring one of those cards restores its icon import with it.
import { Landmark, LucideCopyCheck, LucideMails } from "lucide-react";
import NavigationCard from '../../components/common/NavigationCard.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import {useOutletContext} from "react-router-dom";

const maintenance_cards = [
    /*{
        title: 'Union Details',
        icon: FileBadge,
        desc: 'Maintain Union Details',
        color: 'text-red-600 dark:text-red-400'
    },*/
    {
        title: 'Bank/Branch',
        icon: Landmark,
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
            <Sheet className="mt-6 max-w-4xl divide-y divide-line">
                {maintenance_cards.map((card) => (
                    <NavigationCard
                        key={`${card.href}-${card.title}`}
                        {...card}
                        onSelect={() => {
                            setSelectedCardHref?.('');
                            setSideBarOpen?.(true);
                        }}
                    />
                ))}
            </Sheet>
        </Page>
    );
}