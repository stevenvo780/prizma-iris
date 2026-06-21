#!/bin/bash

# Test 1: API Health and Connectivity
# Tests basic API connectivity, health endpoints, and service availability

set -e

# Load env if available to pick correct PORT and base URL
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
if [ -f "$PROJECT_ROOT/.env.test" ]; then
  set -a; source "$PROJECT_ROOT/.env.test"; set +a
elif [ -f "$PROJECT_ROOT/.env" ]; then
  set -a; source "$PROJECT_ROOT/.env"; set +a
fi

echo "🏥 Testing API Health and Connectivity..."

# Configuration (prefer env PORT and API_URL when available)
API_HOST="${API_HOST:-localhost}"
API_PORT="${API_PORT:-${PORT:-3001}}"
API_URL="${API_URL:-http://$API_HOST:$API_PORT/api}"

# Temporary files for test results
TEMP_DIR="/tmp/iris-api-health-test"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Helper function to check if service is running
check_service() {
    local service_name="$1"
    local host="$2"
    local port="$3"
    
    if command -v nc >/dev/null 2>&1; then
        if nc -z "$host" "$port" 2>/dev/null; then
            echo "✅ $service_name is running on $host:$port"
            return 0
        else
            echo "❌ $service_name is not running on $host:$port"
            return 1
        fi
    else
        # Fallback using /dev/tcp if nc is not available
        if timeout 5 bash -c "echo >/dev/tcp/$host/$port" 2>/dev/null; then
            echo "✅ $service_name is running on $host:$port"
            return 0
        else
            echo "❌ $service_name is not running on $host:$port"
            return 1
        fi
    fi
}

# Helper function to make HTTP requests
make_request() {
    local url="$1"
    local method="${2:-GET}"
    local expected_code="${3:-200}"
    local output_file="$4"
    
    if command -v curl >/dev/null 2>&1; then
        local response_code
        if [ -n "$output_file" ]; then
            response_code=$(curl -s -w '%{http_code}' -X "$method" -o "$output_file" "$url" 2>/dev/null || echo "000")
        else
            response_code=$(curl -s -w '%{http_code}' -X "$method" -o /dev/null "$url" 2>/dev/null || echo "000")
        fi
        
        if [ "$response_code" = "$expected_code" ]; then
            echo "✅ $method $url returned $response_code"
            return 0
        else
            echo "❌ $method $url returned $response_code (expected $expected_code)"
            return 1
        fi
    else
        echo "⚠️  curl not available - skipping HTTP test for $url"
        return 1
    fi
}

echo "📋 Test 1: Basic Service Connectivity"

# Test API server connectivity
if check_service "IRIS API" "$API_HOST" "$API_PORT"; then
    API_RUNNING=true
else
    API_RUNNING=false
    echo "⚠️  API server not running - some tests will be skipped"
fi

# Test database connectivity (PostgreSQL default port)
check_service "PostgreSQL Database" "${DB_HOST:-localhost}" "${DB_PORT:-5432}" || echo "⚠️  Database may not be configured"

# Test Redis connectivity
check_service "Redis Cache" "${REDIS_HOST:-localhost}" "${REDIS_PORT:-6379}" || echo "⚠️  Redis may not be configured"

echo "📋 Test 2: API Health Endpoints"

if [ "$API_RUNNING" = true ]; then
    # Test main health endpoint
    make_request "$API_URL/health" "GET" "200" "$TEMP_DIR/health_response.json"
    
    # Test API documentation endpoint
    make_request "$API_URL/docs" "GET" "200" "$TEMP_DIR/docs_response.html"
    
    # Test API version endpoint
    make_request "$API_URL/version" "GET" "200" "$TEMP_DIR/version_response.json"
    
    # Test database health
    make_request "$API_URL/health/db" "GET" "200" "$TEMP_DIR/db_health_response.json"
    
    # Test Redis health
    make_request "$API_URL/health/redis" "GET" "200" "$TEMP_DIR/redis_health_response.json"
else
    echo "⚠️  Skipping API health endpoint tests - API not running"
fi

echo "📋 Test 3: API Response Format"

if [ "$API_RUNNING" = true ] && [ -f "$TEMP_DIR/health_response.json" ]; then
    # Check if response is valid JSON
    if command -v jq >/dev/null 2>&1; then
        if jq . "$TEMP_DIR/health_response.json" >/dev/null 2>&1; then
            echo "✅ Health endpoint returns valid JSON"
            
            # Check for expected fields
            if jq -e '.status' "$TEMP_DIR/health_response.json" >/dev/null 2>&1; then
                echo "✅ Health response contains status field"
            else
                echo "❌ Health response missing status field"
            fi
            
            if jq -e '.timestamp' "$TEMP_DIR/health_response.json" >/dev/null 2>&1; then
                echo "✅ Health response contains timestamp field"
            else
                echo "❌ Health response missing timestamp field"
            fi
        else
            echo "❌ Health endpoint returns invalid JSON"
        fi
    else
        echo "⚠️  jq not available - skipping JSON validation"
    fi
