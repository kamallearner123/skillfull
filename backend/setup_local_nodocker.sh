#!/bin/bash

# Define colors
GREEN='\033[0;32m'
RESET='\033[0m'

echo -e "${GREEN}🚀 Setting up EduCollab Locally (No Docker)...${RESET}"

# check if python3 is installed
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 could not be found."
    exit 1
fi

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Run migrations
echo "Running migrations..."
# We need to set env vars for local setup if we aren't using the .env file with postgres
# For simplicity, we can rely on local.py using SQLite if POSTGRES vars aren't set, 
# but let's make sure local.py handles that fallback or we export vars here.
# Actually, the local.py I wrote expects postgres env vars. 
# I should probably update local.py to fallback to sqlite if postgres vars are missing.

export DJANGO_SETTINGS_MODULE=config.settings.local
python manage.py migrate

# Create superuser (interactive)
# python manage.py createsuperuser

# Run server
echo -e "${GREEN}Starting Server at http://127.0.0.1:8000${RESET}"
python manage.py runserver
