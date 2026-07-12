from django.urls import path
from .views import (
    NotificationsListView,
    MarkNotificationReadView,
    MarkAllNotificationsReadView,
    UnreadNotificationsCountView
)

urlpatterns = [
    path('', NotificationsListView.as_view(), name='notifications_list'),
    path('unread-count/', UnreadNotificationsCountView.as_view(), name='notifications_unread_count'),
    path('read-all/', MarkAllNotificationsReadView.as_view(), name='notifications_read_all'),
    path('<int:pk>/read/', MarkNotificationReadView.as_view(), name='notification_read'),
]
