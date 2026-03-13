import { Link } from 'react-router-dom';
import {
    Landmark,
    Building2,
    UsersRoundIcon,
    Users,
    ChartNoAxesCombined,
    ChartBar,
    Archive,
    InfoIcon,
    LucideMenu, LucideToolbox, Form, LucideGitBranch, LucideCassetteTape, Plus, TextSelect, LucideChartNoAxesGantt,
    ArrowRightLeft, Mailbox, LucideCalendar, LucideFile, LucideTag
} from 'lucide-react';

export default function Admin() {
    const cards = [
        { title: "Daily Menu", icon: LucideMenu, href: "/miscellaneous/daily-menu" },
        { title: "Monthly Menu", icon: LucideCalendar, href: "/reports/forms" },
        { title: "Banks", icon: Landmark, href: "/banks" },
        { title: "Utilities", icon: LucideToolbox, href: "/reports/forms" },
        { title: "A.C.B", icon: LucideFile, href: "/reports/forms" },
        { title: "Regional Branches", icon: LucideGitBranch, href: "/reports/forms" },
        { title: "Tape", icon: LucideCassetteTape, href: "/reports/forms" },
        { title: "D.B.F", icon: LucideFile, href: "/banks/new" },
        { title: "Selective Print", icon: TextSelect, href: "/members/apply" },
        { title: "Committee", icon: LucideChartNoAxesGantt, href: "/members/apply"},
        { title: "Ad-Hoc Label", icon: LucideTag, href: "/members/apply"},
        { title: "Bank Transfer", icon: ArrowRightLeft, href: "/banks/new"},
        { title: "Letters for Return Debits", icon: Mailbox, href: "/members/apply"}
    ];

    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Admin Membership
            </h2>
            <p className="text-2xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Select options below
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Link
                            key={card.href}
                            to={card.href}
                            className="p-6 rounded-lg shadow-lg transition-shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:shadow-xl dark:hover:shadow-2xl">
                            <Icon size={48} strokeWidth={1} className="mb-4 mx-auto text-shadow-cyan-500 dark:text-shadow-white" />
                            <h3 className="text-xl mb-2 text-cyan-800 dark:text-cyan-300">{card.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300">{card.desc}</p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
