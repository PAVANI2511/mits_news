from django.db import models
from django.contrib.auth.models import User

class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    caption = models.TextField(blank=True, default='')
    text = models.TextField(blank=True, default='')
    hashtags = models.CharField(max_length=255, blank=True, default='')
    location = models.CharField(max_length=150, blank=True, default='')
    music_url = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    is_blocked = models.BooleanField(default=False)

    image = models.FileField(upload_to='posts/images/', blank=True, null=True)
    video = models.FileField(upload_to='posts/videos/', blank=True, null=True)
    audio = models.FileField(upload_to='posts/audio/', blank=True, null=True)
    poster = models.FileField(upload_to='posts/posters/', blank=True, null=True)
    pdf = models.FileField(upload_to='posts/pdfs/', blank=True, null=True)

    def __str__(self):
        return f"Post by {self.user.username} at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from db_connection import posts_col
        # Parse hashtags
        tags = [tag.strip("#") for tag in self.hashtags.split() if tag.startswith("#")] if self.hashtags else []

        posts_col.update_one(
            {"_id": str(self.id)},
            {"$set": {
                "id": str(self.id),
                "user_id": str(self.user.id),
                "username": self.user.username,
                "email": self.user.email,
                "name": f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
                "profile_pic": self.user.profile.profile_pic.url if hasattr(self.user, 'profile') and self.user.profile.profile_pic else '',
                "caption": self.caption,
                "text": self.text,
                "hashtags": tags,
                "location": self.location,
                "music_url": self.music_url,
                "created_at": self.created_at.isoformat() if self.created_at else None,
                "is_blocked": self.is_blocked,
                "image": self.image.url if self.image else '',
                "video": self.video.url if self.video else '',
                "audio": self.audio.url if self.audio else '',
                "poster": self.poster.url if self.poster else '',
                "pdf": self.pdf.url if self.pdf else ''
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import posts_col
        posts_col.delete_one({"_id": str(self.id)})
        super().delete(*args, **kwargs)


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from db_connection import likes_col
        likes_col.update_one(
            {"_id": f"{self.post.id}_{self.user.id}"},
            {"$set": {
                "post_id": str(self.post.id),
                "user_id": str(self.user.id),
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import likes_col
        likes_col.delete_one({"_id": f"{self.post.id}_{self.user.id}"})
        super().delete(*args, **kwargs)


class SavedPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_posts')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        from db_connection import saved_posts_col
        saved_posts_col.update_one(
            {"_id": f"{self.user.id}_{self.post.id}"},
            {"$set": {
                "user_id": str(self.user.id),
                "post_id": str(self.post.id),
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import saved_posts_col
        saved_posts_col.delete_one({"_id": f"{self.user.id}_{self.post.id}"})
        super().delete(*args, **kwargs)
