from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Theme
from db_connection import themes_col, users_col

class ThemePreferenceSaveView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        theme_name = request.data.get('theme_preference', 'light').strip()
        
        # Save theme preference in StudentProfile (SQLite)
        profile = request.user.profile
        profile.theme_preference = theme_name
        profile.save()

        # Update in MongoDB users collection
        users_col.update_one(
            {"_id": str(request.user.id)},
            {"$set": {"theme_preference": theme_name}}
        )

        return Response({
            "message": "Theme preference updated successfully.",
            "theme_preference": theme_name
        }, status=status.HTTP_200_OK)


class CustomThemeCreateView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        name = request.data.get('name', 'custom').strip()
        primary_color = request.data.get('primary_color', '#3b82f6').strip()
        secondary_color = request.data.get('secondary_color', '#1d4ed8').strip()
        bg_color = request.data.get('bg_color', '#f3f4f6').strip()
        text_color = request.data.get('text_color', '#1f2937').strip()
        card_bg = request.data.get('card_bg', '#ffffff').strip()
        border_color = request.data.get('border_color', '#e5e7eb').strip()

        # Create Theme record (SQLite)
        theme, created = Theme.objects.update_or_create(
            user=request.user,
            name=name,
            defaults={
                "primary_color": primary_color,
                "secondary_color": secondary_color,
                "bg_color": bg_color,
                "text_color": text_color,
                "card_bg": card_bg,
                "border_color": border_color
            }
        )

        # Automatically apply the theme
        profile = request.user.profile
        profile.theme_preference = f"custom_{theme.id}"
        profile.save()

        return Response({
            "message": "Custom theme saved and applied successfully.",
            "theme": {
                "id": str(theme.id),
                "name": theme.name,
                "primary_color": theme.primary_color,
                "secondary_color": theme.secondary_color,
                "bg_color": theme.bg_color,
                "text_color": theme.text_color,
                "card_bg": theme.card_bg,
                "border_color": theme.border_color
            }
        }, status=status.HTTP_201_CREATED)


class ThemeDetailView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        theme_name = request.query_params.get('name', 'light').strip()
        
        # Preset themes
        presets = {
            "light": {
                "name": "light",
                "primary_color": "#3b82f6",     # Blue 500
                "secondary_color": "#1d4ed8",   # Blue 700
                "bg_color": "#f9fafb",          # Slate 50
                "text_color": "#111827",        # Slate 900
                "card_bg": "#ffffff",
                "border_color": "#f1f5f9"
            },
            "dark": {
                "name": "dark",
                "primary_color": "#3b82f6",
                "secondary_color": "#60a5fa",
                "bg_color": "#0b0f19",          # Dark Slate
                "text_color": "#f9fafb",
                "card_bg": "#111827",
                "border_color": "#1f2937"
            },
            "blue": {
                "name": "blue",
                "primary_color": "#2563eb",
                "secondary_color": "#1d4ed8",
                "bg_color": "#eff6ff",          # Light Blue
                "text_color": "#1e3a8a",
                "card_bg": "#ffffff",
                "border_color": "#dbeafe"
            },
            "purple": {
                "name": "purple",
                "primary_color": "#7c3aed",
                "secondary_color": "#6d28d9",
                "bg_color": "#faf5ff",          # Light Purple
                "text_color": "#581c87",
                "card_bg": "#ffffff",
                "border_color": "#f3e8ff"
            },
            "green": {
                "name": "green",
                "primary_color": "#16a34a",
                "secondary_color": "#15803d",
                "bg_color": "#f0fdf4",          # Light Green
                "text_color": "#14532d",
                "card_bg": "#ffffff",
                "border_color": "#dcfce7"
            },
            "college": {
                "name": "college",
                "primary_color": "#b91c1c",     # College Red/Maroon
                "secondary_color": "#7f1d1d",
                "bg_color": "#fff5f5",
                "text_color": "#7f1d1d",
                "card_bg": "#ffffff",
                "border_color": "#fee2e2"
            }
        }

        # Check if preset exists
        if theme_name in presets:
            return Response(presets[theme_name], status=status.HTTP_200_OK)

        # Check if custom theme
        if theme_name.startswith("custom_"):
            try:
                theme_id = int(theme_name.split("_")[1])
                theme = Theme.objects.filter(pk=theme_id).first()
                if theme:
                    return Response({
                        "name": theme.name,
                        "primary_color": theme.primary_color,
                        "secondary_color": theme.secondary_color,
                        "bg_color": theme.bg_color,
                        "text_color": theme.text_color,
                        "card_bg": theme.card_bg,
                        "border_color": theme.border_color
                    }, status=status.HTTP_200_OK)
            except (IndexError, ValueError):
                pass

        # Return light theme fallback
        return Response(presets["light"], status=status.HTTP_200_OK)
