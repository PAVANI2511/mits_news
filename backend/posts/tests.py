from django.test import TestCase
from django.contrib.auth.models import User
from .models import Post, Category, CategoryFollow, UserInterest
from notifications.models import Notification

class CategoryAndNotificationTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='student1', email='student1@mits.ac.in', password='pass')
        self.user2 = User.objects.create_user(username='student2', email='student2@mits.ac.in', password='pass')
        
        # Enable departments on profile
        profile1 = self.user1.profile
        profile1.department = 'Computer Science'
        profile1.save()

        profile2 = self.user2.profile
        profile2.department = 'Computer Science'
        profile2.save()

        self.category = Category.objects.create(name='Events & Tech Fests')

    def test_category_slug_generation(self):
        self.assertEqual(self.category.slug, 'events-tech-fests')

    def test_category_follow(self):
        follow = CategoryFollow.objects.create(user=self.user1, category=self.category)
        self.assertEqual(CategoryFollow.objects.filter(user=self.user1).count(), 1)
        self.assertEqual(follow.category.name, 'Events & Tech Fests')

    def test_user_interest(self):
        post = Post.objects.create(user=self.user1, caption='MITS Tech Fest', text='Details...')
        interest = UserInterest.objects.create(user=self.user2, post=post, status='interested')
        
        self.assertEqual(UserInterest.objects.filter(post=post, status='interested').count(), 1)
        self.assertEqual(interest.status, 'interested')

    def test_signal_notification_creation(self):
        # Establish category follow relation so self.user2 receives the notification
        CategoryFollow.objects.create(user=self.user2, category=self.category)

        # Create a post under the category
        post = Post.objects.create(
            user=self.user1, 
            caption='MITS Coding Event', 
            text='Article details here',
            category=self.category
        )
        
        # Since student2 is in the same department (Computer Science), they should receive an in-app Notification
        notifications = Notification.objects.filter(recipient=self.user2, type='new_post', post=post)
        self.assertEqual(notifications.count(), 1)
        self.assertIn('MITS Coding Event', notifications.first().message)


class AdvancedFeatureTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='student1', email='student1@mits.ac.in', password='pass')
        self.user2 = User.objects.create_user(username='student2', email='student2@mits.ac.in', password='pass')
        
        self.profile1 = self.user1.profile
        self.profile1.department = 'Computer Science'
        self.profile1.save()

        self.profile2 = self.user2.profile
        self.profile2.department = 'Mechanical Engineering'
        self.profile2.save()

        # Tech Category
        self.category_tech = Category.objects.create(name='Events & Tech Fests', is_tech=True)
        # Non-Tech Category
        self.category_non_tech = Category.objects.create(name='Cultural Activities', is_tech=False)

    def test_behavioral_scoring_interest_selection(self):
        post = Post.objects.create(
            user=self.user1,
            caption='Coding Fest 2026',
            text='Coding contest details...',
            category=self.category_tech
        )
        
        # Express interest
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import PostInterestView
        
        factory = APIRequestFactory()
        request = factory.post(f'/api/posts/{post.id}/interest/', {'status': 'interested'}, format='json')
        force_authenticate(request, user=self.user2)
        
        view = PostInterestView.as_view()
        response = view(request, pk=post.id)
        
        # Verify status and score increment
        self.assertEqual(response.status_code, 200)
        self.user2.profile.refresh_from_db()
        self.assertEqual(self.user2.profile.tech_score, 2)
        self.assertEqual(self.user2.profile.non_tech_score, 0)

    def test_behavioral_scoring_not_interested_selection(self):
        post = Post.objects.create(
            user=self.user1,
            caption='Coding Fest 2026',
            text='Coding contest details...',
            category=self.category_tech
        )
        # Pre-set scores
        self.profile2.tech_score = 5
        self.profile2.save()
        
        # Express not interested
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import PostInterestView
        
        factory = APIRequestFactory()
        request = factory.post(f'/api/posts/{post.id}/interest/', {'status': 'not_interested'}, format='json')
        force_authenticate(request, user=self.user2)
        
        view = PostInterestView.as_view()
        response = view(request, pk=post.id)
        
        # Verify status and score decrement
        self.assertEqual(response.status_code, 200)
        self.user2.profile.refresh_from_db()
        self.assertEqual(self.user2.profile.tech_score, 3)

    def test_smart_feed_ranking(self):
        # Create two posts with different characteristics
        # 1. Tech post (older)
        post_tech = Post.objects.create(
            user=self.user1,
            caption='Old Tech Post',
            text='Content',
            category=self.category_tech
        )
        # 2. Non-tech post (recent)
        post_non_tech = Post.objects.create(
            user=self.user1,
            caption='New Non-Tech Post',
            text='Content',
            category=self.category_non_tech
        )
        
        # Establish dynamic scores: user2 is heavily interested in Tech
        self.profile2.tech_score = 50
        self.profile2.non_tech_score = 0
        self.profile2.save()
        
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import HomeFeedView
        factory = APIRequestFactory()
        request = factory.get('/api/posts/feed/')
        force_authenticate(request, user=self.user2)
        
        view = HomeFeedView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        # The Tech post should be ranked higher due to interest score weight (50 * 2 = 100 bonus points)
        # even though it was created first
        first_post_id = results[0]['id']
        self.assertEqual(first_post_id, post_tech.id)

        # Now mark the tech post as 'not_interested'
        from posts.models import UserInterest
        UserInterest.objects.create(user=self.user2, post=post_tech, status='not_interested')

        # Request feed again
        request = factory.get('/api/posts/feed/')
        force_authenticate(request, user=self.user2)
        response = view(request)
        self.assertEqual(response.status_code, 200)
        results = response.data['results']

        # Now, the Tech post should be penalized and ranked lower than the Non-Tech post
        first_post_id = results[0]['id']
        self.assertEqual(first_post_id, post_non_tech.id)


class SearchAndSuggestionsTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='student1', email='student1@mits.ac.in', password='pass')
        self.user2 = User.objects.create_user(username='student2', email='student2@mits.ac.in', password='pass')

        profile2 = self.user2.profile
        profile2.department = 'Computer Science'
        profile2.save()

        self.category_tech = Category.objects.create(name='Events & Tech Fests', is_tech=True)
        self.category_non_tech = Category.objects.create(name='Arts & Culture', is_tech=False)

        # 1. Tech Hackathon event (Active)
        self.post_tech_hack = Post.objects.create(
            user=self.user1,
            caption='Annual MITS Hackathon',
            text='Coding all night...',
            category=self.category_tech,
            event_type='Hackathon',
            department='Computer Science'
        )

        # 2. Tech Seminar event (Expired)
        from django.utils import timezone
        from datetime import timedelta
        self.post_expired_seminar = Post.objects.create(
            user=self.user1,
            caption='MITS Seminar',
            text='Past details...',
            category=self.category_tech,
            event_type='Seminar',
            event_date=timezone.now() - timedelta(days=5),
            last_date=timezone.now() - timedelta(days=6)
        )

        # 3. Non-Tech Workshop (Active)
        self.post_non_tech = Post.objects.create(
            user=self.user1,
            caption='Pottery Workshop 2026',
            text='Hands-on craft class',
            category=self.category_non_tech,
            event_type='Workshop'
        )

    def test_advanced_search_matching_and_filtering(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import PostSearchView
        
        factory = APIRequestFactory()
        
        # Test Query 1: Active Tech Hackathon
        request = factory.get('/api/posts/search/', {'q': 'Hackathon', 'category': 'tech'})
        force_authenticate(request, user=self.user2)
        view = PostSearchView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data['is_exact_match'])
        results = response.data['results']
        self.assertEqual(len(results), 1)
        self.assertEqual(results[0]['id'], self.post_tech_hack.id)

    def test_exclude_expired_events_toggle(self):
        from rest_framework.test import APIRequestFactory
        from posts.views import PostSearchView
        
        factory = APIRequestFactory()
        
        # Query: tech category, show_expired=false
        request = factory.get('/api/posts/search/', {'category': 'tech', 'show_expired': 'false'})
        view = PostSearchView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        # The expired seminar post should be excluded
        self.assertNotIn(self.post_expired_seminar.id, [r['id'] for r in results])

        # Query: tech category, show_expired=true
        request = factory.get('/api/posts/search/', {'category': 'tech', 'show_expired': 'true'})
        response = view(request)
        self.assertEqual(response.status_code, 200)
        results_with_expired = response.data['results']
        
        # The expired seminar post should be included
        self.assertIn(self.post_expired_seminar.id, [r['id'] for r in results_with_expired])

    def test_related_fallback_ux(self):
        from rest_framework.test import APIRequestFactory
        from posts.views import PostSearchView
        
        factory = APIRequestFactory()
        
        # Query with keyword that matches nothing
        request = factory.get('/api/posts/search/', {'q': 'NoMatchingKeyword'})
        view = PostSearchView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data['is_exact_match'])
        self.assertEqual(response.data['message'], 'No exact matches found. Showing related events.')
        self.assertGreater(len(response.data['results']), 0)

    def test_autocomplete_suggestions(self):
        from rest_framework.test import APIRequestFactory
        from posts.views import AutocompleteSuggestionsView
        
        factory = APIRequestFactory()
        
        # Query suggestions for 'hack'
        request = factory.get('/api/posts/search/suggestions/', {'q': 'hack'})
        view = AutocompleteSuggestionsView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        suggestions = response.data
        self.assertGreater(len(suggestions), 0)
        
        # Check that it suggests 'Hackathon' event type
        values = [s['value'] for s in suggestions]
        self.assertIn('Hackathon', values)


