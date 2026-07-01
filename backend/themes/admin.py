from django.contrib import admin
from .models import Theme

@admin.register(Theme)
class ThemeAdmin(admin.ModelAdmin):
    list_display = ('name', 'user', 'primary_color', 'secondary_color', 'bg_color', 'text_color')
    search_fields = ('name', 'user__username')
