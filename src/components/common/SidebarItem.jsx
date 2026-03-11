import { Link, useLocation } from "react-router-dom";
import { ChevronDown } from "lucide-react";

export default function SidebarItem({ item, isActive, hasActiveSubItem, isExpanded, onToggle, onClick }) {
  const location = useLocation();
  const Icon = item.icon;
  const hasSubItems = item.subItems && item.subItems.length > 0;

  return (
    <div>
      <div
        className={`flex items-center p-4 hover:bg-gray-200 dark:hover:bg-gray-700 dark:text-white cursor-pointer transition-colors rounded-lg ${
          isActive || hasActiveSubItem ? 'bg-gray-200 dark:bg-gray-700' : ''
        }`}
        onClick={() => {
          if (hasSubItems) {
            onToggle(item.href);
          } else {
            onClick();
          }
        }}
      >
        <Link
          to={item.href}
          className="flex items-center flex-1"
          onClick={onClick}
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
                onClick={onClick}
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
}
