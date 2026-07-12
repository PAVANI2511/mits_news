from django.db import models
from django.contrib.auth.models import User
from posts.models import Post
from comments.models import Comment

class Notification(models.Model):
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications_received')
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications_sent', null=True, blank=True)
    type = models.CharField(max_length=50) # like, comment, reply, follow, announcement, admin
    post = models.ForeignKey(Post, on_delete=models.CASCADE, null=True, blank=True)
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, null=True, blank=True)
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Notification for {self.recipient.username}: {self.message}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from db_connection import notifications_col
        notifications_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "recipient_id": str(self.recipient.id),
                "sender_id": str(self.sender.id) if self.sender else None,
                "sender_username": self.sender.username if self.sender else "System",
                "sender_name": f"{self.sender.first_name} {self.sender.last_name}".strip() if self.sender else "System",
                "sender_profile_pic": self.sender.profile.profile_pic.url if self.sender and hasattr(self.sender, 'profile') and self.sender.profile.profile_pic else '',
                "type": self.type,
                "post_id": str(self.post.id) if self.post else None,
                "comment_id": str(self.comment.id) if self.comment else None,
                "message": self.message,
                "is_read": self.is_read,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import notifications_col
        notifications_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)


def create_mention_notifications(text, sender, post=None, comment=None):
    import re
    if not text:
        return
    # Find all words starting with @
    usernames = set(re.findall(r'@([a-zA-Z0-9_]+)', text))
    for username in usernames:
        if username.lower() == sender.username.lower():
            continue
        try:
            recipient = User.objects.get(username__iexact=username)
            # Create mention notification
            Notification.objects.create(
                recipient=recipient,
                sender=sender,
                type='mention',
                post=post,
                comment=comment,
                message=f"{sender.first_name or sender.username} mentioned you in a {'post' if post and not comment else 'comment'}."
            )
        except User.DoesNotExist:
            pass
