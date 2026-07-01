from django.contrib import admin
from .models import Comment, Reply

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('user', 'post', 'text', 'created_at')
    search_fields = ('user__username', 'text')

@admin.register(Reply)
class ReplyAdmin(admin.ModelAdmin):
    list_display = ('user', 'comment', 'text', 'created_at')
    search_fields = ('user__username', 'text')
