from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.contrib.auth.models import User
from django.db.models import Count
from django.utils import timezone
from datetime import timedelta

from accounts.models import StudentProfile
from posts.models import Post, Like
from comments.models import Comment
from .models import Report, Announcement
from db_connection import (
    users_col, posts_col, comments_col, reports_col, announcements_col
)

class AdminDashboardStatsView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        total_users = User.objects.count()
        blocked_users = StudentProfile.objects.filter(is_blocked=True).count()
        total_posts = Post.objects.count()
        blocked_posts = Post.objects.filter(is_blocked=True).count()
        pending_reports = Report.objects.filter(status='pending').count()
        resolved_reports = Report.objects.filter(status='resolved').count()
        total_comments = Comment.objects.count()

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
                "total": pending_reports + resolved_reports,
                "pending": pending_reports,
                "resolved": resolved_reports
            },
            "comments": {
                "total": total_comments
            }
        }, status=status.HTTP_200_OK)


class AdminUsersListView(views.APIView):
    permission_classes = [permissions.IsAdminUser]

    def get(self, request):
        users = User.objects.all().order_by('-date_joined')
        results = []
        for user in users:
            profile = getattr(user, 'profile', None)
            results.append({
                "id": str(user.id),
                "username": user.username,
                "email": user.email,
                "name": f"{user.first_name} {user.last_name}".strip() or user.username,
                "date_joined": user.date_joined.isoformat(),
                "is_staff": user.is_staff,
                "is_blocked": profile.is_blocked if profile else False,
                "department": profile.department if profile else '',
                "year": profile.year if profile else '',
                "bio": profile.bio if profile else '',
                "profile_pic": profile.profile_pic.url if profile and profile.profile_pic else '',
                "cover_photo": profile.cover_photo.url if profile and profile.cover_photo else ''
            })
        return Response(results, status=status.HTTP_200_OK)


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
            # Sync in MongoDB
            posts_col.update_many({"user_id": str(user_id)}, {"$set": {"is_blocked": True}})
        else:
            Post.objects.filter(user=user).update(is_blocked=False)
            # Sync in MongoDB
            posts_col.update_many({"user_id": str(user_id)}, {"$set": {"is_blocked": False}})

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
        posts = Post.objects.all().order_by('-created_at')
        results = []
        for post in posts:
            results.append({
                "id": str(post.id),
                "username": post.user.username,
                "email": post.user.email,
                "caption": post.caption,
                "text": post.text,
                "created_at": post.created_at.isoformat(),
                "is_blocked": post.is_blocked,
                "likes_count": Like.objects.filter(post=post).count(),
                "comments_count": Comment.objects.filter(post=post).count()
            })
        return Response(results, status=status.HTTP_200_OK)


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
        # Fetch from MongoDB
        cursor = reports_col.find().sort("created_at", -1)
        results = []
        for doc in cursor:
            doc["id"] = doc.pop("_id")
            results.append(doc)
        return Response(results, status=status.HTTP_200_OK)


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
        cursor = announcements_col.find().sort("created_at", -1)
        results = []
        for doc in cursor:
            doc["id"] = doc.pop("_id")
            results.append(doc)
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
        # We can construct historical time-series datasets for charts
        now = timezone.now()
        user_trends = []
        post_trends = []

        # Last 7 days
        for i in range(6, -1, -1):
            day = now - timedelta(days=i)
            day_str = day.strftime('%b %d')

            # Registrations
            user_count = User.objects.filter(
                date_joined__year=day.year,
                date_joined__month=day.month,
                date_joined__day=day.day
            ).count()
            user_trends.append({"date": day_str, "registrations": user_count})

            # Posts
            post_count = Post.objects.filter(
                created_at__year=day.year,
                created_at__month=day.month,
                created_at__day=day.day
            ).count()
            post_trends.append({"date": day_str, "posts": post_count})

        # Top active departments
        dept_data = StudentProfile.objects.values('department').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        departments = [
            {"name": item["department"] or "Unknown", "value": item["count"]}
            for item in dept_data
        ]

        return Response({
            "user_trends": user_trends,
            "post_trends": post_trends,
            "departments": departments
        }, status=status.HTTP_200_OK)
