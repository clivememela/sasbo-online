import {
    LucideMenu, LucideFile, LucideConstruction
} from 'lucide-react';
import { NavigationList } from '../../components/common/NavigationCard';
import { Page } from '../../components/common/Sheet.jsx';
import PageTitle from '../../components/common/PageTitle';

const cards = [
    { title: 'Daily', desc: 'Daily Menu' ,icon: LucideMenu, href: '/admin/daily-menu' },
    //{ title: 'Monthly Menu', icon: LucideCalendar, href: '/admin/monthly-menu' },
    { title: 'A.C.B', desc: 'A.C.B Menu',icon: LucideFile, href:'/admin/acb'},
    // { title: 'BankBranch', icon: Landmark, href:'/banks' },
    //{ title: 'Utilities', icon: LucideToolbox, color: 'text-red-600 dark:text-red-400' },
    //{ title: 'Regional Branches', icon: LucideGitBranch, color: 'text-red-600 dark:text-red-400' },
    //{ title: 'Tape Menu', icon: LucideCassetteTape, color: 'text-red-600 dark:text-red-400' },
    // { title: 'D.B.F Menu', icon: LucideFile,color: 'text-red-600 dark:text-red-400' },
    //{ title: 'Selective Print Menu', icon: TextSelect, color: 'text-red-600 dark:text-red-400'},
    //{ title: 'Committee Menu', icon: LucideChartNoAxesGantt , color: 'text-red-600 dark:text-red-400'},
    //{ title: 'Ad-Hoc Label', icon: LucideTag, color: 'text-red-600 dark:text-red-400'},
    //{ title: 'Bank Transfer', icon: ArrowRightLeft, href: '/admin/bank-transfer' },
    //{ title: 'Letters for Return Debits', icon: Mailbox, color: 'text-red-600 dark:text-red-400'},
    { title: "Maintenance", desc: 'Maintenance Functions',href:'/admin/maintenance', icon: LucideConstruction},
    //{ title: 'Exit System', icon: LucideExternalLink , color: 'text-red-600 dark:text-red-400'}
];

export default function Admin() {
    return (
        <Page>
            <PageTitle title="Admin Membership" subtitle="Select options below" />
            <NavigationList cards={cards} />
        </Page>
    );
}
