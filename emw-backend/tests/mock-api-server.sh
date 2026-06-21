#!/bin/bash

# Mock API Server - Simulates IRIS API responses for testing
# Works with netcat or socat to provide HTTP responses

set -e

API_PORT="${API_PORT:-3005}"
MOCK_DATA_DIR="tests/mock-data"
LOG_FILE="logs/mock-api.log"

# Create directories
mkdir -p "$MOCK_DATA_DIR"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log mock API activities
mock_log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[$timestamp] [$level] MOCK-API: $message" | tee -a "$LOG_FILE"
}

# Create mock response data
create_mock_responses() {
    mock_log "SETUP" "Creating mock response data"
    
    # Health endpoint response
    cat > "$MOCK_DATA_DIR/health.json" << 'EOF'
{
  "status": "healthy",
  "timestamp": "2025-08-01T00:12:00Z",
  "version": "1.0.0",
  "services": {
    "database": "connected",
    "redis": "connected",
    "whatsapp": "ready"
  },
  "uptime": 3600
}
EOF

    # API documentation response
    cat > "$MOCK_DATA_DIR/docs.html" << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>IRIS API Documentation</title>
</head>
<body>
    <h1>IRIS Unified API Documentation</h1>
    <p>Swagger/OpenAPI documentation for IRIS API</p>
    <div>Mock API Documentation</div>
</body>
</html>
EOF

    # Version endpoint response
    cat > "$MOCK_DATA_DIR/version.json" << 'EOF'
{
  "version": "1.0.0",
  "name": "iris-unified-api",
  "environment": "development",
  "build": "mock-build"
}
EOF

    # Error responses
    cat > "$MOCK_DATA_DIR/404.json" << 'EOF'
{
  "error": "Not Found",
  "message": "The requested resource was not found",
  "statusCode": 404,
  "timestamp": "2025-08-01T00:12:00Z"
}
EOF

    cat > "$MOCK_DATA_DIR/400.json" << 'EOF'
{
  "error": "Bad Request",
  "message": "Invalid request format",
  "statusCode": 400,
  "timestamp": "2025-08-01T00:12:00Z"
}
EOF

    mock_log "SETUP" "Mock response data created"
}

# Function to generate HTTP response
generate_response() {
    local status_code="$1"
    local content_type="$2"
    local body="$3"
    local body_length=${#body}
    
    cat << EOF
HTTP/1.1 $status_code
Content-Type: $content_type
Content-Length: $body_length
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
Connection: close

$body
EOF
}

# Function to handle HTTP request
handle_request() {
    local request_line="$1"
    local method=$(echo "$request_line" | cut -d' ' -f1)
    local path=$(echo "$request_line" | cut -d' ' -f2)
    
    mock_log "REQUEST" "$method $path"
    
    case "$path" in
        "/api/v2/health" | "/health")
            generate_response "200 OK" "application/json" "$(cat "$MOCK_DATA_DIR/health.json")"
            ;;
        "/api/v2/docs" | "/docs")
            generate_response "200 OK" "text/html" "$(cat "$MOCK_DATA_DIR/docs.html")"
            ;;
        "/api/v2/version" | "/version")
            generate_response "200 OK" "application/json" "$(cat "$MOCK_DATA_DIR/version.json")"
            ;;
        "/api/v2/health/db")
            generate_response "200 OK" "application/json" '{"status":"connected","type":"mysql","version":"8.0"}'
            ;;
        "/api/v2/health/redis")
            generate_response "200 OK" "application/json" '{"status":"connected","type":"redis","version":"6.2"}'
            ;;
        *)
            if [ "$method" = "DELETE" ] && [ "$path" = "/api/v2/health" ]; then
                generate_response "405 Method Not Allowed" "application/json" '{"error":"Method Not Allowed","statusCode":405}'
            else
                generate_response "404 Not Found" "application/json" "$(cat "$MOCK_DATA_DIR/404.json")"
            fi
            ;;
    esac
}

# Function to start mock server using netcat
start_with_netcat() {
    mock_log "START" "Starting mock API server with netcat on port $API_PORT"
    
    while true; do
        {
            read -r request_line
            mock_log "DEBUG" "Request: $request_line"
            
            # Read headers until empty line
            while read -r header && [ -n "$header" ]; do
                :
            done
            
            # Generate and send response
            handle_request "$request_line"
        } | nc -l -p "$API_PORT" 2>/dev/null || {
            mock_log "ERROR" "netcat failed, trying alternative approach"
            break
        }
    done
}

# Function to start mock server using socat
start_with_socat() {
    mock_log "START" "Starting mock API server with socat on port $API_PORT"
    
    socat TCP-LISTEN:$API_PORT,fork,reuseaddr EXEC:"bash -c 'read request; ./tests/mock-api-handler.sh \"\$request\"'" 2>/dev/null || {
        mock_log "ERROR" "socat failed"
        return 1
    }
}

# Function to start simple mock using bash
start_simple_mock() {
    mock_log "START" "Starting simple mock server on port $API_PORT using /dev/tcp"
    
    # Create a simple handler script
    cat > "tests/mock-api-handler.sh" << 'EOF'
#!/bin/bash
request="$1"
echo "HTTP/1.1 200 OK"
echo "Content-Type: application/json"
echo "Content-Length: 27"
echo ""
echo '{"status":"mock","ok":true}'
EOF
    chmod +x "tests/mock-api-handler.sh"
    
    mock_log "INFO" "Simple mock handler created - limited functionality"
}

# Main function
main() {
    mock_log "INIT" "Initializing mock API server"
    
    # Check if port is already in use
    if command -v netstat >/dev/null 2>&1; then
        if netstat -ln 2>/dev/null | grep ":$API_PORT " >/dev/null; then
            mock_log "ERROR" "Port $API_PORT is already in use"
            exit 1
        fi
    fi
    
    # Create mock data
    create_mock_responses
    
    # Try different methods to start the server
    if command -v nc >/dev/null 2>&1; then
        start_with_netcat
    elif command -v socat >/dev/null 2>&1; then
        start_with_socat
    else
        start_simple_mock
        mock_log "WARN" "Limited mock server created - install netcat or socat for full functionality"
    fi
}

# Handle signals
cleanup() {
    mock_log "STOP" "Mock API server stopping"
    exit 0
}

trap cleanup SIGINT SIGTERM

echo "🚀 IRIS Mock API Server"
echo "======================"
echo "Starting mock API server on port $API_PORT"
echo "Press Ctrl+C to stop"
echo ""

# Check if running as background process
if [ "$1" = "--background" ]; then
    main &
    MOCK_PID=$!
    echo "Mock API server started in background (PID: $MOCK_PID)"
    echo "$MOCK_PID" > "/tmp/iris-mock-api.pid"
else
    main
fi
