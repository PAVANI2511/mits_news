import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import store from './redux/store';
import ThemeWrapper from './components/ThemeWrapper';

// Pages
import LandingPage from './pages/LandingPage';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import HomeFeed from './pages/HomeFeed';
import CreatePost from './pages/CreatePost';
import EditPost from './pages/EditPost';
import PostDetails from './pages/PostDetails';
import UserProfile from './pages/UserProfile';
import Search from './pages/Search';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import SavedPosts from './pages/SavedPosts';
import FollowingFeed from './pages/FollowingFeed';
import ExploreFeed from './pages/ExploreFeed';

// Admin Pages
import AdminLogin from './pages/AdminLogin';
import AdminDashboard from './pages/AdminDashboard';
import UserManagement from './pages/UserManagement';
import PostManagement from './pages/PostManagement';
import Reports from './pages/Reports';
import Announcements from './pages/Announcements';
import CommentManagement from './pages/CommentManagement';
import FollowManagement from './pages/FollowManagement';

function App() {
  return (
    <Provider store={store}>
      <ThemeWrapper>
        <Router>
          <Routes>
            {/* Public Pages */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/feed" element={<HomeFeed />} />
            <Route path="/explore" element={<ExploreFeed />} />
            
            {/* Student Protected Pages */}
            <Route path="/create-post" element={<CreatePost />} />
            <Route path="/posts/:id" element={<PostDetails />} />
            <Route path="/posts/:id/edit" element={<EditPost />} />
            <Route path="/profile/:username" element={<UserProfile />} />
            <Route path="/search" element={<Search />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/saved" element={<SavedPosts />} />
            <Route path="/following" element={<FollowingFeed />} />

            {/* Admin Console Pages */}
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/users" element={<UserManagement />} />
            <Route path="/admin/posts" element={<PostManagement />} />
            <Route path="/admin/reports" element={<Reports />} />
            <Route path="/admin/announcements" element={<Announcements />} />
            <Route path="/admin/comments" element={<CommentManagement />} />
            <Route path="/admin/follows" element={<FollowManagement />} />
          </Routes>
        </Router>
      </ThemeWrapper>
    </Provider>
  );
}

export default App;
