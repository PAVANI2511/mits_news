from django.contrib import admin
from .models import StudentProfile, Follower

@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ('user', 'department', 'branch', 'year', 'theme_preference', 'is_blocked')
    search_fields = ('user__username', 'user__email', 'department', 'branch')
    list_filter = ('year', 'is_blocked')

@admin.register(Follower)
class FollowerAdmin(admin.ModelAdmin):
    list_display = ('follower', 'following', 'created_at')
    search_fields = ('follower__username', 'following__username')
