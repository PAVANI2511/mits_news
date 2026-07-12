from rest_framework import status, views, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import Notification
from db_connection import notifications_col

class NotificationsListView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)
        # Fetch from MongoDB sorted by newest
        cursor = notifications_col.find({"recipient_id": user_id}).sort("created_at", -1)
        results = []
        for doc in cursor:
            doc["id"] = doc.pop("_id")
            results.append(doc)
        return Response(results, status=status.HTTP_200_OK)


class MarkNotificationReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        notification = get_object_or_404(Notification, pk=pk, recipient=request.user)
        notification.is_read = True
        notification.save()
        return Response({"message": "Notification marked as read."}, status=status.HTTP_200_OK)


class MarkAllNotificationsReadView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(recipient=request.user, is_read=False).update(is_read=True)
        
        # Sync all recipient notifications in MongoDB
        notifications_col.update_many(
            {"recipient_id": str(request.user.id), "is_read": False},
            {"$set": {"is_read": True}}
        )
        
        return Response({"message": "All notifications marked as read."}, status=status.HTTP_200_OK)


class UnreadNotificationsCountView(views.APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        user_id = str(request.user.id)
        count = notifications_col.count_documents({"recipient_id": user_id, "is_read": False})
        return Response({"unread_count": count}, status=status.HTTP_200_OK)
