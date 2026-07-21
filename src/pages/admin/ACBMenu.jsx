import {
    LucideMenu, LucideToolbox, LucideGitBranch, LucideCassetteTape,
    TextSelect, LucideChartNoAxesGantt, ArrowRightLeft, Mailbox, LucideCalendar,
    LucideFile, LucideTag, LucideExternalLink, LucideConstruction, ChartNoAxesCombined
} from 'lucide-react';
import PageTitle from "../../components/common/PageTitle.jsx";
import NavigationCard from "../../components/common/NavigationCard.jsx";

const cards = [
    {
        title: "Debits",
        desc: "Manage Re-Debits",
        href: "/admin/membership/users",
        icon: LucideCalendar,
    },
    {
        title: "Credits",
        desc: "Manage Credits",
        href: "/admin/membership/roles",
        icon: LucideCalendar,
    },
    {
        title: "Subscriptions",
        desc: "Manage Subscriptions",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
    {
        title: "Benevolent Funds",
        desc: "Manage Benevolent Funds",
        href: "/admin/membership/users",
        icon: LucideCalendar,
    },
    {
        title: "Death Benefit Funds",
        desc: "Manage Death Benefit Funds",
        href: "/admin/membership/roles",
        icon: LucideCalendar,
    },
    {
        title: "Endowment Funds",
        desc: "Manage Endowment Funds",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
    {
        title: "Criticare",
        desc: "Manage Criticare",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
    {
        title: "Accounts",
        desc: "Manage Accounts",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
];
console.log("Rendering ACBMenu");
export default function ACBMenu() {
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="ACB Menu" subtitle="Select options below" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
            </div>
        </div>
    );
}