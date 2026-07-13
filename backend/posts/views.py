from rest_framework import status, views, generics, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.core.paginator import Paginator
import os

from .models import Post, Like, SavedPost
from .serializers import PostSerializer
from notifications.models import Notification

import threading

def send_new_post_notifications(post, author):
    # 1. Create in-app notifications for followers who have opted in
    from accounts.models import Follower
    try:
        followers = Follower.objects.filter(following=author).select_related('follower', 'follower__profile')
        for f in followers:
            follower_user = f.follower
            follower_profile = getattr(follower_user, 'profile', None)
            if follower_profile and getattr(follower_profile, 'followed_notifications_enabled', True):
                Notification.objects.create(
                    recipient=follower_user,
                    sender=author,
                    type='new_post',
                    post=post,
                    message=f"{author.first_name or author.username} published a new post: {post.caption[:50]}..."
                )
    except Exception as err:
        print(f"Error creating follower in-app notifications: {err}")



class PostCreateView(generics.CreateAPIView):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        post = serializer.save(user=request.user)
        
        # Dispatch notification emails asynchronously in a background thread
        threading.Thread(target=send_new_post_notifications, args=(post, request.user)).start()

        # Trigger mention notifications
        from notifications.models import create_mention_notifications
        create_mention_notifications(post.caption + " " + post.text, request.user, post=post)

        response_serializer = PostSerializer(post, context={'request': request})
        return Response(response_serializer.data, status=status.HTTP_201_CREATED)


class PostDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_blocked=False)
        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def put(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if post.user != request.user and not request.user.is_staff:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)

        # Basic fields update and validation
        caption = request.data.get('caption', post.caption).strip()
        text = request.data.get('text', post.text).strip()

        if not caption or not text:
            return Response({"detail": "Headline/Caption and Article details are required."}, status=status.HTTP_400_BAD_REQUEST)

        post.caption = caption
        post.text = text
        post.hashtags = request.data.get('hashtags', post.hashtags)
        post.location = request.data.get('location', post.location)
        post.music_url = request.data.get('music_url', post.music_url)

        # Check explicit clear flags
        if request.data.get('clear_image') == 'true':
            post.image = None
        if request.data.get('clear_video') == 'true':
            post.video = None
        if request.data.get('clear_audio') == 'true':
            post.audio = None
        if request.data.get('clear_poster') == 'true':
            post.poster = None
        if request.data.get('clear_pdf') == 'true':
            post.pdf = None

        # Files updates
        if 'image' in request.FILES:
            post.image = request.FILES['image']
        if 'video' in request.FILES:
            post.video = request.FILES['video']
        if 'audio' in request.FILES:
            post.audio = request.FILES['audio']
        if 'poster' in request.FILES:
            post.poster = request.FILES['poster']
        if 'pdf' in request.FILES:
            post.pdf = request.FILES['pdf']

        post.save()

        # Trigger mention notifications on edit
        from notifications.models import create_mention_notifications
        create_mention_notifications(caption + " " + text, request.user, post=post)

        serializer = PostSerializer(post, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if post.user != request.user and not request.user.is_staff:
            return Response({"error": "Permission denied."}, status=status.HTTP_403_FORBIDDEN)
        
        post.delete()
        return Response({"message": "Post deleted successfully."}, status=status.HTTP_200_OK)


class HomeFeedView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        query = request.query_params.get('q', '').strip()
        hashtag = request.query_params.get('hashtag', '').strip()
        username = request.query_params.get('username', '').strip()

        queryset = Post.objects.filter(is_blocked=False)
        if query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(caption__icontains=query) |
                Q(text__icontains=query) |
                Q(location__icontains=query)
            )
        if hashtag:
            queryset = queryset.filter(hashtags__icontains=hashtag)
        if username:
            queryset = queryset.filter(user__username=username)

        queryset = queryset.order_by('-created_at')

        total_count = queryset.count()
        skipped = (page - 1) * page_size
        page_items = queryset[skipped:skipped + page_size]

        serializer = PostSerializer(page_items, many=True, context={'request': request})
        has_next = (skipped + page_size) < total_count

        return Response({
            "results": serializer.data,
            "page": page,
            "has_next": has_next,
            "total_count": total_count
        }, status=status.HTTP_200_OK)


class LikePostView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like_rel, created = Like.objects.get_or_create(post=post, user=request.user)
        
        if created:
            # Notifications
            if post.user != request.user:
                Notification.objects.create(
                    recipient=post.user,
                    sender=request.user,
                    type='like',
                    post=post,
                    message=f"{request.user.first_name or request.user.username} liked your post."
                )
            return Response({"message": "Post liked successfully."}, status=status.HTTP_201_CREATED)
        return Response({"message": "Post already liked."}, status=status.HTTP_200_OK)


class UnlikePostView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like_rel = Like.objects.filter(post=post, user=request.user)
        if like_rel.exists():
            for l in like_rel:
                l.delete()
            return Response({"message": "Post unliked successfully."}, status=status.HTTP_200_OK)
        return Response({"error": "Post not liked yet."}, status=status.HTTP_400_BAD_REQUEST)


class SavePostView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        save_rel, created = SavedPost.objects.get_or_create(user=request.user, post=post)
        if created:
            return Response({"message": "Post saved successfully."}, status=status.HTTP_201_CREATED)
        return Response({"message": "Post already saved."}, status=status.HTTP_200_OK)


