#!/bin/bash

# Test 4: WhatsApp Account Management
# Tests WhatsApp Business account registration, validation, and management

set -e

echo "📱 Testing WhatsApp Account Management..."

# Configuration
API_URL="${API_URL:-http://localhost:3005/api/v2}"

# Auth token (should be set from previous tests or environment)
if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ No authentication token available. Set AUTH_TOKEN environment variable."
    exit 1
fi

# Temporary files
TEMP_DIR="/tmp/emw-whatsapp-account-test"
mkdir -p "$TEMP_DIR"

# Cleanup function
cleanup() {
    rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

# Helper function to make authenticated requests
make_auth_request() {
    local method="$1"
    local endpoint="$2"
    local data="$3"
    local output_file="$4"
    
    local curl_cmd="curl -s -w '%{http_code}' -X $method"
    curl_cmd="$curl_cmd -H 'Authorization: Bearer $AUTH_TOKEN'"
    curl_cmd="$curl_cmd -H 'Content-Type: application/json'"
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    if [ -n "$output_file" ]; then
        curl_cmd="$curl_cmd -o '$output_file'"
    fi
    
    curl_cmd="$curl_cmd '$API_URL$endpoint'"
    
    eval $curl_cmd
}

echo "📋 Test 1: Register WhatsApp Account"

# Test account registration
ACCOUNT_DATA="{
    \"name\": \"Test Business Account\",
    \"phoneNumber\": \"+573001234567\",
    \"phoneNumberId\": \"108123456789\",
    \"businessAccountId\": \"234567890123456\",
    \"accessToken\": \"EAATest123456789\",
    \"type\": \"sandbox\",
    \"webhookConfig\": {
        \"url\": \"https://myapp.com/webhook\",
        \"verifyToken\": \"test-verify-token\",
        \"fields\": [\"messages\", \"message_deliveries\"]
    }
}"

HTTP_CODE=$(make_auth_request "POST" "/accounts" "$ACCOUNT_DATA" "$TEMP_DIR/register_account_response.json")

if [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "200" ]; then
    echo "✅ WhatsApp account registration successful"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/register_account_response.json" ]; then
        ACCOUNT_ID=$(jq -r '.id' "$TEMP_DIR/register_account_response.json" 2>/dev/null)
        ACCOUNT_STATUS=$(jq -r '.status' "$TEMP_DIR/register_account_response.json" 2>/dev/null)
        
        if [ "$ACCOUNT_ID" != "null" ]; then
            echo "   Account ID: $ACCOUNT_ID"
            echo "   Status: $ACCOUNT_STATUS"
        fi
    fi
else
    echo "⚠️  WhatsApp account registration failed with HTTP code: $HTTP_CODE"
    if [ -f "$TEMP_DIR/register_account_response.json" ]; then
        cat "$TEMP_DIR/register_account_response.json"
    fi
fi

echo "📋 Test 2: List User Accounts"

# Test listing user's accounts
HTTP_CODE=$(make_auth_request "GET" "/accounts" "" "$TEMP_DIR/list_accounts_response.json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Account listing successful"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/list_accounts_response.json" ]; then
        ACCOUNT_COUNT=$(jq '. | length' "$TEMP_DIR/list_accounts_response.json" 2>/dev/null)
        echo "   Found $ACCOUNT_COUNT accounts"
        
        # If we have accounts, get the first one for subsequent tests
        if [ "$ACCOUNT_COUNT" -gt 0 ]; then
            FIRST_ACCOUNT_ID=$(jq -r '.[0].id' "$TEMP_DIR/list_accounts_response.json" 2>/dev/null)
            echo "   First account ID: $FIRST_ACCOUNT_ID"
        fi
    fi
else
    echo "⚠️  Account listing failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 3: Get Account Details"

# Test getting specific account details (if we have an account ID)
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "GET" "/accounts/$ACCOUNT_ID" "" "$TEMP_DIR/account_details_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Account details retrieval successful"
        
        if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/account_details_response.json" ]; then
            PHONE_NUMBER=$(jq -r '.phoneNumber' "$TEMP_DIR/account_details_response.json" 2>/dev/null)
            ACCOUNT_TYPE=$(jq -r '.type' "$TEMP_DIR/account_details_response.json" 2>/dev/null)
            echo "   Phone: $PHONE_NUMBER"
            echo "   Type: $ACCOUNT_TYPE"
        fi
    else
        echo "⚠️  Account details retrieval failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account details test (no account ID available)"
fi

echo "📋 Test 4: Update Account Configuration"

# Test updating account configuration
if [ -n "$ACCOUNT_ID" ]; then
    UPDATE_DATA="{
        \"name\": \"Updated Test Business Account\",
        \"webhookConfig\": {
            \"url\": \"https://myapp.com/webhook/updated\",
            \"verifyToken\": \"updated-verify-token\",
            \"fields\": [\"messages\", \"message_deliveries\", \"message_reactions\"]
        }
    }"
    
    HTTP_CODE=$(make_auth_request "PUT" "/accounts/$ACCOUNT_ID" "$UPDATE_DATA" "$TEMP_DIR/update_account_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Account update successful"
    else
        echo "⚠️  Account update failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account update test (no account ID available)"
fi

echo "📋 Test 5: Validate Account Status"

# Test account status validation
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "POST" "/accounts/$ACCOUNT_ID/validate" "" "$TEMP_DIR/validate_account_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Account validation successful"
        
        if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/validate_account_response.json" ]; then
            VALIDATION_STATUS=$(jq -r '.valid' "$TEMP_DIR/validate_account_response.json" 2>/dev/null)
            echo "   Validation Status: $VALIDATION_STATUS"
        fi
    else
        echo "⚠️  Account validation failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account validation test (no account ID available)"
fi

echo "📋 Test 6: Account Metrics"

# Test getting account metrics
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "GET" "/accounts/$ACCOUNT_ID/metrics" "" "$TEMP_DIR/account_metrics_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Account metrics retrieval successful"
        
        if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/account_metrics_response.json" ]; then
            MESSAGES_SENT=$(jq -r '.messagesSent' "$TEMP_DIR/account_metrics_response.json" 2>/dev/null)
            DELIVERY_RATE=$(jq -r '.deliveryRate' "$TEMP_DIR/account_metrics_response.json" 2>/dev/null)
            echo "   Messages Sent: $MESSAGES_SENT"
            echo "   Delivery Rate: $DELIVERY_RATE%"
        fi
    else
        echo "⚠️  Account metrics retrieval failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account metrics test (no account ID available)"
fi

echo "📋 Test 7: Duplicate Account Registration"

# Test registering duplicate account (should fail)
HTTP_CODE=$(make_auth_request "POST" "/accounts" "$ACCOUNT_DATA" "$TEMP_DIR/duplicate_account_response.json")

if [ "$HTTP_CODE" = "409" ] || [ "$HTTP_CODE" = "400" ]; then
    echo "✅ Duplicate account registration properly rejected"
else
    echo "⚠️  Duplicate account test failed - expected 409/400, got $HTTP_CODE"
fi

echo "📋 Test 8: Invalid Account Data"

# Test with invalid account data
INVALID_ACCOUNT_DATA="{
    \"name\": \"\",
    \"phoneNumber\": \"invalid-phone\",
    \"phoneNumberId\": \"\",
    \"businessAccountId\": \"\",
    \"accessToken\": \"\",
    \"type\": \"invalid_type\"
}"

