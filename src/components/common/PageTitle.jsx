export default function PageTitle({ title, subtitle }) {
  return (
    <div className="mb-8">
      <h2 className="text-3xl text-center text-cyan-700 dark:text-cyan-400">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xl text-center mt-2 text-cyan-600 dark:text-cyan-500">
          {subtitle}
        </p>
      )}
    </div>
  );
}
