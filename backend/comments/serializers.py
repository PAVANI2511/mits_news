from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Comment, CommentReaction
from accounts.serializers import UserSerializer

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    reactions_summary = serializers.SerializerMethodField()
    my_reaction = serializers.SerializerMethodField()
    total_reactions = serializers.SerializerMethodField()
    likes_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'post', 'user', 'parent_comment', 'content',
            'created_at', 'updated_at', 'deleted_at', 'is_deleted',
            'is_edited', 'is_hidden', 'hidden_at', 'hidden_by',
            'is_pinned', 'pinned_at', 'reactions_summary', 'my_reaction',
            'total_reactions', 'likes_count', 'is_liked'
        ]
        read_only_fields = [
            'id', 'user', 'created_at', 'updated_at', 'deleted_at',
            'is_deleted', 'is_edited', 'is_hidden', 'hidden_at', 'hidden_by',
            'is_pinned', 'pinned_at'
        ]

    def get_reactions_summary(self, obj):
        summary = {r[0]: 0 for r in CommentReaction.REACTION_TYPES}
        reactions = getattr(obj, 'precalculated_reactions', None)
        if reactions is None:
            reactions = list(obj.reactions.all())
        for r in reactions:
            summary[r.reaction_type] = summary.get(r.reaction_type, 0) + 1
        return summary

    def get_my_reaction(self, obj):
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
            
        reactions = getattr(obj, 'precalculated_reactions', None)
        if reactions is not None:
            user_reaction = next((r for r in reactions if r.user_id == request.user.id), None)
            return user_reaction.reaction_type if user_reaction else None
            
        r = obj.reactions.filter(user=request.user).first()
        return r.reaction_type if r else None

    def get_total_reactions(self, obj):
        reactions = getattr(obj, 'precalculated_reactions', None)
        if reactions is not None:
            return len(reactions)
        return obj.reactions.count()

    def get_likes_count(self, obj):
        return self.get_total_reactions(obj)

    def get_is_liked(self, obj):
        return self.get_my_reaction(obj) is not None

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get('request')
        
        is_admin = request and request.user and (request.user.is_staff or request.user.is_superuser)
        is_post_owner = request and request.user and request.user.is_authenticated and (instance.post.user == request.user)
        is_comment_author = request and request.user and request.user.is_authenticated and (instance.user == request.user)
        
        # Soft delete masking
        if instance.is_deleted:
            rep['original_content'] = instance.content if is_admin else None
            rep['content'] = "This comment was deleted."
            if not is_admin:
                rep['user'] = None
                
        # Hiding masking
        elif instance.is_hidden:
            if is_admin or is_post_owner:
                # Can view actual content
                pass
            elif is_comment_author:
                rep['content'] = "Your comment has been hidden by the post owner."
            else:
                rep['content'] = "This comment was hidden."
                
        return rep
