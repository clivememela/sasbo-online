import { createContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'darkMode';

/**
 * R-ROB-D. Both `localStorage` calls are wrapped, and the READ matters most.
 *
 * Safari in private mode, a browser configured to block site data, and some
 * embedded webviews all THROW on `localStorage` rather than returning null. The
 * read below runs inside `useState`'s initialiser, which runs during render --
 * above every error boundary in the tree. An uncaught throw there is not a
 * degraded theme, it is a WHITE PAGE, and no boundary in this app can catch it.
 *
 * The fallback is "light", the same answer a missing key gives, so a browser
 * that cannot remember the choice still renders correctly -- it just forgets.
 */
const readStoredTheme = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

const storeTheme = (darkMode) => {
  try {
    localStorage.setItem(STORAGE_KEY, darkMode);
  } catch {
    // Cannot persist. The theme still applies for this page; only memory is lost.
  }
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [darkMode, setDarkMode] = useState(readStoredTheme);

  useEffect(() => {
    storeTheme(darkMode);
    // The pre-paint script in index.html has already set this on first load;
    // re-applying is what keeps it correct on every subsequent toggle.
    document.documentElement.classList.toggle('dark', darkMode);
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode((previous) => !previous);

  return (
    <ThemeContext.Provider value={{ darkMode, toggleDarkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  );
};

export { ThemeContext };
