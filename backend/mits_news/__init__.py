try:
    from .celery import app as celery_app
    __all__ = ('celery_app',)
except ImportError:
    celery_app = None
    print("Warning: Celery is not installed in this environment. Asynchronous emails and reminders will fall back to background threads or inline execution.")
