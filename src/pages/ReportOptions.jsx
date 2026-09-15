import { NotebookPen, Form, MapPinnedIcon } from 'lucide-react';
import NavigationCard from '../components/common/NavigationCard';
import Sheet, { Page } from '../components/common/Sheet.jsx';
import PageTitle from '../components/common/PageTitle';

const cards = [
  { title: 'Organizer Report', icon: NotebookPen, href: '/reports/organizer-report', desc: 'Complete visit report' },
  { title: 'Forms', icon: Form, href: '/reports/forms', desc: 'Complete Branch Form (Online/Offline), Membership/Non-Membership' },
  { title: 'Location Listing', icon: MapPinnedIcon, href: '/reports/locations', desc: 'Location Listings/Bulk Location Listings' },
];

export default function ReportOptions() {
  return (
    <Page>
      <PageTitle title="Reports" subtitle="Select options below" />
      <Sheet className="mt-6 max-w-4xl divide-y divide-line">
        {cards.map((card) => <NavigationCard key={card.href} {...card} />)}
      </Sheet>
    </Page>
  );
}
