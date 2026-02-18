#!/bin/bash

# Install dependencies if node_modules missing
if [ ! -d "node_modules" ]; then
  npm install
fi

# Run dev server
npm run dev
