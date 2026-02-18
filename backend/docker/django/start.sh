#!/bin/bash

# Wait for postgres
while ! nc -z db 5432; do
  echo "Waiting for postgres..."
  sleep 1
done

echo "PostgreSQL started"

# Apply database migrations
echo "Apply database migrations"
python manage.py migrate

# Start server
echo "Starting server"
python manage.py runserver 0.0.0.0:8000
