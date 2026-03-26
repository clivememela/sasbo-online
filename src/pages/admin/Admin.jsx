import {
    Landmark, LucideMenu, LucideToolbox, LucideGitBranch, LucideCassetteTape,
    TextSelect, LucideChartNoAxesGantt, ArrowRightLeft, Mailbox, LucideCalendar,
    LucideFile, LucideTag
} from 'lucide-react';
import NavigationCard from '../../components/common/NavigationCard';
import PageTitle from '../../components/common/PageTitle';

const cards = [
    { title: 'Daily Menu', icon: LucideMenu, href: '/admin/daily-menu' },
    { title: 'Monthly Menu', icon: LucideCalendar, href: '/' },
    // { title: 'Banks', icon: Landmark, href: '/banks' },
    { title: 'Utilities', icon: LucideToolbox, href: '/' },
    { title: 'A.C.B', icon: LucideFile, href: '/reports/forms' },
    { title: 'Regional Branches', icon: LucideGitBranch, href: '/reports/forms' },
    { title: 'Tape', icon: LucideCassetteTape, href: '/reports/forms' },
    { title: 'D.B.F', icon: LucideFile, href: '/' },
    { title: 'Selective Print', icon: TextSelect, href: '/' },
    { title: 'Committee', icon: LucideChartNoAxesGantt, href: '/' },
    { title: 'Ad-Hoc Label', icon: LucideTag, href: '/' },
    { title: 'Bank Transfer', icon: ArrowRightLeft, href: '/' },
    { title: 'Letters for Return Debits', icon: Mailbox, href: '/' },
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
