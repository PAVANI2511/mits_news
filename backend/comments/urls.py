from django.urls import path
from .views import (
    CommentCreateView,
    CommentDeleteView,
    ReplyCreateView,
    PostCommentsListView
)

urlpatterns = [
    path('post/<int:post_id>/', PostCommentsListView.as_view(), name='comments_list'),
    path('post/<int:post_id>/add/', CommentCreateView.as_view(), name='comment_add'),
    path('<int:pk>/', CommentDeleteView.as_view(), name='comment_delete'),
    path('<int:comment_id>/reply/', ReplyCreateView.as_view(), name='reply_add'),
]
