import {
    LucidePiggyBank
} from 'lucide-react';
import PageTitle from "../../components/common/PageTitle.jsx";
import NavigationCard from "../../components/common/NavigationCard.jsx";

const cards = [
    {
        title: "Debits",
        desc: "Manage Debits",
        href: "/admin/acb/debits",
        icon: LucidePiggyBank,
    },
    /*{
        title: "Credits",
        desc: "Manage Credits",
        //href: "/admin/membership/roles",
        icon: LucidePiggyBank,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: "Subscriptions",
        desc: "Manage Subscriptions",
        //href: "/admin/membership/permissions",
        icon: LucideMails,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: "Benevolent Funds",
        desc: "Manage Benevolent Funds",
        //href: "/admin/membership/users",
        icon: LucideCalendar,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: "Death Benefit Funds",
        desc: "Manage Death Benefit Funds",
        //href: "/admin/membership/roles",
        icon: LucideCalendar,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: "Endowment Funds",
        desc: "Manage Endowment Funds",
        //href: "/admin/membership/permissions",
        icon: LucideCalendar,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: "Criticare",
        desc: "Manage Criticare",
        //href: "/admin/membership/permissions",
        icon: LucideCross,
        color: 'text-red-600 dark:text-red-400'
    },
    {
        title: "Accounts",
        desc: "Manage Accounts",
        //href: "/admin/membership/permissions",
        icon: LucideBuilding,
        color: 'text-red-600 dark:text-red-400'
    },*/
];
console.log("Rendering ACB");
export default function ACB() {
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="A.C.B Menu" subtitle="Select options below" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
            </div>
        </div>
    );
}