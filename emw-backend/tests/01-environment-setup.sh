#!/bin/bash

# Test 1: Environment Setup Validation
# Validates that all required environment variables and dependencies are available

set -e

# Load test environment variables
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_ROOT/.env.test" ]; then
    set -a  # automatically export all variables
    source "$PROJECT_ROOT/.env.test"
    set +a  # stop automatically exporting
    echo "✅ Loaded test environment variables (.env.test)"
elif [ -f "$PROJECT_ROOT/.env" ]; then
    set -a
    source "$PROJECT_ROOT/.env"
    set +a
    echo "✅ Loaded environment variables (.env)"
fi

echo "🔧 Testing Environment Setup..."

# Test configuration
API_URL="${API_URL:-http://localhost:3005}"
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to check environment variable
check_env_var() {
    local var_name="$1"
    local required="$2"
    
    if [ -n "${!var_name}" ]; then
        echo "✅ $var_name is set"
        return 0
    elif [ "$required" = "true" ]; then
        echo "❌ $var_name is required but not set"
        return 1
    else
        echo "⚠️  $var_name is not set (optional)"
        return 0
    fi
}

echo "📋 Checking required system dependencies..."

# Check Node.js
if command_exists node; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is installed: $NODE_VERSION"
    
    # Check if version is >= 16
    NODE_MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'.' -f1 | sed 's/v//')
    if [ "$NODE_MAJOR_VERSION" -ge 16 ]; then
        echo "✅ Node.js version is compatible (>= 16)"
    else
        echo "❌ Node.js version $NODE_VERSION is too old. Minimum required: v16"
        exit 1
    fi
else
    echo "❌ Node.js is not installed"
    exit 1
fi

# Check npm
if command_exists npm; then
    NPM_VERSION=$(npm --version)
    echo "✅ npm is installed: $NPM_VERSION"
else
    echo "❌ npm is not installed"
    exit 1
fi

# Check curl
if command_exists curl; then
    echo "✅ curl is available"
else
    echo "❌ curl is not installed"
    exit 1
fi

# Check Postgres client
if command_exists psql; then
    echo "✅ PostgreSQL client (psql) is available"
else
    echo "⚠️  PostgreSQL client is not installed (optional for testing)"
fi

echo "📋 Checking environment variables..."

# Critical environment variables
check_env_var "NODE_ENV" false
check_env_var "PORT" false
check_env_var "DB_HOST" false
check_env_var "DB_PORT" false
check_env_var "DB_USERNAME" false
check_env_var "DB_PASSWORD" false
check_env_var "DB_DATABASE" false
check_env_var "JWT_SECRET" true

# Optional but recommended
check_env_var "WHATSAPP_API_BASE_URL" false
check_env_var "FRONTEND_URL" false

echo "📋 Checking project structure..."

# Use dynamic project root (already set at top of script)
API_ROOT="$PROJECT_ROOT"

# Check critical files
files_to_check=(
    "$API_ROOT/package.json"
    "$API_ROOT/tsconfig.json" 
    "$API_ROOT/app.module.ts"
    "$API_ROOT/index.ts"
    "$PROJECT_ROOT/docs/flujo_iris.md"
)

for file in "${files_to_check[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ Found: $(basename $file)"
    else
        echo "❌ Missing: $file"
        exit 1
    fi
done

# Check directories
directories_to_check=(
    "$API_ROOT/modules"
    "$API_ROOT/models"
    "$API_ROOT/config"
    "$PROJECT_ROOT/tests"
    "$PROJECT_ROOT/docs"
    "$PROJECT_ROOT/logs"
)

for dir in "${directories_to_check[@]}"; do
    if [ -d "$dir" ]; then
        echo "✅ Directory exists: $(basename $dir)"
    else
        echo "❌ Missing directory: $dir"
        exit 1
    fi
done

# Test API accessibility (if running)
echo "📋 Testing API accessibility..."
if curl -f -s -o /dev/null -w "%{http_code}" "$API_URL/api/v2" | grep -q "200\|404"; then
    echo "✅ API endpoint is accessible"
else
    echo "⚠️  API is not running or not accessible (this is OK for setup test)"
fi

# Test database connectivity (if configured)
if [ -n "$DB_HOST" ] && [ -n "$DB_PORT" ]; then
    echo "📋 Testing database connectivity..."
    if command_exists nc; then
        if nc -z "$DB_HOST" "$DB_PORT"; then
            echo "✅ Database port is accessible"
        else
            echo "⚠️  Database port is not accessible (this is OK if DB is not running)"
        fi
    else
        echo "⚠️  netcat not available, skipping database connectivity test"
    fi
fi

# Create necessary directories if they don't exist
mkdir -p "$PROJECT_ROOT/logs"
mkdir -p "$PROJECT_ROOT/test-reports"
echo "✅ Created necessary directories"

# Write test results
cat > "$PROJECT_ROOT/logs/environment-test.log" << EOF
Environment Setup Test Results
=============================
Date: $(date)
Node.js: $NODE_VERSION
npm: $NPM_VERSION
API URL: $API_URL
Status: PASSED
EOF

echo "✅ Environment setup test completed successfully!"
exit 0
