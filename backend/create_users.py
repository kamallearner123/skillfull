import os
import django
from django.contrib.auth import get_user_model

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

User = get_user_model()

def create_user(email, password, role, is_superuser=False):
    if not User.objects.filter(email=email).exists():
        if is_superuser:
            user = User.objects.create_superuser(username=email.split('@')[0], email=email, password=password, role=role)
        else:
            user = User.objects.create_user(username=email.split('@')[0], email=email, password=password, role=role)
        print(f"Created user: {email} / {password} ({role})")
    else:
        # Update password just in case
        user = User.objects.get(email=email)
        user.set_password(password)
        user.save()
        print(f"Updated user: {email} / {password} ({role})")

create_user('admin@educollab.com', 'admin123', 'SUPER_ADMIN', is_superuser=True)
create_user('student@example.com', 'password123', 'STUDENT')
create_user('mentor@example.com', 'password123', 'MENTOR')
