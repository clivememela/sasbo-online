import { Building2, HandCoins, LucideInfo } from 'lucide-react';
import NavigationCard from '../../components/common/NavigationCard';
import PageTitle from '../../components/common/PageTitle';

const cards = [
  { title: 'Affiliations/Other Trade Unions', icon: Building2, href: '/archives/affiliations-other-trade-unions' },
  { title: 'Finance Houses', icon: HandCoins, href: '/archives/finance-houses' },
  { title: 'Information & Research', icon: LucideInfo, href: '/archives/research-information' },
];

export default function ArchiveSearch() {
  return (
    <div className="p-6 text-ink">
      <PageTitle title="Search Archives" subtitle="Select options below" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </div>
    </div>
  );
}
