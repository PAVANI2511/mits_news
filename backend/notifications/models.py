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

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)


def create_mention_notifications(text, sender, post=None, comment=None):
    import re
    if not text:
        return
    # Find all words starting with @ and containing allowed username characters
    raw_usernames = re.findall(r'@([a-zA-Z0-9_\.\+\-@]+)', text)
    usernames = set()
    for u in raw_usernames:
        u = u.strip()
        if not u:
            continue
        usernames.add(u)
        # Fallback for trailing punctuation like a period at the end of a sentence
        if len(u) > 1 and u[-1] in ['.', '-', '+', '_', '@']:
            usernames.add(u[:-1])

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
