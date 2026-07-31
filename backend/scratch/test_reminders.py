import os
import sys
import django
from datetime import timedelta

# Initialize Django environment
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mits_news.settings')
django.setup()

from django.contrib.auth.models import User
from django.utils import timezone
from posts.models import Post, UserInterest
from notifications.tasks import send_daily_reminders_task
from django.conf import settings

# Force console email backend and disable Brevo to prevent network errors/sending real emails during test
settings.EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
if hasattr(settings, 'BREVO_API_KEY'):
    settings.BREVO_API_KEY = None

def run_test():
    print("--- Setting up test data ---")
    today = timezone.now().date()
    
    # 1. Create or get test user
    username = "reminder_test_user"
    user, created = User.objects.get_or_create(
        username=username,
        defaults={"email": "test_reminder@example.com", "first_name": "TestUser"}
    )
    if not created:
        # Reset user interest states
        UserInterest.objects.filter(user=user).delete()
    
    # Enable email notifications in student profile if it exists
    profile = getattr(user, 'profile', None)
    if profile:
        profile.email_notifications_enabled = True
        profile.save()
        print("Updated existing user profile to enable email notifications.")

    # 2. Create posts for 1, 2, and 3 days out
    posts_data = [
        {"caption": "Event happening in 3 days!", "days": 3},
        {"caption": "Event happening in 2 days!", "days": 2},
        {"caption": "Event happening in 1 day!", "days": 1},
        {"caption": "Event happening in 4 days (should skip)!", "days": 4},
        {"caption": "Event happening today (event day)!", "days": 0},
    ]
    
    created_posts = []
    interests = []
    
    for item in posts_data:
        # We need event_date to be aware datetime
        event_datetime = timezone.now() + timedelta(days=item["days"])
        post = Post.objects.create(
            user=user,
            caption=item["caption"],
            event_date=event_datetime,
            is_blocked=False
        )
        created_posts.append(post)
        
        # Mark user as interested
        interest = UserInterest.objects.create(
            user=user,
            post=post,
            status='interested'
        )
        interests.append(interest)
        print(f"Created post: '{post.caption}' (ID: {post.id}) scheduled for {post.event_date.date()} (in {item['days']} days)")

    print("\n--- Running send_daily_reminders_task ---")
    send_daily_reminders_task()
    
    print("\n--- Verifying UserInterest flags in DB ---")
    for interest in interests:
        # Refresh from database
        interest.refresh_from_db()
        post = interest.post
        days_to_event = (post.event_date.date() - today).days
        print(f"Post: '{post.caption}' (Days out: {days_to_event})")
        print(f"  - reminder_sent_3d: {interest.reminder_sent_3d}")
        print(f"  - reminder_sent_2d: {interest.reminder_sent_2d}")
        print(f"  - reminder_sent_1d: {interest.reminder_sent_1d}")
        print(f"  - event_day_reminder_sent: {interest.event_day_reminder_sent}")

    # Clean up test data
    print("\n--- Cleaning up test data ---")
    UserInterest.objects.filter(user=user).delete()
    for post in created_posts:
        post.delete()
    user.delete()
    print("Cleanup done.")

if __name__ == "__main__":
    run_test()
