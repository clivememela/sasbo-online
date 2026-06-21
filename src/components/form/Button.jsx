export default function Button({
  children,
  onClick,
  type = "button",
  variant = "default",
  disabled = false,
  className = "",
  ...rest
}) {
  const base = "inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border transition focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

  const variants = {
    default:  "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
    primary:  "border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-700 hover:border-cyan-700 dark:border-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700",
    ghost:    "border-transparent bg-transparent text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700",
    pagination: "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700",
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      {...rest}
      className={`${base} ${variants[variant] ?? variants.default} ${className}`}
    >
      {children}
    </button>
  );
}
