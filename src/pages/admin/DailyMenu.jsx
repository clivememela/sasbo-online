import {
    UsersRoundIcon, LucideUserCheck2, LucidePenBox, LucidePiggyBank, LucideCross,
    LucidePresentation, LucideTable, LucideTags, LucideArmchair, LucidePickaxe,
    LucideLocate, LucideCopyCheck, LucidePrinter, LucideFile, LucideDoorOpen,
    Archive, LucidePrinterX
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import NavigationCard from '../../components/common/NavigationCard.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';

const cards = [
    {
        title: 'Members',
        icon: UsersRoundIcon,
        href: '/members',
        desc: 'Search/Capture/Amend Member Records and Details'
    },
    //{ title: 'Member', icon: LucideUserCheck2, href: '/members', desc: 'Member Detail Enquiry' },
    //{ title: 'Member', icon: LucidePenBox, href: '/members/capture', desc: 'Capture/Print Member Audit Trail' },
    // { title: 'Death Benefit/Bene. Fund', icon: LucidePiggyBank, href: '/archives', desc: 'Capture Death Benefit/Bene. Fund' },
    // { title: 'Criti-care', icon: LucideCross, href: '/criticare-details', desc: 'Capture Death Criti-care Details' },
    //{ title: 'Capture/Print Endowment Fund', icon: LucidePiggyBank, href: '/endowment-fund', desc: 'Capture/Print Endowment Fund' },
    {
        title: 'Representatives',
        icon: LucidePresentation,
        href: '/representatives',
        desc: 'Capture/Print Representatives'
    },
    {
        title: 'Suspension/Rejection',
        icon: LucideTable,
        href: '/table',
        desc: 'Suspension/Rejection Table' ,
        color: 'text-red-600 dark:text-red-400'},
    // { title: 'Labels', icon: LucideTags, href: '/member/label', desc: 'Print Member Labels - Selection' },
    //{ title: 'Pensioner', icon: LucideArmchair, href: '/archives', desc: 'Print Pensioner Labels' },
    //{ title: 'BPS Electronic File', icon: LucidePickaxe, href: '/archives', desc: 'Create BPS electronic file' },
    {
        title: 'Recruiter Table Maintenance',
        icon: LucideTable,
        desc: 'Recruiter Table Maintenance',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Area Table Maintenance',
        icon: LucideLocate,
        desc: 'Area Table Maintenance' ,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Duplicate Employee Numbers',
        icon: LucideCopyCheck,
        desc: 'Print Duplicate Employee Numbers',
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: 'Print Member banking at ?',
        icon: LucidePrinter,
        desc: 'Print Member banking at ?',
        color: 'text-red-600 dark:text-red-400'
    },
    // { title: 'Members', icon: LucideFile, href: '/archives', desc: 'BPS Paid Up Members' },
    // { title: 'Members', icon: LucideDoorOpen, href: '/archives', desc: 'Extract Members that have resigned Society' },
    //{ title: 'Tb Code/Lab Ind (Bank)', icon: Archive, href: '/archives', desc: 'Extract by Tb Code/Lab Ind (Bank)' },
    //{ title: 'Tb Code/Lab Ind (Mail)', icon: Archive, href: '/archives', desc: 'Extract by Tb Code/Lab Ind (Mail)' },
    {
        title: 'Area & Table code',
        icon: LucidePrinter,
        desc: 'Print Member by Area & Table code'
    },
];

export default function DailyMenu() {
    const { setSelectedCardHref, setSideBarOpen } = useOutletContext() || {};

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Daily Menu" subtitle="Select options below" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => (
                    <NavigationCard
                        key={`${card.href}-${card.title}`}
                        {...card}
                        onSelect={() => {
                            setSelectedCardHref?.('/admin/daily-menu');
                            setSideBarOpen?.(true);
                        }}
                    />
                ))}
            </div>
        </div>
    );
}