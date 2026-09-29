from django.contrib import admin
from .models import Post, Like, SavedPost, PostMedia, Category, CategoryFollow

@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'slug', 'is_tech')
    search_fields = ('name', 'description')
    prepopulated_fields = {'slug': ('name',)}

@admin.register(CategoryFollow)
class CategoryFollowAdmin(admin.ModelAdmin):
    list_display = ('user', 'category', 'created_at')
    search_fields = ('user__username', 'category__name')

@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ('user', 'caption', 'category', 'created_at', 'share_count', 'last_shared_at', 'is_blocked')
    search_fields = ('user__username', 'caption', 'text')
    list_filter = ('is_blocked', 'category', 'created_at')

@admin.register(PostMedia)
class PostMediaAdmin(admin.ModelAdmin):
    list_display = ('id', 'post', 'media_type', 'created_at')
    list_filter = ('media_type', 'created_at')
    search_fields = ('post__caption', 'post__text')

@admin.register(Like)
class LikeAdmin(admin.ModelAdmin):
    list_display = ('post', 'user', 'created_at')

@admin.register(SavedPost)
class SavedPostAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'created_at')
    search_fields = ('user__username', 'user__email', 'post__caption')
    list_filter = ('created_at',)

