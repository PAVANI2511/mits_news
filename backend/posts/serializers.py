from rest_framework import serializers
from .models import Post

class PostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    caption = serializers.CharField(required=True, allow_blank=False)
    text = serializers.CharField(required=True, allow_blank=False)

    class Meta:
        model = Post
        fields = [
            'id', 'username', 'email', 'caption', 'text', 'hashtags', 
            'location', 'music_url', 'created_at', 'is_blocked', 
            'image', 'video', 'audio', 'poster', 'pdf'
        ]
        read_only_fields = ['is_blocked', 'created_at']
