from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User

from .models import Comment, Reply
from posts.models import Post
from notifications.models import Notification
from db_connection import comments_col

class CommentCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(Post, pk=post_id)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({"error": "Comment text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            post=post,
            user=request.user,
            text=text
        )

        # Notify post owner
        if post.user != request.user:
            Notification.objects.create(
                recipient=post.user,
                sender=request.user,
                type='comment',
                post=post,
                comment=comment,
                message=f"{request.user.first_name or request.user.username} commented on your post."
            )

        # Fetch MongoDB document
        comment_doc = comments_col.find_one({"_id": str(comment.id)})
        if comment_doc:
            comment_doc["id"] = comment_doc.pop("_id")

        return Response(comment_doc, status=status.HTTP_201_CREATED)


class CommentDeleteView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        # Permitted to comment owner, post owner, or admin
        if comment.user != request.user and comment.post.user != request.user and not request.user.is_staff:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response({"message": "Comment deleted successfully."}, status=status.HTTP_200_OK)


class ReplyCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        comment = get_object_or_404(Comment, pk=comment_id)
        text = request.data.get('text', '').strip()
        if not text:
            return Response({"error": "Reply text cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        reply = Reply.objects.create(
            comment=comment,
            user=request.user,
            text=text
        )

        # Notify comment owner
        if comment.user != request.user:
            Notification.objects.create(
                recipient=comment.user,
                sender=request.user,
                type='reply',
                post=comment.post,
                comment=comment,
                message=f"{request.user.first_name or request.user.username} replied to your comment."
            )

        # Fetch MongoDB updated comment document
        comment_doc = comments_col.find_one({"_id": str(comment.id)})
        if comment_doc:
            comment_doc["id"] = comment_doc.pop("_id")

        return Response(comment_doc, status=status.HTTP_201_CREATED)


class PostCommentsListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, post_id):
        # Query MongoDB comments collection sorted by newest comments
        cursor = comments_col.find({"post_id": str(post_id)}).sort("created_at", -1)
        results = []
        for doc in cursor:
            doc["id"] = doc.pop("_id")
            results.append(doc)
        return Response(results, status=status.HTTP_200_OK)
