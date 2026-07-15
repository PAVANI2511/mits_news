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
    SearchUsersView,
    DeleteAccountView,
    VerifyOTPView,
    UserFollowersListView,
    UserFollowingListView,
    SuggestedUsersView,
    ReportUserProfileView,
    debug_cloudinary_settings
)

urlpatterns = [
    path('debug-cloudinary/', debug_cloudinary_settings, name='debug_cloudinary'),
    path('suggestions/', SuggestedUsersView.as_view(), name='suggested_users'),
    path('register/', RegisterView.as_view(), name='register'),
    path('login/', CustomTokenObtainPairView.as_view(), name='login'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('forgot-password/', ForgotPasswordView.as_view(), name='forgot_password'),
    path('verify-otp/', VerifyOTPView.as_view(), name='verify_otp'),
    path('reset-password/', ResetPasswordView.as_view(), name='reset_password'),
    path('profile/update/', UpdateProfileView.as_view(), name='profile_update'),
    path('profile/<str:username>/', UserProfileView.as_view(), name='profile_detail'),
    path('profile/<str:username>/followers/', UserFollowersListView.as_view(), name='user_followers'),
    path('profile/<str:username>/following/', UserFollowingListView.as_view(), name='user_following'),
    path('profile/<str:username>/report/', ReportUserProfileView.as_view(), name='report_profile'),
    path('follow/<str:username>/', FollowUserView.as_view(), name='follow_user'),
    path('unfollow/<str:username>/', UnfollowUserView.as_view(), name='unfollow_user'),
    path('search/', SearchUsersView.as_view(), name='search_users'),
    path('delete/', DeleteAccountView.as_view(), name='delete_account'),
]

