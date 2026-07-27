from rest_framework import serializers
from .models import Post, Like, SavedPost, Category, CategoryFollow, UserInterest, PostMedia
from comments.models import Comment
from accounts.models import Follower

class CategorySerializer(serializers.ModelSerializer):
    is_followed = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'slug', 'description', 'is_followed']

    def get_is_followed(self, obj):
        request = self.context.get('request')
        if request and request.user and request.user.is_authenticated:
            return CategoryFollow.objects.filter(user=request.user, category=obj).exists()
        return False

class PostMediaSerializer(serializers.ModelSerializer):
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = PostMedia
        fields = ['id', 'media_type', 'file_url']

    def get_file_url(self, obj):
        file_obj = obj.file
        if not file_obj:
            return ''
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(file_obj.url)
        return file_obj.url

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
    relevance_score = serializers.IntegerField(required=False, read_only=True)
    priority = serializers.CharField(required=False, read_only=True)
    
    category = CategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(), source='category', write_only=True, required=False, allow_null=True
    )
    interest_status = serializers.SerializerMethodField()
    interested_count = serializers.SerializerMethodField()
    media_files = PostMediaSerializer(many=True, read_only=True)

    class Meta:
        model = Post
        fields = [
            'id', 'username', 'email', 'name', 'profile_pic', 'caption', 'text', 
            'hashtags', 'location', 'music_url', 'created_at', 'is_blocked', 
            'image', 'video', 'audio', 'poster', 'pdf', 'external_url', 
            'share_count', 'likes_count', 'comments_count', 'saved_count', 
            'is_liked', 'is_saved', 'is_following', 'category', 'category_id',
            'event_date', 'last_date', 'interest_status', 'interested_count',
            'event_type', 'department', 'relevance_score', 'priority', 'media_files'
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

    def get_interest_status(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            interest = UserInterest.objects.filter(post=obj, user=request.user).first()
            return interest.status if interest else None
        return None

    def get_interested_count(self, obj):
        return UserInterest.objects.filter(post=obj, status='interested').count()

    def to_representation(self, instance):
        ret = super().to_representation(instance)
        media_list = []
        request = self.context.get('request')

        def get_absolute_url(file_field):
            if not file_field:
                return None
            if request:
                return request.build_absolute_uri(file_field.url)
            return file_field.url

        # Add legacy fields
        if instance.image:
            media_list.append({
                'id': 'legacy-image',
                'media_type': 'image',
                'file_url': get_absolute_url(instance.image)
            })
        if instance.video:
            media_list.append({
                'id': 'legacy-video',
                'media_type': 'video',
                'file_url': get_absolute_url(instance.video)
            })
        if instance.audio:
            media_list.append({
                'id': 'legacy-audio',
                'media_type': 'audio',
                'file_url': get_absolute_url(instance.audio)
            })
        if instance.pdf:
            media_list.append({
                'id': 'legacy-pdf',
                'media_type': 'pdf',
                'file_url': get_absolute_url(instance.pdf)
            })
        if instance.poster:
            media_list.append({
                'id': 'legacy-poster',
                'media_type': 'poster',
                'file_url': get_absolute_url(instance.poster)
            })

        # Add records from PostMedia model
        for pm in instance.media_files.all():
            file_obj = pm.file
            if file_obj:
                media_list.append({
                    'id': pm.id,
                    'media_type': pm.media_type,
                    'file_url': get_absolute_url(file_obj)
                })

        ret['media_files'] = media_list
        return ret
