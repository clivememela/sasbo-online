import {
    LucideTable,
    LucideLocate, LucideFile,
    LucideHdmiPort, LucideLogs, LucideTrain, LucideMail, LucidePaintRoller,
    LucideUserRound
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import NavigationCard from '../../components/common/NavigationCard.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';

const cards = [
    {
        title: 'Key File Setup',
        icon: LucideFile,
        color: 'text-red-600 dark:text-red-400'},
    {
        title: 'Flag All Ports',
        icon: LucideHdmiPort,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Print Log File',
        icon: LucideLogs,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Merge All Audit Trails',
        icon: LucideTrain,
        //href: '/endowment-fund',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Prepare File for Vari Mail',
        icon: LucideMail,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Extract New and Deleted',
        icon: LucideTable,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Print Location Listing',
        icon: LucideLocate,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Print Member Roll (No Adding)' ,
        icon: LucidePaintRoller,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Print Membership Summary',
        icon: LucideUserRound,
        color: 'text-red-600 dark:text-red-400'
    },
];

export default function MonthlyMenu() {
    const { setSelectedCardHref, setSideBarOpen } = useOutletContext() || {};

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Monthly Menu" subtitle="Select options below" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => (
                    <NavigationCard
                        key={`${card.href}-${card.title}`}
                        {...card}
                        onSelect={() => {
                            setSelectedCardHref?.('/admin/Monthly-menu');
                            setSideBarOpen?.(true);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}