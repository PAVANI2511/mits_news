from django.test import TestCase
from django.contrib.auth.models import User
from django.utils import timezone
from datetime import timedelta, datetime
from posts.models import Post, Category
from accounts.models import StudentProfile

class AdminAnalyticsTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        # Create users
        self.admin = User.objects.create_superuser(username='admin', email='admin@mits.ac.in', password='pass')
        self.user1 = User.objects.create_user(username='student1', email='student1@mits.ac.in', password='pass')
        
        # Category
        self.category = Category.objects.create(name='Academics & Exams', is_tech=False)

        # Create posts in different dates/departments
        now = timezone.now()
        
        # CS Dept Post (today)
        self.post_cs = Post.objects.create(
            user=self.user1,
            caption='CS Post',
            text='CS Details...',
            category=self.category,
            department='Computer Science'
        )

        # ME Dept Post (yesterday)
        post_me = Post.objects.create(
            user=self.user1,
            caption='ME Post',
            text='ME Details...',
            category=self.category,
            department='Mechanical Engineering'
        )
        post_me.created_at = now - timedelta(days=1)
        post_me.save()

    def test_analytics_permissions(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from adminpanel.views import AdminAnalyticsView
        
        factory = APIRequestFactory()
        request = factory.get('/api/admin/analytics/')
        
        # Unauthenticated / Non-admin should be rejected
        force_authenticate(request, user=self.user1)
        view = AdminAnalyticsView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 403)

        # Authenticated Admin should succeed
        force_authenticate(request, user=self.admin)
        response = view(request)
        self.assertEqual(response.status_code, 200)

    def test_analytics_metrics_and_formatting(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from adminpanel.views import AdminAnalyticsView
        
        factory = APIRequestFactory()
        request = factory.get('/api/admin/analytics/', {'period': 'daily'})
        force_authenticate(request, user=self.admin)
        
        view = AdminAnalyticsView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        data = response.data
        
        # Verify keys
        self.assertIn('total_posts', data)
        self.assertIn('growth_rate', data)
        self.assertIn('peak_day', data)
        self.assertIn('top_department', data)
        self.assertIn('department_breakdown', data)
        self.assertIn('chart_data', data)

        # Verify department breakdown formatting
        breakdown = data['department_breakdown']
        self.assertGreater(len(breakdown), 0)
        self.assertIn('department', breakdown[0])
        self.assertIn('count', breakdown[0])

    def test_analytics_date_range_priority(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from adminpanel.views import AdminAnalyticsView
        
        factory = APIRequestFactory()
        
        # Period weekly would cover both, but we restrict custom range to just today
        today_str = timezone.now().strftime('%Y-%m-%d')
        request = factory.get('/api/admin/analytics/', {
            'period': 'weekly',
            'start_date': today_str,
            'end_date': today_str
        })
        force_authenticate(request, user=self.admin)
        
        view = AdminAnalyticsView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 200)
        
        # Because we restricted custom range to just today, it should ignore period='weekly'
        # and only return 1 post (post_cs), excluding post_me from yesterday
        self.assertEqual(response.data['total_posts'], 1)

    def test_analytics_caching_and_top_departments(self):
        from django.core.cache import cache
        from rest_framework.test import APIRequestFactory, force_authenticate
        from adminpanel.views import AdminAnalyticsView
        
        # Clear cache first
        cache.clear()
        
        factory = APIRequestFactory()
        request = factory.get('/api/admin/analytics/', {'period': 'weekly'})
        force_authenticate(request, user=self.admin)
        
        view = AdminAnalyticsView.as_view()
        response = view(request)
        self.assertEqual(response.status_code, 200)
        
        # Verify top_departments array formatting
        self.assertIn('top_departments', response.data)
        self.assertEqual(len(response.data['top_departments']), 2) # CS and ME
        
        # Create a new post (which shouldn't show up in cached queries)
        Post.objects.create(
            user=self.user1,
            caption='CS Post 2',
            text='More details...',
            category=self.category,
            department='Computer Science'
        )
        
        # Set manual cache value to check if it returns cached value instead of hitting DB again
        cache_key = "admin_analytics_weekly___"
        cache.set(cache_key, {"cached_check": True}, 300)
        
        response_cached = view(request)
        self.assertEqual(response_cached.status_code, 200)
        self.assertTrue(response_cached.data.get("cached_check"))

    def test_analytics_csv_export(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from adminpanel.views import AdminAnalyticsExportCSVView
        
        factory = APIRequestFactory()
        request = factory.get('/api/admin/analytics/export/csv/', {'period': 'daily'})
        force_authenticate(request, user=self.admin)
        
        view = AdminAnalyticsExportCSVView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response['Content-Type'], 'text/csv')
        self.assertIn('attachment; filename="analytics_report.csv"', response['Content-Disposition'])
