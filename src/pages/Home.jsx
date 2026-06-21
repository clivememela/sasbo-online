import {Landmark, UsersRoundIcon, ChartNoAxesCombined, Archive, LucideDatabase} from 'lucide-react';
import { useOutletContext } from 'react-router-dom';
import NavigationCard from '../components/common/NavigationCard';
import PageTitle from '../components/common/PageTitle';

const cards = [
    {title: 'Admin Menu', icon: LucideDatabase, href: '/admin', desc: 'Manage and view admin menu'},
    { title: 'BankBranch', icon: Landmark, href: '/banks', desc: 'Manage and view bank information' },
    { title: 'Members', icon: UsersRoundIcon, href: '/members', desc: 'Access member records and details' },
    { title: 'Reports', icon: ChartNoAxesCombined, href: '/reports', desc: 'Generate and view system reports' },
    { title: 'Document Archives', icon: Archive, href: '/archives', desc: 'Browse archived documents' },
];

export default function Home() {
  const { setSelectedCardHref } = useOutletContext() || {};
  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <PageTitle title="Welcome to the SASBO" subtitle="Select options below" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
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
