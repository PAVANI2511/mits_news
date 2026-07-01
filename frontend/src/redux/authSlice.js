import { createSlice } from '@reduxjs/toolkit';

const token = localStorage.getItem('token');
const user = localStorage.getItem('user') ? JSON.parse(localStorage.getItem('user')) : null;

const initialState = {
  token: token,
  user: user,
  isAuthenticated: !!token,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.isLoading = true;
      state.error = null;
    },
    loginSuccess(state, action) {
      state.isLoading = false;
      state.isAuthenticated = true;
      state.token = action.payload.access;
      state.user = action.payload.user;
      localStorage.setItem('token', action.payload.access);
      localStorage.setItem('user', JSON.stringify(action.payload.user));
    },
    loginFailure(state, action) {
      state.isLoading = false;
      state.error = action.payload;
      state.isAuthenticated = false;
      state.token = null;
      state.user = null;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    logout(state) {
      state.token = null;
      state.user = null;
      state.isAuthenticated = false;
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    },
    updateProfile(state, action) {
      if (state.user && state.user.profile) {
        state.user.profile = {
          ...state.user.profile,
          ...action.payload,
        };
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    },
    setThemePreference(state, action) {
      if (state.user && state.user.profile) {
        state.user.profile.theme_preference = action.payload;
        localStorage.setItem('user', JSON.stringify(state.user));
      }
    }
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile, setThemePreference } = authSlice.actions;
export default authSlice.reducer;
