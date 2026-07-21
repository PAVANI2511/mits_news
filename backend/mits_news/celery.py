import os
from celery import Celery
from celery.schedules import crontab

# Set default Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'mits_news.settings')

app = Celery('mits_news')

# Load settings from Django settings using CELERY namespace
app.config_from_object('django.conf:settings', namespace='CELERY')

# Load tasks from all registered Django app configs
app.autodiscover_tasks()

# Celery Beat settings for periodic reminders
app.conf.beat_schedule = {
    'send-daily-event-reminders': {
        'task': 'notifications.tasks.send_daily_reminders_task',
        'schedule': crontab(hour=8, minute=0),  # Daily at 8:00 AM
    },
}
