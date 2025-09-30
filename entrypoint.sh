#!/bin/sh

set -e

make redis-on-docker || echo "Redis already running, continuing"
make postgres-on-docker || echo "Postgres already running, continuing"

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

echo "GraphQL API starting on http://localhost:3000/graphql"
echo "REST API starting on http://localhost:3000/rest"
nohup ./nx start twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/server.log" 2>&1 &

nohup ./nx worker twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/worker.log" 2>&1 &

echo "Frontend starting on http://localhost:3001"
nohup ./nx start twenty-front > "$TWILL_ENTRYPOINT_LOG_DIR/front.log" 2>&1 &


