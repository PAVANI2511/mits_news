from rest_framework import serializers
from .models import Notification

class NotificationSerializer(serializers.ModelSerializer):
    recipient_id = serializers.CharField(source='recipient.id', read_only=True)
    sender_id = serializers.CharField(source='sender.id', read_only=True, allow_null=True)
    sender_username = serializers.CharField(source='sender.username', read_only=True, default='System')
    sender_name = serializers.SerializerMethodField()
    sender_profile_pic = serializers.SerializerMethodField()
    post_id = serializers.CharField(source='post.id', read_only=True, allow_null=True)
    comment_id = serializers.CharField(source='comment.id', read_only=True, allow_null=True)

    class Meta:
        model = Notification
        fields = [
            'id', 'recipient_id', 'sender_id', 'sender_username', 'sender_name', 
            'sender_profile_pic', 'type', 'post_id', 'comment_id', 'message', 
            'is_read', 'created_at'
        ]

    def get_sender_name(self, obj):
        if obj.sender:
            return f"{obj.sender.first_name} {obj.sender.last_name}".strip() or obj.sender.username
        return 'System'

    def get_sender_profile_pic(self, obj):
        if obj.sender:
            profile = getattr(obj.sender, 'profile', None)
            if profile and profile.profile_pic:
                request = self.context.get('request')
                if request:
                    return request.build_absolute_uri(profile.profile_pic.url)
                return profile.profile_pic.url
        return ''
