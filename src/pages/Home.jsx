import { Link } from 'react-router-dom';
import { Landmark, Building2, UsersRoundIcon , Users, ChartNoAxesCombined, ChartBar, Archive, InfoIcon } from 'lucide-react';

export default function Home() {
  const cards = [
    { title: 'Search Banks', icon: Landmark, href: '/banks', desc: 'Manage and view bank information' },
    { title: 'Member Search', icon: UsersRoundIcon, href: '/members', desc: 'Access member records and details' },
    { title: 'Reports', icon: ChartNoAxesCombined, href: '/reports', desc: 'Generate and view system reports' },
    { title: 'Document Archives', icon: Archive, href: '/archives', desc: 'Browse archived documents' }//,
    //{ title: 'About Us', icon: InfoIcon, href: '/about', desc: 'Learn more about SASBO' }
  ];

  return (
    <div className="p-6 text-gray-900 dark:text-gray-100">
      <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
        Welcome to the SASBO
      </h2>
        <p className="text-2xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
            Select options below
        </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto text-center">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.href}
              to={card.href}
              className="p-6 rounded-lg shadow-lg transition-shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:shadow-xl dark:hover:shadow-2xl">
              <Icon size={48} strokeWidth={1} className="mb-4 mx-auto text-shadow-cyan-500 dark:text-shadow-white" />
              <h3 className="text-xl mb-2 text-cyan-800 dark:text-cyan-300">{card.title}</h3>
              <p className="text-gray-600 dark:text-gray-300">{card.desc}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
