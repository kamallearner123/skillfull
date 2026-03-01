import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.local')
django.setup()

from django.contrib.auth import get_user_model
from apps.teams.models import Department
from django.utils import timezone

User = get_user_model()

def create_department(name):
    dept, _ = Department.objects.get_or_create(name=name)
    return dept

cs_dept = create_department('Computer Science')
ec_dept = create_department('Electronics & Communication')

def create_user(email, password, role, is_superuser=False, name=None, reg_id=None, dept=None, grad_year=None, cgpa=None):
    if not User.objects.filter(email=email).exists():
        if is_superuser:
            user = User.objects.create_superuser(username=email.split('@')[0], email=email, password=password, role=role)
        else:
            user = User.objects.create_user(username=email.split('@')[0], email=email, password=password, role=role)
        print(f"Created user: {email} / {password} ({role})")
    else:
        user = User.objects.get(email=email)
        user.set_password(password)
        print(f"Updated user: {email} / {password} ({role})")
    
    if name: user.first_name = name.split(' ')[0]; user.last_name = ' '.join(name.split(' ')[1:]);
    if reg_id: user.registration_id = reg_id
    if dept: user.department = dept
    if grad_year: user.graduation_year = grad_year
    if cgpa: user.cgpa = cgpa
    user.save()

create_user('admin@educollab.com', 'admin123', 'SUPER_ADMIN', is_superuser=True, name='Admin User')
create_user('student@example.com', 'password123', 'STUDENT', 
            name='Kamal Kishore', reg_id='22BCS045', dept=cs_dept, grad_year=2026, cgpa=8.95)
create_user('mentor@example.com', 'password123', 'MENTOR', name='John Doe', dept=cs_dept)
create_user('deptadmin@example.com', 'admin123', 'DEPT_ADMIN', name='CS Dept Admin', dept=cs_dept)
create_user('student2@example.com', 'password123', 'STUDENT', 
            name='Priya Sharma', reg_id='22BCS058', dept=cs_dept, grad_year=2026, cgpa=9.12)
