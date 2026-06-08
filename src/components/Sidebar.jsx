import { X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import Logo from "./common/Logo";
import SidebarItem from "./common/SidebarItem";
import { navItems, authItems } from "../config/navigation";

const findAncestors = (items, target, path = []) => {
  for (const item of items) {
    const current = [...path, item.href];
    if (item.href === target) return current;
    if (item.subItems) {
      const found = findAncestors(item.subItems, target, current);
      if (found) return found;
    }
  }
  return null;
};

export default function Sidebar({ sideBarOpen, setSideBarOpen, selectedCardHref}) {
  const location = useLocation();
  const [expandedItems, setExpandedItems] = useState({});
  const [prevSelectedCardHref, setPrevSelectedCardHref] = useState(null);

  if (selectedCardHref !== prevSelectedCardHref) {
    setPrevSelectedCardHref(selectedCardHref);
    if (selectedCardHref) {
      const ancestors = findAncestors(navItems, selectedCardHref) || [selectedCardHref];
      setExpandedItems(prev => {
        const next = { ...prev };
        ancestors.forEach(href => { next[href] = true; });
        return next;
      });
    }
  }

  const toggleExpand = (href) => {
    setExpandedItems(prev => ({
      ...prev,
      [href]: !prev[href]
    }));
  };

  const isSubItemActive = (subItems = []) => {
    return subItems.some((item) => {
      if (location.pathname === item.href) return true;
      return isSubItemActive(item.subItems || []);
    });
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
              expandedItems={expandedItems}
              onToggle={toggleExpand}
              onClick={() => setSideBarOpen(false)}
              selectedCardHref={selectedCardHref}
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
