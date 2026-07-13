from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Count, Q
from django.utils import timezone
from datetime import timedelta

from accounts.models import StudentProfile
from posts.models import Post, Like
from comments.models import Comment, CommentReaction
from .models import Report, Announcement
# db_connection import removed for PostgreSQL centralized architecture

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from django.db.models import Sum
        from accounts.models import LoginLog
        from posts.models import SavedPost

        today = timezone.now().date()
        total_users = User.objects.count()
        blocked_users = StudentProfile.objects.filter(is_blocked=True).count()
        total_posts = Post.objects.count()
        blocked_posts = Post.objects.filter(is_blocked=True).count()
        pending_reports = Report.objects.filter(status='pending').count()
        resolved_reports = Report.objects.filter(status='resolved').count()
        rejected_reports = Report.objects.filter(status='rejected').count()
        under_review_reports = Report.objects.filter(status='under_review').count()
        
        total_comments = Comment.objects.count()
        active_comments = Comment.objects.filter(is_deleted=False).count()
        deleted_comments = Comment.objects.filter(is_deleted=True).count()
        edited_comments = Comment.objects.filter(is_edited=True).count()
        replies_comments = Comment.objects.filter(parent_comment__isnull=False).count()
        total_comment_likes = CommentReaction.objects.count()

        total_likes = Like.objects.count()
        total_shares = Post.objects.aggregate(t_shares=Sum('share_count'))['t_shares'] or 0
        total_saved = SavedPost.objects.count()
        total_reports = Report.objects.count()
        daily_logins = LoginLog.objects.filter(created_at__date=today).count()

        return Response({
            "users": {
                "total": total_users,
                "blocked": blocked_users,
                "active": total_users - blocked_users
            },
            "posts": {
                "total": total_posts,
                "blocked": blocked_posts,
                "active": total_posts - blocked_posts
            },
            "reports": {
                "total": total_reports,
                "pending": pending_reports,
                "resolved": resolved_reports,
                "rejected": rejected_reports,
                "under_review": under_review_reports
            },
            "comments": {
                "total": total_comments,
                "active": active_comments,
                "deleted": deleted_comments,
                "edited": edited_comments,
                "replies": replies_comments,
                "likes": total_comment_likes
            },
            "likes": {
                "total": total_likes
            },
            "shares": {
                "total": total_shares
            },
            "saved_posts": {
                "total": total_saved
            },
            "daily_logins": {
                "total": daily_logins
            }
        }, status=status.HTTP_200_OK)



class AdminCommentsListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = Comment.objects.all().select_related('user', 'post', 'parent_comment').order_by('-created_at')

        # Filter by user (username or name)
        user_query = request.query_params.get('user', '').strip()
        if user_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(user__username__icontains=user_query) |
                Q(user__first_name__icontains=user_query) |
                Q(user__last_name__icontains=user_query)
            )

        # Global Search
        search_query = request.query_params.get('q', '').strip()
        if search_query:
            from django.db.models import Q
            queryset = queryset.filter(
                Q(content__icontains=search_query) |
                Q(user__username__icontains=search_query) |
                Q(post__caption__icontains=search_query)
            )

        # Filter by post (post ID)
        post_query = request.query_params.get('post', '').strip()
        if post_query:
            queryset = queryset.filter(post_id=post_query)

        # Filter by date (YYYY-MM-DD)
        date_query = request.query_params.get('date', '').strip()
        if date_query:
            queryset = queryset.filter(created_at__date=date_query)

        # Filter by status: active, deleted, edited, hidden, pinned
        status_query = request.query_params.get('status', '').strip()
        if status_query == 'active':
            queryset = queryset.filter(is_deleted=False)
        elif status_query == 'deleted':
            queryset = queryset.filter(is_deleted=True)
        elif status_query == 'edited':
            queryset = queryset.filter(is_edited=True)
        elif status_query == 'hidden':
            queryset = queryset.filter(is_hidden=True)
        elif status_query == 'pinned':
            queryset = queryset.filter(is_pinned=True)

        # Filter by reported comments
        reported_query = request.query_params.get('reported', '').strip()
        if reported_query == 'true':
            queryset = queryset.filter(reports__isnull=False).distinct()

        # Sort
        sort_by = request.query_params.get('sort_by', '-created_at').strip()
        if sort_by in ['created_at', '-created_at', 'content', '-content']:
            queryset = queryset.order_by(sort_by)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total_count = queryset.count()

        start = (page - 1) * page_size
        end = start + page_size
        page_items = queryset[start:end]

        results = []
        for comment in page_items:
            likes_count = comment.reactions.count()
            results.append({
                "id": comment.id,
                "post_id": comment.post_id,
                "post_caption": comment.post.caption[:50] if comment.post.caption else (comment.post.text[:50] if comment.post.text else f"Post #{comment.post.id}"),
                "user_id": comment.user_id,
                "username": comment.user.username,
                "user_name": f"{comment.user.first_name} {comment.user.last_name}".strip() or comment.user.username,
                "content": comment.content,
                "parent_comment_id": comment.parent_comment_id,
                "created_at": comment.created_at.isoformat() if comment.created_at else None,
                "updated_at": comment.updated_at.isoformat() if comment.updated_at else None,
                "deleted_at": comment.deleted_at.isoformat() if comment.deleted_at else None,
                "is_deleted": comment.is_deleted,
                "is_edited": comment.is_edited,
                "is_hidden": comment.is_hidden,
                "is_pinned": comment.is_pinned,
                "likes_count": likes_count,
                "reports_count": comment.reports.count()
            })

        has_next = end < total_count

        return Response({
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "has_next": has_next
        }, status=status.HTTP_200_OK)



class AdminUsersListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = User.objects.all().order_by('-date_joined')
        
        # Search
        search_query = request.query_params.get('q', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(username__icontains=search_query) |
                Q(email__icontains=search_query) |
                Q(first_name__icontains=search_query) |
                Q(last_name__icontains=search_query) |
                Q(profile__department__icontains=search_query)
            )

        # Filter by Blocked Status
        status_filter = request.query_params.get('status', '').strip()
        if status_filter == 'blocked':
            queryset = queryset.filter(profile__is_blocked=True)
        elif status_filter == 'active':
            queryset = queryset.filter(profile__is_blocked=False)

        # Filter by Role
        role_filter = request.query_params.get('role', '').strip()
        if role_filter == 'admin':
            queryset = queryset.filter(Q(is_staff=True) | Q(is_superuser=True))
        elif role_filter == 'student':
            queryset = queryset.filter(profile__role_type='student')
        elif role_filter == 'teacher':
            queryset = queryset.filter(profile__role_type='teacher')

        # Sort
        sort_by = request.query_params.get('sort_by', '-date_joined').strip()
        if sort_by in ['username', '-username', 'first_name', '-first_name', 'date_joined', '-date_joined', 'email', '-email']:
            queryset = queryset.order_by(sort_by)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total_count = queryset.count()

        start = (page - 1) * page_size
        end = start + page_size
        page_items = queryset[start:end]

        results = []
        for user in page_items:
            profile = getattr(user, 'profile', None)
            results.append({
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "date_joined": user.date_joined.isoformat(),
                "is_staff": user.is_staff or user.is_superuser,
                "is_blocked": profile.is_blocked if profile else False,
                "department": profile.department if profile else '',
                "year": profile.year if profile else '',
                "bio": profile.bio if profile else '',
                "profile_pic": profile.profile_pic.url if profile and profile.profile_pic else '',
                "cover_photo": profile.cover_photo.url if profile and profile.cover_photo else ''
            })

        has_next = end < total_count

        return Response({
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "has_next": has_next
        }, status=status.HTTP_200_OK)



class AdminUserBlockView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        if user.is_staff or user.is_superuser:
            return Response({"error": "Cannot block admin users."}, status=status.HTTP_400_BAD_REQUEST)
        
        profile = user.profile
        profile.is_blocked = not profile.is_blocked
        profile.save()

        action = "blocked" if profile.is_blocked else "unblocked"
        
        # Block posts if user is blocked
        if profile.is_blocked:
            Post.objects.filter(user=user).update(is_blocked=True)
        else:
            Post.objects.filter(user=user).update(is_blocked=False)

        return Response({
            "message": f"User {user.username} successfully {action}.",
            "is_blocked": profile.is_blocked
        }, status=status.HTTP_200_OK)

    def delete(self, request, user_id):
        user = get_object_or_404(User, pk=user_id)
        if user.is_staff or user.is_superuser:
            return Response({"error": "Cannot delete admin users."}, status=status.HTTP_400_BAD_REQUEST)
        
        user.delete()
        return Response({"message": "User deleted successfully."}, status=status.HTTP_200_OK)


class AdminPostsListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        queryset = Post.objects.all().order_by('-created_at')
        
        # Search
        search_query = request.query_params.get('q', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(user__username__icontains=search_query) |
                Q(caption__icontains=search_query) |
                Q(text__icontains=search_query)
            )

        # Filter Status
        status_filter = request.query_params.get('status', '').strip()
        if status_filter == 'blocked':
            queryset = queryset.filter(is_blocked=True)
        elif status_filter == 'active':
            queryset = queryset.filter(is_blocked=False)

        # Sort
        sort_by = request.query_params.get('sort_by', '-created_at').strip()
        if sort_by in ['created_at', '-created_at', 'share_count', '-share_count']:
            queryset = queryset.order_by(sort_by)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total_count = queryset.count()

        start = (page - 1) * page_size
        end = start + page_size
        page_items = queryset[start:end]

        results = []
        for post in page_items:
            results.append({
                "id": str(post.id),
                "username": post.user.username,
                "email": post.user.email,
                "caption": post.caption,
                "text": post.text,
                "created_at": post.created_at.isoformat(),
                "is_blocked": post.is_blocked,
                "likes_count": Like.objects.filter(post=post).count(),
                "comments_count": Comment.objects.filter(post=post).count(),
                "share_count": post.share_count
            })

        # Python-level sorting for calculated fields
        if sort_by in ['likes_count', '-likes_count', 'comments_count', '-comments_count']:
            reverse_order = sort_by.startswith('-')
            field = sort_by.lstrip('-')
            results.sort(key=lambda x: x[field], reverse=reverse_order)

        has_next = end < total_count

        return Response({
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "has_next": has_next
        }, status=status.HTTP_200_OK)



class AdminPostBlockView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        post.is_blocked = not post.is_blocked
        post.save()

        action = "blocked" if post.is_blocked else "unblocked"
        return Response({
            "message": f"Post successfully {action}.",
            "is_blocked": post.is_blocked
        }, status=status.HTTP_200_OK)

    def delete(self, request, pk):
        post = get_object_or_404(Post, pk=pk)
        post.delete()
        return Response({"message": "Post deleted successfully."}, status=status.HTTP_200_OK)


class AdminReportsListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        # Auto-resolve orphaned pending reports (where target post has been deleted)
        orphans = Report.objects.filter(
            status='pending',
            reported_post__isnull=True,
            reported_user__isnull=True,
            reported_comment__isnull=True
        )
        for r in orphans:
            r.status = 'resolved'
            r.save()

        queryset = Report.objects.all().select_related('reporter', 'reported_post', 'reported_user', 'reported_comment').order_by('-created_at')
        
        # Search
        search_query = request.query_params.get('q', '').strip()
        if search_query:
            queryset = queryset.filter(
                Q(reporter__username__icontains=search_query) |
                Q(reporter__first_name__icontains=search_query) |
                Q(reporter__last_name__icontains=search_query) |
                Q(reported_user__username__icontains=search_query) |
                Q(reason__icontains=search_query) |
                Q(details__icontains=search_query)
            )

        # Filter Type (post / profile / comment)
        report_type = request.query_params.get('type', '').strip()
        if report_type == 'post':
            queryset = queryset.filter(reported_post__isnull=False)
        elif report_type == 'profile':
            queryset = queryset.filter(reported_user__isnull=False, reported_post__isnull=True)
        elif report_type == 'comment':
            queryset = queryset.filter(reported_comment__isnull=False)

        # Filter Reason
        reason = request.query_params.get('reason', '').strip()
        if reason:
            queryset = queryset.filter(reason__iexact=reason)

        # Filter Status
        status_val = request.query_params.get('status', '').strip()
        if status_val:
            queryset = queryset.filter(status__iexact=status_val)

        # Sort
        sort_by = request.query_params.get('sort_by', '-created_at').strip()
        if sort_by in ['created_at', '-created_at', 'status', '-status', 'reason', '-reason']:
            queryset = queryset.order_by(sort_by)

        # Pagination
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 20))
        total_count = queryset.count()
        
        start = (page - 1) * page_size
        end = start + page_size
        page_items = queryset[start:end]

        results = []
        for r in page_items:
            results.append({
                "id": str(r.id),
                "reporter_username": r.reporter.username,
                "reporter_name": f"{r.reporter.first_name} {r.reporter.last_name}".strip() or r.reporter.username,
                "reported_post_id": str(r.reported_post.id) if r.reported_post else None,
                "reported_user_id": str(r.reported_user.id) if r.reported_user else None,
                "reported_username": r.reported_user.username if r.reported_user else (
                    r.reported_post.user.username if r.reported_post else r.reported_username_snapshot
                ),
                "reported_name": f"{r.reported_user.first_name} {r.reported_user.last_name}".strip() if r.reported_user else (
                    f"{r.reported_post.user.first_name} {r.reported_post.user.last_name}".strip() if r.reported_post else r.reported_username_snapshot
                ),
                "target_type": "post" if (r.reported_post or r.reported_post_caption_snapshot or r.reported_post_text_snapshot) else (
                    "comment" if r.reported_comment else "profile"
                ),
                "reason": r.reason,
                "details": r.details,
                "status": r.status,
                "admin_notes": r.admin_notes,
                "created_at": r.created_at.isoformat() if r.created_at else None
            })

        has_next = end < total_count

        # Most reported posts
        most_reported_posts = list(
            Report.objects.filter(reported_post__isnull=False)
            .values('reported_post_id')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        for mrp in most_reported_posts:
            post = Post.objects.filter(id=mrp['reported_post_id']).first()
            mrp['caption'] = post.caption[:40] if post and post.caption else f"Post #{mrp['reported_post_id']}"
            mrp['username'] = post.user.username if post else "unknown"

        # Most reported users
        most_reported_users = list(
            Report.objects.filter(reported_user__isnull=False, reported_post__isnull=True)
            .values('reported_user_id', 'reported_user__username')
            .annotate(count=Count('id'))
            .order_by('-count')[:5]
        )
        for mru in most_reported_users:
            user = User.objects.filter(id=mru['reported_user_id']).first()
            mru['name'] = f"{user.first_name} {user.last_name}".strip() if user else mru['reported_user__username']

        return Response({
            "results": results,
            "page": page,
            "page_size": page_size,
            "total_count": total_count,
            "has_next": has_next,
            "summary": {
                "total": Report.objects.count(),
                "pending": Report.objects.filter(status='pending').count(),
                "resolved": Report.objects.filter(status='resolved').count(),
                "rejected": Report.objects.filter(status='rejected').count(),
                "under_review": Report.objects.filter(status='under_review').count(),
                "most_reported_posts": most_reported_posts,
                "most_reported_users": most_reported_users
            }
        }, status=status.HTTP_200_OK)



class AdminReportDetailView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        
        # Build detailed response
        post_data = None
        if report.reported_post or report.reported_post_caption_snapshot or report.reported_post_text_snapshot:
            post_data = {
                "id": report.reported_post.id if report.reported_post else None,
                "caption": report.reported_post.caption if report.reported_post else report.reported_post_caption_snapshot,
                "text": report.reported_post.text if report.reported_post else report.reported_post_text_snapshot,
                "created_at": report.reported_post.created_at.isoformat() if report.reported_post else report.created_at.isoformat(),
                "is_blocked": report.reported_post.is_blocked if report.reported_post else True,
                "author_username": report.reported_post.user.username if report.reported_post else report.reported_username_snapshot,
                "image": report.reported_post.image.url if report.reported_post and report.reported_post.image else report.reported_post_image_url_snapshot
            }
            
        reported_user_data = None
        if report.reported_user or report.reported_username_snapshot:
            profile = getattr(report.reported_user, 'profile', None) if report.reported_user else None
            reported_user_data = {
                "id": report.reported_user.id if report.reported_user else None,
                "username": report.reported_user.username if report.reported_user else report.reported_username_snapshot,
                "name": f"{report.reported_user.first_name} {report.reported_user.last_name}".strip() if (report.reported_user and f"{report.reported_user.first_name} {report.reported_user.last_name}".strip()) else report.reported_username_snapshot,
                "email": report.reported_user.email if report.reported_user else report.reported_user_email_snapshot,
                "is_blocked": profile.is_blocked if profile else True
            }
            
        reporter_data = {
            "id": report.reporter.id,
            "username": report.reporter.username,
            "name": f"{report.reporter.first_name} {report.reporter.last_name}".strip() or report.reporter.username,
            "email": report.reporter.email
        }
        
        return Response({
            "id": str(report.id),
            "reporter": reporter_data,
            "reported_user": reported_user_data,
            "reported_post": post_data,
            "reason": report.reason,
            "details": report.details,
            "status": report.status,
            "admin_notes": report.admin_notes,
            "created_at": report.created_at.isoformat() if report.created_at else None
        }, status=status.HTTP_200_OK)

    def put(self, request, pk):
        from .models import ModerationLog
        from notifications.models import Notification
        
        report = get_object_or_404(Report, pk=pk)
        
        status_val = request.data.get('status', report.status).strip()
        admin_notes_val = request.data.get('admin_notes', report.admin_notes).strip()
        action_val = request.data.get('action', '').strip()

        # If direct moderation action is taken, auto-resolve the case
        if action_val in ['delete_post', 'hide_post', 'suspend_user', 'delete_user']:
            status_val = 'resolved'

        # Update report fields
        report.status = status_val
        report.admin_notes = admin_notes_val
        report.save()

        moderation_action_taken = ""
        moderation_details = ""

        # Perform moderation action if provided
        if action_val == 'hide_post' and report.reported_post:
            post = report.reported_post
            post.is_blocked = True
            post.save()
            moderation_action_taken = f"Hid post #{post.id}"
            moderation_details = f"Post author: @{post.user.username}. Reason: {report.reason}."
            
        elif action_val == 'restore_post' and report.reported_post:
            post = report.reported_post
            post.is_blocked = False
            post.save()
            moderation_action_taken = f"Restored post #{post.id}"
            moderation_details = f"Post author: @{post.user.username}."
            
        elif action_val == 'delete_post' and report.reported_post:
            post = report.reported_post
            post_id = post.id
            author_username = post.user.username
            post.delete()
            moderation_action_taken = f"Deleted post #{post_id}"
            moderation_details = f"Permanently deleted post. Author was @{author_username}."
            
        elif action_val == 'suspend_user' and report.reported_user:
            user = report.reported_user
            profile = user.profile
            profile.is_blocked = True
            profile.save()
            Post.objects.filter(user=user).update(is_blocked=True)
            moderation_action_taken = f"Suspended user @{user.username}"
            moderation_details = f"Suspended/Blocked student account. Email: {user.email}."
            
        elif action_val == 'unsuspend_user' and report.reported_user:
            user = report.reported_user
            profile = user.profile
            profile.is_blocked = False
            profile.save()
            Post.objects.filter(user=user).update(is_blocked=False)
            moderation_action_taken = f"Unsuspended user @{user.username}"
            moderation_details = f"Unsuspended/Unblocked student account."
            
        elif action_val == 'delete_user' and report.reported_user:
            user = report.reported_user
            u_username = user.username
            user.delete()
            moderation_action_taken = f"Deleted user @{u_username}"
            moderation_details = f"Permanently deleted student account."

        # Create audit log if moderation action was taken
        if moderation_action_taken:
            ModerationLog.objects.create(
                admin=request.user,
                action=moderation_action_taken,
                details=moderation_details
            )
        else:
            # Audit log for updating report status/notes
            ModerationLog.objects.create(
                admin=request.user,
                action=f"Updated report #{report.id} status to {status_val}",
                details=f"Admin notes updated: {admin_notes_val[:100]}..."
            )

        # Notify reporter of review update
        Notification.objects.create(
            recipient=report.reporter,
            sender=request.user,
            type='report_update',
            message=f"Your report (ID: {report.id}) has been updated. Status: {status_val.replace('_', ' ').capitalize()}."
        )

        return Response({
            "message": "Report updated successfully.",
            "report": {
                "id": str(report.id),
                "status": report.status,
                "admin_notes": report.admin_notes,
                "moderation_action": moderation_action_taken
            }
        }, status=status.HTTP_200_OK)


class AdminReportResolveView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def post(self, request, pk):
        report = get_object_or_404(Report, pk=pk)
        report.status = 'resolved'
        report.save()
        return Response({"message": "Report resolved successfully."}, status=status.HTTP_200_OK)



class AdminAnnouncementView(views.APIView):
    def get_permissions(self):
        if self.request.method == 'GET':
            return [permissions.AllowAny()]
        return [permissions.IsAdminUser()]

    def get(self, request):
        announcements = Announcement.objects.all().order_by('-created_at')
        results = []
        for a in announcements:
            results.append({
                "id": str(a.id),
                "title": a.title,
                "content": a.content,
                "created_at": a.created_at.isoformat() if a.created_at else None,
                "author_id": str(a.author.id),
                "author_username": a.author.username,
                "author_name": f"{a.author.first_name} {a.author.last_name}".strip() or a.author.username
            })
        return Response(results, status=status.HTTP_200_OK)

    def post(self, request):
        title = request.data.get('title', '').strip()
        content = request.data.get('content', '').strip()

        if not title or not content:
            return Response({"error": "Title and Content are required."}, status=status.HTTP_400_BAD_REQUEST)

        announcement = Announcement.objects.create(
            author=request.user,
            title=title,
            content=content
        )

        # Notify all students
        students = StudentProfile.objects.filter(is_blocked=False)
        from notifications.models import Notification
        for profile in students:
            if profile.user != request.user:
                Notification.objects.create(
                    recipient=profile.user,
                    sender=request.user,
                    type='announcement',
                    message=f"[Announcement] {title}"
                )

        return Response({
            "message": "Announcement created and students notified.",
            "announcement": {
                "id": str(announcement.id),
                "title": announcement.title,
                "content": announcement.content,
                "created_at": announcement.created_at.isoformat()
            }
        }, status=status.HTTP_201_CREATED)


class AdminAnalyticsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        now = timezone.now()
        filter_range = request.query_params.get('range', '7_days').strip()
        intervals = []

        if filter_range == 'today':
            for i in range(23, -1, -1):
                start_dt = now - timedelta(hours=i+1)
                end_dt = now - timedelta(hours=i)
                label = end_dt.strftime('%H:%M')
                intervals.append((start_dt, end_dt, label))
        elif filter_range == '7_days':
            for i in range(6, -1, -1):
                day = now - timedelta(days=i)
                start_dt = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 0, 0, 0))
                end_dt = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 23, 59, 59))
                label = day.strftime('%b %d')
                intervals.append((start_dt, end_dt, label))
        elif filter_range == '30_days':
            for i in range(29, -1, -1):
                day = now - timedelta(days=i)
                start_dt = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 0, 0, 0))
                end_dt = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 23, 59, 59))
                label = day.strftime('%b %d')
                intervals.append((start_dt, end_dt, label))
        elif filter_range == '6_months':
            current_year = now.year
            current_month = now.month
            for i in range(5, -1, -1):
                month_offset = current_month - i
                year_offset = current_year
                while month_offset <= 0:
                    month_offset += 12
                    year_offset -= 1
                start_dt = timezone.make_aware(timezone.datetime(year_offset, month_offset, 1, 0, 0, 0))
                next_m = month_offset + 1
                next_y = year_offset
                if next_m > 12:
                    next_m = 1
                    next_y += 1
                end_dt = timezone.make_aware(timezone.datetime(next_y, next_m, 1, 0, 0, 0)) - timedelta(seconds=1)
                label = start_dt.strftime('%b %Y')
                intervals.append((start_dt, end_dt, label))
        elif filter_range == 'custom':
            start_str = request.query_params.get('start_date', '').strip()
            end_str = request.query_params.get('end_date', '').strip()
            try:
                start_date = timezone.datetime.strptime(start_str, '%Y-%m-%d').date()
                end_date = timezone.datetime.strptime(end_str, '%Y-%m-%d').date()
            except ValueError:
                start_date = (now - timedelta(days=6)).date()
                end_date = now.date()

            diff_days = (end_date - start_date).days
            for i in range(diff_days + 1):
                day = start_date + timedelta(days=i)
                start_dt = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 0, 0, 0))
                end_dt = timezone.make_aware(timezone.datetime(day.year, day.month, day.day, 23, 59, 59))
                label = day.strftime('%b %d')
                intervals.append((start_dt, end_dt, label))

        chart_data = []
        for start_dt, end_dt, label in intervals:
            user_growth = User.objects.filter(date_joined__lte=end_dt).count()
            new_users = User.objects.filter(date_joined__range=(start_dt, end_dt)).count()
            posts = Post.objects.filter(created_at__range=(start_dt, end_dt)).count()
            comments = Comment.objects.filter(created_at__range=(start_dt, end_dt)).count()
            likes = Like.objects.filter(created_at__range=(start_dt, end_dt)).count()
            
            from posts.models import ShareLog
            from accounts.models import LoginLog
            shares = ShareLog.objects.filter(created_at__range=(start_dt, end_dt)).count()
            reports = Report.objects.filter(created_at__range=(start_dt, end_dt)).count()
            dau = LoginLog.objects.filter(created_at__range=(start_dt, end_dt)).values('user_id').distinct().count()

            chart_data.append({
                "date": label,
                "user_growth": user_growth,
                "new_users": new_users,
                "posts": posts,
                "comments": comments,
                "likes": likes,
                "shares": shares,
                "reports": reports,
                "dau": dau
            })

        # Top active departments
        dept_data = StudentProfile.objects.values('department').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        departments = [
            {"name": item["department"] or "Unknown", "value": item["count"]}
            for item in dept_data
        ]

        # Followers/Creators analytics
        most_followed = StudentProfile.objects.order_by('-followers_count')[:5]
        most_followed_data = [
            {"username": p.user.username, "name": f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username, "followers": p.followers_count}
            for p in most_followed
        ]
        
        thirty_days_ago = now - timedelta(days=30)
        fastest_growing = StudentProfile.objects.filter(user__date_joined__gte=thirty_days_ago).order_by('-followers_count')[:5]
        fastest_growing_data = [
            {"username": p.user.username, "name": f"{p.user.first_name} {p.user.last_name}".strip() or p.user.username, "followers": p.followers_count}
            for p in fastest_growing
        ]
        
        creators = User.objects.annotate(posts_count=Count('posts')).order_by('-posts_count')[:5]
        top_creators_data = [
            {"username": u.username, "name": f"{u.first_name} {u.last_name}".strip() or u.username, "posts": u.posts_count}
            for u in creators
        ]

        return Response({
            "chart_data": chart_data,
            "departments": departments,
            "most_followed": most_followed_data,
            "fastest_growing": fastest_growing_data,
            "top_creators": top_creators_data
        }, status=status.HTTP_200_OK)



class AdminFollowsListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        from accounts.models import Follower
        follows = Follower.objects.all().select_related('follower', 'following').order_by('-created_at')
        results = []
        for f in follows:
            results.append({
                "id": f.id,
                "follower_id": f.follower.id,
                "follower_username": f.follower.username,
                "follower_name": f"{f.follower.first_name} {f.follower.last_name}".strip() or f.follower.username,
                "following_id": f.following.id,
                "following_username": f.following.username,
                "following_name": f"{f.following.first_name} {f.following.last_name}".strip() or f.following.username,
                "created_at": f.created_at.isoformat() if f.created_at else None
            })
        return Response(results, status=status.HTTP_200_OK)


class AdminFollowDeleteView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def delete(self, request, pk):
        from accounts.models import Follower
        relation = get_object_or_404(Follower, pk=pk)
        relation.delete()
        return Response({"message": "Follow relationship removed successfully."}, status=status.HTTP_200_OK)
