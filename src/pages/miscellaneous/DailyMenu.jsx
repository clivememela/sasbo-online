import {
    Archive,
    ChartNoAxesCombined,
    Landmark, LucideArmchair, LucideBanknoteArrowDown, LucideBookCheck, LucideCaravan, LucideCopyCheck,
    LucideCross, LucideFile, LucideLocate,
    LucidePenBox, LucidePiggyBank, LucidePresentation, LucidePrinter,
    LucidePrinterX, LucideTable, LucideTags,
    LucideUserCheck2,
    UsersRoundIcon
} from "lucide-react";
import {Link} from "react-router-dom";


export default function DailyMenu () {
    const cards = [
        { title: 'Member (Online)', icon: UsersRoundIcon, href: '/members', desc: 'Search/Capture/Amend Member Records and Details' },
        { title: 'Member Detail Enquiry', icon: LucideUserCheck2, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Capture/Print Member Audit Trail', icon: LucidePenBox, href: '/reports', desc: 'Generate and view system reports' },
        { title: 'Capture Death Benefit/Bene. Fund', icon: LucidePiggyBank, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Criti-care', icon: LucideCross, href: '/criticare-details', desc: 'Capture Death Criti-care Details' },
        { title: 'Capture/Print Endowment Fund', icon: LucidePiggyBank, href: '/endowment-fund', desc: 'Capture/Print Endowment Fund' },
        { title: 'Representatives', icon: LucidePresentation, href: '/representatives', desc: 'Capture/Print Representatives' },
        { title: 'Table', icon: LucideTable, href: '/table', desc: 'Suspension/Rejection Table' },

        { title: 'Labels', icon: LucideTags, href: '/member/label', desc: 'Print Member Labels - Selection' },
        { title: 'Pensioner', icon: LucideArmchair, href: '/archives', desc: 'Print Pensioner Labels' },
        { title: 'Create BPS electronic file', icon: Archive, href: '/archives', desc: 'Browse archived documents' },

        { title: 'Recruiter Table Maintenance', icon: LucideTable, href: '/archives', desc: 'Recruiter Table Maintenance' },
        { title: 'Area Table Maintenance', icon: LucideLocate, href: '/area', desc: 'Area Table Maintenance' },
        { title: 'Print Duplicate Employee Numbers', icon: LucideCopyCheck, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Print Member banking at ?', icon: LucidePrinter, href: '/archives', desc: 'Browse archived documents' },
        { title: 'BPS Paid Up Members', icon: LucideFile, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Extract Members that have resigned Society', icon: Archive, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Extract by Tb Code/Lab Ind (Bank)', icon: Archive, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Extract by Tb Code/Lab Ind (Mail)', icon: Archive, href: '/archives', desc: 'Browse archived documents' },
        { title: 'Member Print by Area & Table code', icon: Archive, href: '/archives', desc: 'Browse archived documents' }
    ];
    return (
        <div className="p-6 text-gray-900 dark:text-gray-100">
            <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
                Daily Menu
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