class RelatedAndRemindersFunctionalityTests(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='teststudent', email='teststudent@mits.ac.in', password='pass')
        self.category = Category.objects.create(name='Test Category', slug='test-category')
        self.post1 = Post.objects.create(
            user=self.user,
            caption='Target Event',
            text='Target details',
            category=self.category,
            hashtags='#cse #ai'
        )
        self.post2 = Post.objects.create(
            user=self.user,
            caption='Related Category Event',
            text='Category match details',
            category=self.category
        )
        self.post3 = Post.objects.create(
            user=self.user,
            caption='Related Hashtag Event',
            text='Hashtag match details',
            hashtags='#ai #sports'
        )

    def test_related_posts_api(self):
        from rest_framework.test import APIRequestFactory
        from posts.views import PostSearchView
        
        factory = APIRequestFactory()
        request = factory.get('/api/posts/search/', {'related_to': self.post1.id})
        view = PostSearchView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        # Should return post2 (same category) and post3 (common hashtag '#ai')
        matching_ids = [r['id'] for r in results]
        self.assertIn(self.post2.id, matching_ids)
        self.assertIn(self.post3.id, matching_ids)
        
        # Target post itself must be excluded
        self.assertNotIn(self.post1.id, matching_ids)

    def test_daily_reminders_task(self):
        from django.utils import timezone
        from datetime import timedelta
        from notifications.tasks import send_daily_reminders_task
        from django.core import mail
        
        today = timezone.now().date()
        
        # 1. Post conducting in 3 days
        post_event = Post.objects.create(
            user=self.user,
            caption='Conduction Event',
            event_date=timezone.now() + timedelta(days=3)
        )
        UserInterest.objects.create(user=self.user, post=post_event, status='interested')
        
        # 2. Post registration deadline closes today
        post_reg_today = Post.objects.create(
            user=self.user,
            caption='Reg Closes Today',
            last_date=timezone.now()
        )
        UserInterest.objects.create(user=self.user, post=post_reg_today, status='interested')
        
        # Clear outbox
        mail.outbox = []
        
        # Run daily reminders task
        send_daily_reminders_task()
        
        # Check that reminders are successfully triggered and sent
        self.assertGreater(len(mail.outbox), 0)
        subjects = [m.subject for m in mail.outbox]
        self.assertTrue(any('Event conduction starts in 3 days' in s for s in subjects))
        self.assertTrue(any('LAST DAY: Registration Closes TODAY' in s for s in subjects))


class FeedExclusionTests(TestCase):
    def setUp(self):
        self.user1 = User.objects.create_user(username='user1', email='user1@mits.ac.in', password='pass')
        self.user2 = User.objects.create_user(username='user2', email='user2@mits.ac.in', password='pass')
        
        # User 1 posts
        self.post_user1 = Post.objects.create(
            user=self.user1,
            caption='User1 Post',
            text='Content'
        )
        # User 2 posts
        self.post_user2 = Post.objects.create(
            user=self.user2,
            caption='User2 Post',
            text='Content'
        )

    def test_exclude_own_posts_home_feed(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import HomeFeedView
        
        factory = APIRequestFactory()
        request = factory.get('/api/posts/feed/')
        force_authenticate(request, user=self.user1)
        
        view = HomeFeedView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        # User1 should see User2's post, but NOT their own post
        post_ids = [p['id'] for p in results]
        self.assertIn(self.post_user2.id, post_ids)
        self.assertNotIn(self.post_user1.id, post_ids)

    def test_include_own_posts_profile_feed(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import HomeFeedView
        
        factory = APIRequestFactory()
        # Explicit username parameter
        request = factory.get('/api/posts/feed/', {'username': 'user1'})
        force_authenticate(request, user=self.user1)
        
        view = HomeFeedView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        # User1's profile query should include User1's post
        post_ids = [p['id'] for p in results]
        self.assertIn(self.post_user1.id, post_ids)
        self.assertNotIn(self.post_user2.id, post_ids)

    def test_exclude_own_posts_explore_feed(self):
        from rest_framework.test import APIRequestFactory, force_authenticate
        from posts.views import ExploreFeedView
        
        factory = APIRequestFactory()
        request = factory.get('/api/posts/explore/')
        force_authenticate(request, user=self.user1)
        
        view = ExploreFeedView.as_view()
        response = view(request)
        
        self.assertEqual(response.status_code, 200)
        results = response.data['results']
        
        post_ids = [p['id'] for p in results]
        self.assertIn(self.post_user2.id, post_ids)
        self.assertNotIn(self.post_user1.id, post_ids)


