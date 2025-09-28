#!/bin/sh

set -e

make redis-on-docker
make postgres-on-docker

yarn

./nx database:reset twenty-server

# Ensure log directory exists
mkdir -p "$TWILL_ENTRYPOINT_LOG_DIR"

nohup ./nx start twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/server.log" 2>&1 &
nohup ./nx worker twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/worker.log" 2>&1 &
nohup ./nx start twenty-front > "$TWILL_ENTRYPOINT_LOG_DIR/front.log" 2>&1 &

echo "Frontend starting on http://localhost:3001"
echo "GraphQL API starting on http://localhost:3000/graphql"
echo "REST API starting on http://localhost:3000/rest"

