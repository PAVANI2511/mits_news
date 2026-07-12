from django.urls import path
from .views import (
    AdminDashboardStatsView,
    AdminUsersListView,
    AdminUserBlockView,
    AdminPostsListView,
    AdminPostBlockView,
    AdminReportsListView,
    AdminReportResolveView,
    AdminAnnouncementView,
    AdminAnalyticsView,
    AdminCommentsListView,
    AdminFollowsListView,
    AdminFollowDeleteView
)

urlpatterns = [
    path('stats/', AdminDashboardStatsView.as_view(), name='admin_stats'),
    path('users/', AdminUsersListView.as_view(), name='admin_users'),
    path('users/<int:user_id>/', AdminUserBlockView.as_view(), name='admin_user_action'),
    path('posts/', AdminPostsListView.as_view(), name='admin_posts'),
    path('posts/<int:pk>/', AdminPostBlockView.as_view(), name='admin_post_action'),
    path('reports/', AdminReportsListView.as_view(), name='admin_reports'),
    path('reports/<int:pk>/resolve/', AdminReportResolveView.as_view(), name='admin_report_resolve'),
    path('announcement/', AdminAnnouncementView.as_view(), name='admin_announcement'),
    path('analytics/', AdminAnalyticsView.as_view(), name='admin_analytics'),
    path('comments/', AdminCommentsListView.as_view(), name='admin_comments'),
    path('follows/', AdminFollowsListView.as_view(), name='admin_follows'),
    path('follows/<int:pk>/', AdminFollowDeleteView.as_view(), name='admin_follow_action'),
]
