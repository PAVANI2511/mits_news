from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.models import User
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Post

@receiver(post_save, sender=Post)
def post_created_signal(sender, instance, created, **kwargs):
    if not created:
        return

    # Avoid processing blocked posts or admin panel items differently if needed
    if instance.is_blocked:
        return

    author = instance.user
    category = instance.category
    
    from .models import Category, CategoryFollow
    from django.utils import timezone
    
    # Calculate notification priority
    priority = 'low'
    if instance.event_date or instance.last_date:
        today = timezone.now().date()
        days_to_event = None
        days_to_last_date = None
        
        if instance.event_date:
            days_to_event = (instance.event_date.date() - today).days
        if instance.last_date:
            days_to_last_date = (instance.last_date.date() - today).days
            
        if (days_to_event is not None and days_to_event == 0) or (days_to_last_date is not None and days_to_last_date == 0):
            priority = 'high'
        elif (days_to_event is not None and days_to_event in [1, 2, 3]) or (days_to_last_date is not None and days_to_last_date in [1, 2, 3]):
            priority = 'medium'

    # Filter recipients based on department, followed categories, or dynamic interest scores
    recipients = User.objects.filter(is_active=True).exclude(id=author.id)
    channel_layer = get_channel_layer()

    # Import inside handler to avoid circular imports or early model loading issues
    from notifications.models import Notification
    from notifications.serializers import NotificationSerializer
    from notifications.tasks import send_new_post_email_task

    for recipient in recipients:
        recipient_profile = getattr(recipient, 'profile', None)
        in_app_enabled = getattr(recipient_profile, 'in_app_notifications_enabled', True) if recipient_profile else True
        email_enabled = getattr(recipient_profile, 'email_notifications_enabled', True) if recipient_profile else True

        # Personalized Relevance Filter
        is_relevant = False
        author_profile = getattr(author, 'profile', None)
        
        # a) Same department
        if recipient_profile and author_profile and author_profile.department and recipient_profile.department == author_profile.department:
            is_relevant = True
            
        # b) Category follow
        if not is_relevant and category:
            is_relevant = CategoryFollow.objects.filter(user=recipient, category=category).exists()
            
        # c) Tech / Non-tech interest alignment
        if not is_relevant and recipient_profile and category:
            is_tech_post = category.is_tech
            dominant_interest_is_tech = recipient_profile.tech_score >= recipient_profile.non_tech_score
            if is_tech_post == dominant_interest_is_tech:
                is_relevant = True
                
        # If the post is not relevant to this recipient, skip them!
        if not is_relevant:
            continue

        if in_app_enabled:
            # Create In-App Notification with designated priority
            notification = Notification.objects.create(
                recipient=recipient,
                sender=author,
                type='new_post',
                post=instance,
                priority=priority,
                message=f"{author.first_name or author.username} published a new post: {instance.caption[:50]}..."
            )

            # Broadcast via WebSockets in real-time
            if channel_layer:
                serializer = NotificationSerializer(notification)
                try:
                    async_to_sync(channel_layer.group_send)(
                        f"user_notifications_{recipient.id}",
                        {
                            "type": "send_notification",
                            "notification": serializer.data
                        }
                    )
                except Exception as e:
                    print(f"Error broadcasting WebSocket notification: {e}")

        # Enqueue Celery task to send new post email alert asynchronously
        # Only send emails immediately for HIGH priority notifications
        if email_enabled and priority == 'high':
            import sys
            is_testing = 'test' in sys.argv
            
            if is_testing:
                # Execute synchronously during test execution to avoid background DB connections
                from notifications.emails import send_new_post_email_sync
                try:
                    send_new_post_email_sync(recipient.id, instance.id)
                except Exception as e:
                    pass
            else:
                try:
                    send_new_post_email_task.delay(recipient.id, instance.id)
                except Exception as e:
                    print(f"Error triggering Celery new post task (checking fallback): {e}")
                    import threading
                    from notifications.emails import send_new_post_email_sync
                    threading.Thread(target=send_new_post_email_sync, args=(recipient.id, instance.id)).start()
