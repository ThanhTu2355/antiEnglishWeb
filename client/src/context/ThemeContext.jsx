import React, { createContext, useState, useEffect } from 'react';

export const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  // Themes: 'neutral' (default, balanced between white & black), 'light', 'dark'
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('antienglish_theme') || 'neutral';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.classList.toggle('dark', theme !== 'light');
    localStorage.setItem('antienglish_theme', theme);
  }, [theme]);

  const toggleTheme = (newTheme) => {
    if (newTheme) {
      setTheme(newTheme);
    } else {
      setTheme(prev => {
        if (prev === 'neutral') return 'light';
        if (prev === 'light') return 'dark';
        return 'neutral';
      });
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}
