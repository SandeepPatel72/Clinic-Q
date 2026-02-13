#!/bin/sh
set -e

echo "============================================"
echo "  Clinic-Q OPD Management - Docker Setup"
echo "============================================"

if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL environment variable is not set."
  echo "Please set DATABASE_URL in docker-compose.yml or pass it via -e flag."
  exit 1
fi

echo "Waiting for PostgreSQL to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0
until node -e "
  const pg = require('pg');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  pool.query('SELECT 1').then(() => { pool.end(); process.exit(0); }).catch(() => { pool.end(); process.exit(1); });
" 2>/dev/null; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "ERROR: Could not connect to PostgreSQL after $MAX_RETRIES attempts."
    exit 1
  fi
  echo "  Attempt $RETRY_COUNT/$MAX_RETRIES - PostgreSQL not ready, retrying in 2s..."
  sleep 2
done

echo "PostgreSQL is ready!"

TABLE_EXISTS=$(node -e "
  const pg = require('pg');
  const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
  pool.query(\"SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'patient')\")
    .then(r => { console.log(r.rows[0].exists); pool.end(); })
    .catch(() => { console.log('false'); pool.end(); });
" 2>/dev/null)

if [ "$TABLE_EXISTS" = "false" ]; then
  echo "First run detected - initializing database schema..."

  if [ -f /app/database_schema.sql ]; then
    node -e "
      const pg = require('pg');
      const fs = require('fs');
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const sql = fs.readFileSync('/app/database_schema.sql', 'utf8');
      pool.query(sql).then(() => { console.log('Schema created successfully.'); pool.end(); }).catch(e => { console.error('Schema error:', e.message); pool.end(); process.exit(1); });
    "
  fi

  if [ "$LOAD_SAMPLE_DATA" = "true" ] && [ -f /app/database_backup.sql ]; then
    echo "Loading sample data from database_backup.sql..."
    node -e "
      const pg = require('pg');
      const fs = require('fs');
      const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
      const sql = fs.readFileSync('/app/database_backup.sql', 'utf8');
      pool.query(sql).then(() => { console.log('Sample data loaded successfully.'); pool.end(); }).catch(e => { console.error('Data load error:', e.message); pool.end(); });
    "
  fi

  echo "Database initialization complete."
else
  echo "Database already initialized - skipping schema setup."
fi

echo "============================================"
echo "  Starting Clinic-Q Server on port ${PORT:-3001}"
echo "============================================"

exec "$@"
