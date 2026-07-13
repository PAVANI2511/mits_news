from django.db import models
from django.contrib.auth.models import User
from posts.models import Post

class Report(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_filed')
    reported_post = models.ForeignKey(Post, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    reported_user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reports_against')
    reported_comment = models.ForeignKey('comments.Comment', on_delete=models.SET_NULL, null=True, blank=True, related_name='reports')
    reason = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    status = models.CharField(max_length=50, default='pending') # pending, resolved, under_review, rejected
    admin_notes = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    # Snapshot Fields to retain details if the parent items are deleted
    reported_username_snapshot = models.CharField(max_length=150, blank=True, default='')
    reported_user_email_snapshot = models.EmailField(blank=True, default='')
    reported_post_caption_snapshot = models.TextField(blank=True, default='')
    reported_post_text_snapshot = models.TextField(blank=True, default='')
    reported_post_image_url_snapshot = models.CharField(max_length=500, blank=True, default='')

    def __str__(self):
        return f"Report {self.id} (status: {self.status}) by {self.reporter.username}"

    def save(self, *args, **kwargs):
        # Capture snapshots when saving if they are not already set
        if self.reported_user and not self.reported_username_snapshot:
            self.reported_username_snapshot = self.reported_user.username
            self.reported_user_email_snapshot = self.reported_user.email
        if self.reported_post:
            if not self.reported_post_caption_snapshot:
                self.reported_post_caption_snapshot = self.reported_post.caption or ''
            if not self.reported_post_text_snapshot:
                self.reported_post_text_snapshot = self.reported_post.text or ''
            if not self.reported_post_image_url_snapshot and self.reported_post.image:
                self.reported_post_image_url_snapshot = self.reported_post.image.url
            if not self.reported_username_snapshot:
                self.reported_username_snapshot = self.reported_post.user.username
                self.reported_user_email_snapshot = self.reported_post.user.email
        if self.reported_comment:
            if not self.reported_post_text_snapshot:
                self.reported_post_text_snapshot = self.reported_comment.content or ''
            if not self.reported_username_snapshot:
                self.reported_username_snapshot = self.reported_comment.user.username
                self.reported_user_email_snapshot = self.reported_comment.user.email

        super().save(*args, **kwargs)
        from db_connection import reports_col
        reports_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "reporter_id": str(self.reporter.id),
                "reporter_username": self.reporter.username,
                "reported_post_id": str(self.reported_post.id) if self.reported_post else None,
                "reported_user_id": str(self.reported_user.id) if self.reported_user else None,
                "reported_comment_id": str(self.reported_comment.id) if self.reported_comment else None,
                "reported_username": self.reported_user.username if self.reported_user else (
                    self.reported_post.user.username if self.reported_post else (
                        self.reported_comment.user.username if self.reported_comment else self.reported_username_snapshot
                    )
                ),
                "reason": self.reason,
                "details": self.details,
                "status": self.status,
                "admin_notes": self.admin_notes,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import reports_col
        reports_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)


class Announcement(models.Model):
    author = models.ForeignKey(User, on_delete=models.CASCADE)
    title = models.CharField(max_length=200)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Announcement: {self.title}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from db_connection import announcements_col
        announcements_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "author_id": str(self.author.id),
                "author_username": self.author.username,
                "title": self.title,
                "content": self.content,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import announcements_col
        announcements_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)


class ModerationLog(models.Model):
    admin = models.ForeignKey(User, on_delete=models.CASCADE, related_name='moderation_actions')
    action = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.admin.username} - {self.action} at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from db_connection import moderation_logs_col
        moderation_logs_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "admin_id": str(self.admin.id),
                "admin_username": self.admin.username,
                "action": self.action,
                "details": self.details,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import moderation_logs_col
        moderation_logs_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)

