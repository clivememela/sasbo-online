import {
    Form,
    MapPinnedIcon,
    LucideArchive,
    NotebookPen,
    Building2,
    HandCoins,
    LucideInfo,
    LucideHome
} from "lucide-react";
import {Link} from "react-router-dom";

export default function ArchiveSearch() {

    const cards = [
        { title: "Affiliations/Other Trade Unions", icon: Building2, href: "/archives/affiliations-other-trade-unions" },
        { title: "Finance Houses", icon: HandCoins, href: "/archives/finance-houses" },
        { title: "Information & Research", icon: LucideInfo, href: "/archives/research-information" }
    ];
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Search Archives
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
                            <Icon size={48} strokeWidth={1}
                                  className="mb-4 mx-auto text-shadow-cyan-500 dark:text-shadow-white"/>
                            <h3 className="text-xl mb-2 text-cyan-800 dark:text-cyan-300">{card.title}</h3>
                            <p className="text-gray-600 dark:text-gray-300">{card.desc}</p>
                        </Link>
                    );
                })}
            </div>
        </div>
    );
}
