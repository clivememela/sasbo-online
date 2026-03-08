export default function Button({ 
  children, 
  onClick, 
  type = "button", 
  variant = "default",
  disabled = false,
  className = ""
}) {
  const baseStyles = "px-3 py-1.5 rounded-md text-xs border transition font-medium";
  
  const variants = {
    default: "border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700",
    primary: "bg-cyan-600 hover:bg-cyan-700 text-white border-cyan-600 dark:border-cyan-600",
    pagination: "border-gray-200 bg-white hover:bg-gray-100 dark:border-gray-700 dark:bg-gray-900 dark:hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
