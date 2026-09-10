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
    <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
      <PageTitle title="Search Archives" subtitle="Select options below" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </div>
    </div>
  );
}
