#!/bin/bash

# EMW Unified API - Master Test Runner
# This script runs all automated tests for the EMW platform

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
API_ROOT="$PROJECT_ROOT"
TEST_ROOT="$PROJECT_ROOT/tests"
LOGS_DIR="$PROJECT_ROOT/logs"
REPORTS_DIR="$PROJECT_ROOT/test-reports"

echo -e "${BLUE}🚀 EMW Platform - Master Test Runner${NC}"
echo -e "${BLUE}====================================${NC}"

# Create necessary directories
mkdir -p "$LOGS_DIR"
mkdir -p "$REPORTS_DIR"

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOGS_DIR/test-run.log"
}

# Function to run a test suite and capture results
run_test_suite() {
    local suite_name="$1"
    local test_command="$2"
    local test_file="$3"
    
    echo -e "\n${YELLOW}📋 Running $suite_name...${NC}"
    log "Starting $suite_name"
    
    if [ -f "$test_file" ]; then
        if bash "$test_file"; then
            echo -e "${GREEN}✅ $suite_name PASSED${NC}"
            log "$suite_name: PASSED"
            return 0
        else
            echo -e "${RED}❌ $suite_name FAILED${NC}"
            log "$suite_name: FAILED"
            return 1
        fi
    else
        echo -e "${YELLOW}⚠️  $suite_name test file not found: $test_file${NC}"
        log "$suite_name: SKIPPED (file not found)"
        return 2
    fi
}

# Start test execution
log "=== EMW Test Suite Execution Started ==="

# Initialize counters
total_tests=0
passed_tests=0
failed_tests=0
skipped_tests=0

# Test Suite 1: Environment Setup
total_tests=$((total_tests + 1))
run_test_suite "Environment Setup" "" "$TEST_ROOT/01-environment-setup.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 2: Database Connection
total_tests=$((total_tests + 1))
run_test_suite "Database Connection" "" "$TEST_ROOT/02-database-connection.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 3: Authentication Flow
total_tests=$((total_tests + 1))
run_test_suite "Authentication Flow" "" "$TEST_ROOT/03-auth-flow.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 4: WhatsApp Account Management
total_tests=$((total_tests + 1))
run_test_suite "WhatsApp Account Management" "" "$TEST_ROOT/04-whatsapp-accounts.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 5: Template Management
total_tests=$((total_tests + 1))
run_test_suite "Template Management" "" "$TEST_ROOT/05-template-management.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 6: Message Sending
total_tests=$((total_tests + 1))
run_test_suite "Message Sending" "" "$TEST_ROOT/06-message-sending.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 7: Bulk Message Processing
total_tests=$((total_tests + 1))
run_test_suite "Bulk Message Processing" "" "$TEST_ROOT/07-bulk-messaging.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 8: Webhook Processing
total_tests=$((total_tests + 1))
run_test_suite "Webhook Processing" "" "$TEST_ROOT/08-webhook-processing.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 9: Queue Management
total_tests=$((total_tests + 1))
run_test_suite "Queue Management" "" "$TEST_ROOT/09-queue-management.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Test Suite 10: Error Handling & Retries
total_tests=$((total_tests + 1))
run_test_suite "Error Handling & Retries" "" "$TEST_ROOT/10-error-handling.sh"
case $? in
    0) passed_tests=$((passed_tests + 1)) ;;
    1) failed_tests=$((failed_tests + 1)) ;;
    2) skipped_tests=$((skipped_tests + 1)) ;;
esac

# Generate final report
echo -e "\n${BLUE}📊 Test Execution Summary${NC}"
echo -e "${BLUE}=========================${NC}"
echo -e "Total Tests: $total_tests"
echo -e "${GREEN}Passed: $passed_tests${NC}"
echo -e "${RED}Failed: $failed_tests${NC}"
echo -e "${YELLOW}Skipped: $skipped_tests${NC}"

# Calculate success rate
if [ $total_tests -gt 0 ]; then
    success_rate=$(( (passed_tests * 100) / total_tests ))
    echo -e "Success Rate: ${success_rate}%"
fi

# Generate HTML report
generate_html_report() {
    local report_file="$REPORTS_DIR/test-report-$(date +%Y%m%d-%H%M%S).html"
    
    cat > "$report_file" << EOF
<!DOCTYPE html>
<html>
<head>
    <title>EMW Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { background: #f4f4f4; padding: 20px; border-radius: 5px; }
        .summary { margin: 20px 0; }
        .passed { color: #28a745; }
        .failed { color: #dc3545; }
        .skipped { color: #ffc107; }
        .metric { display: inline-block; margin: 10px; padding: 10px; border-radius: 5px; background: #f8f9fa; }
    </style>
</head>
<body>
    <div class="header">
        <h1>EMW Platform Test Report</h1>
        <p>Generated on: $(date)</p>
    </div>
    
    <div class="summary">
        <h2>Test Summary</h2>
        <div class="metric">Total Tests: <strong>$total_tests</strong></div>
        <div class="metric passed">Passed: <strong>$passed_tests</strong></div>
        <div class="metric failed">Failed: <strong>$failed_tests</strong></div>
        <div class="metric skipped">Skipped: <strong>$skipped_tests</strong></div>
        <div class="metric">Success Rate: <strong>${success_rate}%</strong></div>
    </div>
    
    <div class="details">
        <h2>Test Details</h2>
        <pre>$(cat "$LOGS_DIR/test-run.log" | tail -50)</pre>
    </div>
</body>
</html>
EOF
    
    echo -e "\n${BLUE}📄 HTML Report generated: $report_file${NC}"
}

generate_html_report

# Log completion
log "=== EMW Test Suite Execution Completed ==="
log "Results: $passed_tests passed, $failed_tests failed, $skipped_tests skipped"

# Exit with appropriate code
if [ $failed_tests -gt 0 ]; then
    echo -e "\n${RED}❌ Some tests failed. Check the logs for details.${NC}"
    exit 1
elif [ $skipped_tests -eq $total_tests ]; then
    echo -e "\n${YELLOW}⚠️  All tests were skipped. Please ensure test files exist.${NC}"
    exit 2
else
    echo -e "\n${GREEN}✅ All tests completed successfully!${NC}"
    exit 0
fi
