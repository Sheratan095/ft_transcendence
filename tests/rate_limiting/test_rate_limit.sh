#!/bin/bash

# Rate Limiting Tester for ft_transcendence Gateway
# Tests all rate limiting configurations using curl

GATEWAY_URL="http://localhost:3000"
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}🧪 Rate Limiting Test Suite${NC}"
echo -e "${CYAN}Testing gateway at: ${GATEWAY_URL}${NC}"
echo "════════════════════════════════════════════════════════════════"

# Function to test rate limiting
test_rate_limit() {
    local test_name="$1"
    local description="$2"
    local endpoint="$3"
    local method="$4"
    local data="$5"
    local expected_limit="$6"
    local max_tests="$7"
    
    echo -e "\n${CYAN}=== $test_name ===${NC}"
    echo -e "${YELLOW}$description${NC}"
    echo -e "${YELLOW}Testing: $method $endpoint${NC}"
    
    local rate_limited=false
    local rate_limit_at=0
    
    for i in $(seq 1 $max_tests); do
        printf "Request %2d/%d... " $i $max_tests
        
        if [ "$method" = "POST" ]; then
            response=$(curl -s -w "\n%{http_code}" -X POST "$GATEWAY_URL$endpoint" \
                      -H "Content-Type: application/json" \
                      -d "$data" 2>/dev/null)
        else
            response=$(curl -s -w "\n%{http_code}" -X GET "$GATEWAY_URL$endpoint" \
                      -H "Authorization: Bearer invalid-token" 2>/dev/null)
        fi
        
        # Extract status code (last line)
        status_code=$(echo "$response" | tail -n1)
        
        # Color code the response
        if [ "$status_code" = "429" ]; then
            echo -e "${RED}$status_code (RATE LIMITED)${NC}"
            if [ "$rate_limited" = false ]; then
                rate_limited=true
                rate_limit_at=$i
                echo -e "  ${RED}⚠️  Rate limit triggered at attempt $i${NC}"
            fi
        elif [ "$status_code" -ge 400 ] 2>/dev/null; then
            echo -e "${YELLOW}$status_code${NC}"
        else
            echo -e "${GREEN}$status_code${NC}"
        fi
        
        # Stop if rate limited and we're doing a quick test
        if [ "$rate_limited" = true ] && [ "$max_tests" -le 10 ]; then
            echo -e "  ${YELLOW}ℹ️  Stopping early after rate limit detection${NC}"
            break
        fi
        
        sleep 0.2
    done
    
    # Analyze results
    echo -e "\n${CYAN}📊 Results Summary:${NC}"
    if [ "$rate_limited" = true ]; then
        echo -e "  ${GREEN}✅ Rate limiting detected at request: $rate_limit_at${NC}"
        if [ "$rate_limit_at" -le $((expected_limit + 1)) ]; then
            echo -e "  ${GREEN}✅ Rate limiting working as expected (limit: $expected_limit)${NC}"
            return 0
        else
            echo -e "  ${RED}⚠️  Expected limit: $expected_limit, got: $((rate_limit_at - 1))${NC}"
            return 1
        fi
    else
        echo -e "  ${YELLOW}⚠️  No rate limiting detected${NC}"
        return 2
    fi
}

# Check if gateway is running
echo -e "\n${BLUE}🔍 Checking if gateway is running...${NC}"
if ! curl -s --connect-timeout 3 "$GATEWAY_URL" >/dev/null 2>&1; then
    echo -e "${RED}❌ Gateway is not responding at $GATEWAY_URL${NC}"
    echo -e "${YELLOW}💡 Make sure to run 'make dev' in the backend directory${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Gateway is responding${NC}"

# Test 1: Auth Routes (Strict) - 5 attempts per 5 minutes
test_rate_limit \
    "🔴 AUTH ROUTES (Strict)" \
    "Login/Register/2FA routes - 5 attempts per 5 minutes" \
    "/auth/login" \
    "POST" \
    '{"username":"testuser","password":"wrongpassword"}' \
    5 \
    8
auth_result=$?

echo -e "\n${YELLOW}⏳ Waiting 3 seconds before next test...${NC}"
sleep 3

# Test 2: Token Routes (Moderate) - 10 attempts per 5 minutes  
test_rate_limit \
    "🟡 TOKEN ROUTES (Moderate)" \
    "Token/Logout routes - 10 attempts per 5 minutes" \
    "/auth/token" \
    "POST" \
    '{"refreshToken":"invalid-token"}' \
    10 \
    13
token_result=$?

echo -e "\n${YELLOW}⏳ Waiting 3 seconds before next test...${NC}"
sleep 3

# Test 3: User Routes (Relaxed) - 100 attempts per 1 minute (quick test only)
test_rate_limit \
    "🟢 USER ROUTES (Relaxed - Quick Test)" \
    "General user routes - 100 attempts per 1 minute (testing first 10)" \
    "/users/" \
    "GET" \
    "" \
    100 \
    10
user_result=$?

# Final Summary
echo -e "\n${CYAN}🏁 Final Test Summary${NC}"
echo "════════════════════════════════════════════════════════════════"

total_tests=0
passed_tests=0

if [ $auth_result -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} 🔴 AUTH ROUTES"
    passed_tests=$((passed_tests + 1))
elif [ $auth_result -eq 1 ]; then
    echo -e "${RED}❌ FAIL${NC} 🔴 AUTH ROUTES"
else
    echo -e "${YELLOW}⏸️  PARTIAL${NC} 🔴 AUTH ROUTES"
fi
total_tests=$((total_tests + 1))

if [ $token_result -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} 🟡 TOKEN ROUTES"
    passed_tests=$((passed_tests + 1))
elif [ $token_result -eq 1 ]; then
    echo -e "${RED}❌ FAIL${NC} 🟡 TOKEN ROUTES"
else
    echo -e "${YELLOW}⏸️  PARTIAL${NC} 🟡 TOKEN ROUTES"
fi
total_tests=$((total_tests + 1))

if [ $user_result -eq 0 ]; then
    echo -e "${GREEN}✅ PASS${NC} 🟢 USER ROUTES"
    passed_tests=$((passed_tests + 1))
elif [ $user_result -eq 1 ]; then
    echo -e "${RED}❌ FAIL${NC} 🟢 USER ROUTES"
else
    echo -e "${YELLOW}⏸️  PARTIAL${NC} 🟢 USER ROUTES (Quick test - may not hit limit)"
fi
total_tests=$((total_tests + 1))

echo "────────────────────────────────────────────────────────────────"
echo -e "Tests Passed: ${CYAN}$passed_tests/$total_tests${NC}"

if [ $passed_tests -eq $total_tests ]; then
    echo -e "${GREEN}🎉 All rate limiting tests passed!${NC}"
    exit 0
elif [ $passed_tests -gt 0 ]; then
    echo -e "${YELLOW}⚠️  Some tests need attention${NC}"
    exit 1
else
    echo -e "${RED}❌ Rate limiting may not be working correctly${NC}"
    exit 2
fi