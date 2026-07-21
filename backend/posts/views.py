from rest_framework import status, views, generics, permissions
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.core.paginator import Paginator
import os

from .models import Post, Like, SavedPost, Category, CategoryFollow, UserInterest
from .serializers import PostSerializer, CategorySerializer
from notifications.models import Notification

import threading

def send_new_post_notifications(post, author):
    # 1. Create in-app notifications for followers who have opted in
    from accounts.models import Follower
    try:
        author_profile = getattr(author, 'profile', None)
        author_name = f"{author.first_name} {author.last_name}".strip() or author.username
        post_title = post.caption[:50] if post.caption else (post.text[:50] if post.text else 'post')
        post_dept = (post.department or (author_profile.department if author_profile else '')).strip().lower()

        if post.event_date or post.event_type:
            msg = f"{author_name} uploaded a new event: \"{post_title}\"."
        else:
            msg = f"{author_name} published a new article \"{post_title}\"."

        followers = Follower.objects.filter(following=author).select_related('follower', 'follower__profile')
        for f in followers:
            follower_user = f.follower
            follower_profile = getattr(follower_user, 'profile', None)
            follower_dept = (follower_profile.department if follower_profile else '').strip().lower()

            # Department filter
            if post_dept and follower_dept and post_dept != follower_dept:
                continue

            # Deduplication
            if Notification.objects.filter(recipient=follower_user, sender=author, type='new_post', post=post).exists():
                continue

            if follower_profile and getattr(follower_profile, 'followed_notifications_enabled', True):
                Notification.objects.create(
                    recipient=follower_user,
                    sender=author,
                    type='new_post',
                    post=post,
                    message=msg
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
        raw_caption = request.data.get('caption')
        raw_text = request.data.get('text')
        caption = (raw_caption if raw_caption is not None else post.caption or '').strip()
        text = (raw_text if raw_text is not None else post.text or '').strip()

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

        # Rank posts dynamically
        posts_list = list(queryset)
        if request.user.is_authenticated:
            try:
                profile = request.user.profile
                user_dept = profile.department
                
                followed_cat_ids = set(CategoryFollow.objects.filter(user=request.user).values_list('category_id', flat=True))
                tech_score = profile.tech_score
                non_tech_score = profile.non_tech_score
                
                def calculate_rank(post):
                    score = 0
                    
                    # 1. Followed Categories (highest priority)
                    if post.category_id in followed_cat_ids:
                        score += 100
                        
                    # 2. Same Department
                    post_author_profile = getattr(post.user, 'profile', None)
                    if post_author_profile and user_dept and post_author_profile.department == user_dept:
                        score += 50
                        
                    # 3. User Interest Alignment
                    if post.category:
                        if post.category.is_tech:
                            score += tech_score * 2
                        else:
                            score += non_tech_score * 2
                            
                    # 4. Recency Time-Decay
                    from django.utils import timezone
                    time_diff = timezone.now() - post.created_at
                    hours_ago = time_diff.total_seconds() / 3600.0
                    score -= hours_ago * 0.5
                    
                    return score
                
                posts_list.sort(key=calculate_rank, reverse=True)
            except Exception as e:
                print(f"Error sorting feed dynamically: {e}")

        total_count = len(posts_list)
        skipped = (page - 1) * page_size
        page_items = posts_list[skipped:skipped + page_size]

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
        from django.db import IntegrityError
        post = get_object_or_404(Post, pk=pk)
        try:
            like_rel, created = Like.objects.get_or_create(post=post, user=request.user)
        except IntegrityError:
            created = False
        
        if created:
            # Increment user's behavioral interest score based on category type
            profile = getattr(request.user, 'profile', None)
            if profile and post.category:
                if post.category.is_tech:
                    profile.tech_score += 1
                else:
                    profile.non_tech_score += 1
                profile.save()

            # Notifications
            if post.user != request.user:
                user_name = f"{request.user.first_name} {request.user.last_name}".strip() or request.user.username
                post_title = post.caption[:40] if post.caption else (post.text[:40] if post.text else 'post')
                if not Notification.objects.filter(recipient=post.user, sender=request.user, type='like', post=post).exists():
                    Notification.objects.create(
                        recipient=post.user,
                        sender=request.user,
                        type='like',
                        post=post,
                        message=f"{user_name} liked your post \"{post_title}\"."
                    )
        
        likes_count = Like.objects.filter(post=post).count()
        return Response({
            "message": "Post liked successfully.",
            "likes_count": likes_count,
            "is_liked": True
        }, status=status.HTTP_200_OK)


class UnlikePostView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        like_rel = Like.objects.filter(post=post, user=request.user)
        if like_rel.exists():
            like_rel.delete()
            
        likes_count = Like.objects.filter(post=post).count()
        return Response({
            "message": "Post unliked successfully.",
            "likes_count": likes_count,
            "is_liked": False
        }, status=status.HTTP_200_OK)



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
        
        from django.db.models import Count, F, Q
        queryset = Post.objects.filter(is_blocked=False).annotate(
            num_likes=Count('likes', distinct=True),
            num_comments=Count('comments_sql', filter=Q(comments_sql__is_deleted=False), distinct=True)
        ).annotate(
            popularity=(F('num_likes') * 2) + F('num_comments')
        ).order_by('-popularity', '-created_at')
        
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


class PostInterestView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        post_obj = get_object_or_404(Post, pk=pk)
        status_val = request.data.get('status', '').strip().lower()

        if status_val not in ['interested', 'not_interested', '']:
            return Response({"error": "Invalid status. Allowed values: 'interested', 'not_interested', or empty string to clear."}, status=status.HTTP_400_BAD_REQUEST)

        if status_val == '':
            UserInterest.objects.filter(post=post_obj, user=request.user).delete()
            msg = "Interest removed."
        else:
            interest, created = UserInterest.objects.update_or_create(
                post=post_obj,
                user=request.user,
                defaults={'status': status_val}
            )
            msg = f"Post interest status set to '{status_val}'."
            
            # Increment user's behavioral interest score based on category type
            if status_val == 'interested':
                profile = getattr(request.user, 'profile', None)
                if profile and post_obj.category:
                    if post_obj.category.is_tech:
                        profile.tech_score += 2
                    else:
                        profile.non_tech_score += 2
                    profile.save()
            
            # Send immediate confirmation email if status set to interested
            if status_val == 'interested':
                import sys
                is_testing = 'test' in sys.argv
                
                # Check user profile notification setting
                profile = getattr(request.user, 'profile', None)
                if profile and getattr(profile, 'email_notifications_enabled', True):
                    if is_testing:
                        from notifications.emails import send_interest_confirmation_email_sync
                        try:
                            send_interest_confirmation_email_sync(request.user.id, post_obj.id)
                        except Exception:
                            pass
                    else:
                        from notifications.tasks import send_interest_confirmation_email_task
                        try:
                            send_interest_confirmation_email_task.delay(request.user.id, post_obj.id)
                        except Exception:
                            # Fallback: send in a background thread if Celery is offline
                            import threading
                            from notifications.emails import send_interest_confirmation_email_sync
                            threading.Thread(target=send_interest_confirmation_email_sync, args=(request.user.id, post_obj.id)).start()

        interested_count = UserInterest.objects.filter(post=post_obj, status='interested').count()
        return Response({
            "message": msg,
            "interest_status": status_val or None,
            "interested_count": interested_count
        }, status=status.HTTP_200_OK)


class CategoryListView(generics.ListAPIView):
    queryset = Category.objects.all().order_by('name')
    serializer_class = CategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]


