import {Landmark, UsersRoundIcon, ChartNoAxesCombined, Archive, LucideDatabase} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import NavigationCard from '../components/common/NavigationCard';
import PageTitle from '../components/common/PageTitle';

const cards = [
    {title: 'Admin Menu', icon: LucideDatabase, href: '/admin', desc: 'Manage and view admin menu'},
    { title: 'Bank/Branch', icon: Landmark, href: '/banks', desc: 'Manage and view bank information' },
    { title: 'Members', icon: UsersRoundIcon, href: '/members', desc: 'Access member records and details' },
    { title: 'Reports', icon: ChartNoAxesCombined, href: '/reports', desc: 'Generate and view system reports' },
    { title: 'Document Archives', icon: Archive, href: '/archives', desc: 'Browse archived documents' },
];

export default function Home() {
  const { setSelectedCardHref } = useOutletContext() || {};
  return (
    <div className="px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
      <PageTitle title="Welcome to SASBO Online" subtitle="Select an area to begin." />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => (
          <NavigationCard
            key={card.href}
            {...card}
            onSelect={() => setSelectedCardHref?.(card.href)}
          />
        ))}
      </div>
    </div>
  );
}