class UnsavePostView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        save_rel = SavedPost.objects.filter(user=request.user, post=post)
        if save_rel.exists():
            for s in save_rel:
                s.delete()
            return Response({"message": "Post unsaved successfully."}, status=status.HTTP_200_OK)
        return Response({"error": "Post not saved."}, status=status.HTTP_400_BAD_REQUEST)


class SharePostView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request, pk):
        from django.utils import timezone
        post = get_object_or_404(Post, pk=pk)
        post.share_count += 1
        post.last_shared_at = timezone.now()
        post.save()

        # Log share event
        from .models import ShareLog
        ShareLog.objects.create(
            post=post,
            user=request.user if request.user.is_authenticated else None
        )

        return Response({
            "message": "Post share recorded.",
            "share_count": post.share_count,
            "last_shared_at": post.last_shared_at.isoformat()
        }, status=status.HTTP_200_OK)



class GetSavedPostsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        saved_relations = SavedPost.objects.filter(user=request.user, post__is_blocked=False).order_by('-created_at').select_related('post')
        posts = [rel.post for rel in saved_relations]
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data, status=status.HTTP_200_OK)


class MediaDownloadView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        post = get_object_or_404(Post, pk=pk, is_blocked=False)

        # Determine media url requested
        media_type = request.query_params.get('type', 'image') # image, video, audio, poster, pdf
        media_field = getattr(post, media_type, None)
        media_url = media_field.url if media_field else ''

        if not media_url:
            return Response({"error": "Requested media file does not exist on this post."}, status=status.HTTP_404_NOT_FOUND)

        # Check permission:
        is_restricted = media_type in ['video', 'audio', 'poster', 'pdf']
        
        if is_restricted and (not request.user.is_authenticated):
            return Response({
                "error": "Viewers are not allowed to download restricted media. Please log in using your @mits.ac.in account."
            }, status=status.HTTP_403_FORBIDDEN)

        return Response({"download_url": media_url}, status=status.HTTP_200_OK)


class TrendingHashtagsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        from django.db.models import Q
        import re
        from collections import Counter
        
        posts = Post.objects.filter(is_blocked=False).values_list('hashtags', flat=True)
        all_tags = []
        for tags_str in posts:
            if tags_str:
                tokens = re.split(r'[\s,]+', tags_str)
                all_tags.extend([t.lstrip("#").lower() for t in tokens if t.strip()])
                
        counter = Counter(all_tags)
        trends = [{"tag": tag, "count": count} for tag, count in counter.most_common(10)]
        return Response(trends, status=status.HTTP_200_OK)


class FollowingFeedView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        
        from accounts.models import Follower
        followed_users = Follower.objects.filter(follower=request.user).values_list('following', flat=True)
        
        if not followed_users:
            return Response({
                "results": [],
                "page": page,
                "has_next": False,
                "total_count": 0
            }, status=status.HTTP_200_OK)
            
        queryset = Post.objects.filter(user__in=followed_users, is_blocked=False).order_by('-created_at')
        total_count = queryset.count()
        
        skipped = (page - 1) * page_size
        page_items = queryset[skipped:skipped + page_size]
        
        serializer = PostSerializer(page_items, many=True, context={'request': request})
        has_next = (skipped + page_size) < total_count
        
        return Response({
            "results": serializer.data,
            "page": page,
            "has_next": has_next,
            "total_count": total_count
        }, status=status.HTTP_200_OK)


class ExploreFeedView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        
        queryset = Post.objects.filter(is_blocked=False)
        posts_list = list(queryset)
        
        # We need to compute (likes_count * 2) + comments_count to sort them
        # Let's serialize the posts first to get their precomputed likes_count and comments_count
        serializer = PostSerializer(posts_list, many=True, context={'request': request})
        serialized_data = serializer.data
        
        # Sort by popularity: (likes_count * 2) + comments_count DESC, then created_at DESC
        serialized_data.sort(
            key=lambda x: (
                (x.get("likes_count", 0) * 2) + x.get("comments_count", 0), 
                x.get("created_at", "")
            ), 
            reverse=True
        )
        
        total_count = len(serialized_data)
        skipped = (page - 1) * page_size
        paginated_data = serialized_data[skipped : skipped + page_size]
        
        has_next = (skipped + page_size) < total_count
        return Response({
            "results": paginated_data,
            "page": page,
            "has_next": has_next,
            "total_count": total_count
        }, status=status.HTTP_200_OK)


class ReportPostView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        if post.user == request.user:
            return Response({"error": "You cannot report your own post."}, status=status.HTTP_400_BAD_REQUEST)
        
        reason = request.data.get('reason', '').strip()
        details = request.data.get('details', '').strip()

        if not reason:
            return Response({"error": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate reports
        from adminpanel.models import Report
        duplicate = Report.objects.filter(
            reporter=request.user,
            reported_post=post
        ).exists()

        if duplicate:
            return Response({"error": "You have already reported this post."}, status=status.HTTP_400_BAD_REQUEST)

        # Create report
        report = Report.objects.create(
            reporter=request.user,
            reported_post=post,
            reported_user=post.user,
            reason=reason,
            details=details,
            status='pending'
        )

        # Notify administrators
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                sender=request.user,
                type='admin_report',
                message=f"Post #{post.id} (by @{post.user.username}) was reported by @{request.user.username} for: {reason}."
            )

        return Response({
            "message": "Post reported successfully.",
            "report_id": report.id
        }, status=status.HTTP_201_CREATED)

