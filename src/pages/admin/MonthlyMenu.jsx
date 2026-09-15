import {
    LucideTable,
    LucideLocate, LucideFile,
    LucideHdmiPort, LucideLogs, LucideTrain, LucideMail, LucidePaintRoller,
    LucideUserRound
} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import NavigationCard from '../../components/common/NavigationCard.jsx';
import PageTitle from '../../components/common/PageTitle.jsx';
import Sheet, { Page } from '../../components/common/Sheet.jsx';

/*
 * 🔴 NINE ROWS, NINE DEAD ENDS -- the worst state a landing surface can be in, and the last
 * page in the application still in it. Not one of these entries carries an `href`, so
 * `<Link to={undefined}>` rendered nine `<a>` elements pointing at this very url: a pointer
 * cursor, a hover wash, a chevron promising somewhere to go, and a click that did nothing.
 * Measured on the running app, 2026-09-10 -- `9 rows, 9 DEAD`.
 *
 * The routes do not exist because the OPERATIONS are not built. `NavigationCard` now says so
 * on any row without a route, which is where that decision belongs; the other pages simply
 * comment their unbuilt entries out, and both are honest. The dead `color:` key each card
 * carried is gone with them -- `NavigationCard` has never accepted one.
 */
const cards = [
    { title: 'Key File Setup', icon: LucideFile },
    { title: 'Flag All Ports', icon: LucideHdmiPort },
    { title: 'Print Log File', icon: LucideLogs },
    { title: 'Merge All Audit Trails', icon: LucideTrain },
    { title: 'Prepare File for Vari Mail', icon: LucideMail },
    { title: 'Extract New and Deleted', icon: LucideTable },
    { title: 'Print Location Listing', icon: LucideLocate },
    { title: 'Print Member Roll (No Adding)', icon: LucidePaintRoller },
    { title: 'Print Membership Summary', icon: LucideUserRound },
];

export default function MonthlyMenu() {
    const { setSelectedCardHref, setSideBarOpen } = useOutletContext() || {};

    return (
        <Page>
            <PageTitle title="Monthly Menu" subtitle="Select options below" />
            {/* 📐 A SHEET OF ROWS, like every other menu page -- Home, Admin, ACB, Daily Menu,
                Maintenance, Archive Search and Report Options all render this exact shape.
                This one was a `grid md:grid-cols-2 xl:grid-cols-3` of same-size cards, which
                is the scaffold `NavigationCard`'s own note refuses by name and the direction
                contract lists first under page scaffolds. */}
            <Sheet className="mt-6 max-w-4xl divide-y divide-line">
                {cards.map((card) => (
                    <NavigationCard
                        key={card.title}
                        {...card}
                        onSelect={() => {
                            setSelectedCardHref?.('/admin/monthly-menu');
                            setSideBarOpen?.(true);
                        }}
                    />
                ))}
            </Sheet>
        </Page>
    );
}
