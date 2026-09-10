export default function Footer({ absolute }) {
  return (
    <footer className={`${absolute ? 'absolute bottom-0 left-0 right-0 z-50' : 'mt-auto'} border-t border-line bg-surface/80 p-4 text-center text-sm text-ink-muted backdrop-blur-sm`}>
      <p>© 2026 SASBO - The Finance Union</p>
    </footer>
  );
}
