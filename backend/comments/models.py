from django.db import models
from django.contrib.auth.models import User
from posts.models import Post

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments_sql')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments_sql')
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    is_deleted = models.BooleanField(default=False)
    is_edited = models.BooleanField(default=False)

    # Post Owner Moderation Fields
    is_hidden = models.BooleanField(default=False)
    hidden_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='hidden_comments')
    hidden_at = models.DateTimeField(null=True, blank=True)
    is_pinned = models.BooleanField(default=False)
    pinned_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"Comment by {self.user.username} on post {self.post.id} (ID: {self.id})"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.sync_to_mongo()

    def delete(self, *args, **kwargs):
        from db_connection import comments_col
        comments_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)

    def sync_to_mongo(self):
        from db_connection import comments_col
        comments_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "post_id": str(self.post.id),
                "user_id": str(self.user.id),
                "username": self.user.username,
                "name": f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
                "profile_pic": self.user.profile.profile_pic.url if hasattr(self.user, 'profile') and self.user.profile.profile_pic else '',
                "content": self.content,
                "parent_comment_id": str(self.parent_comment.id) if self.parent_comment else None,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "updated_at": self.updated_at.isoformat() if self.updated_at else None,
                "deleted_at": self.deleted_at.isoformat() if self.deleted_at else None,
                "is_deleted": self.is_deleted,
                "is_edited": self.is_edited,
                "is_hidden": self.is_hidden,
                "hidden_by_id": str(self.hidden_by.id) if self.hidden_by else None,
                "hidden_at": self.hidden_at.isoformat() if self.hidden_at else None,
                "is_pinned": self.is_pinned,
                "pinned_at": self.pinned_at.isoformat() if self.pinned_at else None,
            }},
            upsert=True
        )


class CommentReaction(models.Model):
    REACTION_TYPES = [
        ('like', '👍 Like'),
        ('love', '❤️ Love'),
        ('haha', '😂 Haha'),
        ('wow', '😮 Wow'),
        ('sad', '😢 Sad'),
        ('angry', '😡 Angry'),
    ]
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comment_reactions')
    reaction_type = models.CharField(max_length=10, choices=REACTION_TYPES, default='like')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('comment', 'user')

    def __str__(self):
        return f"{self.user.username} reacted {self.reaction_type} on comment {self.comment.id}"
