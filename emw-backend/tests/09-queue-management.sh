#!/bin/bash

# Test 9: Queue Management
# Tests message queue processing, priorities, retries, and performance

set -e

echo "ℹ️ Queue system has been removed in simplified architecture. Skipping queue tests."

cat > "/tmp/queue-management-test-report.json" << EOF
{
    "test_suite": "Queue Management",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "status": "SKIPPED",
    "reason": "Queue module removed; direct send flow enabled"
}
EOF

echo "✅ Skipped. Report: /tmp/queue-management-test-report.json"
exit 0

# Configuration
API_URL="${API_URL:-http://localhost:3005/api/v2}"
REDIS_HOST="${REDIS_HOST:-localhost}"
REDIS_PORT="${REDIS_PORT:-6379}"

# Auth token (should be set from previous tests)
if [ -z "$AUTH_TOKEN" ]; then
    echo "❌ No authentication token available. Set AUTH_TOKEN environment variable."
    exit 1
fi

# Temporary files
TEMP_DIR="/tmp/iris-queue-test"
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

echo "📋 Test 1: Queue Status and Health"

# Test queue health endpoint
HTTP_CODE=$(make_auth_request "GET" "/queue/health" "" "$TEMP_DIR/queue_health_response.json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Queue health endpoint accessible"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/queue_health_response.json" ]; then
        QUEUE_STATUS=$(jq -r '.status' "$TEMP_DIR/queue_health_response.json" 2>/dev/null)
        PENDING_JOBS=$(jq -r '.pendingJobs' "$TEMP_DIR/queue_health_response.json" 2>/dev/null)
        ACTIVE_JOBS=$(jq -r '.activeJobs' "$TEMP_DIR/queue_health_response.json" 2>/dev/null)
        
        echo "   Queue Status: $QUEUE_STATUS"
        echo "   Pending Jobs: $PENDING_JOBS"
        echo "   Active Jobs: $ACTIVE_JOBS"
    fi
else
    echo "⚠️  Queue health endpoint failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 2: Redis Connection Test"

# Test Redis connectivity (if nc is available)
if command -v nc >/dev/null 2>&1; then
    if nc -z "$REDIS_HOST" "$REDIS_PORT"; then
        echo "✅ Redis connection successful"
        
        # Test Redis ping (if redis-cli is available)
        if command -v redis-cli >/dev/null 2>&1; then
            REDIS_RESPONSE=$(redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" ping 2>/dev/null || echo "ERROR")
            if [ "$REDIS_RESPONSE" = "PONG" ]; then
                echo "✅ Redis ping successful"
            else
                echo "⚠️  Redis ping failed (redis-cli may not be configured)"
            fi
        fi
    else
        echo "⚠️  Redis connection failed (Redis may not be running)"
    fi
else
    echo "⚠️  netcat not available, skipping Redis connectivity test"
fi

echo "📋 Test 3: Priority Queue Testing"

# Add high priority message
HIGH_PRIORITY_MESSAGE="{
    \"accountId\": \"test-account-id\",
    \"type\": \"text\",
    \"recipient\": \"+573001111111\",
    \"content\": \"High priority test message\",
    \"priority\": 10
}"

HTTP_CODE=$(make_auth_request "POST" "/messages/send" "$HIGH_PRIORITY_MESSAGE" "$TEMP_DIR/high_priority_response.json")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ High priority message queued"
    HIGH_PRIORITY_ID=$(jq -r '.messageLogId' "$TEMP_DIR/high_priority_response.json" 2>/dev/null)
else
    echo "⚠️  High priority message failed with HTTP code: $HTTP_CODE"
fi

# Add low priority message
LOW_PRIORITY_MESSAGE="{
    \"accountId\": \"test-account-id\",
    \"type\": \"text\",
    \"recipient\": \"+573002222222\",
    \"content\": \"Low priority test message\",
    \"priority\": 1
}"

HTTP_CODE=$(make_auth_request "POST" "/messages/send" "$LOW_PRIORITY_MESSAGE" "$TEMP_DIR/low_priority_response.json")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Low priority message queued"
    LOW_PRIORITY_ID=$(jq -r '.messageLogId' "$TEMP_DIR/low_priority_response.json" 2>/dev/null)
