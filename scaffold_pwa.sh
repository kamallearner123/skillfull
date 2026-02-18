#!/bin/bash
set -e

GREEN='\033[0;32m'
RESET='\033[0m'

echo -e "${GREEN}🚀 Scaffolding React PWA Frontend...${RESET}"

# check if npm installed
if ! command -v npm &> /dev/null; then
    echo "Error: npm is not installed."
    exit 1
fi

# Force create frontend (remove if exists to ensure clean state)
if [ -d "frontend" ]; then
    rm -rf frontend
fi

echo "Creating Vite React-TS project..."
# Use --yes to skip confirmation prompt if any
npm create vite@latest frontend -- --template react-ts --yes

cd frontend

echo "Installing dependencies..."
npm install

echo "Installing PWA & API libraries..."
npm install vite-plugin-pwa workbox-window workbox-precaching axios @tanstack/react-query react-router-dom idb clsx tailwind-merge

echo "Setting up Tailwind CSS..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

echo -e "${GREEN}✅ Frontend PWA scaffolded.${RESET}"
