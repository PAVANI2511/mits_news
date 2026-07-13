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

    def delete(self, *args, **kwargs):
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

    def delete(self, *args, **kwargs):
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

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

