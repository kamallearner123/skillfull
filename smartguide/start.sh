#!/bin/bash

# Configuration
COMPOSE_FILE="docker-compose.yml"
REDIS_PORT=6380
SMARTGUIDE_PORT=8080

echo "🚀 Bootstrapping SmartGuide..."

# 1. Check for Docker and Docker Compose (V2 preferred)
if command -v docker &> /dev/null && docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
    echo "✅ Found Docker Compose V2 (plugin)"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
    echo "⚠️  Found legacy docker-compose (v1). If you encounter KeyError: 'ContainerConfig', please upgrade Docker or use 'docker compose' (v2)."
else
    echo "❌ Docker or Docker Compose not found. Please install Docker Desktop or the Docker Compose plugin."
    exit 1
fi

# 2. Setup Environment
if [ ! -f .env ]; then
    if [ -f .env.example ]; then
        echo "📝 Creating .env from .env.example..."
        cp .env.example .env
    else
        echo "⚠️  No .env or .env.example found. Continuing with default environment variables..."
    fi
fi

# 3. Bring up the stack
# We use --build to ensure code changes are picked up
echo "🏗️  Starting SmartGuide stack (API + Redis) via $COMPOSE_CMD..."
$COMPOSE_CMD up --build -d

# 4. Wait for healthy status
echo "⏳ Waiting for SmartGuide to be ready on port $SMARTGUIDE_PORT..."
MAX_RETRIES=30
RETRY_COUNT=0
until $(curl -sf http://localhost:$SMARTGUIDE_PORT/health > /dev/null); do
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "❌ SmartGuide failed to start in time. Check logs with '$COMPOSE_CMD logs -f smartguide'"
        exit 1
    fi
    printf '.'
    RETRY_COUNT=$((RETRY_COUNT+1))
    sleep 2
done

echo -e "\n✅ SmartGuide is UP and running!"
echo "📍 API: http://localhost:$SMARTGUIDE_PORT"
echo "📍 Swagger Docs: http://localhost:$SMARTGUIDE_PORT/docs"
echo "📍 Redis: localhost:$REDIS_PORT"
echo ""
echo "💡 To view logs: $COMPOSE_CMD logs -f"
echo "💡 To stop: $COMPOSE_CMD down"
