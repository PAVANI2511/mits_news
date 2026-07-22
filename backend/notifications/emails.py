import os
import requests
from django.core.mail import EmailMultiAlternatives
from django.template.loader import render_to_string
from django.utils.html import strip_tags
from django.conf import settings
from django.contrib.auth.models import User
from posts.models import Post

def send_email_via_brevo(subject, recipient_email, html_content=None, text_content=None, sender_name="MITS Newspaper", sender_email=None):
    """
    Sends email via Brevo (Sendinblue) HTTP REST API over Port 443 (HTTPS).
    Works on cloud hosts like Render Free Tier that block outbound SMTP socket ports.
    """
    api_key = getattr(settings, 'BREVO_API_KEY', None) or os.getenv('BREVO_API_KEY')
    if not api_key:
        return False

    sender_email = sender_email or getattr(settings, 'BREVO_SENDER_EMAIL', None) or os.getenv('BREVO_SENDER_EMAIL', 'mitsnews691a@gmail.com')

    url = "https://api.brevo.com/v3/smtp/email"
    headers = {
        "accept": "application/json",
        "api-key": api_key,
        "content-type": "application/json"
    }
    payload = {
        "sender": {"name": sender_name, "email": sender_email},
        "to": [{"email": recipient_email}],
        "subject": subject
    }
    if html_content:
        payload["htmlContent"] = html_content
    if text_content:
        payload["textContent"] = text_content

    try:
        response = requests.post(url, json=payload, headers=headers, timeout=12)
        if response.status_code in [200, 201, 202]:
            print(f"Brevo HTTP API Email sent successfully to {recipient_email}")
            return True
        else:
            print(f"Brevo HTTP API Email error ({response.status_code}): {response.text}")
            return False
    except Exception as e:
        print(f"Brevo HTTP API Email exception: {e}")
        return False


def send_new_post_email_sync(user_id, post_id):
    try:
        user = User.objects.get(id=user_id)
        post = Post.objects.get(id=post_id)
        
        subject = f"MITS Newspaper - New Post Alert: {post.caption[:50]}"
        to_email = user.email
        
        if not to_email:
            return
            
        context = {
            'user': user,
            'post': post,
            'post_url': f"https://mits-news-frontend.onrender.com/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/new_post_alert.html', context)
        text_content = strip_tags(html_content)
        
        # 1. Try Brevo HTTP API (Port 443 HTTPS)
        sent = send_email_via_brevo(subject, to_email, html_content=html_content, text_content=text_content)
        if sent:
            return

        # 2. Fallback to standard SMTP
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"New post alert email successfully sent via SMTP to {to_email}")
    except Exception as e:
        print(f"Error sending new post email: {e}")


def send_event_reminder_email_sync(user_id, post_id, days_to_event, days_to_last_date):
    try:
        user = User.objects.get(id=user_id)
        post = Post.objects.get(id=post_id)
        to_email = user.email
        
        if not to_email:
            return
            
        countdown_message = ""
        subject = ""
        
        if days_to_event is not None and days_to_event == 0:
            subject = f"🎉 TODAY: Event Happening Now - {post.caption[:30]}"
            countdown_message = "The event you are interested in is being conducted TODAY! Get ready to join."
        elif days_to_last_date is not None and days_to_last_date in [1, 2, 3]:
            days = days_to_last_date
            unit = "day" if days == 1 else "days"
            time_str = "tomorrow" if days == 1 else f"in {days} days"
            subject = f"🔔 LAST CALL: Registration Closes {time_str} for {post.caption[:30]}"
            countdown_message = f"Registration for this event closes {time_str} ({days} {unit} left)! Don't forget to register."
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
            'post_url': f"https://mits-news-frontend.onrender.com/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/event_reminder.html', context)
        text_content = strip_tags(html_content)
        
        # 1. Try Brevo HTTP API
        sent = send_email_via_brevo(subject, to_email, html_content=html_content, text_content=text_content)
        if sent:
            return

        # 2. Fallback to standard SMTP
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Event reminder email successfully sent via SMTP to {to_email}")
    except Exception as e:
        print(f"Error sending event reminder email: {e}")


