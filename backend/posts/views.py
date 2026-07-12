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
from db_connection import posts_col, likes_col, saved_posts_col, followers_col

import threading
from django.core.mail import send_mail

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

    # Query all users who have opted in for email notifications
    # Excluding empty emails and the author themselves
    recipients = list(User.objects.filter(
        profile__email_notifications_enabled=True
    ).exclude(
        email=''
    ).exclude(
        id=author.id
    ).values_list('email', flat=True))
    
    if not recipients:
        return
        
    subject = "New Article Published on MITS Newspaper"
    message = f"Hello,\n\nA new article has been published by @{author.username} on MITS Newspaper!\n\nHeadline: {post.caption}\n\nRead the article here: http://localhost:5173/posts/{post.id}"
    
    try:
        send_mail(
            subject=subject,
            message=message,
            from_email="no-reply@mits.ac.in",
            recipient_list=recipients,
            fail_silently=False,
        )
    except Exception as e:
        print(f"Error sending new post email notifications: {e}")


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

        # Fetch fresh synced post from MongoDB
        post_doc = posts_col.find_one({"_id": str(post.id)})
        if post_doc:
            post_doc["id"] = post_doc.pop("_id")
            post_doc["likes_count"] = 0
            post_doc["comments_count"] = 0
            post_doc["saved_count"] = 0
            post_doc["share_count"] = 0
            post_doc["is_liked"] = False
            post_doc["is_saved"] = False
            post_doc["is_following"] = False
        return Response(post_doc or serializer.data, status=status.HTTP_201_CREATED)


