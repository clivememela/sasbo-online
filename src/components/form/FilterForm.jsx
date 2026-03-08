export default function FilterForm({ children, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="max-w-6xl mx-auto p-6 rounded-2xl shadow-lg bg-white dark:bg-gray-800">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {children}
      </div>
    </form>
  );
}
