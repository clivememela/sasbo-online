import {HandCoins,Home, Landmark, LucideInfo, Building2, Users, ChartNoAxesCombined, Archive, X, LogOutIcon, NotebookPen, Form, MapPinnedIcon, Plus} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import Logo from "./common/Logo";
import SidebarItem from "./common/SidebarItem";

const navItems = [
  { title: "Home", icon: Home, href: "/" },
  { title: "Banks", icon: Landmark, href: "/banks" },
  { 
    title: "Members", 
    icon: Users, 
    href: "/members",
    subItems: [
      { title: "Member Application", icon: Plus, href: "/members/apply" }
    ]
  },
  { 
    title: "Reports", 
    icon: ChartNoAxesCombined, 
    href: "/reports",
    subItems: [
      { title: "Organizer Report", icon: NotebookPen, href: "/reports/organizer-report" },
      { title: "Forms", icon: Form, href: "/reports/forms" },
      { title: "Location Listing", icon: MapPinnedIcon, href: "/reports/locations" }
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
            <Logo className="h-12 w-auto" />
            <span>Enquiry Navigation Menu</span>
          </div>
          <button className="lg:hidden dark:text-white" onClick={() => setSideBarOpen(false)}>
            <X size={24} strokeWidth={1} />
          </button>
        </div>
        <div className="p-4 space-y-2 flex-1 overflow-y-auto">
          {navItems.map((item) => (
            <SidebarItem 
              key={item.href}
              item={item}
              isActive={location.pathname === item.href}
              hasActiveSubItem={isSubItemActive(item.subItems)}
              isExpanded={expandedItems[item.href]}
              onToggle={toggleExpand}
              onClick={() => setSideBarOpen(false)}
            />
          ))}
          
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
