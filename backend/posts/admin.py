from django.contrib import admin
from .models import Post, Like, SavedPost

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('user', 'caption', 'created_at', 'share_count', 'last_shared_at', 'is_blocked')
    search_fields = ('user__username', 'caption', 'text')
    list_filter = ('is_blocked', 'created_at')

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')

@admin.register(SavedPost)
class SavedPostAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'created_at')
    search_fields = ('user__username', 'user__email', 'post__caption')
    list_filter = ('created_at',)
