from rest_framework import status, generics, permissions, views, serializers
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.authentication import JWTAuthentication

from .models import StudentProfile, Follower
from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer
from notifications.models import Notification

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username', '').strip()
        user = None
        if '@' in username:
            user = User.objects.filter(email__iexact=username).first()
        else:
            user = User.objects.filter(username__iexact=username).first()
            
        if user:
            attrs['username'] = user.username
                
        data = super().validate(attrs)
        profile = getattr(self.user, 'profile', None)
        if profile and profile.is_blocked:
            raise serializers.ValidationError("Your account has been blocked by the admin.")
        
        user_serializer = UserSerializer(self.user, context={
            'request': self.context.get('request'),
            'is_self': True
        })
        data['user'] = user_serializer.data

        # Log successful login
        from .models import LoginLog
        LoginLog.objects.create(user=self.user)

        return data


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    permission_classes = [permissions.AllowAny]
    serializer_class = RegisterSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        user_data = UserSerializer(user, context={'request': request}).data
        return Response({
            "message": "User registered successfully.",
            "user": user_data
        }, status=status.HTTP_201_CREATED)


class UserProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        profile = getattr(user, 'profile', None)
        if not profile:
            profile = StudentProfile.objects.create(user=user)
        
        profile_serializer = ProfileSerializer(profile, context={'request': request})
        is_following = False
        if request.user.is_authenticated and request.user != user:
            is_following = Follower.objects.filter(follower=request.user, following=user).exists()
            
        from posts.models import Post, Like
        total_posts = Post.objects.filter(user=user).count()
        total_likes = Like.objects.filter(post__user=user).count()
        joined_date = user.date_joined.isoformat()

        return Response({
            **profile_serializer.data,
            "is_following": is_following,
            "total_posts": total_posts,
            "total_likes": total_likes,
            "joined_date": joined_date
        }, status=status.HTTP_200_OK)


class UserFollowersListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        followers = Follower.objects.filter(following=user).select_related('follower', 'follower__profile')
        results = []
        for f in followers:
            profile = getattr(f.follower, 'profile', None)
            results.append({
                "id": f.follower.id,
                "username": f.follower.username,
                "name": f"{f.follower.first_name} {f.follower.last_name}".strip() or f.follower.username,
                "profile_pic": profile.profile_pic.url if profile and profile.profile_pic else '',
                "bio": profile.bio if profile else '',
                "department": profile.department if profile else '',
                "year": profile.year if profile else '',
            })
        return Response(results, status=status.HTTP_200_OK)


class UserFollowingListView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, username):
        user = get_object_or_404(User, username=username)
        following = Follower.objects.filter(follower=user).select_related('following', 'following__profile')
        results = []
        for f in following:
            profile = getattr(f.following, 'profile', None)
            results.append({
                "id": f.following.id,
                "username": f.following.username,
                "name": f"{f.following.first_name} {f.following.last_name}".strip() or f.following.username,
                "profile_pic": profile.profile_pic.url if profile and profile.profile_pic else '',
                "bio": profile.bio if profile else '',
                "department": profile.department if profile else '',
                "year": profile.year if profile else '',
            })
        return Response(results, status=status.HTTP_200_OK)


