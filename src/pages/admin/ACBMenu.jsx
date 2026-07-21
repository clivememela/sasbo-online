import {
    LucideMenu, LucideToolbox, LucideGitBranch, LucideCassetteTape,
    TextSelect, LucideChartNoAxesGantt, ArrowRightLeft, Mailbox, LucideCalendar,
    LucideFile, LucideTag, LucideExternalLink, LucideConstruction
} from 'lucide-react';
import PageTitle from "../../components/common/PageTitle.jsx";
import NavigationCard from "../../components/common/NavigationCard.jsx";

const cards = [
    {
        title: "Re-Debits",
        description: "Manage users and their permissions",
        href: "/admin/membership/users",
        icon: LucideCalendar,
    },
    {
        title: "Credits",
        description: "Manage roles and their permissions",
        href: "/admin/membership/roles",
        icon: LucideCalendar,
    },
    {
        title: "Subscriptions",
        description: "Manage permissions and their associations",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
    {
        title: "Benevolent Funds",
        description: "Manage users and their permissions",
        href: "/admin/membership/users",
        icon: LucideCalendar,
    },
    {
        title: "Death Benefit Funds",
        description: "Manage roles and their permissions",
        href: "/admin/membership/roles",
        icon: LucideCalendar,
    },
    {
        title: "Endowment Funds",
        description: "Manage permissions and their associations",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
    {
        title: "Criticare",
        description: "Manage permissions and their associations",
        href: "/admin/membership/permissions",
        icon: LucideCalendar,
    },
    {
        title: "Accounts",
        description: "Manage permissions and their associations",
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