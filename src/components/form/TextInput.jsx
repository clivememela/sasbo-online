export default function TextInput({ label, value, onChange, placeholder, type = "text" }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      {label}
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
      />
    </label>
  );
}
