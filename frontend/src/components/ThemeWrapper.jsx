import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';

const ThemeWrapper = ({ children }) => {
  const currentTheme = useSelector((state) => state.theme.currentTheme);

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-primary', currentTheme.primary);
    root.style.setProperty('--color-secondary', currentTheme.secondary);
    root.style.setProperty('--color-bg', currentTheme.bg);
    root.style.setProperty('--color-text', currentTheme.text);
    root.style.setProperty('--color-card', currentTheme.card);
    root.style.setProperty('--color-border', currentTheme.border);
  }, [currentTheme]);

  return <>{children}</>;
};

export default ThemeWrapper;
