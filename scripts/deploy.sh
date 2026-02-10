#!/usr/bin/env bash
set -e

# ===== CONFIG (your setup) =====
IMAGE="ghcr.io/aryankinha2024/at-domain:latest"
CONTAINER_NAME="app"
HOST_PORT=3000
CONTAINER_PORT=3000
ENV_FILE=".env"
USE_ENV=${USE_ENV:-false}

# ===== HELPER FUNCTIONS =====
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

error() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] ❌ ERROR: $1" >&2
  exit 1
}

check_env_file() {
  if [ "$USE_ENV" = "true" ]; then
    if [ -f "$ENV_FILE" ]; then
      log "✅ Environment file found: $ENV_FILE"
      return 0
    else
      log "⚠️  USE_ENV=true but $ENV_FILE not found - continuing without env vars"
      return 1
    fi
  fi
  return 1
}

# ===== MAIN DEPLOYMENT =====
log "🚀 Deploying latest container for at-domain..."
log "Configuration: IMAGE=$IMAGE, CONTAINER=$CONTAINER_NAME, PORTS=$HOST_PORT:$CONTAINER_PORT"

# Check environment file status
ENV_AVAILABLE=false
if check_env_file; then
  ENV_AVAILABLE=true
fi

# ===== STEP 1: Pull latest image =====
log "📦 Pulling latest image from registry..."
docker pull "$IMAGE" || error "Failed to pull image: $IMAGE"

# ===== STEP 2: Stop old container if running =====
if docker ps -q -f name=^/${CONTAINER_NAME}$ > /dev/null 2>&1; then
  log "🛑 Stopping running container: $CONTAINER_NAME"
  docker stop "$CONTAINER_NAME" || true
else
  log "ℹ️  No running container found: $CONTAINER_NAME"
fi

# ===== STEP 3: Remove old container if exists =====
if docker ps -a -q -f name=^/${CONTAINER_NAME}$ > /dev/null 2>&1; then
  log "🗑 Removing old container: $CONTAINER_NAME"
  docker rm "$CONTAINER_NAME" || true
else
  log "ℹ️  No stopped container found: $CONTAINER_NAME"
fi

# ===== STEP 4: Start new container =====
log "▶️ Starting new container..."

if [ "$ENV_AVAILABLE" = "true" ]; then
  log "📝 Using environment variables from $ENV_FILE"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$HOST_PORT:$CONTAINER_PORT" \
    --env-file "$ENV_FILE" \
    "$IMAGE" || error "Failed to start container with env vars"
else
  log "📝 Starting container without environment variables"
  docker run -d \
    --name "$CONTAINER_NAME" \
    --restart unless-stopped \
    -p "$HOST_PORT:$CONTAINER_PORT" \
    "$IMAGE" || error "Failed to start container"
fi

log "✅ Container started successfully: $CONTAINER_NAME"

# ===== STEP 5: Cleanup old images =====
log "🧹 Cleaning up unused images..."
docker image prune -f --filter "until=72h" || true

log "✅ Deployment complete!"
log "🎉 Container $CONTAINER_NAME is now running on port $HOST_PORT"