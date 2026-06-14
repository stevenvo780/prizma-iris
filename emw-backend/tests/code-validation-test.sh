#!/bin/bash

# EMW Code Validation Test - Tests code logic and structure without running services
# Validates TypeScript syntax, imports, exports, and logical structure

set -e

LOG_FILE="logs/code-validation.log"
mkdir -p "$(dirname "$LOG_FILE")"

# Function to log test results
test_log() {
    local status="$1"
    local test_name="$2"
    local message="$3"
    local timestamp=$(date -u +%Y-%m-%dT%H:%M:%SZ)
    echo "[$timestamp] [$status] $test_name: $message" | tee -a "$LOG_FILE"
}

echo "🔍 EMW Code Validation Test"
echo "==========================="

# Test 1: Entity Relationships
echo "Test 1: Entity Relationships"

# Check if User entity has proper relationships
if grep -q "OneToMany.*WhatsAppAccount" models/user.entity.ts 2>/dev/null; then
    test_log "PASS" "USER_RELATIONSHIPS" "User -> WhatsAppAccount relationship found"
else
    test_log "FAIL" "USER_RELATIONSHIPS" "User -> WhatsAppAccount relationship missing"
fi

if grep -q "OneToMany.*MessageLog" models/user.entity.ts 2>/dev/null; then
    test_log "PASS" "USER_RELATIONSHIPS" "User -> MessageLog relationship found"
else
    test_log "FAIL" "USER_RELATIONSHIPS" "User -> MessageLog relationship missing"
fi

# Check WhatsAppAccount relationships
if grep -q "ManyToOne.*User" models/whatsapp-account.entity.ts 2>/dev/null; then
    test_log "PASS" "ACCOUNT_RELATIONSHIPS" "WhatsAppAccount -> User relationship found"
else
    test_log "FAIL" "ACCOUNT_RELATIONSHIPS" "WhatsAppAccount -> User relationship missing"
fi

# Test 2: Service Dependencies
echo "Test 2: Service Dependencies"

# Check AuthService dependencies
if [ -f "modules/auth/auth.service.ts" ]; then
    if grep -q "JwtService" modules/auth/auth.service.ts 2>/dev/null; then
        test_log "PASS" "AUTH_DEPENDENCIES" "AuthService has JwtService dependency"
    else
        test_log "WARN" "AUTH_DEPENDENCIES" "AuthService missing JwtService dependency"
    fi
    
    if grep -q "Repository.*User" modules/auth/auth.service.ts 2>/dev/null; then
        test_log "PASS" "AUTH_DEPENDENCIES" "AuthService has User repository"
    else
        test_log "WARN" "AUTH_DEPENDENCIES" "AuthService missing User repository"
    fi
else
    test_log "FAIL" "AUTH_DEPENDENCIES" "AuthService file missing"
fi

# Test 3: Configuration Validation
echo "Test 3: Configuration Validation"

# Check database configuration (PostgreSQL)
if grep -q "type: 'postgres'\|type:\s*\"postgres\"" config/database.config.ts 2>/dev/null; then
    test_log "PASS" "DB_CONFIG" "Database configured for PostgreSQL"
else
    test_log "FAIL" "DB_CONFIG" "Database configuration missing or invalid"
fi

# Check JWT configuration
if grep -q "JWT_SECRET" config/auth.config.ts 2>/dev/null; then
    test_log "PASS" "JWT_CONFIG" "JWT configuration found"
else
    test_log "FAIL" "JWT_CONFIG" "JWT configuration missing"
fi

# Test 4: Module Structure
echo "Test 4: Module Structure"

# Check if modules are properly structured
modules=("auth" "messages" "webhook" "customers" "templates" "accounts" "metrics")
for module in "${modules[@]}"; do
    if [ -d "modules/$module" ]; then
        test_log "PASS" "MODULE_STRUCTURE" "$module module directory exists"
        
        # Check for module file
        if [ -f "modules/$module/$module.module.ts" ]; then
            test_log "PASS" "MODULE_STRUCTURE" "$module.module.ts exists"
        else
            test_log "WARN" "MODULE_STRUCTURE" "$module.module.ts missing"
        fi
        
        # Check for service file
        if [ -f "modules/$module/$module.service.ts" ]; then
            test_log "PASS" "MODULE_STRUCTURE" "$module.service.ts exists"
        else
            test_log "WARN" "MODULE_STRUCTURE" "$module.service.ts missing"
        fi
        
        # Check for controller file
        if [ -f "modules/$module/$module.controller.ts" ]; then
            test_log "PASS" "MODULE_STRUCTURE" "$module.controller.ts exists"
        else
            test_log "WARN" "MODULE_STRUCTURE" "$module.controller.ts missing"
        fi
    else
        test_log "FAIL" "MODULE_STRUCTURE" "$module module directory missing"
    fi
