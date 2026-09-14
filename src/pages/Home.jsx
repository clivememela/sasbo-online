import { useOutletContext } from 'react-router-dom';
import NavigationCard from '../components/common/NavigationCard';
import Sheet, { Page } from '../components/common/Sheet.jsx';
import PageTitle from '../components/common/PageTitle';
import { navItems } from '../config/navigation';

/*
 * 🔴 THE LANDING PAGE STATED A DIFFERENT INVENTORY OF THE APPLICATION FROM THE RAIL BESIDE
 * IT. This list was hand-typed: five of the nine top-level areas, in an order of their own,
 * silently missing A.C.B, Recruiters and Subscriptions -- each of which the rail two inches
 * to the left lists. "Select an area to begin" under a list that is a subset of the
 * navigation, with nothing saying so, reads as an oversight rather than as a choice.
 *
 * 🔑 SO IT IS NOT A LIST ANY MORE -- it is the rail, read across instead of down. `navItems`
 * is the one place the application's areas are declared, Home drops only its own entry, and
 * the two can no longer disagree: an area added to the menu appears here on the same commit,
 * and one removed disappears from both.
 *
 * The descriptions stay hand-written because the rail has none and a menu row with nothing
 * under its title is a poorer row; they are keyed by href so a renamed title cannot silently
 * detach one from its area.
 */
const DESCRIPTIONS = {
  '/admin': 'Daily, monthly and maintenance operations',
  '/admin/acb': 'Automated clearing bureau debits and returns',
  '/banks': 'Every bank and branch Sasbo members work from',
  '/archives': 'Agreements, policies and research, by institution',
  '/members': 'The membership register across every bank',
  '/recruiters': 'Who signs members up, and how many they bring',
  '/admin/maintenance/subscriptions': 'What each bank collects, and when it debits',
  '/reports': 'Organiser reports, locations, forms and listings',
};

const cards = navItems
  .filter((item) => item.href && item.href !== '/home')
  .map((item) => ({
    title: item.title.trim(),
    icon: item.icon,
    href: item.href,
    desc: DESCRIPTIONS[item.href],
  }));

export default function Home() {
  const { setSelectedCardHref } = useOutletContext() || {};
  return (
    <Page>
      <PageTitle title="Welcome to SASBO Online" subtitle="Select an area to begin." />
      <Sheet className="mt-6 max-w-4xl divide-y divide-line">
        {cards.map((card) => (
          <NavigationCard
            key={card.href}
            {...card}
            onSelect={() => setSelectedCardHref?.(card.href)}
          />
        ))}
      </Sheet>
    </Page>
  );
}
