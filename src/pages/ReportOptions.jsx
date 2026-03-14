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
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <PageTitle title="Reports" subtitle="Select options below" />
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </div>
    </div>
  );
}
