from django.urls import path
from .views import (
    ThemePreferenceSaveView,
    CustomThemeCreateView,
    ThemeDetailView
)

urlpatterns = [
    path('save/', ThemePreferenceSaveView.as_view(), name='theme_save_preference'),
    path('custom/', CustomThemeCreateView.as_view(), name='theme_create_custom'),
    path('detail/', ThemeDetailView.as_view(), name='theme_detail'),
]
