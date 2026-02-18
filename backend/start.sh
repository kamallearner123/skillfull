#!/bin/bash

# Activate virtual environment
source venv/bin/activate

# Apply migrations
python manage.py migrate

# Create default users (optional, safe to run multiple times)
python create_users.py

# Run server
python manage.py runserver 0.0.0.0:8000
