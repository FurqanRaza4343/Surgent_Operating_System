#!/bin/bash
# Run database migrations
cd "$(dirname "$0")/.."
source venv/bin/activate 2>/dev/null || source venv/Scripts/activate 2>/dev/null
alembic upgrade head
echo "Migrations complete"