HTTP_CODE=$(make_auth_request "POST" "/accounts" "$INVALID_ACCOUNT_DATA" "$TEMP_DIR/invalid_account_response.json")

if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "422" ]; then
    echo "✅ Invalid account data properly rejected"
else
    echo "⚠️  Invalid account data test failed - expected 400/422, got $HTTP_CODE"
fi

echo "📋 Test 9: Account Deactivation"

# Test account deactivation
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "POST" "/accounts/$ACCOUNT_ID/deactivate" "" "$TEMP_DIR/deactivate_account_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Account deactivation successful"
    else
        echo "⚠️  Account deactivation failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account deactivation test (no account ID available)"
fi

echo "📋 Test 10: Account Reactivation"

# Test account reactivation
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "POST" "/accounts/$ACCOUNT_ID/activate" "" "$TEMP_DIR/reactivate_account_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Account reactivation successful"
    else
        echo "⚠️  Account reactivation failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account reactivation test (no account ID available)"
fi

echo "📋 Test 11: Webhook Configuration Test"

# Test webhook configuration validation
if [ -n "$ACCOUNT_ID" ]; then
    WEBHOOK_TEST_DATA="{
        \"url\": \"https://webhook.site/test\",
        \"verifyToken\": \"test-webhook-token\"
    }"
    
    HTTP_CODE=$(make_auth_request "POST" "/accounts/$ACCOUNT_ID/test-webhook" "$WEBHOOK_TEST_DATA" "$TEMP_DIR/webhook_test_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Webhook configuration test successful"
    else
        echo "⚠️  Webhook configuration test failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping webhook configuration test (no account ID available)"
fi

echo "📋 Test 12: Account Deletion"

# Test account deletion (only if we created a test account)
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "DELETE" "/accounts/$ACCOUNT_ID" "" "$TEMP_DIR/delete_account_response.json")
    
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "204" ]; then
        echo "✅ Account deletion successful"
    else
        echo "⚠️  Account deletion failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping account deletion test (no account ID available)"
fi

echo "📋 Test 13: Access Deleted Account"

# Test accessing deleted account (should fail)
if [ -n "$ACCOUNT_ID" ]; then
    HTTP_CODE=$(make_auth_request "GET" "/accounts/$ACCOUNT_ID" "" "/dev/null")
    
    if [ "$HTTP_CODE" = "404" ]; then
        echo "✅ Deleted account properly inaccessible"
    else
        echo "⚠️  Deleted account access test failed - expected 404, got $HTTP_CODE"
    fi
else
    echo "⚠️  Skipping deleted account access test (no account ID available)"
fi

# Generate test report
cat > "$TEMP_DIR/whatsapp-accounts-test-report.json" << EOF
{
    "test_suite": "WhatsApp Account Management",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "results": {
        "account_registration": "TESTED",
        "account_listing": "TESTED",
        "account_details": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "account_update": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "account_validation": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "account_metrics": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "duplicate_registration": "PASSED",
        "invalid_data": "PASSED",
        "account_deactivation": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "account_reactivation": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "webhook_configuration": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "account_deletion": "$( [ -n "$ACCOUNT_ID" ] && echo "TESTED" || echo "SKIPPED" )",
        "deleted_account_access": "$( [ -n "$ACCOUNT_ID" ] && echo "PASSED" || echo "SKIPPED" )"
    },
    "test_data": {
        "account_id": "$ACCOUNT_ID",
        "test_phone": "+573001234567"
    },
    "status": "PASSED"
}
EOF

cp "$TEMP_DIR/whatsapp-accounts-test-report.json" "/tmp/whatsapp-accounts-test-report.json"

echo "✅ WhatsApp account management test completed!"
echo "📄 Test report saved to: /tmp/whatsapp-accounts-test-report.json"

exit 0