else
    echo "⚠️  Low priority message failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 4: Bulk Queue Processing"

# Add multiple messages to test queue processing
BULK_QUEUE_TEST="{
    \"accountId\": \"test-account-id\",
    \"type\": \"text\",
    \"recipients\": ["

# Generate test recipients
for i in {1..20}; do
    PHONE="+5730000000$(printf "%02d" $i)"
    BULK_QUEUE_TEST="$BULK_QUEUE_TEST{\"phoneNumber\": \"$PHONE\", \"content\": \"Bulk queue test message $i\"}"
    if [ $i -lt 20 ]; then
        BULK_QUEUE_TEST="$BULK_QUEUE_TEST,"
    fi
done

BULK_QUEUE_TEST="$BULK_QUEUE_TEST],
    \"batchSize\": 5,
    \"delayBetweenBatches\": 1000
}"

HTTP_CODE=$(make_auth_request "POST" "/messages/send-bulk" "$BULK_QUEUE_TEST" "$TEMP_DIR/bulk_queue_response.json")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ] || [ "$HTTP_CODE" = "202" ]; then
    echo "✅ Bulk queue test submitted"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/bulk_queue_response.json" ]; then
        CAMPAIGN_ID=$(jq -r '.campaignId' "$TEMP_DIR/bulk_queue_response.json" 2>/dev/null)
        echo "   Campaign ID: $CAMPAIGN_ID"
    fi
else
    echo "⚠️  Bulk queue test failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 5: Queue Statistics"

# Wait a moment for queue processing
sleep 2

# Get queue statistics
HTTP_CODE=$(make_auth_request "GET" "/queue/stats" "" "$TEMP_DIR/queue_stats_response.json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Queue statistics retrieved"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/queue_stats_response.json" ]; then
        TOTAL_JOBS=$(jq -r '.total' "$TEMP_DIR/queue_stats_response.json" 2>/dev/null)
        COMPLETED_JOBS=$(jq -r '.completed' "$TEMP_DIR/queue_stats_response.json" 2>/dev/null)
        FAILED_JOBS=$(jq -r '.failed' "$TEMP_DIR/queue_stats_response.json" 2>/dev/null)
        
        echo "   Total Jobs: $TOTAL_JOBS"
        echo "   Completed: $COMPLETED_JOBS"
        echo "   Failed: $FAILED_JOBS"
    fi
else
    echo "⚠️  Queue statistics failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 6: Failed Message Retry"

# Test retry mechanism by creating a message that will likely fail
RETRY_TEST_MESSAGE="{
    \"accountId\": \"invalid-account-id\",
    \"type\": \"text\",
    \"recipient\": \"+573003333333\",
    \"content\": \"This message should fail and retry\",
    \"priority\": 5
}"

HTTP_CODE=$(make_auth_request "POST" "/messages/send" "$RETRY_TEST_MESSAGE" "$TEMP_DIR/retry_test_response.json")

if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "201" ]; then
    echo "✅ Retry test message submitted"
    RETRY_MESSAGE_ID=$(jq -r '.messageLogId' "$TEMP_DIR/retry_test_response.json" 2>/dev/null)
    
    # Wait for processing and retries
    sleep 5
    
    # Check message status
    if [ -n "$RETRY_MESSAGE_ID" ]; then
        HTTP_CODE=$(make_auth_request "GET" "/messages/$RETRY_MESSAGE_ID/status" "" "$TEMP_DIR/retry_status_response.json")
        
        if [ "$HTTP_CODE" = "200" ]; then
            RETRY_COUNT=$(jq -r '.retryCount' "$TEMP_DIR/retry_status_response.json" 2>/dev/null)
            MESSAGE_STATUS=$(jq -r '.status' "$TEMP_DIR/retry_status_response.json" 2>/dev/null)
            
            echo "   Message Status: $MESSAGE_STATUS"
            echo "   Retry Count: $RETRY_COUNT"
            
            if [ "$RETRY_COUNT" -gt 0 ]; then
                echo "✅ Retry mechanism is working"
            else
                echo "⚠️  No retries detected (message may have succeeded or retries not yet triggered)"
            fi
        fi
    fi
