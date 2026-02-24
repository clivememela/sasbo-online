import React from 'react';

export default function Footer({ absolute }) {
  return (
    <footer className={`${absolute ? 'absolute' : 'fixed'} bottom-0 left-0 right-0 p-4 text-center text-gray-500 dark:text-gray-400 text-sm border-t dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-50 ${absolute ? '' : 'lg:left-64'}`}>
      <p>© 2026 SASBO - The Finance Union</p>
    </footer>
  );
}
