from django.db import models
from django.contrib.auth.models import User

class Theme(models.Model):
    name = models.CharField(max_length=100) # light, dark, blue, purple, green, college, custom
    user = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True, related_name='custom_themes')
    primary_color = models.CharField(max_length=50) # e.g. hex code or tailwind class
    secondary_color = models.CharField(max_length=50)
    bg_color = models.CharField(max_length=50)
    text_color = models.CharField(max_length=50)
    card_bg = models.CharField(max_length=50, default='#ffffff')
    border_color = models.CharField(max_length=50, default='#e5e7eb')

    def __str__(self):
        return f"Theme {self.name} " + (f"by {self.user.username}" if self.user else "(Global)")

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        super().delete(*args, **kwargs)
