#!/bin/sh

set -e

# Ensure Redis container is running
if [ -n "$(docker ps -aq -f name=^twenty_redis$)" ]; then
  if [ -z "$(docker ps -q -f name=^twenty_redis$)" ]; then
    echo "Starting existing Redis container twenty_redis"
    if ! docker start twenty_redis >/dev/null 2>&1; then
      echo "Redis start failed, retrying once..."
      sleep 1
      docker start twenty_redis >/dev/null 2>&1 || echo "Redis start failed after retry"
    fi
  else
    echo "Redis container twenty_redis already running"
  fi
else
  make redis-on-docker || echo "Redis setup command failed"
fi

# Ensure Postgres container is running
if [ -n "$(docker ps -aq -f name=^twenty_pg$)" ]; then
  if [ -z "$(docker ps -q -f name=^twenty_pg$)" ]; then
    echo "Starting existing Postgres container twenty_pg"
    if ! docker start twenty_pg >/dev/null 2>&1; then
      echo "Postgres start failed, retrying once..."
      sleep 1
      docker start twenty_pg >/dev/null 2>&1 || echo "Postgres start failed after retry"
    fi
  else
    echo "Postgres container twenty_pg already running"
  fi
else
  make postgres-on-docker || echo "Postgres setup command failed"
fi

yarn

echo "Checking database initialization status"

# Check if the database has been initialized by checking if the core schema and workspace table exist
if ./nx ts-node-no-deps-transpile-only twenty-server -- ./scripts/check-db-initialized.ts > /dev/null 2>&1; then
  echo "Database already initialized, skipping reset"
else
  echo "Database not initialized, resetting database"
  ./nx database:reset twenty-server > /dev/null
fi

# Ensure log directory exists
mkdir -p "$TWILL_ENTRYPOINT_LOG_DIR"

# Check if server is already responding on port 3000
if curl -s "http://localhost:3000/healthz" > /dev/null 2>&1; then
  echo "Server already responding on port 3000, skipping"
else
  echo "GraphQL API starting on http://localhost:3000/graphql"
  echo "REST API starting on http://localhost:3000/rest"
  nohup ./nx start twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/server.log" 2>&1 &
fi

# Check if worker is already running
if ps aux | grep -q "[n]x worker twenty-server"; then
  echo "Worker already running, skipping"
else
  echo "Worker starting"
  nohup ./nx worker twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/worker.log" 2>&1 &
fi

# Check if frontend is already responding on port 3001
if curl -s "http://localhost:3001" > /dev/null 2>&1; then
  echo "Frontend already responding on port 3001, skipping"
else
  echo "Frontend starting on http://localhost:3001"
  nohup ./nx start twenty-front > "$TWILL_ENTRYPOINT_LOG_DIR/front.log" 2>&1 &
fi


