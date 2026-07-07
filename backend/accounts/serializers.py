import re
from rest_framework import serializers
from django.contrib.auth.models import User
from .models import StudentProfile

class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    email = serializers.CharField(source='user.email', read_only=True)
    name = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = ['id', 'username', 'email', 'name', 'department', 'year', 'bio', 'profile_pic', 'cover_photo', 'theme_preference', 'is_blocked', 'followers_count', 'following_count', 'email_notifications_enabled']
        read_only_fields = ['is_blocked', 'followers_count', 'following_count']

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_staff', 'is_superuser']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True, required=True)
    department = serializers.CharField(write_only=True, required=True)
    year = serializers.CharField(write_only=True, required=True)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'name', 'department', 'year', 'bio']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        email = attrs.get('email', '')
        if not email.endswith('@mits.ac.in'):
            raise serializers.ValidationError({"email": "Only @mits.ac.in emails are allowed for student registration."})
            
        if User.objects.filter(email=email).exists():
            raise serializers.ValidationError({"email": "An account with this email address already exists."})

        username = attrs.get('username', '')
        if User.objects.filter(username=username).exists():
            raise serializers.ValidationError({"username": "Username is already taken."})

        if not re.search(r'[a-zA-Z]', username):
            raise serializers.ValidationError({"username": "Username must contain at least one letter."})

        if not re.search(r'[0-9]', username):
            raise serializers.ValidationError({"username": "Username must contain at least one number."})

        if not re.search(r'[^a-zA-Z0-9]', username):
            raise serializers.ValidationError({"username": "Username must contain at least one special character (e.g. _, ., @, +, -)."})
            
        return attrs

    def create(self, validated_data):
        # Extract extra fields
        name = validated_data.pop('name', '')
        department = validated_data.pop('department', '')
        year = validated_data.pop('year', '')
        bio = validated_data.pop('bio', '')
        validated_data.pop('confirm_password')

        # Split name into first and last name
        name_parts = name.strip().split(' ', 1)
        first_name = name_parts[0] if len(name_parts) > 0 else ''
        last_name = name_parts[1] if len(name_parts) > 1 else ''

        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=first_name,
            last_name=last_name
        )

        # Update profile
        profile = user.profile
        profile.department = department
        profile.year = year
        profile.bio = bio
        profile.save()

        return user
