from django.db import models
from django.contrib.auth.models import User
from django.conf import settings

# Determine storage classes conditionally for Cloudinary deployments
if hasattr(settings, 'CLOUDINARY_STORAGE') and settings.CLOUDINARY_STORAGE:
    from cloudinary_storage.storage import VideoMediaCloudinaryStorage, RawMediaCloudinaryStorage
    video_storage = VideoMediaCloudinaryStorage()
    audio_storage = VideoMediaCloudinaryStorage()
    pdf_storage = RawMediaCloudinaryStorage()
else:
    video_storage = None
    audio_storage = None
    pdf_storage = None

class Category(models.Model):
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=120, unique=True, blank=True)
    description = models.TextField(blank=True, default='')
    is_tech = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class CategoryFollow(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followed_categories')
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('user', 'category')

    def __str__(self):
        return f"{self.user.username} follows category {self.category.name}"


class Post(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='posts')
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True, related_name='posts')
    caption = models.TextField(blank=True, default='')
    text = models.TextField(blank=True, default='')
    hashtags = models.CharField(max_length=255, blank=True, default='')
    location = models.CharField(max_length=150, blank=True, default='')
    music_url = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)
    is_blocked = models.BooleanField(default=False)
    event_date = models.DateTimeField(null=True, blank=True)
    last_date = models.DateTimeField(null=True, blank=True)
    event_type = models.CharField(max_length=100, blank=True, default='')
    department = models.CharField(max_length=100, blank=True, default='')

    image = models.FileField(upload_to='posts/images/', blank=True, null=True)
    video = models.FileField(upload_to='posts/videos/', storage=video_storage, blank=True, null=True)
    audio = models.FileField(upload_to='posts/audio/', storage=audio_storage, blank=True, null=True)
    poster = models.FileField(upload_to='posts/posters/', blank=True, null=True)
    pdf = models.FileField(upload_to='posts/pdfs/', storage=pdf_storage, blank=True, null=True)
    external_url = models.URLField(max_length=500, blank=True, default='')
    share_count = models.PositiveIntegerField(default=0)
    last_shared_at = models.DateTimeField(blank=True, null=True)

    def __str__(self):
        return f"Post by {self.user.username} at {self.created_at}"

    def save(self, *args, **kwargs):
        if not self.department and self.user:
            profile = getattr(self.user, 'profile', None)
            if profile and profile.department:
                self.department = profile.department
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


class UserInterest(models.Model):
    STATUS_CHOICES = (
        ('interested', 'Interested'),
        ('not_interested', 'Not Interested'),
    )
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='interests')
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='interests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES)
    created_at = models.DateTimeField(auto_now=True)
    
    # Flags to prevent duplicate emails
    reminder_sent_3d = models.BooleanField(default=False)
    reminder_sent_2d = models.BooleanField(default=False)
    reminder_sent_1d = models.BooleanField(default=False)
    event_day_reminder_sent = models.BooleanField(default=False)

    class Meta:
        unique_together = ('user', 'post')

    def __str__(self):
        return f"{self.user.username} - {self.post.id} - {self.status}"


from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from django.core.cache import cache

@receiver(post_save, sender=Post)
@receiver(post_delete, sender=Post)
def clear_analytics_cache(sender, **kwargs):
    cache.clear()

