import logo from "../assets/images/logo.png";
import {HandCoins,Home, Landmark, LucideInfo, LucideHome, Building2, Users, ChartNoAxesCombined, ChartBar, Archive, InfoIcon, X, LogIn, LogOutIcon, NotebookPen, Form, MapPinnedIcon, ChevronDown} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";

const navItems = [
  { title: "Home", icon: Home, href: "/" },
  { title: "Search Banks", icon: Landmark, href: "/banks" },
  { title: "Search Members", icon: Users, href: "/members" },
  { 
    title: "Reports", 
    icon: ChartNoAxesCombined, 
    href: "/reports",
    subItems: [
      { title: "Organizer Report", icon: NotebookPen, href: "/reports/organizer-report" },
      { title: "Forms", icon: Form, href: "/reports/forms" },
      { title: "Locations", icon: MapPinnedIcon, href: "/reports/locations" }
    ]
  },
  {
    title:"Document Archives",
    icon: Archive,
    href: "/archives",
    subItems: [
        { title: "Affiliations/Other Trade Unions", icon: Building2, href: "/archives/affiliations-other-trade-unions" },
        { title: "Finance Houses", icon: HandCoins, href: "/archives/finance-houses" },
        { title: "Information & Research", icon: LucideInfo, href: "/archives/research-information" }
    ]}
];

const authItems = [
  { title: "Logout", icon: LogOutIcon, href: "/login" },
];

export default function Sidebar({ sideBarOpen, setSideBarOpen}) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});

  const toggleExpand = (href) => {
    setExpandedItems(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const isSubItemActive = (subItems) => {
    return subItems?.some(item => location.pathname === item.href);
  };

  return (
    <>
      {/* Overlay for mobile */}
      {sideBarOpen && (
        <div
          className="fixed inset-0 bg-transparent z-10 lg:hidden"
          onClick={() => setSideBarOpen(false)}
        ></div>
      )}

      <div
        className={`fixed bg-white dark:bg-gray-800 z-20 w-64 h-screen shadow flex flex-col ${
          sideBarOpen ? "translate-x-0" : "-translate-x-64"
        } lg:translate-x-0 lg:static transition ease-in-out duration-300`}
      >
        <div className="p-4 flex justify-between items-center border-b dark:border-gray-700">
          <div className="flex items-center gap-2 text-xl text-cyan-700 dark:text-cyan-400">
            <img src={logo} alt="Logo" className="h-12 w-auto" />
            <span>Enquiry Navigation Menu</span>
          </div>
          <button className="lg:hidden dark:text-white" onClick={() => setSideBarOpen(false)}>
            <X size={24} strokeWidth={1} />
          </button>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isExpanded = expandedItems[item.href];
            const isActive = location.pathname === item.href;
            const hasActiveSubItem = isSubItemActive(item.subItems);

            return (
              <div key={item.href}>
                <div
                  className={`flex items-center p-4 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white cursor-pointer transition-colors rounded-lg ${
                    isActive || hasActiveSubItem ? 'bg-gray-200 dark:bg-gray-700' : ''
                  }`}
                  onClick={() => {
                    if (hasSubItems) {
                      toggleExpand(item.href);
                    } else {
                      setSideBarOpen(false);
                    }
                  }}
                >
                  <Link
                    to={item.href}
                    className="flex items-center flex-1"
                    onClick={(e) => {
                      if (hasSubItems) {
                        e.preventDefault();
                      } else {
                        setSideBarOpen(false);
                      }
                    }}
                  >
                    <Icon size={24} strokeWidth={1} className="mr-6" />
                    <div className="font-medium">{item.title}</div>
                  </Link>
                  {hasSubItems && (
                    <ChevronDown 
                      size={20} 
                      strokeWidth={1} 
                      className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                    />
                  )}
                </div>
                
                {hasSubItems && isExpanded && (
                  <div className="ml-4 space-y-1">
                    {item.subItems.map((subItem) => {
                      const SubIcon = subItem.icon;
                      const isSubActive = location.pathname === subItem.href;
                      return (
                        <Link
                          key={subItem.href}
                          to={subItem.href}
                          className={`flex items-center p-3 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white cursor-pointer transition-colors rounded-lg text-sm ${
                            isSubActive ? 'bg-gray-200 dark:bg-gray-700' : ''
                          }`}
                          onClick={() => setSideBarOpen(false)}
                        >
                          <SubIcon size={20} strokeWidth={1} className="mr-4" />
                          <div className="font-medium">{subItem.title}</div>
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
          
          <div className="my-4 border-t border-gray-200 dark:border-gray-700"></div>
          
          {authItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center p-4 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white cursor-pointer transition-colors rounded-lg"
                onClick={() => setSideBarOpen(false)}
              >
                <Icon size={24} strokeWidth={1} className="mr-6 text-cyan-500" />
                <div className="font-medium">{item.title}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
}