class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = ProfileSerializer
    authentication_classes = [JWTAuthentication]
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user.profile

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        
        # Get target role_type, roll_number, email
        role_type = request.data.get('role_type', profile.role_type)
        roll_number = request.data.get('roll_number', profile.roll_number)
        email = request.data.get('email', request.user.email)
        
        # Normalize and strip if present
        import re
        if email:
            email = email.strip().lower()
        if roll_number:
            roll_number = roll_number.strip().lower()

        # If student, validate roll number format and email prefix match case-insensitively
        if role_type == 'student':
            if not roll_number:
                return Response({"roll_number": "Roll number is required for students."}, status=status.HTTP_400_BAD_REQUEST)
            if len(roll_number) != 10 or not re.match(r'^[a-zA-Z0-9]+$', roll_number):
                return Response({"roll_number": "Roll number must be exactly 10 alphanumeric characters."}, status=status.HTTP_400_BAD_REQUEST)
            
            # Email prefix check
            email_prefix = email.split('@')[0].strip().lower() if email else ''
            if email_prefix != roll_number:
                return Response({
                    "email": f"For students, the email prefix must match the roll number (e.g. {roll_number}@mits.ac.in)."
                }, status=status.HTTP_400_BAD_REQUEST)

        # Extract fields to update in user object if provided
        name = request.data.get('name')
        if name is not None:
            name_parts = name.strip().split(' ', 1)
            request.user.first_name = name_parts[0] if len(name_parts) > 0 else ''
            request.user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            request.user.save()

        # Update email if provided (restricted to @mits.ac.in check if updated)
        email_val = request.data.get('email')
        if email_val is not None:
            email_val = email_val.strip().lower()
            if email_val != request.user.email:
                if not email_val.endswith('@mits.ac.in'):
                    return Response({"email": "Only @mits.ac.in emails are allowed."}, status=status.HTTP_400_BAD_REQUEST)
                if User.objects.filter(email__iexact=email_val).exclude(pk=request.user.pk).exists():
                    return Response({"email": "An account with this email address already exists."}, status=status.HTTP_400_BAD_REQUEST)
                request.user.email = email_val
                request.user.save()

        serializer = self.get_serializer(profile, data=request.data, partial=True)
        serializer.context['is_self'] = True
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data, status=status.HTTP_200_OK)


class FollowUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        user_to_follow = get_object_or_404(User, username=username)
        if user_to_follow == request.user:
            return Response({"error": "You cannot follow yourself."}, status=status.HTTP_400_BAD_REQUEST)

        follower_rel, created = Follower.objects.get_or_create(
            follower=request.user,
            following=user_to_follow
        )

        if created:
            # Dispatch Notification
            Notification.objects.create(
                recipient=user_to_follow,
                sender=request.user,
                type='follow',
                message=f"{request.user.first_name or request.user.username} started following you."
            )
            return Response({"message": f"Successfully followed {username}."}, status=status.HTTP_201_CREATED)
        else:
            return Response({"message": f"You already follow {username}."}, status=status.HTTP_200_OK)


class UnfollowUserView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        user_to_unfollow = get_object_or_404(User, username=username)
        relation = Follower.objects.filter(follower=request.user, following=user_to_unfollow)
        
        if relation.exists():
            for r in relation:
                r.delete()
            return Response({"message": f"Successfully unfollowed {username}."}, status=status.HTTP_200_OK)
        else:
            return Response({"error": f"You do not follow {username}."}, status=status.HTTP_400_BAD_REQUEST)


class ForgotPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)
        
        import random
        from django.utils import timezone
        from datetime import datetime, timedelta
        from django.core.mail import send_mail
        
        # Generate 6-digit OTP
        otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
        expiry = timezone.now() + timedelta(minutes=10)
        
        # Store OTP in StudentProfile
        profile = user.profile
        profile.reset_otp_code = otp
        profile.reset_otp_expiry = expiry
        profile.save()
        
        # Send Email asynchronously
        from django.conf import settings
        is_console = getattr(settings, 'EMAIL_BACKEND', '') == 'django.core.mail.backends.console.EmailBackend'
        
        if is_console:
            print(f"\n==================================================")
            print(f"DEVELOPMENT RESET OTP FOR {email}: {otp}")
            print(f"==================================================\n")
            return Response({
                "message": "Development mode: Verification OTP has been printed to the server terminal console."
            }, status=status.HTTP_200_OK)

        def send_email_async(subject, message, from_email, recipient_list, otp_code):
            try:
                send_mail(
                    subject=subject,
                    message=message,
                    from_email=from_email,
                    recipient_list=recipient_list,
                    fail_silently=False,
                )
                print(f"Password reset email sent successfully to {recipient_list}")
            except Exception as e:
                print(f"\n==================================================")
                print(f"Background SMTP Error: {e}. Outputting OTP to log console: {otp_code}")
                print(f"==================================================\n")

        import threading
        threading.Thread(
            target=send_email_async,
            args=(
                "MITS Newspaper - Password Reset Code",
                f"Hello,\n\nYour password reset verification code is: {otp}\n\nThis code will expire in 10 minutes.",
                getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mits.ac.in'),
                [email],
                otp
            )
        ).start()
            
        return Response({"message": "Verification OTP sent to your college email address."}, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '')
        new_password = request.data.get('password', '')
        
        if not email or not otp or not new_password:
            return Response({"error": "Email, verification OTP, and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)
        
        from django.utils import timezone
        
        profile = user.profile
        if not profile.reset_otp_code:
            return Response({"error": "No password reset request found. Please request a new verification code."}, status=status.HTTP_400_BAD_REQUEST)
        
        if profile.reset_otp_code != str(otp).strip():
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        if timezone.now() > profile.reset_otp_expiry:
            return Response({"error": "Verification code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            
        # Validate new password complexity constraints (min 8 chars, containing upper, lowercase, numbers, spl characters)
        import re
        if len(new_password) < 8:
            return Response({"error": "Password must be at least 8 characters long."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[A-Z]', new_password):
            return Response({"error": "Password must contain at least one uppercase letter."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[a-z]', new_password):
            return Response({"error": "Password must contain at least one lowercase letter."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[0-9]', new_password):
            return Response({"error": "Password must contain at least one number."}, status=status.HTTP_400_BAD_REQUEST)
        if not re.search(r'[^a-zA-Z0-9]', new_password):
            return Response({"error": "Password must contain at least one special character."}, status=status.HTTP_400_BAD_REQUEST)

        # Clean up OTP and reset password
        profile.reset_otp_code = ''
        profile.reset_otp_expiry = None
        profile.save()
        
        user.set_password(new_password)
        user.save()
        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)


class SearchUsersView(views.APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        dept = request.query_params.get('department', '').strip()
        year = request.query_params.get('year', '').strip()

        from django.db.models import Q
        queryset = User.objects.all()

        if query:
            queryset = queryset.filter(
                Q(username__icontains=query) |
                Q(first_name__icontains=query) |
                Q(last_name__icontains=query) |
                Q(email__icontains=query)
            )
        if dept:
            queryset = queryset.filter(profile__department__icontains=dept)
        if year:
            queryset = queryset.filter(profile__year__icontains=year)

        # Hide blocked profiles unless requester is admin
        if not (request.user.is_authenticated and request.user.is_staff):
            queryset = queryset.filter(profile__is_blocked=False)

        # Limit to 50 results
        queryset = queryset.select_related('profile')[:50]

        results = []
        for u in queryset:
            prof = getattr(u, 'profile', None)
            profile_pic_url = prof.profile_pic.url if prof and prof.profile_pic else ''
            cover_photo_url = prof.cover_photo.url if prof and prof.cover_photo else ''
            results.append({
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "name": f"{u.first_name} {u.last_name}".strip() or u.username,
                "department": prof.department if prof else '',

                "year": prof.year if prof else '',
                "bio": prof.bio if prof else '',
                "profile_pic": profile_pic_url,
                "cover_photo": cover_photo_url,
                "theme_preference": prof.theme_preference if prof else 'light',
                "is_blocked": prof.is_blocked if prof else False,
                "followers_count": prof.followers_count if prof else 0,
                "following_count": prof.following_count if prof else 0,
                "role_type": prof.role_type if prof else 'student',
                "roll_number": prof.roll_number if prof else '',
                "designation": prof.designation if prof else '',
                "teacher_role": prof.teacher_role if prof else '',
                "mobile_number": prof.mobile_number if prof else '',
            })

        return Response(results, status=status.HTTP_200_OK)


class DeleteAccountView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user.delete()
        return Response({"message": "Your account and all associated content have been permanently deleted."}, status=status.HTTP_200_OK)


class VerifyOTPView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip().lower()
        otp = request.data.get('otp', '')
        
        if not email or not otp:
            return Response({"error": "Email and verification OTP are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        user = User.objects.filter(email__iexact=email).first()
        if not user:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)
            
        from django.utils import timezone
        profile = user.profile
        
        if not profile.reset_otp_code:
            return Response({"error": "No password reset request found. Please request a new verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        if profile.reset_otp_code != str(otp).strip():
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        if timezone.now() > profile.reset_otp_expiry:
            return Response({"error": "Verification code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"message": "Verification code verified successfully."}, status=status.HTTP_200_OK)


class SuggestedUsersView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user = request.user
        profile = getattr(user, 'profile', None)
        dept = profile.department if profile else ''
        
        # 1. Get IDs of users already followed
        from accounts.models import Follower
        followed_ids = Follower.objects.filter(follower=user).values_list('following_id', flat=True)
        
        # Exclude logged in user and already followed
        exclude_ids = list(followed_ids) + [user.id]
        
        # Query SQL for suggestions
        # Option A: Users in the same department
        dept_suggestions = []
        if dept:
            dept_suggestions = User.objects.filter(
                profile__department=dept,
                profile__is_blocked=False
            ).exclude(id__in=exclude_ids).select_related('profile')[:10]
            
        # Option B: Other users
        exclude_ids_b = exclude_ids + [u.id for u in dept_suggestions]
        other_suggestions = User.objects.filter(
            profile__is_blocked=False
        ).exclude(id__in=exclude_ids_b).select_related('profile')[:10]
        
        # Combine
        suggestions = list(dept_suggestions) + list(other_suggestions)
        results = []
        for u in suggestions[:10]:
            prof = getattr(u, 'profile', None)
            profile_pic_url = prof.profile_pic.url if prof and prof.profile_pic else ''
            cover_photo_url = prof.cover_photo.url if prof and prof.cover_photo else ''
            results.append({
                "id": str(u.id),
                "username": u.username,
                "email": u.email,
                "name": f"{u.first_name} {u.last_name}".strip() or u.username,
                "department": prof.department if prof else '',

                "year": prof.year if prof else '',
                "bio": prof.bio if prof else '',
                "profile_pic": profile_pic_url,
                "cover_photo": cover_photo_url,
                "theme_preference": prof.theme_preference if prof else 'light',
                "is_blocked": prof.is_blocked if prof else False,
                "followers_count": prof.followers_count if prof else 0,
                "following_count": prof.following_count if prof else 0,
                "role_type": prof.role_type if prof else 'student',
                "roll_number": prof.roll_number if prof else '',
                "designation": prof.designation if prof else '',
                "teacher_role": prof.teacher_role if prof else '',
                "mobile_number": prof.mobile_number if prof else '',
            })
            
        return Response(results, status=status.HTTP_200_OK)


class ReportUserProfileView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, username):
        target_user = get_object_or_404(User, username=username)
        if target_user == request.user:
            return Response({"error": "You cannot report your own profile."}, status=status.HTTP_400_BAD_REQUEST)
        
        reason = request.data.get('reason', '').strip()
        details = request.data.get('details', '').strip()

        if not reason:
            return Response({"error": "Reason is required."}, status=status.HTTP_400_BAD_REQUEST)

        # Prevent duplicate reports
        from adminpanel.models import Report
        duplicate = Report.objects.filter(
            reporter=request.user,
            reported_user=target_user,
            reported_post__isnull=True,
            reported_comment__isnull=True
        ).exists()

        if duplicate:
            return Response({"error": "You have already reported this profile."}, status=status.HTTP_400_BAD_REQUEST)

        # Create report
        report = Report.objects.create(
            reporter=request.user,
            reported_user=target_user,
            reason=reason,
            details=details,
            status='pending'
        )

        # Notify administrators
        admins = User.objects.filter(is_staff=True)
        for admin in admins:
            Notification.objects.create(
                recipient=admin,
                sender=request.user,
                type='admin_report',
                message=f"User profile @{target_user.username} was reported by @{request.user.username} for: {reason}."
            )

        return Response({
            "message": "Profile reported successfully.",
            "report_id": report.id
        }, status=status.HTTP_201_CREATED)


# reload views password validation changes
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny

@api_view(['GET'])
@permission_classes([AllowAny])
def debug_cloudinary_settings(request):
    import os
    from django.conf import settings
    return Response({
        "CLOUDINARY_CLOUD_NAME": os.environ.get('CLOUDINARY_CLOUD_NAME'),
        "CLOUDINARY_API_KEY": os.environ.get('CLOUDINARY_API_KEY'),
        "CLOUDINARY_API_SECRET": os.environ.get('CLOUDINARY_API_SECRET') is not None,
        "STORAGES": getattr(settings, 'STORAGES', None),
    })
