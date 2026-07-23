import { createSlice } from '@reduxjs/toolkit';

const presets = {
  light: {
    name: 'light',
    primary: '#800000',
    secondary: '#660000',
    bg: '#f8f6f2',
    text: '#1f2937',
    card: '#ffffff',
    border: '#e5e0d8'
  },
  dark: {
    name: 'dark',
    primary: '#3b82f6',
    secondary: '#60a5fa',
    bg: '#0b0f19',
    text: '#f9fafb',
    card: '#111827',
    border: '#1f2937'
  },
  blue: {
    name: 'blue',
    primary: '#2563eb',
    secondary: '#1d4ed8',
    bg: '#eff6ff',
    text: '#1e3a8a',
    card: '#ffffff',
    border: '#dbeafe'
  },
  purple: {
    name: 'purple',
    primary: '#7c3aed',
    secondary: '#6d28d9',
    bg: '#faf5ff',
    text: '#581c87',
    card: '#ffffff',
    border: '#f3e8ff'
  },
  green: {
    name: 'green',
    primary: '#16a34a',
    secondary: '#15803d',
    bg: '#f0fdf4',
    text: '#14532d',
    card: '#ffffff',
    border: '#dcfce7'
  },
  college: {
    name: 'college',
    primary: '#b91c1c',
    secondary: '#7f1d1d',
    bg: '#fff5f5',
    text: '#7f1d1d',
    card: '#ffffff',
    border: '#fee2e2'
  }
};

const savedTheme = localStorage.getItem('theme_preference') || 'light';
const activeTheme = presets[savedTheme] || presets.light;

const initialState = {
  currentTheme: activeTheme,
  presets,
};

const themeSlice = createSlice({
  name: 'theme',
  initialState,
  reducers: {
    changeTheme(state, action) {
      const themeName = action.payload;
      if (state.presets[themeName]) {
        state.currentTheme = state.presets[themeName];
        localStorage.setItem('theme_preference', themeName);
      }
    },
    setCustomTheme(state, action) {
      state.currentTheme = {
        name: 'custom',
        ...action.payload,
      };
      localStorage.setItem('theme_preference', 'custom');
    }
  },
});

export const { changeTheme, setCustomTheme } = themeSlice.actions;
export default themeSlice.reducer;
