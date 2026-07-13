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
        fields = ['id', 'username', 'email', 'name', 'department', 'year', 'bio', 'profile_pic', 'cover_photo', 'theme_preference', 'is_blocked', 'followers_count', 'following_count', 'email_notifications_enabled', 'followed_notifications_enabled', 'role_type', 'roll_number', 'designation', 'teacher_role', 'mobile_number']
        read_only_fields = ['is_blocked', 'followers_count', 'following_count']

    def get_name(self, obj):
        return f"{obj.user.first_name} {obj.user.last_name}".strip() or obj.user.username

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        request = self.context.get('request')
        
        is_admin = request and request.user and (request.user.is_staff or request.user.is_superuser)
        is_self = request and request.user and request.user.is_authenticated and (instance.user == request.user)
        
        if not (is_admin or is_self):
            rep.pop('mobile_number', None)
            
        return rep


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 'profile', 'is_staff', 'is_superuser']


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    name = serializers.CharField(write_only=True, required=True)
    role_type = serializers.CharField(write_only=True, default='student')
    department = serializers.CharField(write_only=True, required=True)
    year = serializers.CharField(write_only=True, required=False, allow_blank=True)
    roll_number = serializers.CharField(write_only=True, required=False, allow_blank=True)
    designation = serializers.CharField(write_only=True, required=False, allow_blank=True)
    teacher_role = serializers.CharField(write_only=True, required=False, allow_blank=True)
    mobile_number = serializers.CharField(write_only=True, required=True)
    bio = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ['username', 'email', 'password', 'confirm_password', 'name', 'role_type', 'department', 'year', 'roll_number', 'designation', 'teacher_role', 'mobile_number', 'bio']

    def validate(self, attrs):
        if attrs['password'] != attrs['confirm_password']:
            raise serializers.ValidationError({"password": "Passwords do not match."})
        
        email = attrs.get('email', '').strip().lower()
        attrs['email'] = email
        if not email.endswith('@mits.ac.in'):
            raise serializers.ValidationError({"email": "Only @mits.ac.in emails are allowed for registration."})
            
        if User.objects.filter(email__iexact=email).exists():
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
            
        # Mobile number validation
        mobile_number = attrs.get('mobile_number', '')
        if not re.match(r'^\d{10}$', mobile_number):
            raise serializers.ValidationError({"mobile_number": "Mobile number must be exactly 10 digits."})
        if StudentProfile.objects.filter(mobile_number=mobile_number).exists():
            raise serializers.ValidationError({"mobile_number": "An account with this mobile number already exists."})

        # Password complexity validation
        password = attrs.get('password', '')
        if len(password) < 8:
            raise serializers.ValidationError({"password": "Password must be at least 8 characters long."})
        if not re.search(r'[A-Z]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one uppercase letter."})
        if not re.search(r'[a-z]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one lowercase letter."})
        if not re.search(r'[0-9]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one number."})
        if not re.search(r'[^a-zA-Z0-9]', password):
            raise serializers.ValidationError({"password": "Password must contain at least one special character."})

        # Conditional validation
        role_type = attrs.get('role_type', 'student')
        if role_type not in ['student', 'teacher']:
            raise serializers.ValidationError({"role_type": "Invalid role selected."})

        if not attrs.get('department'):
            raise serializers.ValidationError({"department": "Department is required."})

        if role_type == 'student':
            if not attrs.get('year'):
                raise serializers.ValidationError({"year": "Year of study is required for students."})
            roll_number = attrs.get('roll_number', '').strip().lower()
            attrs['roll_number'] = roll_number
            if not roll_number:
                raise serializers.ValidationError({"roll_number": "Roll number is required for students."})
            if len(roll_number) != 10 or not re.match(r'^[a-zA-Z0-9]+$', roll_number):
                raise serializers.ValidationError({"roll_number": "Roll number must be exactly 10 alphanumeric characters."})
            if StudentProfile.objects.filter(roll_number__iexact=roll_number).exists():
                raise serializers.ValidationError({"roll_number": "An account with this roll number already exists."})
            
            email_prefix = email.split('@')[0].strip().lower()
            if email_prefix != roll_number:
                raise serializers.ValidationError({
                    "email": f"For students, the email prefix must match the roll number (e.g. {roll_number}@mits.ac.in)."
                })
        elif role_type == 'teacher':
            if not attrs.get('designation'):
                raise serializers.ValidationError({"designation": "Designation is required for teachers."})
            if not attrs.get('teacher_role'):
                raise serializers.ValidationError({"teacher_role": "Teacher role is required."})

        return attrs

    def create(self, validated_data):
        # Extract extra fields
        name = validated_data.pop('name', '')
        role_type = validated_data.pop('role_type', 'student')
        department = validated_data.pop('department', '')
        year = validated_data.pop('year', '')
        roll_number = validated_data.pop('roll_number', '')
        designation = validated_data.pop('designation', '')
        teacher_role = validated_data.pop('teacher_role', '')
        mobile_number = validated_data.pop('mobile_number', '')
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
        profile.role_type = role_type
        profile.department = department
        profile.mobile_number = mobile_number
        profile.bio = bio
        
        if role_type == 'student':
            profile.year = year
            profile.roll_number = roll_number
            profile.designation = ''
            profile.teacher_role = ''
        else:
            profile.year = ''
            profile.roll_number = ''
            profile.designation = designation
            profile.teacher_role = teacher_role
            
        profile.save()

        return user
