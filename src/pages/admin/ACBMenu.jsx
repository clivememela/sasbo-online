import PageTitle from "../../components/common/PageTitle.jsx";
import NavigationCard from "../../components/common/NavigationCard.jsx";

const cards = [
    {
        title: "User Management",
        description: "Manage users and their permissions",
        href: "/admin/membership/users",
        color: "bg-blue-500",
    },
    {
        title: "Role Management",
        description: "Manage roles and their permissions",
        href: "/admin/membership/roles",
        color: "bg-green-500",
    },
    {
        title: "Permission Management",
        description: "Manage permissions and their associations",
        href: "/admin/membership/permissions",
        color: "bg-purple-500",
    },
];
console.log("Rendering ACBMenu");
export default function ACBMenu() {
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <PageTitle title="Admin Membership" subtitle="Select options below" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
                {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
            </div>
        </div>
    );
}