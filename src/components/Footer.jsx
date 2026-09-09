export default function Footer({ absolute }) {
  return (
    <footer className={`${absolute ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 p-4 text-center text-ink-muted text-sm border-t border-line bg-surface/80 backdrop-blur-sm z-50 ${absolute ? '' : 'lg:left-64'}`}>
      <p>© 2026 SASBO - The Finance Union</p>
    </footer>
  );
}
