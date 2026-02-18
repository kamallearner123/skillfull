#!/bin/bash
set -e

# Define colors
GREEN='\033[0;32m'
RESET='\033[0m'

echo -e "${GREEN}📦 Installing Dependencies...${RESET}"

# Create venv if not exists
if [ ! -d "venv" ]; then
    python3 -m venv venv
    echo "Created virtual environment."
fi

# Upgrade pip
venv/bin/pip install --upgrade pip

# Install requirements
echo "Installing pip packages (this may take a moment)..."
venv/bin/pip install -r requirements.txt

# Run migrations
echo -e "${GREEN}🔄 Running Migrations...${RESET}"
export DJANGO_SETTINGS_MODULE=config.settings.local
venv/bin/python manage.py migrate

echo -e "${GREEN}✅ Setup Complete!${RESET}"
echo "You can now start the server with: ./run_server.sh"
