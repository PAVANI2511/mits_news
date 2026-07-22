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
    
    from .models import Category, CategoryFollow, UserInterest
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
    from accounts.models import Follower

    author_profile = getattr(author, 'profile', None)
    author_full_name = f"{author.first_name} {author.last_name}".strip() or author.username
    post_title = instance.caption[:60] if instance.caption else (instance.text[:60] if instance.text else 'New Post')
    
    if instance.event_date or instance.event_type:
        msg_text = f"{author_full_name} uploaded a new event: \"{post_title}\"."
    else:
        msg_text = f"{author_full_name} published a new article \"{post_title}\"."

    post_dept = (instance.department or (author_profile.department if author_profile else '')).strip().lower()

    for recipient in recipients:
        recipient_profile = getattr(recipient, 'profile', None)
        in_app_enabled = getattr(recipient_profile, 'in_app_notifications_enabled', True) if recipient_profile else True
        email_enabled = getattr(recipient_profile, 'email_notifications_enabled', True) if recipient_profile else True
        recipient_dept = (recipient_profile.department if recipient_profile else '').strip().lower()

        # 1. Department Check: Must belong to the same department if post or recipient has a department specified
        if post_dept and recipient_dept and post_dept != recipient_dept:
            continue

        # 2. Following Check: Receiver follows author OR follows category
        is_following_author = Follower.objects.filter(follower=recipient, following=author).exists()
        is_following_category = category and CategoryFollow.objects.filter(user=recipient, category=category).exists()
        if not (is_following_author or is_following_category):
            continue

        # 3. Interest Check: Follows category OR has expressed interest OR tech/non-tech score alignment
        has_interest = is_following_category
        if not has_interest and category:
            has_interest = UserInterest.objects.filter(user=recipient, post__category=category, status='interested').exists()
        if not has_interest and recipient_profile and category:
            is_tech_post = category.is_tech
            dominant_interest_is_tech = recipient_profile.tech_score >= recipient_profile.non_tech_score
            if is_tech_post == dominant_interest_is_tech:
                has_interest = True
        if not has_interest:
            continue

        # 4. Deduplication Check: Do not create duplicate notification
        if Notification.objects.filter(recipient=recipient, sender=author, type='new_post', post=instance).exists():
            continue

        if in_app_enabled:
            # Create In-App Notification with designated priority
            notification = Notification.objects.create(
                recipient=recipient,
                sender=author,
                type='new_post',
                post=instance,
                priority=priority,
                message=msg_text
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

        # Enqueue task or thread to send new post email alert
        if email_enabled:
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


