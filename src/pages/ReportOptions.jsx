import { NotebookPen, Form, MapPinnedIcon } from 'lucide-react';
import { NavigationList } from '../components/common/NavigationCard';
import { Page } from '../components/common/Sheet.jsx';
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
      <NavigationList cards={cards} />
    </Page>
  );
}
