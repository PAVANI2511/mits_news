from django.db import models
from django.contrib.auth.models import User
from django.db.models.signals import post_save
from django.dispatch import receiver

class StudentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    role_type = models.CharField(max_length=20, default='student')
    department = models.CharField(max_length=100, blank=True, default='')
    year = models.CharField(max_length=50, blank=True, default='')
    roll_number = models.CharField(max_length=50, blank=True, default='')
    designation = models.CharField(max_length=100, blank=True, default='')
    teacher_role = models.CharField(max_length=50, blank=True, default='')
    mobile_number = models.CharField(max_length=15, blank=True, default='')
    bio = models.TextField(blank=True, default='')
    profile_pic = models.FileField(upload_to='profiles/', blank=True, null=True)
    cover_photo = models.ImageField(upload_to='covers/', blank=True, null=True)
    theme_preference = models.CharField(max_length=50, default='light')
    is_blocked = models.BooleanField(default=False)
    email_notifications_enabled = models.BooleanField(default=True)
    followed_notifications_enabled = models.BooleanField(default=True)
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)
    
    # Password Reset OTP fields
    reset_otp_code = models.CharField(max_length=6, blank=True, default='')
    reset_otp_expiry = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)

# Signals to automatically create profile for User
@receiver(post_save, sender=User)
def create_or_update_user_profile(sender, instance, created, **kwargs):
    if created:
        StudentProfile.objects.create(user=instance)
    try:
        instance.profile.save()
    except StudentProfile.DoesNotExist:
        StudentProfile.objects.create(user=instance)

class Follower(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following_relations')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='follower_relations')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

    def __str__(self):
        return f"{self.follower.username} follows {self.following.username}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        
        # Recalculate follower and following counts
        self.follower.profile.following_count = Follower.objects.filter(follower=self.follower).count()
        self.follower.profile.save()
        
        self.following.profile.followers_count = Follower.objects.filter(following=self.following).count()
        self.following.profile.save()

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
        
        # Recalculate counts after deletion
        self.follower.profile.following_count = Follower.objects.filter(follower=self.follower).count()
        self.follower.profile.save()
        
        self.following.profile.followers_count = Follower.objects.filter(following=self.following).count()
        self.following.profile.save()


class LoginLog(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_logs')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} logged in at {self.created_at}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)


