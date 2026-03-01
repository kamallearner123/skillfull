import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.contrib.auth import get_user_model
User = get_user_model()

users = User.objects.all()
for u in users:
    print(f"{u.email} | Role: {u.role} | Dept: {u.department.name if u.department else 'N/A'}")
