import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Interceptor to attach JWT token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor to handle authentication failures
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      const token = localStorage.getItem('token');
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // Redirect to login if user was logged in but session expired
      if (token && window.location.pathname !== '/login' && window.location.pathname !== '/register' && window.location.pathname !== '/') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API Endpoints
export const authAPI = {
  register: (data) => api.post('/auth/register/', data),
  login: (credentials) => api.post('/auth/login/', credentials),
  forgotPassword: (email) => api.post('/auth/forgot-password/', { email }),
  resetPassword: (email, otp, password) => api.post('/auth/reset-password/', { email, otp, password }),
  getProfile: (username) => api.get(`/auth/profile/${username}/`),
  updateProfile: (data) => api.put('/auth/profile/update/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  follow: (username) => api.post(`/auth/follow/${username}/`),
  unfollow: (username) => api.post(`/auth/unfollow/${username}/`),
  searchUsers: (params) => api.get('/auth/search/', { params }),
};

export const postsAPI = {
  create: (data) => api.post('/posts/create/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  getFeed: (params) => api.get('/posts/feed/', { params }),
  getSaved: () => api.get('/posts/saved/'),
  getDetail: (id) => api.get(`/posts/${id}/`),
  update: (id, data) => api.put(`/posts/${id}/`, data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/posts/${id}/`),
  like: (id) => api.post(`/posts/${id}/like/`),
  unlike: (id) => api.post(`/posts/${id}/unlike/`),
  save: (id) => api.post(`/posts/${id}/save/`),
  unsave: (id) => api.post(`/posts/${id}/unsave/`),
  getDownloadUrl: (id, type) => api.get(`/posts/${id}/download/`, { params: { type } }),
};

export const commentsAPI = {
  getList: (postId) => api.get(`/comments/post/${postId}/`),
  add: (postId, text) => api.post(`/comments/post/${postId}/add/`, { text }),
  delete: (id) => api.delete(`/comments/${id}/`),
  addReply: (commentId, text) => api.post(`/comments/${commentId}/reply/`, { text }),
};

export const notificationsAPI = {
  getList: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
};

export const themesAPI = {
  savePreference: (themeName) => api.post('/themes/save/', { theme_preference: themeName }),
  createCustom: (themeData) => api.post('/themes/custom/', themeData),
  getDetail: (themeName) => api.get('/themes/detail/', { params: { name: themeName } }),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats/'),
  getUsers: () => api.get('/admin/users/'),
  toggleBlockUser: (id) => api.post(`/admin/users/${id}/`),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  getPosts: () => api.get('/admin/posts/'),
  toggleBlockPost: (id) => api.post(`/admin/posts/${id}/`),
  deletePost: (id) => api.delete(`/admin/posts/${id}/`),
  getReports: () => api.get('/admin/reports/'),
  resolveReport: (id) => api.post(`/admin/reports/${id}/resolve/`),
  getAnnouncements: () => api.get('/admin/announcement/'),
  createAnnouncement: (data) => api.post('/admin/announcement/', data),
  getAnalytics: () => api.get('/admin/analytics/'),
};

export default api;
