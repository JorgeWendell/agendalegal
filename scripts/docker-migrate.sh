#!/bin/sh
set -e

echo "Aguardando PostgreSQL..."
until pg_isready -h "${POSTGRES_HOST:-db}" -U "${POSTGRES_USER:-agendalegal}" -d "${POSTGRES_DB:-agendalegal}" >/dev/null 2>&1; do
  sleep 1
done

echo "PostgreSQL pronto."
node scripts/docker-migrate.mjs
