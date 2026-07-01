from django.contrib import admin
from .models import Report, Announcement

@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('reporter', 'reported_user', 'reported_post', 'reason', 'status', 'created_at')
    list_filter = ('status', 'created_at')
    search_fields = ('reporter__username', 'reason', 'details')

@admin.register(Announcement)
class AnnouncementAdmin(admin.ModelAdmin):
    list_display = ('title', 'author', 'created_at')
    search_fields = ('title', 'content')
