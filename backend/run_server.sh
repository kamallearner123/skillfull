#!/bin/bash
GREEN='\033[0;32m'
RESET='\033[0m'

echo -e "${GREEN}🚀 Starting Local Server...${RESET}"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "Virtual environment not found. Running installation..."
    ./install_dependencies.sh
fi

source venv/bin/activate
export DJANGO_SETTINGS_MODULE=config.settings.local
python manage.py runserver
