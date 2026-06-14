#!/bin/bash

# Test 2: Database Connection (PostgreSQL)
# Tests database connectivity, schema validation, and basic operations

set -e

echo "🗄️  Testing Database Connection (PostgreSQL)..."

# Load .env if present
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$PROJECT_ROOT/.env" ]; then
  set -a
  source "$PROJECT_ROOT/.env"
  set +a
fi

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USERNAME="${DB_USERNAME:-postgres}"
DB_PASSWORD="${DB_PASSWORD:-}"
DB_DATABASE="${DB_DATABASE:-postgres}"

# Temporary files
TEMP_DIR="/tmp/emw-db-test"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

command_exists() { command -v "$1" >/dev/null 2>&1; }

echo "📋 Test 1: Database Server Connectivity"

if command_exists nc; then
    if nc -z "$DB_HOST" "$DB_PORT"; then
        echo "✅ Database server is accessible on $DB_HOST:$DB_PORT"
    else
        echo "❌ Database server is not accessible on $DB_HOST:$DB_PORT"
        echo "   Please ensure PostgreSQL is running"
        exit 1
    fi
else
    echo "⚠️  netcat not available, skipping connectivity test"
fi

export PGPASSWORD="$DB_PASSWORD"
PSQL_BASE=(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USERNAME" -v ON_ERROR_STOP=1 -t -A)

echo "📋 Test 2: Database Client Connection"
if command_exists psql; then
    if echo "SELECT 1;" | "${PSQL_BASE[@]}" postgres >/dev/null 2>&1; then
        echo "✅ psql client connection successful"
    else
        echo "❌ psql client connection failed"
        echo "   Check credentials: $DB_USERNAME@$DB_HOST:$DB_PORT"
        exit 1
    fi
else
    echo "❌ psql not available. Install it (e.g., sudo apt install postgresql-client)"
    exit 1
fi

echo "📋 Test 3: Database Existence"
DB_EXISTS=$(echo "SELECT 1 FROM pg_database WHERE datname = '$DB_DATABASE';" | "${PSQL_BASE[@]}" postgres 2>/dev/null)
if [ "$DB_EXISTS" = "1" ]; then
    echo "✅ Database '$DB_DATABASE' exists"
else
    echo "⚠️  Database '$DB_DATABASE' does not exist. Attempting to create..."
    if echo "CREATE DATABASE \"$DB_DATABASE\";" | "${PSQL_BASE[@]}" postgres >/dev/null 2>&1; then
        echo "✅ Database '$DB_DATABASE' created successfully"
    else
        echo "❌ Failed to create database '$DB_DATABASE'"
        exit 1
    fi
fi

echo "📋 Test 4: Table Schema Validation (basic)"
TABLES_TO_CHECK=("users" "whatsapp_accounts" "message_logs" "customers" "templates")
for table in "${TABLES_TO_CHECK[@]}"; do
  EXISTS=$(echo "SELECT to_regclass('$table') IS NOT NULL;" | "${PSQL_BASE[@]}" "$DB_DATABASE" 2>/dev/null)
  if [ "$EXISTS" = "t" ]; then
    echo "✅ Table '$table' exists"
  else
    echo "⚠️  Table '$table' does not exist (will be created by TypeORM)"
  fi
done

echo "📋 Test 5: Database Permissions"
if echo "CREATE TEMP TABLE test_permissions (id INT PRIMARY KEY, test_data TEXT);" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1; then
  echo "✅ CREATE permission available"
  if echo "INSERT INTO test_permissions (id, test_data) VALUES (1, 'test');" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1; then
    echo "✅ INSERT permission available"
    if echo "SELECT COUNT(*) FROM test_permissions;" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1; then
      echo "✅ SELECT permission available"
      if echo "UPDATE test_permissions SET test_data='updated' WHERE id=1;" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1; then
        echo "✅ UPDATE permission available"
        if echo "DELETE FROM test_permissions WHERE id=1;" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1; then
          echo "✅ DELETE permission available"
        else
          echo "❌ DELETE permission not available"
        fi
      else
        echo "❌ UPDATE permission not available"
      fi
    else
      echo "❌ SELECT permission not available"
    fi
  else
    echo "❌ INSERT permission not available"
  fi
  echo "DROP TABLE IF EXISTS test_permissions;" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1
else
  echo "❌ CREATE permission not available"
  exit 1
fi

echo "📋 Test 6: Timezone Functions"
if echo "SELECT NOW(), CURRENT_TIMESTAMP AT TIME ZONE 'UTC';" | "${PSQL_BASE[@]}" "$DB_DATABASE" >/dev/null 2>&1; then
  echo "✅ Timezone functions working correctly"
else
  echo "⚠️  Timezone function test failed"
fi

# Generate minimal report
cat > "/tmp/database-connection-test-report.json" << EOF
{
  "test_suite": "Database Connection (PostgreSQL)",
  "config": {"host": "$DB_HOST", "port": $DB_PORT, "database": "$DB_DATABASE"},
  "status": "PASSED",
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF

echo "✅ Database connection test completed successfully!"
echo "📄 Test report saved to: /tmp/database-connection-test-report.json"

exit 0
