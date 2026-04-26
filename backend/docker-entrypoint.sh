#!/bin/sh
set -e
if [ -n "$DATABASE_URL" ]; then
  node scripts/init-replica.mjs
  npx prisma db push --accept-data-loss --skip-generate
  npx prisma db seed || true
fi
exec node dist/index.js
