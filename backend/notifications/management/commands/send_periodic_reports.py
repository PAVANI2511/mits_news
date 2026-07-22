from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from accounts.models import StudentProfile
from notifications.emails import send_periodic_summary_report

class Command(BaseCommand):
    help = "Send periodic department summary reports to HODs and Admins."

    def add_arguments(self, parser):
        parser.add_argument(
            '--days',
            type=int,
            default=15,
            help='Number of days for the summary report (e.g. 15 or 30)'
        )
        parser.add_argument(
            '--email',
            type=str,
            help='Override recipient email for manual testing/sending'
        )

    def handle(self, *args, **options):
        days = options['days']
        email_override = options['email']

        if email_override:
            self.stdout.write(f"Sending test report for past {days} days to {email_override}...")
            success = send_periodic_summary_report(email_override, "Test HOD / User", days)
            if success:
                self.stdout.write(self.style.SUCCESS(f"Successfully sent report to {email_override}."))
            else:
                self.stdout.write(self.style.ERROR(f"Failed to send report to {email_override}."))
            return

        # Find all HODs
        hods = StudentProfile.objects.filter(teacher_role='HOD', user__is_active=True)
        count = 0
        for hod in hods:
            if hod.user.email:
                name = f"{hod.user.first_name} {hod.user.last_name}".strip() or hod.user.username
                self.stdout.write(f"Sending report for past {days} days to HOD {name} ({hod.user.email})...")
                success = send_periodic_summary_report(hod.user.email, name, days)
                if success:
                    count += 1

        self.stdout.write(self.style.SUCCESS(f"Finished. Sent reports to {count} HODs."))