class PostDetailView(views.APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, pk):
        # Query MongoDB
        post_doc = posts_col.find_one({"_id": str(pk), "is_blocked": False})
        if not post_doc:
            return Response({"error": "Post not found or blocked."}, status=status.HTTP_404_NOT_FOUND)

        post_doc["id"] = post_doc.pop("_id")
        
        # Inject like, comment, and save counts
        post_doc["likes_count"] = likes_col.count_documents({"post_id": str(pk)})
        from db_connection import comments_col
        post_doc["comments_count"] = comments_col.count_documents({"post_id": str(pk)})
        post_doc["saved_count"] = saved_posts_col.count_documents({"post_id": str(pk)})
        post_doc["share_count"] = post_doc.get("share_count", 0)
        
        # Inject current user states
        post_doc["is_liked"] = False
        post_doc["is_saved"] = False
        if request.user.is_authenticated:
            post_doc["is_liked"] = likes_col.count_documents({"post_id": str(pk), "user_id": str(request.user.id)}) > 0
            post_doc["is_saved"] = saved_posts_col.count_documents({"post_id": str(pk), "user_id": str(request.user.id)}) > 0

        return Response(post_doc, status=status.HTTP_200_OK)

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

        post_doc = posts_col.find_one({"_id": str(post.id)})
        if post_doc:
            post_doc["id"] = post_doc.pop("_id")
        return Response(post_doc, status=status.HTTP_200_OK)

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

        # Build mongo query
        mongo_query = {"is_blocked": False}
        if query:
            import re
            escaped_query = re.escape(query)
            mongo_query["$or"] = [
                {"caption": re.compile(escaped_query, re.IGNORECASE)},
                {"text": re.compile(escaped_query, re.IGNORECASE)},
                {"location": re.compile(escaped_query, re.IGNORECASE)}
            ]
        if hashtag:
            mongo_query["hashtags"] = hashtag.strip("#")
        if username:
            mongo_query["username"] = username

        # Total post docs sorting by newest
        posts_cursor = posts_col.find(mongo_query).sort("created_at", -1)
        
        # Paginate manually via PyMongo
        total_count = posts_col.count_documents(mongo_query)
        skipped = (page - 1) * page_size
        posts_list = list(posts_cursor.skip(skipped).limit(page_size))

        results = []
        for doc in posts_list:
            post_id = doc["_id"]
            doc["id"] = post_id
            doc.pop("_id", None)
            
            # Fetch likes, comments & saves count from MongoDB
            doc["likes_count"] = likes_col.count_documents({"post_id": str(post_id)})
            from db_connection import comments_col
            doc["comments_count"] = comments_col.count_documents({"post_id": str(post_id)})
            doc["saved_count"] = saved_posts_col.count_documents({"post_id": str(post_id)})
            doc["share_count"] = doc.get("share_count", 0)

            # Inject request.user follow state, liked, saved
            doc["is_liked"] = False
            doc["is_saved"] = False
            doc["is_following"] = False
            
            if request.user.is_authenticated:
                doc["is_liked"] = likes_col.count_documents({"post_id": str(post_id), "user_id": str(request.user.id)}) > 0
                doc["is_saved"] = saved_posts_col.count_documents({"post_id": str(post_id), "user_id": str(request.user.id)}) > 0
                doc["is_following"] = followers_col.count_documents({"follower_id": str(request.user.id), "following_id": str(doc["user_id"])}) > 0

            results.append(doc)

        has_next = (skipped + page_size) < total_count

        return Response({
            "results": results,
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
        return Response({
            "message": "Post share recorded.",
            "share_count": post.share_count,
            "last_shared_at": post.last_shared_at.isoformat()
        }, status=status.HTTP_200_OK)


class GetSavedPostsView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        # Fetch saved post IDs from MongoDB, sorted by when they were bookmarked (newest first)
        user_id = str(request.user.id)
        saved_cursor = saved_posts_col.find({"user_id": user_id}).sort("created_at", -1)
        post_ids = [doc["post_id"] for doc in saved_cursor]

        # Fetch actual post details
        posts_cursor = posts_col.find({"_id": {"$in": post_ids}, "is_blocked": False})
        posts_map = {str(doc["_id"]): doc for doc in posts_cursor}
        
        results = []
        for pid in post_ids:
            if pid in posts_map:
                doc = posts_map[pid]
                post_id = doc["_id"]
                
                # Make a copy to avoid mutating any cached object and pop _id safely
                doc_copy = dict(doc)
                doc_copy["id"] = str(post_id)
                doc_copy.pop("_id", None)
                
                doc_copy["likes_count"] = likes_col.count_documents({"post_id": str(post_id)})
                from db_connection import comments_col
                doc_copy["comments_count"] = comments_col.count_documents({"post_id": str(post_id)})
                doc_copy["saved_count"] = saved_posts_col.count_documents({"post_id": str(post_id)})
                doc_copy["share_count"] = doc_copy.get("share_count", 0)
                doc_copy["is_liked"] = likes_col.count_documents({"post_id": str(post_id), "user_id": user_id}) > 0
                doc_copy["is_saved"] = True
                doc_copy["is_following"] = followers_col.count_documents({"follower_id": user_id, "following_id": str(doc_copy["user_id"])}) > 0
                results.append(doc_copy)

        return Response(results, status=status.HTTP_200_OK)


class MediaDownloadView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, pk):
        # Check permissions: Viewers cannot download restricted media.
        # Restricted media: PDF, Audio, Video, Poster? Let's check user roles.
        # User roles:
        # 1. Viewer: No login (request.user.is_anonymous) -> Cannot download restricted media.
        # 2. Student: Logged in (request.user.is_authenticated) -> Can download.
        
        post_doc = posts_col.find_one({"_id": str(pk), "is_blocked": False})
        if not post_doc:
            return Response({"error": "Media not found."}, status=status.HTTP_404_NOT_FOUND)

        # Determine media url requested
        media_type = request.query_params.get('type', 'image') # image, video, audio, poster, pdf
        media_url = post_doc.get(media_type, '')

        if not media_url:
            return Response({"error": "Requested media file does not exist on this post."}, status=status.HTTP_404_NOT_FOUND)

        # Check permission:
        # "Cannot download restricted media" -> applies to Viewer. Student can download allowed media.
        # Let's say video, audio, posters, and PDFs are restricted media. Only students can download them.
        is_restricted = media_type in ['video', 'audio', 'poster', 'pdf']
        
        if is_restricted and (not request.user.is_authenticated):
            return Response({
                "error": "Viewers are not allowed to download restricted media. Please log in using your @mits.ac.in account."
            }, status=status.HTTP_403_FORBIDDEN)

        # Return download url or redirect
        return Response({"download_url": media_url}, status=status.HTTP_200_OK)


class TrendingHashtagsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        pipeline = [
            {"$match": {"is_blocked": False}},
            {"$unwind": "$hashtags"},
            {"$group": {"_id": "$hashtags", "count": {"$sum": 1}}},
            {"$sort": {"count": -1}},
            {"$limit": 10}
        ]
        results = list(posts_col.aggregate(pipeline))
        trends = [{"tag": r["_id"], "count": r["count"]} for r in results]
        return Response(trends, status=status.HTTP_200_OK)


class FollowingFeedView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        
        user_id = str(request.user.id)
        
        # Get IDs of users followed by the logged-in user
        following_cursor = followers_col.find({"follower_id": user_id})
        followed_ids = [doc["following_id"] for doc in following_cursor]
        
        if not followed_ids:
            return Response({
                "results": [],
                "page": page,
                "has_next": False,
                "total_count": 0
            }, status=status.HTTP_200_OK)
            
        mongo_query = {
            "user_id": {"$in": followed_ids},
            "is_blocked": False
        }
        
        posts_cursor = posts_col.find(mongo_query).sort("created_at", -1)
        total_count = posts_col.count_documents(mongo_query)
        
        skipped = (page - 1) * page_size
        posts_list = list(posts_cursor.skip(skipped).limit(page_size))
        
        results = []
        for doc in posts_list:
            post_id = doc["_id"]
            doc["id"] = post_id
            doc.pop("_id", None)
            
            doc["likes_count"] = likes_col.count_documents({"post_id": str(post_id)})
            from db_connection import comments_col
            doc["comments_count"] = comments_col.count_documents({"post_id": str(post_id)})
            doc["saved_count"] = saved_posts_col.count_documents({"post_id": str(post_id)})
            doc["share_count"] = doc.get("share_count", 0)
            
            doc["is_liked"] = likes_col.count_documents({"post_id": str(post_id), "user_id": user_id}) > 0
            doc["is_saved"] = saved_posts_col.count_documents({"post_id": str(post_id), "user_id": user_id}) > 0
            doc["is_following"] = True
            
            results.append(doc)
            
        has_next = (skipped + page_size) < total_count
        return Response({
            "results": results,
            "page": page,
            "has_next": has_next,
            "total_count": total_count
        }, status=status.HTTP_200_OK)


class ExploreFeedView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        
        mongo_query = {"is_blocked": False}
        posts_cursor = posts_col.find(mongo_query)
        posts_list = list(posts_cursor)
        
        # Inject engagement statistics and follow states
        for doc in posts_list:
            post_id = doc["_id"]
            doc["id"] = post_id
            doc["likes_count"] = likes_col.count_documents({"post_id": str(post_id)})
            from db_connection import comments_col
            doc["comments_count"] = comments_col.count_documents({"post_id": str(post_id)})
            doc["saved_count"] = saved_posts_col.count_documents({"post_id": str(post_id)})
            doc["share_count"] = doc.get("share_count", 0)
            
            doc["is_liked"] = False
            doc["is_saved"] = False
            doc["is_following"] = False
            if request.user.is_authenticated:
                user_id = str(request.user.id)
                doc["is_liked"] = likes_col.count_documents({"post_id": str(post_id), "user_id": user_id}) > 0
                doc["is_saved"] = saved_posts_col.count_documents({"post_id": str(post_id), "user_id": user_id}) > 0
                doc["is_following"] = followers_col.count_documents({"follower_id": user_id, "following_id": str(doc["user_id"])}) > 0
        
        # Sort by popularity: (likes_count * 2) + comments_count DESC, then created_at DESC
        posts_list.sort(key=lambda x: (x["likes_count"] * 2 + x["comments_count"], x.get("created_at", "")), reverse=True)
        
        total_count = len(posts_list)
        skipped = (page - 1) * page_size
        paginated_posts = posts_list[skipped : skipped + page_size]
        
        for doc in paginated_posts:
            doc.pop("_id", None)
            
        has_next = (skipped + page_size) < total_count
        return Response({
            "results": paginated_posts,
            "page": page,
            "has_next": has_next,
            "total_count": total_count
        }, status=status.HTTP_200_OK)
