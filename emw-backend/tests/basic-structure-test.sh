#!/bin/bash

# EMW Basic Test Framework - Works without Node.js
# Tests basic file structure, configurations, and logic

set -e

LOG_FILE="logs/test-basic.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log test results
test_log() {
    local status="$1"
    local test_name="$2"
    local message="$3"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[$timestamp] [$status] $test_name: $message" | tee -a "$LOG_FILE"
}

echo "🧪 EMW Basic Testing Framework"
echo "=============================="

# Test 1: Project Structure
echo "Test 1: Project Structure"
if [ -f "app.module.ts" ]; then
    test_log "PASS" "MAIN_MODULE" "app.module.ts exists"
else
    test_log "FAIL" "MAIN_MODULE" "app.module.ts missing"
fi

if [ -f "index.ts" ]; then
    test_log "PASS" "ENTRY_POINT" "index.ts exists"
else
    test_log "FAIL" "ENTRY_POINT" "index.ts missing"
fi

# Test 2: Configuration Files
echo "Test 2: Configuration Files"
config_files=("config/database.config.ts" "config/auth.config.ts" "config/redis.config.ts")
for config_file in "${config_files[@]}"; do
    if [ -f "$config_file" ]; then
        test_log "PASS" "CONFIG" "$config_file exists"
    else
        test_log "FAIL" "CONFIG" "$config_file missing"
    fi
done

# Test 3: Entity Models
echo "Test 3: Entity Models"
entity_files=("models/user.entity.ts" "models/whatsapp-account.entity.ts" "models/message-log.entity.ts")
for entity_file in "${entity_files[@]}"; do
    if [ -f "$entity_file" ]; then
        test_log "PASS" "ENTITY" "$entity_file exists"
    else
        test_log "FAIL" "ENTITY" "$entity_file missing"
    fi
done

# Test 4: Service Modules
echo "Test 4: Service Modules"
module_dirs=("modules/auth" "modules/messages" "modules/webhook")
for module_dir in "${module_dirs[@]}"; do
    if [ -d "$module_dir" ]; then
        test_log "PASS" "MODULE" "$module_dir exists"
    else
        test_log "FAIL" "MODULE" "$module_dir missing"
    fi
done

# Test 5: Code Syntax Check (basic)
echo "Test 5: Code Syntax Check"
if command -v grep >/dev/null 2>&1; then
    # Check for basic TypeScript syntax issues
    syntax_errors=0
    
    # Check for missing imports
    if grep -r "import.*from" . --include="*.ts" >/dev/null 2>&1; then
        test_log "PASS" "SYNTAX" "Import statements found"
    else
        test_log "WARN" "SYNTAX" "No import statements found"
        ((syntax_errors++))
    fi
    
    # Check for export statements
    if grep -r "export" . --include="*.ts" >/dev/null 2>&1; then
        test_log "PASS" "SYNTAX" "Export statements found"
    else
        test_log "FAIL" "SYNTAX" "No export statements found"
        ((syntax_errors++))
    fi
    
    # Check for class definitions
    if grep -r "class.*{" . --include="*.ts" >/dev/null 2>&1; then
        test_log "PASS" "SYNTAX" "Class definitions found"
    else
        test_log "WARN" "SYNTAX" "No class definitions found"
        ((syntax_errors++))
    fi
    
    if [ $syntax_errors -eq 0 ]; then
        test_log "PASS" "OVERALL_SYNTAX" "Basic syntax check passed"
    else
        test_log "WARN" "OVERALL_SYNTAX" "$syntax_errors syntax issues found"
    fi
fi

# Test 6: Package Configuration
echo "Test 6: Package Configuration"
if [ -f "package.json" ]; then
    if grep -q "\"@nestjs/core\"" "package.json" 2>/dev/null; then
        test_log "PASS" "PACKAGE" "NestJS dependency configured"
    else
        test_log "WARN" "PACKAGE" "NestJS dependency not found in package.json"
    fi
    
    if grep -q "\"typeorm\"" "package.json" 2>/dev/null; then
        test_log "PASS" "PACKAGE" "TypeORM dependency configured"
    else
        test_log "WARN" "PACKAGE" "TypeORM dependency not found in package.json"
    fi
else
    test_log "FAIL" "PACKAGE" "package.json missing"
fi

# Test 7: Testing Scripts
echo "Test 7: Testing Scripts"
test_scripts=("tests/run_all_tests.sh" "tests/01-api-health.sh" "scripts/setup-environment.sh")
for test_script in "${test_scripts[@]}"; do
    if [ -f "$test_script" ]; then
        if [ -x "$test_script" ]; then
            test_log "PASS" "TEST_SCRIPT" "$test_script exists and is executable"
        else
            test_log "WARN" "TEST_SCRIPT" "$test_script exists but not executable"
        fi
    else
        test_log "FAIL" "TEST_SCRIPT" "$test_script missing"
    fi
done

# Test 8: Documentation
echo "Test 8: Documentation"
doc_files=("README.md")
for doc_file in "${doc_files[@]}"; do
    if [ -f "$doc_file" ]; then
        test_log "PASS" "DOCUMENTATION" "$doc_file exists"
    else
        test_log "FAIL" "DOCUMENTATION" "$doc_file missing"
    fi
done

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
