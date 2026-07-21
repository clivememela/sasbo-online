import { Link } from "react-router-dom";

export default function NavigationCard({ title, icon: Icon, href, desc, color, onSelect }) {
  return (
    <Link
      to={href}
      onClick={onSelect}
      className="p-6 rounded-lg shadow-lg transition-shadow bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 hover:shadow-xl dark:hover:shadow-2xl"
    >
      {Icon && <Icon
        size={48}
        strokeWidth={1}
        className="mb-4 mx-auto text-shadow-cyan-500 dark:text-shadow-white"
      />}
      <h3 className={`text-xl mb-2 ${color ? color : 'text-cyan-800 dark:text-cyan-300'}`}>{title}</h3>
      {desc && <p className="text-gray-600 dark:text-gray-300">{desc}</p>}
    </Link>
  );
}
