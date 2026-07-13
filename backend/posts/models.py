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
    external_url = models.URLField(max_length=500, blank=True, default='')
    share_count = models.PositiveIntegerField(default=0)
    last_shared_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Post by {self.user.username} at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Auto-resolve reports filed against this post
        try:
            from adminpanel.models import Report
            Report.objects.filter(reported_post=self).update(status='resolved')
        except Exception as e:
            print(f"Error resolving reports on post delete: {e}")

        super().delete(*args, **kwargs)


class Like(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='likes')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='likes')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('post', 'user')

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)


class SavedPost(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='saved_posts')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='saved_by')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'post')

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)


class ShareLog(models.Model):
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='share_logs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='share_logs')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Post {self.post.id} shared at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