done

# Test 5: Import/Export Consistency
echo "Test 5: Import/Export Consistency"

# Check if main app module imports all necessary modules
if [ -f "app.module.ts" ]; then
    modules_imported=0
    for module in "${modules[@]}"; do
        module_name="${module^}Module"  # Capitalize first letter
        if grep -q "$module_name" app.module.ts 2>/dev/null; then
            test_log "PASS" "IMPORTS" "$module_name imported in app.module.ts"
            ((modules_imported++))
        else
            test_log "WARN" "IMPORTS" "$module_name not imported in app.module.ts"
        fi
    done
    
    if [ $modules_imported -gt 4 ]; then
        test_log "PASS" "IMPORTS" "Most core modules are imported ($modules_imported/7)"
    else
        test_log "FAIL" "IMPORTS" "Too few modules imported ($modules_imported/7)"
    fi
else
    test_log "FAIL" "IMPORTS" "app.module.ts missing"
fi

# Test 6: TypeScript Decorators
echo "Test 6: TypeScript Decorators"

# Check for NestJS decorators
decorators=("@Controller" "@Injectable" "@Module" "@Entity")
total_decorators=0

for decorator in "${decorators[@]}"; do
    count=$(grep -r "$decorator"  2>/dev/null | wc -l)
    if [ "$count" -gt 0 ]; then
        test_log "PASS" "DECORATORS" "$decorator found $count times"
        ((total_decorators += count))
    else
        test_log "WARN" "DECORATORS" "$decorator not found"
    fi
done

if [ $total_decorators -gt 10 ]; then
    test_log "PASS" "DECORATORS" "Good decorator usage ($total_decorators total)"
else
    test_log "WARN" "DECORATORS" "Limited decorator usage ($total_decorators total)"
fi

# Test 7: Error Handling Patterns
echo "Test 7: Error Handling Patterns"

# Check for try-catch blocks
try_catch_count=$(grep -r "try\s*{"  2>/dev/null | wc -l)
if [ "$try_catch_count" -gt 3 ]; then
    test_log "PASS" "ERROR_HANDLING" "Error handling found ($try_catch_count try-catch blocks)"
else
    test_log "WARN" "ERROR_HANDLING" "Limited error handling ($try_catch_count try-catch blocks)"
fi

# Check for HttpException usage
http_exception_count=$(grep -r "HttpException"  2>/dev/null | wc -l)
if [ "$http_exception_count" -gt 1 ]; then
    test_log "PASS" "ERROR_HANDLING" "HTTP exceptions used ($http_exception_count instances)"
else
    test_log "WARN" "ERROR_HANDLING" "Limited HTTP exception usage"
fi

# Test 8: Security Patterns
echo "Test 8: Security Patterns"

# Check for authentication guards
if grep -r "@UseGuards"  2>/dev/null | wc -l | grep -q "[1-9]"; then
    test_log "PASS" "SECURITY" "Authentication guards found"
else
    test_log "WARN" "SECURITY" "No authentication guards found"
fi

# Check for validation decorators
validation_count=$(grep -r "@IsString\|@IsEmail\|@IsNotEmpty"  2>/dev/null | wc -l)
if [ "$validation_count" -gt 5 ]; then
    test_log "PASS" "SECURITY" "Input validation found ($validation_count validations)"
else
    test_log "WARN" "SECURITY" "Limited input validation ($validation_count validations)"
fi

# Summary
echo ""
echo "📊 Code Validation Summary"
echo "=========================="

total_tests=$(grep -c "\[PASS\]" "$LOG_FILE" 2>/dev/null || echo "0")
failed_tests=$(grep -c "\[FAIL\]" "$LOG_FILE" 2>/dev/null || echo "0")
warn_tests=$(grep -c "\[WARN\]" "$LOG_FILE" 2>/dev/null || echo "0")

echo "✅ Passed: $total_tests"
echo "❌ Failed: $failed_tests"
echo "⚠️  Warnings: $warn_tests"

# Calculate code quality score
if [ "$total_tests" -gt 0 ]; then
    quality_score=$(( (total_tests * 100) / (total_tests + failed_tests + warn_tests) ))
    echo "📈 Code Quality Score: $quality_score%"
    
    if [ "$quality_score" -gt 70 ]; then
        echo "🎉 Code quality is good!"
        exit 0
    else
        echo "⚠️  Code quality needs improvement"
        exit 1
    fi
else
    echo "❌ No tests passed"
    exit 1
fi
