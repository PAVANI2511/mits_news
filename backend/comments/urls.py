from django.urls import path
from .views import (
    PostCommentsListView,
    CommentCreateView,
    CommentDetailView,
    ReplyCreateView,
    CommentLikeView,
    CommentUnlikeView,
    CommentRestoreView,
    CommentPermanentDeleteView,
    CommentHideView,
    CommentUnhideView,
    CommentPinView,
    CommentUnpinView,
    CommentReactView,
    CommentReactionsUsersView
)

urlpatterns = [
    path('post/<int:post_id>/', PostCommentsListView.as_view(), name='comments_list'),
    path('post/<int:post_id>/add/', CommentCreateView.as_view(), name='comment_add'),
    path('<int:pk>/', CommentDetailView.as_view(), name='comment_detail'),
    path('<int:comment_id>/reply/', ReplyCreateView.as_view(), name='reply_add'),
    path('<int:pk>/like/', CommentLikeView.as_view(), name='comment_like'),
    path('<int:pk>/unlike/', CommentUnlikeView.as_view(), name='comment_unlike'),
    path('<int:pk>/restore/', CommentRestoreView.as_view(), name='comment_restore'),
    path('<int:pk>/permanent/', CommentPermanentDeleteView.as_view(), name='comment_permanent_delete'),
    path('<int:pk>/hide/', CommentHideView.as_view(), name='comment_hide'),
    path('<int:pk>/unhide/', CommentUnhideView.as_view(), name='comment_unhide'),
    path('<int:pk>/pin/', CommentPinView.as_view(), name='comment_pin'),
    path('<int:pk>/unpin/', CommentUnpinView.as_view(), name='comment_unpin'),
    path('<int:pk>/react/', CommentReactView.as_view(), name='comment_react'),
    path('<int:pk>/reactions/', CommentReactionsUsersView.as_view(), name='comment_reactions_list'),
]
