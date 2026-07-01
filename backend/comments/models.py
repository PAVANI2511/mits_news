from django.db import models
from django.contrib.auth.models import User
from posts.models import Post

class Comment(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments_sql')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='comments_sql')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Comment by {self.user.username} on post {self.post.id}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.sync_to_mongo()

    def delete(self, *args, **kwargs):
        from db_connection import comments_col
        comments_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)

    def sync_to_mongo(self):
        from db_connection import comments_col
        # Get replies list
        replies_list = []
        for reply in self.replies.all():
            replies_list.append({
                "id": str(reply.id),
                "user_id": str(reply.user.id),
                "username": reply.user.username,
                "name": f"{reply.user.first_name} {reply.user.last_name}".strip() or reply.user.username,
                "text": reply.text,
                "created_at": reply.created_at.isoformat() if reply.created_at else None
            })

        comments_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "post_id": str(self.post.id),
                "user_id": str(self.user.id),
                "username": self.user.username,
                "name": f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
                "profile_pic": self.user.profile.profile_pic.url if hasattr(self.user, 'profile') and self.user.profile.profile_pic else '',
                "text": self.text,
                "replies": replies_list,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )


class Reply(models.Model):
    comment = models.ForeignKey(Comment, on_delete=models.CASCADE, related_name='replies')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='replies')
    text = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Reply by {self.user.username} on comment {self.comment.id}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.comment.sync_to_mongo()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        self.comment.sync_to_mongo()
