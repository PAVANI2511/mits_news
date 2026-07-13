from django.urls import path
from .views import (
    PostCreateView,
    PostDetailView,
    HomeFeedView,
    LikePostView,
    UnlikePostView,
    SavePostView,
    UnsavePostView,
    SharePostView,
    GetSavedPostsView,
    MediaDownloadView,
    TrendingHashtagsView,
    FollowingFeedView,
    ExploreFeedView,
    ReportPostView
)

urlpatterns = [
    path('create/', PostCreateView.as_view(), name='post_create'),
    path('feed/', HomeFeedView.as_view(), name='home_feed'),
    path('following/', FollowingFeedView.as_view(), name='following_feed'),
    path('explore/', ExploreFeedView.as_view(), name='explore_feed'),
    path('saved/', GetSavedPostsView.as_view(), name='saved_posts'),
    path('trends/', TrendingHashtagsView.as_view(), name='trending_hashtags'),
    path('<int:pk>/', PostDetailView.as_view(), name='post_detail'),
    path('<int:pk>/like/', LikePostView.as_view(), name='like_post'),
    path('<int:pk>/unlike/', UnlikePostView.as_view(), name='unlike_post'),
    path('<int:pk>/save/', SavePostView.as_view(), name='save_post'),
    path('<int:pk>/unsave/', UnsavePostView.as_view(), name='unsave_post'),
    path('<int:pk>/share/', SharePostView.as_view(), name='share_post'),
    path('<int:pk>/download/', MediaDownloadView.as_view(), name='media_download'),
    path('<int:pk>/report/', ReportPostView.as_view(), name='report_post'),
]

