import {
    LucideCalendarRange,
    LucidePiggyBank
} from 'lucide-react';
import PageTitle from "../../components/common/PageTitle.jsx";
import { NavigationList } from "../../components/common/NavigationCard.jsx";
import { Page } from '../../components/common/Sheet.jsx';

const cards = [
    {
        title: "Debits",
        desc: "Manage Debits",
        href: "/admin/acb/debits",
        icon: LucidePiggyBank,
    },
    {
        title: "Runs",
        desc: "Debit Order Runs",
        href: "/admin/acb/runs",
        icon: LucideCalendarRange,
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

// 🔴 `console.log("Rendering Acb")` WAS HERE, AT MODULE SCOPE -- so it fired once per
// import rather than per render, which is not what its own text claimed, and it fired in
// production. Debug output that outlived the debugging session.
export default function Acb() {
    return (
        <Page>
            <PageTitle title="A.C.B Menu" subtitle="Select options below" />
            <NavigationList cards={cards} />
        </Page>
    );
}