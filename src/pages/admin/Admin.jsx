import {
    Landmark, LucideMenu, LucideToolbox, LucideGitBranch, LucideCassetteTape,
    TextSelect, LucideChartNoAxesGantt, ArrowRightLeft, Mailbox, LucideCalendar,
    LucideFile, LucideTag, LucideExternalLink, LucideConstruction
} from 'lucide-react';
import NavigationCard from '../../components/common/NavigationCard';
import PageTitle from '../../components/common/PageTitle';

const cards = [
    { title: 'Daily Menu', icon: LucideMenu, href: '/admin/daily-menu' },
    { title: 'Monthly Menu', icon: LucideCalendar, href: '/admin/monthly-menu' },
    // { title: 'BankBranch', icon: Landmark, href:'/banks' },
    { title: 'Utilities', icon: LucideToolbox, color: 'text-red-600 dark:text-red-400' },
    { title: 'A.C.B Menu', icon: LucideFile, color: 'text-red-600 dark:text-red-400'},
    { title: 'Regional Branches', icon: LucideGitBranch, color: 'text-red-600 dark:text-red-400' },
    { title: 'Tape Menu', icon: LucideCassetteTape, color: 'text-red-600 dark:text-red-400' },
    { title: 'D.B.F Menu', icon: LucideFile,color: 'text-red-600 dark:text-red-400' },
    { title: 'Selective Print Menu', icon: TextSelect, color: 'text-red-600 dark:text-red-400'},
    { title: 'Committee Menu', icon: LucideChartNoAxesGantt , color: 'text-red-600 dark:text-red-400'},
    { title: 'Ad-Hoc Label', icon: LucideTag, color: 'text-red-600 dark:text-red-400'},
    { title: 'Bank Transfer', icon: ArrowRightLeft, href: '/admin/bank-transfer' },
    { title: 'Letters for Return Debits', icon: Mailbox, color: 'text-red-600 dark:text-red-400'},
    { title: "Maintenance", href:'/maintenance', icon: LucideConstruction},
    { title: 'Exit System', icon: LucideExternalLink , color: 'text-red-600 dark:text-red-400'}
];

export default function Admin() {
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Admin Membership" subtitle="Select options below" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
            </div>
        </div>
    );
}
