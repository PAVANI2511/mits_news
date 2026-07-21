from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth.models import User
from posts.models import Post

def send_new_post_email_sync(user_id, post_id):
    try:
        user = User.objects.get(id=user_id)
        post = Post.objects.get(id=post_id)
        
        subject = f"MITS Newspaper - New Post Alert: {post.caption[:50]}"
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        to_email = user.email
        
        if not to_email:
            return
            
        context = {
            'user': user,
            'post': post,
            'post_url': f"http://localhost:5173/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/new_post_alert.html', context)
        text_content = strip_tags(html_content)
        
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"New post alert email successfully sent to {to_email}")
    except Exception as e:
        print(f"Error sending new post email: {e}")


def send_event_reminder_email_sync(user_id, post_id, days_to_event, days_to_last_date):
    try:
        user = User.objects.get(id=user_id)
        post = Post.objects.get(id=post_id)
        
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        to_email = user.email
        
        if not to_email:
            return
            
        countdown_message = ""
        subject = ""
        
        # Event conduction TODAY has top priority
        if days_to_event is not None and days_to_event == 0:
            subject = f"🎉 TODAY: Event Happening Now - {post.caption[:30]}"
            countdown_message = "The event you are interested in is being conducted TODAY! Get ready to join."
            
        # Registration Closes 1, 2, or 3 days reminder
        elif days_to_last_date is not None and days_to_last_date in [1, 2, 3]:
            days = days_to_last_date
            unit = "day" if days == 1 else "days"
            time_str = "tomorrow" if days == 1 else f"in {days} days"
            subject = f"🔔 LAST CALL: Registration Closes {time_str} for {post.caption[:30]}"
            countdown_message = f"Registration for this event closes {time_str} ({days} {unit} left)! Don't forget to register."
            
        # Event conduction reminders: Tomorrow or 2-3 days
        elif days_to_event is not None and days_to_event == 1:
            subject = f"🔥 TOMORROW: Event conduction - {post.caption[:30]}"
            countdown_message = "The event you are interested in is starting TOMORROW! Make sure you don't miss it."
        elif days_to_event is not None and days_to_event in [2, 3]:
            days = days_to_event
            unit = "day" if days == 1 else "days"
            time_str = f"in {days} days"
            subject = f"Reminder: Event Starts {time_str} - {post.caption[:30]}"
            countdown_message = f"The event you are interested in starts {time_str} ({days} {unit} left)."
        else:
            subject = f"Reminder: Upcoming Event - {post.caption[:30]}"
            countdown_message = "An event you are interested in is coming up soon!"
            
        context = {
            'user': user,
            'post': post,
            'countdown_message': countdown_message,
            'post_url': f"http://localhost:5173/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/event_reminder.html', context)
        text_content = strip_tags(html_content)
        
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Event reminder email successfully sent to {to_email}")
    except Exception as e:
        print(f"Error sending event reminder email: {e}")


def send_interest_confirmation_email_sync(user_id, post_id):
    try:
        user = User.objects.get(id=user_id)
        post = Post.objects.get(id=post_id)
        
        subject = f"MITS Newspaper - Interested in Event: {post.caption[:50]}"
        from_email = getattr(settings, 'DEFAULT_FROM_EMAIL', 'no-reply@mits.ac.in')
        to_email = user.email
        
        if not to_email:
            return
            
        context = {
            'user': user,
            'post': post,
            'post_url': f"http://localhost:5173/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/interest_confirmation.html', context)
        text_content = strip_tags(html_content)
        
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Interest confirmation email successfully sent to {to_email}")
    except Exception as e:
        print(f"Error sending interest confirmation email: {e}")
