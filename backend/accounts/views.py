from rest_framework import status, generics, permissions, views, serializers
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.contrib.auth.models import User
from django.shortcuts import get_object_or_404
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from .models import StudentProfile, Follower
from .serializers import RegisterSerializer, UserSerializer, ProfileSerializer
from notifications.models import Notification

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    def validate(self, attrs):
        username = attrs.get('username', '')
        if '@' in username:
            user = User.objects.filter(email=username).first()
            if user:
                attrs['username'] = user.username
                
        data = super().validate(attrs)
        if self.user.profile.is_blocked:
            raise serializers.ValidationError("Your account has been blocked by the admin.")
        
        user_serializer = UserSerializer(self.user)
        data['user'] = user_serializer.data
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
        user_data = UserSerializer(user).data
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
        
        profile_serializer = ProfileSerializer(profile)
        is_following = False
        if request.user.is_authenticated and request.user != user:
            is_following = Follower.objects.filter(follower=request.user, following=user).exists()
            
        return Response({
            **profile_serializer.data,
            "is_following": is_following
        }, status=status.HTTP_200_OK)


class UpdateProfileView(generics.UpdateAPIView):
    serializer_class = ProfileSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]

    def get_object(self):
        return self.request.user.profile

    def update(self, request, *args, **kwargs):
        profile = self.get_object()
        
        # Extract fields to update in user object if provided
        name = request.data.get('name')
        if name is not None:
            name_parts = name.strip().split(' ', 1)
            request.user.first_name = name_parts[0] if len(name_parts) > 0 else ''
            request.user.last_name = name_parts[1] if len(name_parts) > 1 else ''
            request.user.save()

        # Update email if provided (restricted to @mits.ac.in check if updated)
        email = request.data.get('email')
        if email is not None and email != request.user.email:
            if not email.endswith('@mits.ac.in'):
                return Response({"email": "Only @mits.ac.in emails are allowed."}, status=status.HTTP_400_BAD_REQUEST)
            request.user.email = email
            request.user.save()

        return super().update(request, *args, **kwargs)


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
            relation.delete()
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
        from db_connection import users_col
        
        # Generate 6-digit OTP
        otp = "".join([str(random.randint(0, 9)) for _ in range(6)])
        expiry = timezone.now() + timedelta(minutes=5)
        
        # Store OTP in MongoDB
        users_col.update_one(
            {"_id": str(user.id)},
            {"$set": {
                "reset_otp": {
                    "code": otp,
                    "expiry": expiry.isoformat()
                }
            }}
        )
        
        # Send Email
        from django.conf import settings
        is_console = getattr(settings, 'EMAIL_BACKEND', '') == 'django.core.mail.backends.console.EmailBackend'
        try:
            send_mail(
                subject="MITS Newspaper - Password Reset Code",
                message=f"Hello,\n\nYour password reset verification code is: {otp}\n\nThis code will expire in 10 minutes.",
                from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mits.ac.in'),
                recipient_list=[email],
                fail_silently=False,
            )
        except Exception as e:
            print(f"\n==================================================")
            print(f"SMTP Error: {e}. Outputting OTP to log console: {otp}")
            print(f"==================================================\n")
            return Response(
                {"error": f"Failed to send email due to SMTP error: {str(e)}."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
            
        if is_console:
            print(f"\n==================================================")
            print(f"DEVELOPMENT RESET OTP FOR {email}: {otp}")
            print(f"==================================================\n")
            return Response({
                "message": "Development mode: Verification OTP has been printed to the server terminal console."
            }, status=status.HTTP_200_OK)
            
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
        
        from db_connection import users_col
        from django.utils import timezone
        from datetime import datetime
        
        doc = users_col.find_one({"_id": str(user.id)})
        reset_otp = doc.get("reset_otp") if doc else None
        
        if not reset_otp:
            return Response({"error": "No password reset request found. Please request a new verification code."}, status=status.HTTP_400_BAD_REQUEST)
        
        stored_code = reset_otp.get("code")
        stored_expiry = reset_otp.get("expiry")
        
        if stored_code != str(otp).strip():
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        expiry_dt = datetime.fromisoformat(stored_expiry)
        if timezone.is_naive(expiry_dt):
            expiry_dt = timezone.make_aware(expiry_dt)
            
        if timezone.now() > expiry_dt:
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
        users_col.update_one({"_id": str(user.id)}, {"$unset": {"reset_otp": ""}})
        
        user.set_password(new_password)
        user.save()
        return Response({"message": "Password has been reset successfully."}, status=status.HTTP_200_OK)


class SearchUsersView(views.APIView):
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def get(self, request):
        query = request.query_params.get('q', '').strip()
        dept = request.query_params.get('department', '').strip()
        year = request.query_params.get('year', '').strip()

        # Connect to MongoDB for searching users
        from db_connection import users_col
        
        import re
        mongo_query = {}
        if query:
            escaped_query = re.escape(query)
            mongo_query["$or"] = [
                {"username": re.compile(escaped_query, re.IGNORECASE)},
                {"name": re.compile(escaped_query, re.IGNORECASE)},
                {"email": re.compile(escaped_query, re.IGNORECASE)}
            ]
        if dept:
            mongo_query["department"] = re.compile(re.escape(dept), re.IGNORECASE)
        if year:
            mongo_query["year"] = re.compile(re.escape(year), re.IGNORECASE)

        # Hide blocked profiles unless requester is admin
        if not (request.user.is_authenticated and request.user.is_staff):
            mongo_query["is_blocked"] = False

        users_cursor = users_col.find(mongo_query).limit(50)
        results = []
        for doc in users_cursor:
            doc["id"] = doc.get("_id")
            doc.pop("_id", None)
            results.append(doc)

        return Response(results, status=status.HTTP_200_OK)


class DeleteAccountView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        user = request.user
        user_id_str = str(user.id)
        
        from db_connection import posts_col, comments_col, users_col
        
        # 1. Delete user posts from MongoDB
        posts_col.delete_many({"user_id": user_id_str})
        
        # 2. Delete user comments from MongoDB
        comments_col.delete_many({"user_id": user_id_str})
        
        # 3. Delete user replies and sync their parent comments in MongoDB
        from comments.models import Reply
        user_replies = Reply.objects.filter(user=user)
        parent_comments = set(r.comment for r in user_replies)
        user_replies.delete()
        for comment in parent_comments:
            comment.sync_to_mongo()
            
        # 4. Delete user profile from MongoDB
        users_col.delete_one({"_id": user_id_str})
        
        # 5. Delete the User model itself (cascades database relations automatically)
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
            
        from db_connection import users_col
        from django.utils import timezone
        from datetime import datetime
        
        doc = users_col.find_one({"_id": str(user.id)})
        reset_otp = doc.get("reset_otp") if doc else None
        
        if not reset_otp:
            return Response({"error": "No password reset request found. Please request a new verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        stored_code = reset_otp.get("code")
        stored_expiry = reset_otp.get("expiry")
        
        if stored_code != str(otp).strip():
            return Response({"error": "Invalid verification code."}, status=status.HTTP_400_BAD_REQUEST)
            
        expiry_dt = datetime.fromisoformat(stored_expiry)
        if timezone.is_naive(expiry_dt):
            expiry_dt = timezone.make_aware(expiry_dt)
            
        if timezone.now() > expiry_dt:
            return Response({"error": "Verification code has expired. Please request a new one."}, status=status.HTTP_400_BAD_REQUEST)
            
        return Response({"message": "Verification code verified successfully."}, status=status.HTTP_200_OK)
# reload views password validation changes
