from rest_framework import serializers
from .models import Post, Like, SavedPost
from comments.models import Comment
from accounts.models import Follower

class PostSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    name = serializers.SerializerMethodField()
    profile_pic = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    comments_count = serializers.SerializerMethodField()
    saved_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    is_saved = serializers.SerializerMethodField()
    is_following = serializers.SerializerMethodField()
    hashtags = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = [
            'id', 'username', 'email', 'name', 'profile_pic', 'caption', 'text', 
            'hashtags', 'location', 'music_url', 'created_at', 'is_blocked', 
            'image', 'video', 'audio', 'poster', 'pdf', 'external_url', 
            'share_count', 'likes_count', 'comments_count', 'saved_count', 
            'is_liked', 'is_saved', 'is_following'
        ]
        read_only_fields = ['is_blocked', 'created_at', 'share_count']

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def get_profile_pic(self, obj):
        profile = getattr(obj.user, 'profile', None)
        if profile and profile.profile_pic:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(profile.profile_pic.url)
            return profile.profile_pic.url
        return ''

    def get_likes_count(self, obj):
        return Like.objects.filter(post=obj).count()

    def get_comments_count(self, obj):
        return Comment.objects.filter(post=obj, is_deleted=False).count()

    def get_saved_count(self, obj):
        return SavedPost.objects.filter(post=obj).count()

    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Like.objects.filter(post=obj, user=request.user).exists()
        return False

    def get_is_saved(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return SavedPost.objects.filter(post=obj, user=request.user).exists()
        return False

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return Follower.objects.filter(follower=request.user, following=obj.user).exists()
        return False

    def get_hashtags(self, obj):
        if not obj.hashtags:
            return []
        # Support both a comma-separated or space-separated hashtags string
        import re
        tokens = re.split(r'[\s,]+', obj.hashtags)
        return [t.lstrip("#") for t in tokens if t.strip()]
