#!/bin/sh

set -e

make redis-on-docker
make postgres-on-docker

yarn

npx nx database:reset twenty-server

# Ensure log directory exists
mkdir -p "$TWILL_ENTRYPOINT_LOG_DIR"

nohup npx nx start twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/server.log" 2>&1 &
nohup npx nx worker twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/worker.log" 2>&1 &
nohup npx nx start twenty-front > "$TWILL_ENTRYPOINT_LOG_DIR/front.log" 2>&1 &

echo "Frontend started on http://localhost:3001"
echo "GraphQL API started on http://localhost:3000/graphql"
echo "REST API started on http://localhost:3000/rest"