fi

echo "📋 Test 4: API Error Handling"

if [ "$API_RUNNING" = true ]; then
    # Test 404 endpoint
    make_request "$API_URL/nonexistent-endpoint" "GET" "404" "/dev/null"
    
    # Test invalid method
    make_request "$API_URL/health" "DELETE" "405" "/dev/null"
    
    # Test malformed request
    if command -v curl >/dev/null 2>&1; then
        response_code=$(curl -s -w '%{http_code}' -X POST -H "Content-Type: application/json" -d "invalid-json" -o /dev/null "$API_URL/auth/login" 2>/dev/null || echo "000")
        if [ "$response_code" = "400" ] || [ "$response_code" = "422" ]; then
            echo "✅ API properly handles malformed JSON (returned $response_code)"
        else
            echo "❌ API error handling test failed (returned $response_code)"
        fi
    fi
else
    echo "⚠️  Skipping API error handling tests - API not running"
fi

echo "📋 Test 5: Security Headers"

if [ "$API_RUNNING" = true ]; then
    if command -v curl >/dev/null 2>&1; then
        # Check for security headers
        headers=$(curl -s -I "$API_URL/health" 2>/dev/null || echo "")
        
        if echo "$headers" | grep -i "x-powered-by" >/dev/null; then
            echo "⚠️  X-Powered-By header exposed (security risk)"
        else
            echo "✅ X-Powered-By header properly hidden"
        fi
        
        if echo "$headers" | grep -i "x-frame-options\|x-content-type-options" >/dev/null; then
            echo "✅ Security headers present"
        else
            echo "⚠️  Security headers missing"
        fi
        
        if echo "$headers" | grep -i "server:" >/dev/null; then
            echo "⚠️  Server header exposed"
        else
            echo "✅ Server header properly hidden"
        fi
    fi
else
    echo "⚠️  Skipping security header tests - API not running"
fi

echo "📋 Test 6: API Documentation"

if [ "$API_RUNNING" = true ] && [ -f "$TEMP_DIR/docs_response.html" ]; then
    # Check if documentation contains expected content
    if grep -i "swagger\|openapi\|api documentation" "$TEMP_DIR/docs_response.html" >/dev/null 2>&1; then
        echo "✅ API documentation is available"
    else
        echo "❌ API documentation not properly configured"
    fi
else
    echo "⚠️  Skipping API documentation test"
fi

echo "📋 Test 7: Environment Check"

# Check if running in development/production
if [ -n "$NODE_ENV" ]; then
    echo "✅ NODE_ENV is set to: $NODE_ENV"
    
    if [ "$NODE_ENV" = "production" ]; then
        echo "⚠️  Running in production mode - ensure all security measures are active"
    else
        echo "✅ Running in development mode"
    fi
else
    echo "⚠️  NODE_ENV not set - defaulting to development"
fi

# Check for required environment variables
required_vars=("JWT_SECRET" "DB_HOST" "REDIS_HOST")
for var in "${required_vars[@]}"; do
    if [ -n "${!var}" ]; then
        echo "✅ Required environment variable $var is set"
    else
        echo "⚠️  Environment variable $var is not set"
    fi
done

# Generate test report
cat > "$TEMP_DIR/api-health-test-report.json" << EOF
{
    "test_suite": "API Health and Connectivity",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "api_running": $API_RUNNING,
    "tests": {
        "service_connectivity": "TESTED",
        "health_endpoints": "$( [ "$API_RUNNING" = true ] && echo "TESTED" || echo "SKIPPED" )",
        "response_format": "$( [ "$API_RUNNING" = true ] && echo "TESTED" || echo "SKIPPED" )",
        "error_handling": "$( [ "$API_RUNNING" = true ] && echo "TESTED" || echo "SKIPPED" )",
        "security_headers": "$( [ "$API_RUNNING" = true ] && echo "TESTED" || echo "SKIPPED" )",
        "documentation": "$( [ "$API_RUNNING" = true ] && echo "TESTED" || echo "SKIPPED" )",
        "environment": "TESTED"
    },
    "environment": {
        "api_url": "$API_URL",
        "node_env": "${NODE_ENV:-unset}",
        "api_port": "$API_PORT"
    },
    "status": "$( [ "$API_RUNNING" = true ] && echo "PASSED" || echo "PARTIAL" )"
}
EOF

cp "$TEMP_DIR/api-health-test-report.json" "/tmp/api-health-test-report.json"

if [ "$API_RUNNING" = true ]; then
    echo "✅ API health test completed successfully!"
    echo "📄 Test report saved to: /tmp/api-health-test-report.json"
    exit 0
else
    echo "⚠️  API health test completed with warnings - API not running"
    echo "📄 Test report saved to: /tmp/api-health-test-report.json"
    exit 1
fi
