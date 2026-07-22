export default function TextInput({ label, value, onChange, placeholder, type = "text", name }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400">
      <span>{label}</span>
      <input
        type={type}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        aria-label={label}
        className="rounded-lg px-3 py-2 text-sm font-normal normal-case tracking-normal border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 dark:focus:ring-cyan-400"
      />
    </label>
  );
}
