#!/bin/sh
set -eu

if [ "${DATABASE_URL:-}" = "sqlite:////data/route53.db" ]; then
    if [ ! -d /data ]; then
        mkdir -p /data
    fi
    if [ ! -w /data ]; then
        echo "The Railway volume mounted at /data is not writable." >&2
        exit 1
    fi
fi

echo "Applying database migrations..."
alembic upgrade head

echo "Ensuring the demo user exists..."
python -m app.seed

exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --workers 1
