import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:8000/api';

export const getMediaUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http') || path.startsWith('data:')) return path;
  return `${window.location.protocol}//${window.location.hostname}:8000${path}`;
};

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
  verifyOtp: (email, otp) => api.post('/auth/verify-otp/', { email, otp }),
  resetPassword: (email, otp, password) => api.post('/auth/reset-password/', { email, otp, password }),
  getProfile: (username) => api.get(`/auth/profile/${username}/`),
  getFollowers: (username) => api.get(`/auth/profile/${username}/followers/`),
  getFollowing: (username) => api.get(`/auth/profile/${username}/following/`),
  updateProfile: (data) => api.put('/auth/profile/update/', data, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  follow: (username) => api.post(`/auth/follow/${username}/`),
  unfollow: (username) => api.post(`/auth/unfollow/${username}/`),
  searchUsers: (params) => api.get('/auth/search/', { params }),
  deleteAccount: () => api.post('/auth/delete/'),
  getSuggestions: () => api.get('/auth/suggestions/'),
  reportProfile: (username, data) => api.post(`/auth/profile/${username}/report/`, data),
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
  share: (id) => api.post(`/posts/${id}/share/`),
  getDownloadUrl: (id, type) => api.get(`/posts/${id}/download/`, { params: { type } }),
  getTrends: () => api.get('/posts/trends/'),
  getFollowingFeed: (params) => api.get('/posts/following/', { params }),
  getExplore: (params) => api.get('/posts/explore/', { params }),
  report: (id, data) => api.post(`/posts/${id}/report/`, data),
};

export const commentsAPI = {
  getList: (postId) => api.get(`/comments/post/${postId}/`),
  add: (postId, content) => api.post(`/comments/post/${postId}/add/`, { content }),
  update: (id, content) => api.put(`/comments/${id}/`, { content }),
  delete: (id) => api.delete(`/comments/${id}/`),
  addReply: (commentId, content) => api.post(`/comments/${commentId}/reply/`, { content }),
  like: (id) => api.post(`/comments/${id}/like/`),
  unlike: (id) => api.post(`/comments/${id}/unlike/`),
  restore: (id) => api.post(`/comments/${id}/restore/`),
  permanentDelete: (id) => api.delete(`/comments/${id}/permanent/`),
  hide: (id) => api.post(`/comments/${id}/hide/`),
  unhide: (id) => api.post(`/comments/${id}/unhide/`),
  pin: (id) => api.post(`/comments/${id}/pin/`),
  unpin: (id) => api.post(`/comments/${id}/unpin/`),
  react: (id, reactionType) => api.post(`/comments/${id}/react/`, { reaction_type: reactionType }),
  getReactionsUsers: (id) => api.get(`/comments/${id}/reactions/`),
};

export const notificationsAPI = {
  getList: () => api.get('/notifications/'),
  markRead: (id) => api.post(`/notifications/${id}/read/`),
  markAllRead: () => api.post('/notifications/read-all/'),
  getUnreadCount: () => api.get('/notifications/unread-count/'),
};

export const themesAPI = {
  savePreference: (themeName) => api.post('/themes/save/', { theme_preference: themeName }),
  createCustom: (themeData) => api.post('/themes/custom/', themeData),
  getDetail: (themeName) => api.get('/themes/detail/', { params: { name: themeName } }),
};

export const adminAPI = {
  getStats: () => api.get('/admin/stats/'),
  getUsers: (params) => api.get('/admin/users/', { params }),
  toggleBlockUser: (id) => api.post(`/admin/users/${id}/`),
  deleteUser: (id) => api.delete(`/admin/users/${id}/`),
  getPosts: (params) => api.get('/admin/posts/', { params }),
  toggleBlockPost: (id) => api.post(`/admin/posts/${id}/`),
  deletePost: (id) => api.delete(`/admin/posts/${id}/`),
  getReports: (params) => api.get('/admin/reports/', { params }),
  resolveReport: (id) => api.post(`/admin/reports/${id}/resolve/`),
  updateReport: (id, data) => api.put(`/admin/reports/${id}/`, data),
  getReportDetail: (id) => api.get(`/admin/reports/${id}/`),
  getAnnouncements: () => api.get('/admin/announcement/'),
  createAnnouncement: (data) => api.post('/admin/announcement/', data),
  getAnalytics: (params) => api.get('/admin/analytics/', { params }),
  getComments: (params) => api.get('/admin/comments/', { params }),
  getFollows: () => api.get('/admin/follows/'),
  deleteFollow: (id) => api.delete(`/admin/follows/${id}/`),
};


export default api;
