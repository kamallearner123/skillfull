#!/usr/bin/env python
"""
Run with: source venv/bin/activate && DJANGO_SETTINGS_MODULE=config.settings.local python3 scripts/seed_demo_users.py
"""
import os, django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from apps.users.models import User

users = [
    {'email': 'student@example.com', 'username': 'student', 'role': 'STUDENT', 'password': 'password123', 'first_name': 'Demo', 'last_name': 'Student'},
    {'email': 'mentor@example.com',  'username': 'mentor',  'role': 'MENTOR',  'password': 'password123', 'first_name': 'Demo', 'last_name': 'Mentor'},
    {'email': 'admin@educollab.com', 'username': 'superadmin', 'role': 'SUPER_ADMIN', 'password': 'admin123', 'first_name': 'Super', 'last_name': 'Admin'},
]

for u in users:
    obj, created = User.objects.get_or_create(
        email=u['email'],
        defaults={
            'username': u['username'],
            'role': u['role'],
            'first_name': u['first_name'],
            'last_name': u['last_name'],
        }
    )
    if created:
        obj.set_password(u['password'])
        obj.save()
        print(f"✅ Created:  {u['email']}  ({u['role']})")
    else:
        print(f"ℹ  Exists:   {u['email']}  (role={obj.role})")

print("Done.")
