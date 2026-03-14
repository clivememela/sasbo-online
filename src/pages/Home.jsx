import { Landmark, UsersRoundIcon, ChartNoAxesCombined, Archive } from 'lucide-react';
import NavigationCard from '../components/common/NavigationCard';
import PageTitle from '../components/common/PageTitle';

const cards = [
  { title: 'Search Banks', icon: Landmark, href: '/banks', desc: 'Manage and view bank information' },
  { title: 'Member Search', icon: UsersRoundIcon, href: '/members', desc: 'Access member records and details' },
  { title: 'Reports', icon: ChartNoAxesCombined, href: '/reports', desc: 'Generate and view system reports' },
  { title: 'Document Archives', icon: Archive, href: '/archives', desc: 'Browse archived documents' },
];

export default function Home() {
  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <PageTitle title="Welcome to the SASBO" subtitle="Select options below" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </div>
    </div>
  );
}
