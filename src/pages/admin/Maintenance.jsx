import {
    FileBadge, Landmark, LucideArrowUpDown, LucideBrushCleaning,
    LucideCopyCheck, LucideFileText, LucideFileX,
    LucideLocate, LucideMails,
    LucideTable, LucideTreePalm, LucideUserKey, LucideUsers
} from "lucide-react";
import NavigationCard from '../../components/common/NavigationCard.jsx';
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
        title: 'Recruiter Types',
        icon: LucideCopyCheck,
        desc: 'Maintain Recruiter Types',
        href: '/maintenance/recruiter-type'
    },
    {
        title: 'Subscriptions',
        icon: LucideMails,
        href: '/maintenance/subscriptions',
        desc: 'Maintain Subscription Table',
        color: 'text-red-600 dark:text-red-400'
    },
    /*{
        title: 'Representatives',
        icon: LucideUserKey,
        desc: 'Maintain Representatives',
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

        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Maintenance" subtitle="Select a function to maintain" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
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
            </div>
        </div>
    );
}