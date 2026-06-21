#!/bin/bash

# Test 3: Authentication Flow
# Tests user registration, login, token validation, and refresh

set -e

echo "🔐 Testing Authentication Flow..."

# Configuration
API_URL="${API_URL:-http://localhost:3005/api/v2}"
TEST_USER_EMAIL="test_$(date +%s)@example.com"
TEST_USER_PASSWORD="TestPassword123!"
TEST_USER_FIRSTNAME="Test"
TEST_USER_LASTNAME="User"

# Temporary files for test data
TEMP_DIR="/tmp/iris-auth-test"
mkdir -p "$TEMP_DIR"

REGISTER_RESPONSE="$TEMP_DIR/register_response.json"
LOGIN_RESPONSE="$TEMP_DIR/login_response.json"
PROFILE_RESPONSE="$TEMP_DIR/profile_response.json"
REFRESH_RESPONSE="$TEMP_DIR/refresh_response.json"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Helper function to make HTTP requests
make_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local auth_header="$4"
    local output_file="$5"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi
    
    if [ -n "$auth_header" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $auth_header'"
    fi
    
    if [ -n "$output_file" ]; then
        curl_cmd="$curl_cmd -o '$output_file'"
    fi
    
    curl_cmd="$curl_cmd '$API_URL$endpoint'"
    
    eval $curl_cmd
}

echo "📋 Test 1: User Registration"

# Test user registration
REGISTER_DATA="{
    \"email\": \"$TEST_USER_EMAIL\",
    \"password\": \"$TEST_USER_PASSWORD\",
    \"firstName\": \"$TEST_USER_FIRSTNAME\",
    \"lastName\": \"$TEST_USER_LASTNAME\"
}"

HTTP_CODE=$(make_request "POST" "/auth/register" "$REGISTER_DATA" "" "$REGISTER_RESPONSE")

if [ "$HTTP_CODE" = "201" ]; then
    echo "✅ User registration successful"
    
    # Validate response structure
    if command -v jq >/dev/null 2>&1; then
        USER_ID=$(jq -r '.user.id' "$REGISTER_RESPONSE" 2>/dev/null)
        TOKEN=$(jq -r '.token' "$REGISTER_RESPONSE" 2>/dev/null)
        
        if [ "$USER_ID" != "null" ] && [ "$TOKEN" != "null" ]; then
            echo "✅ Registration response has valid structure"
            echo "   User ID: $USER_ID"
            echo "   Token: ${TOKEN:0:20}..."
        else
            echo "❌ Registration response missing required fields"
            exit 1
        fi
    else
        echo "⚠️  jq not available, skipping response validation"
        # Extract token using grep (fallback)
        TOKEN=$(grep -o '"token":"[^"]*"' "$REGISTER_RESPONSE" | cut -d'"' -f4)
    fi
else
    echo "❌ User registration failed with HTTP code: $HTTP_CODE"
    cat "$REGISTER_RESPONSE"
    exit 1
fi

echo "📋 Test 2: User Login"

# Test user login
LOGIN_DATA="{
    \"email\": \"$TEST_USER_EMAIL\",
    \"password\": \"$TEST_USER_PASSWORD\"
}"

