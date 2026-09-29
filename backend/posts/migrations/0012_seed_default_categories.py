import sys
from django.db import migrations
from django.utils.text import slugify

DEFAULT_CATEGORIES = [
    ('Academics & Exams', False, 'Academic announcements, exam schedules, syllabus updates, and result notices.'),
    ('Events & Tech Fests', True, 'Campus technical festivals, workshops, hackathons, and symposiums.'),
    ('Cultural & Arts', False, 'Cultural events, music, dance, drama, and festival celebrations.'),
    ('Sports & Athletics', False, 'Inter-college tournaments, sports meets, and athletic achievements.'),
    ('Placements & Internships', True, 'Placement drives, internship opportunities, and career guidance.'),
    ('Departmental Updates', True, 'News and announcements from various academic departments.'),
    ('Clubs & Societies', False, 'Student club activities, community service, and society workshops.'),
    ('Research & Innovation', True, 'Paper publications, patents, research projects, and innovation cell news.'),
    ('Campus Life', False, 'Student stories, campus amenities, hostel updates, and daily campus news.'),
    ('Notice Board', False, 'Official circulars, administrative guidelines, and urgent campus notices.'),
    ('Other', False, 'General news and miscellaneous campus updates.'),
]

def seed_categories(apps, schema_editor):
    db_name = str(schema_editor.connection.settings_dict.get('NAME', ''))
    if 'test' in sys.argv or 'test_' in db_name or db_name == ':memory:':
        return

    Category = apps.get_model('posts', 'Category')
    for name, is_tech, desc in DEFAULT_CATEGORIES:
        slug = slugify(name)
        Category.objects.get_or_create(
            slug=slug,
            defaults={
                'name': name,
                'is_tech': is_tech,
                'description': desc
            }
        )

def reverse_seed_categories(apps, schema_editor):
    pass

class Migration(migrations.Migration):

    dependencies = [
        ('posts', '0011_post_is_edited'),
    ]

    operations = [
        migrations.RunPython(seed_categories, reverse_code=reverse_seed_categories),
    ]
