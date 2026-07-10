from django.contrib import admin
from .models import Comment, CommentReaction

@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ('id', 'user', 'post', 'parent_comment_id', 'content_snippet', 'is_deleted', 'is_hidden', 'is_pinned', 'created_at')
    list_filter = ('is_deleted', 'is_hidden', 'is_pinned', 'created_at')
    search_fields = ('user__username', 'post__id', 'content')
    actions = ['restore_deleted', 'restore_hidden', 'permanent_delete']

    def content_snippet(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_snippet.short_description = 'Comment'

    @admin.action(description="Restore soft-deleted comments")
    def restore_deleted(self, request, queryset):
        count = 0
        for comment in queryset:
            if comment.is_deleted:
                comment.is_deleted = False
                comment.deleted_at = None
                comment.save()
                count += 1
        self.message_user(request, f"Successfully restored {count} soft-deleted comments.")

    @admin.action(description="Restore hidden comments")
    def restore_hidden(self, request, queryset):
        count = 0
        for comment in queryset:
            if comment.is_hidden:
                comment.is_hidden = False
                comment.hidden_by = None
                comment.hidden_at = None
                comment.save()
                count += 1
        self.message_user(request, f"Successfully restored {count} hidden comments.")

    @admin.action(description="Permanently delete comments")
    def permanent_delete(self, request, queryset):
        count = 0
        for comment in queryset:
            comment.delete()
            count += 1
        self.message_user(request, f"Successfully permanently deleted {count} comments.")


@admin.register(CommentReaction)
class CommentReactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'comment', 'user', 'reaction_type', 'created_at')
    list_filter = ('reaction_type', 'created_at')
    search_fields = ('user__username', 'comment__content')
