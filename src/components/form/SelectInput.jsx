export default function SelectInput({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      {label}
      <select
        value={value}
        onChange={onChange}
        className="rounded-lg px-3 py-2 text-sm border bg-gray-50 border-gray-200 text-gray-900 dark:bg-gray-900 dark:border-gray-700 dark:text-white"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
