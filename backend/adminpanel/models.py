from django.db import models
from django.contrib.auth.models import User
from posts.models import Post

class Report(models.Model):
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_filed')
    reported_post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='reports_against')
    reported_comment = models.ForeignKey('comments.Comment', on_delete=models.CASCADE, null=True, blank=True, related_name='reports')
    reason = models.CharField(max_length=255)
    details = models.TextField(blank=True, default='')
    status = models.CharField(max_length=50, default='pending') # pending, resolved
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Report {self.id} (status: {self.status}) by {self.reporter.username}"

    def save(self, *args, **kwargs):
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
                        self.reported_comment.user.username if self.reported_comment else None
                    )
                ),
                "reason": self.reason,
                "details": self.details,
                "status": self.status,
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