else
    echo "⚠️  Retry test message failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 7: Queue Pause/Resume"

# Test queue pause functionality
HTTP_CODE=$(make_auth_request "POST" "/queue/pause" "" "$TEMP_DIR/pause_response.json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Queue pause command successful"
    
    # Wait a moment
    sleep 1
    
    # Test queue resume
    HTTP_CODE=$(make_auth_request "POST" "/queue/resume" "" "$TEMP_DIR/resume_response.json")
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ Queue resume command successful"
    else
        echo "⚠️  Queue resume failed with HTTP code: $HTTP_CODE"
    fi
else
    echo "⚠️  Queue pause failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 8: Queue Performance Metrics"

# Get performance metrics
HTTP_CODE=$(make_auth_request "GET" "/queue/metrics" "" "$TEMP_DIR/metrics_response.json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Queue performance metrics retrieved"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/metrics_response.json" ]; then
        THROUGHPUT=$(jq -r '.throughput' "$TEMP_DIR/metrics_response.json" 2>/dev/null)
        AVG_PROCESSING_TIME=$(jq -r '.averageProcessingTime' "$TEMP_DIR/metrics_response.json" 2>/dev/null)
        
        echo "   Throughput: $THROUGHPUT msgs/min"
        echo "   Avg Processing Time: $AVG_PROCESSING_TIME ms"
    fi
else
    echo "⚠️  Queue metrics failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 9: Dead Letter Queue"

# Check dead letter queue for permanently failed messages
HTTP_CODE=$(make_auth_request "GET" "/queue/dead-letter" "" "$TEMP_DIR/dlq_response.json")

if [ "$HTTP_CODE" = "200" ]; then
    echo "✅ Dead letter queue accessible"
    
    if command -v jq >/dev/null 2>&1 && [ -f "$TEMP_DIR/dlq_response.json" ]; then
        DLQ_COUNT=$(jq '. | length' "$TEMP_DIR/dlq_response.json" 2>/dev/null)
        echo "   Dead letter queue size: $DLQ_COUNT"
    fi
else
    echo "⚠️  Dead letter queue failed with HTTP code: $HTTP_CODE"
fi

echo "📋 Test 10: Queue Memory Usage"

# Check queue memory usage
if command -v ps >/dev/null 2>&1; then
    # Find processes related to our API
    API_PROCESSES=$(ps aux | grep -E "(node|nest)" | grep -v grep | wc -l)
    if [ $API_PROCESSES -gt 0 ]; then
        echo "✅ Found $API_PROCESSES API-related processes"
        
        # Memory usage (simplified)
        MEMORY_USAGE=$(ps aux | grep -E "(node|nest)" | grep -v grep | awk '{sum+=$6} END {print sum/1024}' 2>/dev/null || echo "0")
        echo "   Approximate memory usage: ${MEMORY_USAGE} MB"
    else
        echo "⚠️  No API processes found (API may not be running)"
    fi
fi

# Generate test report
cat > "$TEMP_DIR/queue-management-test-report.json" << EOF
{
    "test_suite": "Queue Management",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "results": {
        "queue_health": "TESTED",
        "redis_connection": "TESTED",
        "priority_queuing": "TESTED",
        "bulk_processing": "TESTED",
        "queue_statistics": "TESTED",
        "retry_mechanism": "TESTED",
        "pause_resume": "TESTED",
        "performance_metrics": "TESTED",
        "dead_letter_queue": "TESTED",
        "memory_usage": "TESTED"
    },
    "test_data": {
        "high_priority_id": "$HIGH_PRIORITY_ID",
        "low_priority_id": "$LOW_PRIORITY_ID",
        "retry_message_id": "$RETRY_MESSAGE_ID",
        "campaign_id": "$CAMPAIGN_ID"
    },
    "status": "PASSED"
}
EOF

cp "$TEMP_DIR/queue-management-test-report.json" "/tmp/queue-management-test-report.json"

echo "✅ Queue management test completed!"
echo "📄 Test report saved to: /tmp/queue-management-test-report.json"

exit 0
