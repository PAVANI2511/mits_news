from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    RegisterView,
    CustomTokenObtainPairView,
    UserProfileView,
    UpdateProfileView,
    FollowUserView,
    UnfollowUserView,
    ForgotPasswordView,
    ResetPasswordView,
    SearchUsersView
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('profile/update/', UpdateProfileView.as_view(), name='profile_update'),
    path('profile/<str:username>/', UserProfileView.as_view(), name='profile_detail'),
    path('follow/<str:username>/', FollowUserView.as_view(), name='follow_user'),
    path('unfollow/<str:username>/', UnfollowUserView.as_view(), name='unfollow_user'),
    path('search/', SearchUsersView.as_view(), name='search_users'),
]
