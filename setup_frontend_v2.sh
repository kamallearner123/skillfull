#!/bin/bash
set -e

GREEN='\033[0;32m'
RESET='\033[0m'

echo -e "${GREEN}🚀 Setting up CareerBrook-inspired Placement Dashboard...${RESET}"

# 1. Create Vite Project (Fresh)
# The logical AND (&&) ensures we only proceed if creation succeeds
npm create vite@latest frontend -- --template react-ts && cd frontend

# 2. Install Dependencies
echo "Installing Core Dependencies..."
npm install

echo "Installing UI & Logic Libraries..."
# - react-router-dom: Routing
# - lucide-react: Icons (clean, standard)
# - clsx, tailwind-merge: CSS utility handling
# - recharts: For dashboard charts
# - axios: API requests
# - chart.js react-chartjs-2: Alternative charting
# - framer-motion: Animations
npm install react-router-dom lucide-react clsx tailwind-merge recharts axios framer-motion

echo "Installing Dev Dependencies (Tailwind)..."
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

echo -e "${GREEN}✅ Frontend Setup Complete.${RESET}"