def send_interest_confirmation_email_sync(user_id, post_id):
    try:
        user = User.objects.get(id=user_id)
        post = Post.objects.get(id=post_id)
        
        subject = f"MITS Newspaper - Interested in Event: {post.caption[:50]}"
        to_email = user.email
        
        if not to_email:
            return
            
        context = {
            'user': user,
            'post': post,
            'post_url': f"https://mits-news-frontend.onrender.com/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/interest_confirmation.html', context)
        text_content = strip_tags(html_content)
        
        # 1. Try Brevo HTTP API
        sent = send_email_via_brevo(subject, to_email, html_content=html_content, text_content=text_content)
        if sent:
            return

        # 2. Fallback to standard SMTP
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Interest confirmation email successfully sent via SMTP to {to_email}")
    except Exception as e:
        print(f"Error sending interest confirmation email: {e}")


def send_hod_new_post_email_sync(hod_email, department_name, post_id):
    try:
        post = Post.objects.get(id=post_id)
        
        subject = f"[HOD Notification] New Post in {department_name} by {post.user.first_name or post.user.username}"
        to_email = hod_email
        
        context = {
            'post': post,
            'department_name': department_name,
            'post_url': f"https://mits-news-frontend.onrender.com/posts/{post.id}"
        }
        
        html_content = render_to_string('emails/hod_new_post_alert.html', context)
        text_content = strip_tags(html_content)
        
        # 1. Try Brevo HTTP API
        sent = send_email_via_brevo(subject, to_email, html_content=html_content, text_content=text_content, sender_name="MITS Department Portal")
        if sent:
            return True

        # 2. Fallback to standard SMTP
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"HOD alert email successfully sent via SMTP to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending HOD alert email: {e}")
        return False


def send_periodic_summary_report(recipient_email, recipient_name, days):
    try:
        from django.utils import timezone
        from datetime import timedelta
        from django.db.models import Count
        from posts.models import Post
        
        now = timezone.now()
        start_date = now - timedelta(days=days)
        
        # Query posts in range
        posts_qs = Post.objects.filter(is_blocked=False, created_at__range=(start_date, now))
        total_posts = posts_qs.count()
        
        # Group by department
        dept_breakdown_qs = posts_qs.values('department').annotate(count=Count('id')).order_by('-count')
        department_breakdown = [
            {"department": item["department"] or "General / Campus", "count": item["count"]}
            for item in dept_breakdown_qs
        ]
        
        top_departments = department_breakdown[:3]
        
        subject = f"MITS Newspaper - {days}-Day Departmental Summary Report"
        to_email = recipient_email
        
        context = {
            'recipient_name': recipient_name,
            'days': days,
            'total_posts': total_posts,
            'top_departments': top_departments,
            'department_breakdown': department_breakdown
        }
        
        html_content = render_to_string('emails/departmental_summary_report.html', context)
        text_content = strip_tags(html_content)
        
        # 1. Try Brevo HTTP API
        sent = send_email_via_brevo(subject, to_email, html_content=html_content, text_content=text_content, sender_name="MITS Newspaper Admin")
        if sent:
            return True

        # 2. Fallback to standard SMTP
        from_email = getattr(settings, 'EMAIL_HOST_USER', 'mitsnews691a@gmail.com') or 'mitsnews691a@gmail.com'
        msg = EmailMultiAlternatives(subject, text_content, from_email, [to_email])
        msg.attach_alternative(html_content, "text/html")
        msg.send()
        print(f"Periodic summary report successfully sent via SMTP to {to_email}")
        return True
    except Exception as e:
        print(f"Error sending periodic summary report: {e}")
        return False
