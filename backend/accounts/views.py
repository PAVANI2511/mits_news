from rest_framework import status, generics, permissions, views
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
        email = request.data.get('email', '')
        if not email:
            return Response({"error": "Email is required."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)
        
        # In a real app we send an email with reset link. We stub it here.
        return Response({"message": "Password reset link sent to your college email."}, status=status.HTTP_200_OK)


class ResetPasswordView(views.APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get('email', '')
        new_password = request.data.get('password', '')
        if not email or not new_password:
            return Response({"error": "Email and new password are required."}, status=status.HTTP_400_BAD_REQUEST)
        
        user = User.objects.filter(email=email).first()
        if not user:
            return Response({"error": "User with this email does not exist."}, status=status.HTTP_404_NOT_FOUND)
        
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
        
        mongo_query = {}
        if query:
            mongo_query["$or"] = [
                {"username": {"$regex": query, "$options": "i"}},
                {"name": {"$regex": query, "$options": "i"}},
                {"email": {"$regex": query, "$options": "i"}}
            ]
        if dept:
            mongo_query["department"] = {"$regex": dept, "$options": "i"}
        if year:
            mongo_query["year"] = {"$regex": year, "$options": "i"}

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
