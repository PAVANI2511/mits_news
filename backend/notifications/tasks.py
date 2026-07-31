import logging
from celery import shared_task
from django.contrib.auth.models import User
from posts.models import Post, UserInterest
from django.utils import timezone
from datetime import timedelta
from .emails import send_new_post_email_sync, send_event_reminder_email_sync

logger = logging.getLogger(__name__)

@shared_task
def send_new_post_email_task(user_id, post_id):
    send_new_post_email_sync(user_id, post_id)

@shared_task
def send_daily_reminders_task():
    logger.info("Starting scheduled task: send_daily_reminders_task")
    today = timezone.now().date()
    
    # Calculate milestones
    day1 = today + timedelta(days=1)
    day2 = today + timedelta(days=2)
    day3 = today + timedelta(days=3)
    
    logger.info(f"Checking for events on: Today={today}, 1 Day out={day1}, 2 Days out={day2}, 3 Days out={day3}")
    
    # Query posts that are not blocked and where either event_date is within the next 3 days or last_date is today, in 2 days, or in 3 days
    posts = Post.objects.filter(
        is_blocked=False
    ).filter(
        event_date__date__in=[today, day1, day2, day3]
    ) | Post.objects.filter(
        is_blocked=False
    ).filter(
        last_date__date__in=[today, day2, day3]
    )
    posts = posts.distinct()
    
    logger.info(f"Found {posts.count()} active events with conduction or deadline dates in the target windows.")
    
    for post in posts:
        # Find all interested users
        interests = UserInterest.objects.filter(
            post=post,
            status='interested'
        ).select_related('user', 'user__profile')
        
        logger.info(f"Processing event post ID {post.id} ('{post.caption[:30]}'). Found {interests.count()} interested users.")
        
        for interest in interests:
            user = interest.user
            user_profile = getattr(user, 'profile', None)
            
            # Skip if user has disabled email alerts
            if user_profile and not getattr(user_profile, 'email_notifications_enabled', True):
                logger.info(f"Skipping user {user.username} (ID {user.id}) - email notifications disabled.")
                continue
            
            days_to_event = None
            days_to_last_date = None
            
            if post.event_date:
                days_to_event = (post.event_date.date() - today).days
            if post.last_date:
                days_to_last_date = (post.last_date.date() - today).days
                
            logger.debug(f"User {user.username} - Event ID {post.id}: days_to_event={days_to_event}, days_to_last_date={days_to_last_date}")
            
            should_send = False
            send_days_to_event = None
            send_days_to_last = None
            
            # Check event conduction date reminders (3, 2, 1, 0 days)
            if days_to_event is not None:
                if days_to_event == 3:
                    if not interest.reminder_sent_3d:
                        should_send = True
                        send_days_to_event = 3
                        interest.reminder_sent_3d = True
                    else:
                        logger.info(f"3-day event reminder already sent to {user.username} for event ID {post.id}")
                elif days_to_event == 2:
                    if not interest.reminder_sent_2d:
                        should_send = True
                        send_days_to_event = 2
                        interest.reminder_sent_2d = True
                    else:
                        logger.info(f"2-day event reminder already sent to {user.username} for event ID {post.id}")
                elif days_to_event == 1:
                    if not interest.reminder_sent_1d:
                        should_send = True
                        send_days_to_event = 1
                        interest.reminder_sent_1d = True
                    else:
                        logger.info(f"1-day event reminder already sent to {user.username} for event ID {post.id}")
                elif days_to_event == 0:
                    if not interest.event_day_reminder_sent:
                        should_send = True
                        send_days_to_event = 0
                        interest.event_day_reminder_sent = True
                    else:
                        logger.info(f"Event-day reminder already sent to {user.username} for event ID {post.id}")
            
            # Check registration deadline reminders (3, 2, 0 days) only if event reminder wasn't triggered
            if not should_send and days_to_last_date is not None:
                if days_to_last_date == 3:
                    if not interest.reminder_sent_3d:
                        should_send = True
                        send_days_to_last = 3
                        interest.reminder_sent_3d = True
                    else:
                        logger.info(f"3-day deadline reminder already sent to {user.username} for event ID {post.id}")
                elif days_to_last_date == 2:
                    if not interest.reminder_sent_2d:
                        should_send = True
                        send_days_to_last = 2
                        interest.reminder_sent_2d = True
                    else:
                        logger.info(f"2-day deadline reminder already sent to {user.username} for event ID {post.id}")
                elif days_to_last_date == 0:
                    if not interest.reminder_sent_1d:
                        should_send = True
                        send_days_to_last = 0
                        interest.reminder_sent_1d = True
                    else:
                        logger.info(f"0-day deadline reminder already sent to {user.username} for event ID {post.id}")
                
            # Send the email alert and persist tracking state
            if should_send:
                label = f"event ({send_days_to_event}d)" if send_days_to_event is not None else f"deadline ({send_days_to_last}d)"
                logger.info(f"Sending {label} reminder email to {user.email} (user ID {user.id}) for post ID {post.id}")
                try:
                    send_event_reminder_email_sync(user.id, post.id, send_days_to_event, send_days_to_last)
                    interest.save()
                    logger.info(f"Successfully sent email and saved interest state for user ID {user.id}, post ID {post.id}")
                except Exception as e:
                    logger.error(f"Error sending reminder to user ID {user.id} for post ID {post.id}: {e}", exc_info=True)


@shared_task
def send_interest_confirmation_email_task(user_id, post_id):
    from .emails import send_interest_confirmation_email_sync
    send_interest_confirmation_email_sync(user_id, post_id)


@shared_task
def send_15_days_summary_reports_task():
    from accounts.models import StudentProfile
    from .emails import send_periodic_summary_report
    hods = StudentProfile.objects.filter(faculty_role='HOD', user__is_active=True)
    for hod in hods:
        if hod.user.email:
            name = f"{hod.user.first_name} {hod.user.last_name}".strip() or hod.user.username
            send_periodic_summary_report(hod.user.email, name, 15)


@shared_task
def send_monthly_summary_reports_task():
    from accounts.models import StudentProfile
    from .emails import send_periodic_summary_report
    hods = StudentProfile.objects.filter(faculty_role='HOD', user__is_active=True)
    for hod in hods:
        if hod.user.email:
            name = f"{hod.user.first_name} {hod.user.last_name}".strip() or hod.user.username
            send_periodic_summary_report(hod.user.email, name, 30)
