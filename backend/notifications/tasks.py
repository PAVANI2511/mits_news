from celery import shared_task
from django.contrib.auth.models import User
from posts.models import Post, UserInterest
from django.utils import timezone
from datetime import timedelta
from .emails import send_new_post_email_sync, send_event_reminder_email_sync

@shared_task
def send_new_post_email_task(user_id, post_id):
    send_new_post_email_sync(user_id, post_id)

@shared_task
def send_daily_reminders_task():
    today = timezone.now().date()
    
    # 1, 2, or 3 days remaining milestones
    day1 = today + timedelta(days=1)
    day2 = today + timedelta(days=2)
    day3 = today + timedelta(days=3)
    
    # Get all active posts with events or last registration dates matching the milestones
    posts = Post.objects.filter(is_blocked=False).filter(
        event_date__date__in=[today, day1, day2, day3]
    ) | Post.objects.filter(is_blocked=False).filter(
        last_date__date__in=[day1, day2, day3]
    )
    posts = posts.distinct()
    
    for post in posts:
        # Find all interested users
        interests = UserInterest.objects.filter(post=post, status='interested').select_related('user', 'user__profile')
        
        for interest in interests:
            user = interest.user
            user_profile = getattr(user, 'profile', None)
            
            # Skip if user has disabled email alerts
            if user_profile and not getattr(user_profile, 'email_notifications_enabled', True):
                continue
            
            days_to_event = None
            days_to_last_date = None
            
            if post.event_date:
                days_to_event = (post.event_date.date() - today).days
            if post.last_date:
                days_to_last_date = (post.last_date.date() - today).days
            
            should_send = False
            
            # 3, 2, 1 days before registration deadline
            if days_to_last_date == 3 and not interest.reminder_sent_3d:
                should_send = True
                interest.reminder_sent_3d = True
            elif days_to_last_date == 2 and not interest.reminder_sent_2d:
                should_send = True
                interest.reminder_sent_2d = True
            elif days_to_last_date == 1 and not interest.reminder_sent_1d:
                should_send = True
                interest.reminder_sent_1d = True
                
            # Event conduction day reminder (starts today)
            if days_to_event == 0 and not interest.event_day_reminder_sent:
                should_send = True
                interest.event_day_reminder_sent = True
                
            # Send the email alert and persist tracking state
            if should_send:
                send_event_reminder_email_sync(user.id, post.id, days_to_event, days_to_last_date)
                interest.save()


@shared_task
def send_interest_confirmation_email_task(user_id, post_id):
    from .emails import send_interest_confirmation_email_sync
    send_interest_confirmation_email_sync(user_id, post_id)
