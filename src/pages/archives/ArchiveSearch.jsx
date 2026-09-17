import { Building2, HandCoins, LucideInfo } from 'lucide-react';
import NavigationCard from '../../components/common/NavigationCard';
import Sheet, { Page } from '../../components/common/Sheet.jsx';
import PageTitle from '../../components/common/PageTitle';

const cards = [
  { title: 'Affiliations/Other Trade Unions', icon: Building2, href: '/archives/affiliations-other-trade-unions' },
  { title: 'Finance Houses', icon: HandCoins, href: '/archives/finance-houses' },
  { title: 'Information & Research', icon: LucideInfo, href: '/archives/research-information' },
];

export default function ArchiveSearch() {
  return (
    <Page>
      <PageTitle title="Search Archives" subtitle="Select options below" />
      <Sheet className="mt-6 max-w-4xl divide-y divide-line">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </Sheet>
    </Page>
  );
}
