import { useState } from "react";
import {Form, LucideGitBranch, NotebookPen, MapPinnedIcon, IdCard, Building2, ChartBar, InfoIcon, LucideMap} from "lucide-react";
import {Link} from "react-router-dom";

export default function ReportOptions() {

    const cards = [
        { title: 'Organizer Report', icon: NotebookPen, href: '/reports/organizer-report', desc: 'Complete visit report' },
        { title: 'Forms', icon: Form, href: '/reports/forms', desc: 'Complete Branch Form (Online/Offline), Membership/Non-Membership' },
        { title: 'Location Listing', icon: MapPinnedIcon, href: '/reports/locations', desc: 'Location Listings/Bulk Location Listings' }
    ];

  return (
      <div className="p-6 text-gray-900 dark:text-gray-100">
          <h2 className="text-3xl text-center mb-8 text-cyan-700 dark:text-cyan-400">
              Reports
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
                          <Icon size={48} strokeWidth={1}
                                className="mb-4 mx-auto text-shadow-cyan-500 dark:text-shadow-white"/>
                          <h3 className="text-xl mb-2 text-cyan-800 dark:text-cyan-300">{card.title}</h3>
                          <p className="text-gray-600 dark:text-gray-300">{card.desc}</p>
                      </Link>
                  );
              })}
          </div>
    </div>
  );
}
