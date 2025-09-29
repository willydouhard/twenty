#!/bin/sh

set -e

make redis-on-docker || echo "Redis already running, continuing"
make postgres-on-docker || echo "Postgres already running, continuing"

yarn


echo "Resetting database"
./nx database:reset twenty-server > /dev/null


# Building sequentially to avoid exhausting memory

# echo "Building server"
# ./nx build twenty-server

# echo "Typechecking server"
# ./nx typecheck twenty-server

# echo "Building UI"
# ./nx build twenty-ui

# Ensure log directory exists
mkdir -p "$TWILL_ENTRYPOINT_LOG_DIR"

echo "GraphQL API starting on http://localhost:3000/graphql"
echo "REST API starting on http://localhost:3000/rest"
nohup ./nx start twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/server.log" 2>&1 &

nohup ./nx worker twenty-server > "$TWILL_ENTRYPOINT_LOG_DIR/worker.log" 2>&1 &

echo "Frontend starting on http://localhost:3001"
nohup ./nx start twenty-front > "$TWILL_ENTRYPOINT_LOG_DIR/front.log" 2>&1 &


