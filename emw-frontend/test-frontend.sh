#!/bin/bash

# EMW Frontend Test Framework
# Tests Next.js structure, configurations, and dependencies

set -e

LOG_FILE="logs/test-frontend.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log test results
test_log() {
    local status="$1"
    local test_name="$2"
    local message="$3"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[$timestamp] [$status] $test_name: $message" | tee -a "$LOG_FILE"
}

echo "🎨 EMW Frontend Testing Framework"
echo "================================="

# Test 1: Next.js Structure
echo "Test 1: Next.js Structure"
if [ -f "package.json" ]; then
    test_log "PASS" "PACKAGE" "package.json exists"
else
    test_log "FAIL" "PACKAGE" "package.json missing"
fi

if [ -f "next.config.js" ]; then
    test_log "PASS" "NEXT_CONFIG" "next.config.js exists"
else
    test_log "FAIL" "NEXT_CONFIG" "next.config.js missing"
fi

if [ -f "tsconfig.json" ]; then
    test_log "PASS" "TYPESCRIPT" "tsconfig.json exists"
else
    test_log "FAIL" "TYPESCRIPT" "tsconfig.json missing"
fi

# Test 2: Source Structure
echo "Test 2: Source Structure"
directories=("src" "public")
for dir in "${directories[@]}"; do
    if [ -d "$dir" ]; then
        test_log "PASS" "STRUCTURE" "$dir directory exists"
    else
        test_log "FAIL" "STRUCTURE" "$dir directory missing"
    fi
done

# Test 3: Core Directories
echo "Test 3: Core Directories"
core_dirs=("src/components" "src/pages" "src/api" "src/store")
for core_dir in "${core_dirs[@]}"; do
    if [ -d "$core_dir" ]; then
        test_log "PASS" "CORE_DIRS" "$core_dir exists"
    else
        test_log "FAIL" "CORE_DIRS" "$core_dir missing"
    fi
done

# Test 4: Configuration Files
echo "Test 4: Configuration Files"
config_files=("tailwind.config.js" "postcss.config.js")
for config_file in "${config_files[@]}"; do
    if [ -f "$config_file" ]; then
        test_log "PASS" "CONFIG" "$config_file exists"
    else
        test_log "WARN" "CONFIG" "$config_file missing"
    fi
done

# Test 5: Package Dependencies
echo "Test 5: Package Dependencies"
if [ -f "package.json" ]; then
    if grep -q "\"next\"" "package.json" 2>/dev/null; then
        test_log "PASS" "DEPS" "Next.js dependency configured"
    else
        test_log "FAIL" "DEPS" "Next.js dependency not found"
    fi
    
    if grep -q "\"react\"" "package.json" 2>/dev/null; then
        test_log "PASS" "DEPS" "React dependency configured"
    else
        test_log "FAIL" "DEPS" "React dependency not found"
    fi
    
    if grep -q "\"typescript\"" "package.json" 2>/dev/null; then
        test_log "PASS" "DEPS" "TypeScript dependency configured"
    else
        test_log "WARN" "DEPS" "TypeScript dependency not found"
    fi
fi

# Test 6: Code Quality
echo "Test 6: Code Quality"
if command -v grep >/dev/null 2>&1; then
    # Check for React components
    if grep -r "export.*function\|export.*const.*=" src/ --include="*.tsx" --include="*.ts" >/dev/null 2>&1; then
        test_log "PASS" "COMPONENTS" "React components found"
    else
        test_log "WARN" "COMPONENTS" "No React components found"
    fi
    
    # Check for imports
    if grep -r "import.*from" src/ --include="*.tsx" --include="*.ts" >/dev/null 2>&1; then
        test_log "PASS" "IMPORTS" "Import statements found"
    else
        test_log "WARN" "IMPORTS" "No import statements found"
    fi
fi

# Test 7: Documentation
echo "Test 7: Documentation"
if [ -f "README.md" ]; then
    test_log "PASS" "DOCS" "README.md exists"
else
    test_log "FAIL" "DOCS" "README.md missing"
fi

# Summary
echo ""
echo "📊 Test Summary"
echo "==============="

total_tests=$(grep -c "\[PASS\]" "$LOG_FILE" 2>/dev/null || echo "0")
failed_tests=$(grep -c "\[FAIL\]" "$LOG_FILE" 2>/dev/null || echo "0")
warn_tests=$(grep -c "\[WARN\]" "$LOG_FILE" 2>/dev/null || echo "0")

# Remove any newlines from the counts
total_tests=$(echo "$total_tests" | tr -d '\n')
failed_tests=$(echo "$failed_tests" | tr -d '\n')
warn_tests=$(echo "$warn_tests" | tr -d '\n')

echo "✅ Passed: $total_tests"
echo "❌ Failed: $failed_tests"
echo "⚠️  Warnings: $warn_tests"

if [ "$failed_tests" -eq 0 ]; then
    echo "🎉 All critical tests passed!"
    exit 0
else
    echo "💥 Some tests failed. Check $LOG_FILE for details."
    exit 1
fi