class CategoryFollowView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        category = get_object_or_404(Category, pk=pk)
        relation, created = CategoryFollow.objects.get_or_create(user=request.user, category=category)
        if created:
            return Response({"message": f"Successfully followed category '{category.name}'."}, status=status.HTTP_201_CREATED)
        return Response({"message": f"You already follow category '{category.name}'."}, status=status.HTTP_200_OK)


class CategoryUnfollowView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        category = get_object_or_404(Category, pk=pk)
        deleted, _ = CategoryFollow.objects.filter(user=request.user, category=category).delete()
        if deleted:
            return Response({"message": f"Successfully unfollowed category '{category.name}'."}, status=status.HTTP_200_OK)
        return Response({"error": f"You do not follow category '{category.name}'."}, status=status.HTTP_400_BAD_REQUEST)


class FollowedCategoriesListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        follows = CategoryFollow.objects.filter(user=request.user).select_related('category')
        categories = [f.category for f in follows]
        serializer = CategorySerializer(categories, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)


class PostSearchView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip()
        category_filter = request.query_params.get('category', '').strip().lower()
        event_type_filter = request.query_params.get('event_type', '').strip().lower()
        dept_filter = request.query_params.get('department', '').strip().lower()
        show_expired = request.query_params.get('show_expired', 'false').strip().lower() == 'true'
        hide_closed = request.query_params.get('hide_closed', 'false').strip().lower() == 'true'

        from django.utils import timezone
        from django.db.models import Q
        today = timezone.now()

        queryset = Post.objects.filter(is_blocked=False)

        # 1. Date Filtering (exclude expired)
        if not show_expired:
            queryset = queryset.filter(
                Q(event_date__isnull=True) | Q(event_date__gte=today)
            ).filter(
                Q(last_date__isnull=True) | Q(last_date__gte=today)
            )

        # 2. Hide closed registration
        if hide_closed:
            queryset = queryset.filter(
                Q(last_date__isnull=True) | Q(last_date__gte=today)
            )

        # 3. Smart query classification matching
        # e.g., "tech paper presentation"
        q_lower = q.lower()
        inferred_tech = None
        if 'non-tech' in q_lower or 'non_tech' in q_lower or 'non tech' in q_lower:
            inferred_tech = False
        elif 'tech' in q_lower:
            inferred_tech = True

        if category_filter:
            is_tech_val = (category_filter == 'tech')
            queryset = queryset.filter(category__is_tech=is_tech_val)
        elif inferred_tech is not None:
            queryset = queryset.filter(category__is_tech=inferred_tech)

        if event_type_filter:
            queryset = queryset.filter(event_type__icontains=event_type_filter)

        if dept_filter:
            queryset = queryset.filter(department__icontains=dept_filter)

        # 4. Keyword filtering
        cleaned_q = q
        if inferred_tech is not None:
            q_words = q.split()
            cleaned_q = " ".join([w for w in q_words if w.lower() not in ['tech', 'non-tech', 'non_tech', 'non']])

        if cleaned_q:
            queryset = queryset.filter(
                Q(caption__icontains=cleaned_q) |
                Q(text__icontains=cleaned_q) |
                Q(event_type__icontains=cleaned_q) |
                Q(hashtags__icontains=cleaned_q)
            )

        posts_list = list(queryset)
        is_exact = True

        # Fallback UX: If no exact matches found, show related events
        if not posts_list:
            is_exact = False
            fallback_qs = Post.objects.filter(is_blocked=False)
            if not show_expired:
                fallback_qs = fallback_qs.filter(
                    Q(event_date__isnull=True) | Q(event_date__gte=today)
                )
            # Take top 10 most recent posts as fallback
            posts_list = list(fallback_qs.order_by('-created_at')[:10])

        # Get requesting user metadata
        user = request.user
        is_auth = user.is_authenticated
        user_dept = ''
        followed_cat_ids = set()
        tech_score = 0
        non_tech_score = 0

        if is_auth:
            try:
                profile = user.profile
                user_dept = profile.department.lower() if profile.department else ''
                followed_cat_ids = set(CategoryFollow.objects.filter(user=user).values_list('category_id', flat=True))
                tech_score = profile.tech_score
                non_tech_score = profile.non_tech_score
            except Exception:
                pass

        # 5. Personalized Ranking Scores
        for post in posts_list:
            score = 0
            
            # Match search keyword -> +100
            if cleaned_q:
                q_lower = cleaned_q.lower()
                if q_lower in post.caption.lower() or q_lower in post.text.lower():
                    score += 100
            
            # Matching category classification (tech / non-tech) -> +50
            if post.category:
                if category_filter:
                    is_tech_val = (category_filter == 'tech')
                    if post.category.is_tech == is_tech_val:
                        score += 50
                elif inferred_tech is not None:
                    if post.category.is_tech == inferred_tech:
                        score += 50
            
            # Matching event type -> +80
            if event_type_filter and post.event_type and event_type_filter in post.event_type.lower():
                score += 80
            elif cleaned_q and post.event_type and post.event_type.lower() in cleaned_q.lower():
                score += 80

            if is_auth:
                # Followed category -> +40
                if post.category_id in followed_cat_ids:
                    score += 40
                # Same department -> +30
                if post.department and user_dept and post.department.lower() == user_dept:
                    score += 30
                # User interest alignment score * 2
                if post.category:
                    if post.category.is_tech:
                        score += tech_score * 2
                    else:
                        score += non_tech_score * 2

            # Recency decay penalty -> -0.5 per hour
            time_diff = timezone.now() - post.created_at
            hours_ago = time_diff.total_seconds() / 3600.0
            score -= hours_ago * 0.5
            
            post.relevance_score = int(score)

            # Map dynamically assigned Priority field
            prio = 'low'
            if post.event_date or post.last_date:
                days_to_event = None
                days_to_last_date = None
                
                if post.event_date:
                    days_to_event = (post.event_date.date() - today.date()).days
                if post.last_date:
                    days_to_last_date = (post.last_date.date() - today.date()).days
                    
                if (days_to_event is not None and days_to_event == 0) or (days_to_last_date is not None and days_to_last_date == 0):
                    prio = 'high'
                elif (days_to_event is not None and days_to_event in [1, 2, 3]) or (days_to_last_date is not None and days_to_last_date in [1, 2, 3]):
                    prio = 'medium'
            
            post.priority = prio

        # Sort results descending by score
        posts_list.sort(key=lambda x: x.relevance_score, reverse=True)

        # Paginate results
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        total_count = len(posts_list)
        skipped = (page - 1) * page_size
        paginated_data = posts_list[skipped:skipped + page_size]

        serializer = PostSerializer(paginated_data, many=True, context={'request': request})
        
        response_data = {
            "results": serializer.data,
            "page": page,
            "has_next": (skipped + page_size) < total_count,
            "total_count": total_count,
            "is_exact_match": is_exact,
        }
        if not is_exact:
            response_data["message"] = "No exact matches found. Showing related events."

        return Response(response_data, status=status.HTTP_200_OK)


class AutocompleteSuggestionsView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        q = request.query_params.get('q', '').strip().lower()
        if not q:
            return Response([], status=status.HTTP_200_OK)

        suggestions = []

        # Suggest matching categories
        categories = Category.objects.all()
        for cat in categories:
            if q in cat.name.lower():
                suggestions.append({
                    "type": "category",
                    "value": cat.name,
                    "slug": cat.slug,
                    "is_tech": cat.is_tech
                })

        # Suggest matching event types
        event_types = Post.objects.filter(is_blocked=False).exclude(event_type='').values_list('event_type', flat=True).distinct()
        preset_event_types = ["Paper Presentation", "Workshop", "Hackathon", "Seminar", "Guest Lecture"]
        all_event_types = set(list(event_types) + preset_event_types)

        for et in all_event_types:
            if q in et.lower():
                suggestions.append({
                    "type": "event_type",
                    "value": et
                })

        return Response(suggestions[:8], status=status.HTTP_200_OK)