HTTP_CODE=$(make_request "POST" "/auth/login" "$LOGIN_DATA" "" "$LOGIN_RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ User login successful"
    
    # Validate login response
    if command -v jq >/dev/null 2>&1; then
        LOGIN_TOKEN=$(jq -r '.token' "$LOGIN_RESPONSE" 2>/dev/null)
        USER_EMAIL=$(jq -r '.user.email' "$LOGIN_RESPONSE" 2>/dev/null)
        
        if [ "$LOGIN_TOKEN" != "null" ] && [ "$USER_EMAIL" = "$TEST_USER_EMAIL" ]; then
            echo "✅ Login response has valid structure"
            TOKEN="$LOGIN_TOKEN"  # Use login token for subsequent tests
        else
            echo "❌ Login response missing required fields"
            exit 1
        fi
    else
        # Fallback extraction
        TOKEN=$(grep -o '"token":"[^"]*"' "$LOGIN_RESPONSE" | cut -d'"' -f4)
    fi
else
    echo "❌ User login failed with HTTP code: $HTTP_CODE"
    cat "$LOGIN_RESPONSE"
    exit 1
fi

echo "📋 Test 3: Get User Profile (Token Validation)"

# Test getting user profile with token
HTTP_CODE=$(make_request "GET" "/auth/profile" "" "$TOKEN" "$PROFILE_RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Profile retrieval successful (token is valid)"
    
    if command -v jq >/dev/null 2>&1; then
        PROFILE_EMAIL=$(jq -r '.email' "$PROFILE_RESPONSE" 2>/dev/null)
        if [ "$PROFILE_EMAIL" = "$TEST_USER_EMAIL" ]; then
            echo "✅ Profile data matches registered user"
        else
            echo "❌ Profile data mismatch"
            exit 1
        fi
    fi
else
    echo "❌ Profile retrieval failed with HTTP code: $HTTP_CODE"
    cat "$PROFILE_RESPONSE"
    exit 1
fi

echo "📋 Test 4: Token Refresh"

# Test token refresh
HTTP_CODE=$(make_request "POST" "/auth/refresh" "" "$TOKEN" "$REFRESH_RESPONSE")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Token refresh successful"
    
    if command -v jq >/dev/null 2>&1; then
        NEW_TOKEN=$(jq -r '.token' "$REFRESH_RESPONSE" 2>/dev/null)
        if [ "$NEW_TOKEN" != "null" ] && [ "$NEW_TOKEN" != "$TOKEN" ]; then
            echo "✅ New token received and is different from old token"
        else
            echo "❌ Token refresh did not return a new token"
            exit 1
        fi
    fi
else
    echo "❌ Token refresh failed with HTTP code: $HTTP_CODE"
    cat "$REFRESH_RESPONSE"
    exit 1
fi

echo "📋 Test 5: Invalid Credentials"

# Test login with invalid credentials
INVALID_LOGIN_DATA="{
    \"email\": \"$TEST_USER_EMAIL\",
    \"password\": \"WrongPassword123!\"
}"

HTTP_CODE=$(make_request "POST" "/auth/login" "$INVALID_LOGIN_DATA" "" "/dev/null")

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Invalid credentials properly rejected"
else
    echo "❌ Invalid credentials test failed - expected 401, got $HTTP_CODE"
    exit 1
fi

echo "📋 Test 6: Access Without Token"

# Test accessing protected endpoint without token
HTTP_CODE=$(make_request "GET" "/auth/profile" "" "" "/dev/null")

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Protected endpoint properly requires authentication"
else
    echo "❌ Protected endpoint test failed - expected 401, got $HTTP_CODE"
    exit 1
fi

echo "📋 Test 7: Access With Invalid Token"

# Test accessing protected endpoint with invalid token
INVALID_TOKEN="invalid.jwt.token"
HTTP_CODE=$(make_request "GET" "/auth/profile" "" "$INVALID_TOKEN" "/dev/null")

if [ "$HTTP_CODE" = "401" ]; then
    echo "✅ Invalid token properly rejected"
else
    echo "❌ Invalid token test failed - expected 401, got $HTTP_CODE"
    exit 1
fi

# Generate test report
cat > "/tmp/auth-flow-test-report.json" << EOF
{
    "test_suite": "Authentication Flow",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "results": {
        "user_registration": "PASSED",
        "user_login": "PASSED", 
        "profile_retrieval": "PASSED",
        "token_refresh": "PASSED",
        "invalid_credentials": "PASSED",
        "no_token_access": "PASSED",
        "invalid_token_access": "PASSED"
    },
    "test_user": {
        "email": "$TEST_USER_EMAIL",
        "user_id": "$USER_ID"
    },
    "status": "PASSED"
}
EOF

echo "✅ Authentication flow test completed successfully!"
echo "📄 Test report saved to: /tmp/auth-flow-test-report.json"

exit 0
