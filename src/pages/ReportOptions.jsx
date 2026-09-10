import { NotebookPen, Form, MapPinnedIcon } from 'lucide-react';
import NavigationCard from '../components/common/NavigationCard';
import PageTitle from '../components/common/PageTitle';

const cards = [
  { title: 'Organizer Report', icon: NotebookPen, href: '/reports/organizer-report', desc: 'Complete visit report' },
  { title: 'Forms', icon: Form, href: '/reports/forms', desc: 'Complete Branch Form (Online/Offline), Membership/Non-Membership' },
  { title: 'Location Listing', icon: MapPinnedIcon, href: '/reports/locations', desc: 'Location Listings/Bulk Location Listings' },
];

export default function ReportOptions() {
  return (
    <div className="flex min-h-0 flex-1 flex-col px-7 pb-7 pt-[26px] text-ink max-lg:px-4">
      <PageTitle title="Reports" subtitle="Select options below" />
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </div>
    </div>
  );
}
