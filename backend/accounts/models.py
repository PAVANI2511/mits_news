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
    followers_count = models.IntegerField(default=0)
    following_count = models.IntegerField(default=0)

    def __str__(self):
        return f"{self.user.username}'s Profile"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Sync with MongoDB
        from db_connection import users_col
        profile_pic_url = self.profile_pic.url if self.profile_pic else ''
        cover_photo_url = self.cover_photo.url if self.cover_photo else ''
        users_col.update_one(
            {"_id": str(self.user.id)},
            {"$set": {
                "id": str(self.user.id),
                "username": self.user.username,
                "email": self.user.email,
                "name": f"{self.user.first_name} {self.user.last_name}".strip() or self.user.username,
                "department": self.department,
                "year": self.year,
                "bio": self.bio,
                "profile_pic": profile_pic_url,
                "cover_photo": cover_photo_url,
                "theme_preference": self.theme_preference,
                "is_blocked": self.is_blocked,
                "email_notifications_enabled": self.email_notifications_enabled,
                "is_admin": self.user.is_staff or self.user.is_superuser,
                "followers_count": self.followers_count,
                "following_count": self.following_count,
                "role_type": self.role_type,
                "roll_number": self.roll_number,
                "designation": self.designation,
                "teacher_role": self.teacher_role,
                "mobile_number": self.mobile_number,
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import users_col
        users_col.delete_one({"_id": str(self.user.id)})
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
        from db_connection import followers_col
        
        # Recalculate follower and following counts
        self.follower.profile.following_count = Follower.objects.filter(follower=self.follower).count()
        self.follower.profile.save()
        
        self.following.profile.followers_count = Follower.objects.filter(following=self.following).count()
        self.following.profile.save()

        followers_col.update_one(
            {"_id": f"{self.follower.id}_{self.following.id}"},
            {"$set": {
                "follower_id": str(self.follower.id),
                "follower_username": self.follower.username,
                "following_id": str(self.following.id),
                "following_username": self.following.username,
                "created_at": self.created_at.isoformat() if self.created_at else None
            }},
            upsert=True
        )

    def delete(self, *args, **kwargs):
        from db_connection import followers_col
        followers_col.delete_one({"_id": f"{self.follower.id}_{self.following.id}"})
        super().delete(*args, **kwargs)
        
        # Recalculate counts after deletion
        self.follower.profile.following_count = Follower.objects.filter(follower=self.follower).count()
        self.follower.profile.save()
        
        self.following.profile.followers_count = Follower.objects.filter(following=self.following).count()
        self.following.profile.save()

