from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db.models import Count

from .models import Comment, CommentReaction
from .serializers import CommentSerializer
from posts.models import Post
from notifications.models import Notification

class CommentCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, post_id):
        post = get_object_or_404(Post, pk=post_id)
        content = (request.data.get('content') or request.data.get('text') or '').strip()
        if not content:
            return Response({"error": "Comment content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        comment = Comment.objects.create(
            post=post,
            user=request.user,
            content=content
        )

        # Increment user's behavioral interest score based on category type
        profile = getattr(request.user, 'profile', None)
        if profile and post.category:
            if post.category.is_tech:
                profile.tech_score += 1
            else:
                profile.non_tech_score += 1
            profile.save()

        # Trigger mention notifications
        from notifications.models import create_mention_notifications
        create_mention_notifications(content, request.user, post=post, comment=comment)

        # Notify post owner
        if post.user != request.user:
            user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
            post_title = post.caption[:40] if post.caption else (post.text[:40] if post.text else 'article')
            Notification.objects.create(
                recipient=post.user,
                sender=request.user,
                type='comment',
                post=post,
                comment=comment,
                message=f"{user_name} commented on your article \"{post_title}\"."
            )

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def put(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        # Only the comment author or admin can edit content (Post owner cannot edit author's content)
        if comment.user != request.user and not request.user.is_staff and not request.user.is_superuser:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        
        content = (request.data.get('content') or request.data.get('text') or '').strip()
        if not content:
            return Response({"error": "Comment content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        comment.content = content
        comment.is_edited = True
        comment.updated_at = timezone.now()
        comment.save()

        # Trigger mention notifications on edit
        from notifications.models import create_mention_notifications
        create_mention_notifications(content, request.user, post=comment.post, comment=comment)

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        # Comment Author, Post Owner, or Admin can delete
        if comment.user != request.user and comment.post.user != request.user and not request.user.is_staff and not request.user.is_superuser:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        comment.is_deleted = True
        comment.deleted_at = timezone.now()
        comment.save()

        serializer = CommentSerializer(comment, context={'request': request})
        return Response({
            "message": "Comment soft deleted successfully.",
            "comment": serializer.data
        }, status=status.HTTP_200_OK)


class CommentRestoreView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        comment.is_deleted = False
        comment.deleted_at = None
        comment.save()

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommentPermanentDeleteView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        comment.delete()
        return Response({"message": "Comment permanently deleted."}, status=status.HTTP_200_OK)


class ReplyCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, comment_id):
        parent_comment = get_object_or_404(Comment, pk=comment_id)
        content = (request.data.get('content') or request.data.get('text') or '').strip()
        if not content:
            return Response({"error": "Reply content cannot be empty."}, status=status.HTTP_400_BAD_REQUEST)

        reply = Comment.objects.create(
            post=parent_comment.post,
            user=request.user,
            parent_comment=parent_comment,
            content=content
        )

        # Trigger mention notifications
        from notifications.models import create_mention_notifications
        create_mention_notifications(content, request.user, post=parent_comment.post, comment=reply)

        user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
        post = parent_comment.post
        post_title = post.caption[:40] if post.caption else (post.text[:40] if post.text else 'post')

        # Notify parent comment owner
        if parent_comment.user != request.user:
            Notification.objects.create(
                recipient=parent_comment.user,
                sender=request.user,
                type='reply',
                post=post,
                comment=reply,
                message=f"{user_name} replied to your comment on \"{post_title}\"."
            )

        # Notify post owner (if not the replier and not already notified as parent owner)
        if post.user != request.user and post.user != parent_comment.user:
            Notification.objects.create(
                recipient=post.user,
                sender=request.user,
                type='reply',
                post=post,
                comment=reply,
                message=f"{user_name} replied to a comment on your post \"{post_title}\"."
            )

        serializer = CommentSerializer(reply, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class CommentLikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        reaction, created = CommentReaction.objects.get_or_create(comment=comment, user=request.user, defaults={"reaction_type": "like"})
        if not created and reaction.reaction_type != 'like':
            reaction.reaction_type = 'like'
            reaction.save()
        return Response({"likes_count": comment.reactions.count(), "is_liked": True}, status=status.HTTP_200_OK)


class CommentUnlikeView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        CommentReaction.objects.filter(comment=comment, user=request.user).delete()
        return Response({"likes_count": comment.reactions.count(), "is_liked": False}, status=status.HTTP_200_OK)


class CommentReactView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        reaction_type = request.data.get('reaction_type', 'like').strip().lower()
        
        valid_types = [r[0] for r in CommentReaction.REACTION_TYPES]
        if reaction_type not in valid_types:
            return Response({"error": f"Invalid reaction type. Must be one of: {', '.join(valid_types)}"}, status=status.HTTP_400_BAD_REQUEST)

        existing_reaction = CommentReaction.objects.filter(comment=comment, user=request.user).first()
        
        if existing_reaction:
            if existing_reaction.reaction_type == reaction_type:
                existing_reaction.delete()
                my_reaction = None
            else:
                existing_reaction.reaction_type = reaction_type
                existing_reaction.save()
                my_reaction = reaction_type
        else:
            CommentReaction.objects.create(comment=comment, user=request.user, reaction_type=reaction_type)
            my_reaction = reaction_type
            
            # Send Notification to post owner
            post = comment.post
            if post.user != request.user:
                emoji = next((r[1].split(' ')[0] for r in CommentReaction.REACTION_TYPES if r[0] == reaction_type), '👍')
                Notification.objects.create(
                    recipient=post.user,
                    sender=request.user,
                    type='like',
                    post=post,
                    comment=comment,
                    message=f"{request.user.first_name or request.user.username} reacted {emoji} to a comment on your post."
                )

        all_reactions = list(comment.reactions.all())
        summary = {r[0]: 0 for r in CommentReaction.REACTION_TYPES}
        for r in all_reactions:
            summary[r.reaction_type] = summary.get(r.reaction_type, 0) + 1
            
        return Response({
            "my_reaction": my_reaction,
            "total_reactions": len(all_reactions),
            "reactions_summary": summary
        }, status=status.HTTP_200_OK)


class CommentReactionsUsersView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        reactions = comment.reactions.select_related('user', 'user__profile').order_by('-created_at')
        
        results = []
        for r in reactions:
            profile = getattr(r.user, 'profile', None)
            results.append({
                "user_id": r.user.id,
                "username": r.user.username,
                "name": f"{r.user.first_name} {r.user.last_name}".strip() or r.user.username,
                "profile_pic": profile.profile_pic.url if profile and profile.profile_pic else '',
                "reaction_type": r.reaction_type,
                "emoji": next((item[1].split(' ')[0] for item in CommentReaction.REACTION_TYPES if item[0] == r.reaction_type), '👍')
            })
        return Response(results, status=status.HTTP_200_OK)


class CommentHideView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if comment.post.user != request.user:
            return Response({"error": "Only the post owner can hide comments."}, status=status.HTTP_403_FORBIDDEN)

        comment.is_hidden = True
        comment.hidden_by = request.user
        comment.hidden_at = timezone.now()
        comment.save()

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommentUnhideView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if comment.post.user != request.user:
            return Response({"error": "Only the post owner can unhide comments."}, status=status.HTTP_403_FORBIDDEN)

        comment.is_hidden = False
        comment.hidden_by = None
        comment.hidden_at = None
        comment.save()

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommentPinView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if comment.post.user != request.user:
            return Response({"error": "Only the post owner can pin comments."}, status=status.HTTP_403_FORBIDDEN)

        comment.is_pinned = True
        comment.pinned_at = timezone.now()
        comment.save()

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class CommentUnpinView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        comment = get_object_or_404(Comment, pk=pk)
        if comment.post.user != request.user:
            return Response({"error": "Only the post owner can unpin comments."}, status=status.HTTP_403_FORBIDDEN)

        comment.is_pinned = False
        comment.pinned_at = None
        comment.save()

        serializer = CommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class PostCommentsListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, post_id):
        comments = Comment.objects.filter(post_id=post_id).select_related('user', 'user__profile').prefetch_related('reactions', 'reactions__user', 'reactions__user__profile')
        
        for c in comments:
            c.precalculated_reactions = list(c.reactions.all())

        serializer = CommentSerializer(comments, many=True, context={'request': request})
        comments_data = serializer.data
        
        # 1. Filter out hidden comments based on user permissions
        is_admin = request.user and (request.user.is_staff or request.user.is_superuser)
        post = get_object_or_404(Post, pk=post_id)
        is_post_owner = request.user and request.user.is_authenticated and (post.user == request.user)
        
        visible_comments = []
        for c in comments_data:
            if c['is_hidden']:
                is_comment_author = request.user and request.user.is_authenticated and (str(c['user']['id']) == str(request.user.id))
                if is_admin or is_post_owner or is_comment_author:
                    visible_comments.append(c)
            else:
                visible_comments.append(c)
                
        # 2. Build recursive tree in memory
        comment_dict = {c['id']: c for c in visible_comments}
        for c in visible_comments:
            c['replies'] = []
            
        root_comments = []
        for c in visible_comments:
            parent_id = c['parent_comment']
            if parent_id:
                parent = comment_dict.get(parent_id)
                if parent:
                    parent['replies'].append(c)
            else:
                root_comments.append(c)
                
        # 3. Sort root comments: Pinned comments first (by pinned_at descending), then unpinned by created_at descending
        root_comments.sort(key=lambda x: (x["is_pinned"], x["pinned_at"] or x["created_at"] or ""), reverse=True)
        
        # 4. Sort nested replies chronologically (oldest first)
        def sort_replies_recursive(comment_node):
            comment_node["replies"].sort(key=lambda x: x["created_at"] or "")
            for reply in comment_node["replies"]:
                sort_replies_recursive(reply)
                
        for root in root_comments:
            sort_replies_recursive(root)
            
        return Response(root_comments, status=status.HTTP_200_OK)
