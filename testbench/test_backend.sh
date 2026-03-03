#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# CogniLearn — Backend API Test Script
#
# Runs automated curl tests against all major backend endpoints.
# Requires: curl, jq (optional, for pretty output)
#
# Usage:
#   chmod +x testbench/test_backend.sh
#   ./testbench/test_backend.sh
#
# Make sure the backend is running first:
#   python3 -m uvicorn Backend.mindmap.app:app --host 0.0.0.0 --port 8000
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

BASE_URL="${API_URL:-http://localhost:8000}"
PASS=0
FAIL=0
TOTAL=0

# ── Helpers ──────────────────────────────────────────────────────────────────

green() { printf "\033[32m%s\033[0m\n" "$1"; }
red()   { printf "\033[31m%s\033[0m\n" "$1"; }
bold()  { printf "\033[1m%s\033[0m\n" "$1"; }

check() {
  local name="$1"
  local expected_code="$2"
  local actual_code="$3"
  local body="$4"
  TOTAL=$((TOTAL + 1))

  if [ "$actual_code" = "$expected_code" ]; then
    green "  ✓ $name (HTTP $actual_code)"
    PASS=$((PASS + 1))
  else
    red "  ✗ $name — expected $expected_code, got $actual_code"
    echo "    Response: ${body:0:200}"
    FAIL=$((FAIL + 1))
  fi
}

# ── Pre-flight: is the server running? ───────────────────────────────────────

bold "═══════════════════════════════════════════"
bold "  CogniLearn Backend API Tests"
bold "  Server: $BASE_URL"
bold "═══════════════════════════════════════════"
echo ""

HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health" 2>/dev/null || echo "000")
if [ "$HTTP_CODE" = "000" ]; then
  red "ERROR: Backend server is not running at $BASE_URL"
  red "Start it first: python3 -m uvicorn Backend.mindmap.app:app --port 8000"
  exit 1
fi

# ═══════════════════════════════════════════════════════════════════════════════
# 1. Health Check
# ═══════════════════════════════════════════════════════════════════════════════

bold "1. Health Check"
RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/health")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /health" "200" "$CODE" "$BODY"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# 2. Demo Profiles
# ═══════════════════════════════════════════════════════════════════════════════

bold "2. Demo Profiles"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/demo/aisha")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /demo/aisha" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/demo/marcus")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /demo/marcus" "200" "$CODE" "$BODY"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# 3. Student Dashboard Pipeline
# ═══════════════════════════════════════════════════════════════════════════════

bold "3. Student Dashboard Pipeline"
STUDENT_ID="test-student-001"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/dashboard")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/dashboard" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/diagnose")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/diagnose" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/temporal")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/temporal" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/attention")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/attention" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/knowledge-graph")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/knowledge-graph" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/report")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/report" "200" "$CODE" "$BODY"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# 4. Privacy Endpoints
# ═══════════════════════════════════════════════════════════════════════════════

bold "4. Privacy Endpoints"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/privacy")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/privacy" "200" "$CODE" "$BODY"

RESP=$(curl -s -w "\n%{http_code}" "$BASE_URL/student/$STUDENT_ID/data-export")
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "GET /student/{id}/data-export" "200" "$CODE" "$BODY"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# 5. AI Endpoints (require OpenAI key)
# ═══════════════════════════════════════════════════════════════════════════════

bold "5. AI-Powered Endpoints (require OpenAI API key)"

# Chat Tutor (Ask Mode)
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/chat/tutor" \
  -H "Content-Type: application/json" \
  -d '{"message": "What is photosynthesis?", "topic": "Biology"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /chat/tutor (Ask Mode)" "200" "$CODE" "$BODY"

# Generate Questions
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/quiz/generate-questions" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Mathematics", "num_questions": 2}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /quiz/generate-questions" "200" "$CODE" "$BODY"

# Generate from Materials
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/quiz/generate-from-materials" \
  -H "Content-Type: application/json" \
  -d '{"topic": "Physics", "materials_text": "Newtons laws of motion describe force and acceleration", "num_questions": 2}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /quiz/generate-from-materials (Practice Mode)" "200" "$CODE" "$BODY"

# Assess Answer
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/quiz/assess-answer" \
  -H "Content-Type: application/json" \
  -d '{"question": "What is F=ma?", "student_answer": "Force equals mass times acceleration", "topic": "Physics"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /quiz/assess-answer (Test Mode)" "200" "$CODE" "$BODY"

# Voice Analysis
RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/voice/analyze-understanding" \
  -H "Content-Type: application/json" \
  -d '{"transcript": "Photosynthesis is when plants use sunlight to make food from carbon dioxide and water", "topic": "Biology"}')
CODE=$(echo "$RESP" | tail -1)
BODY=$(echo "$RESP" | sed '$d')
check "POST /voice/analyze-understanding" "200" "$CODE" "$BODY"
echo ""

# ═══════════════════════════════════════════════════════════════════════════════
# Summary
# ═══════════════════════════════════════════════════════════════════════════════

bold "═══════════════════════════════════════════"
echo "  Results: $PASS passed, $FAIL failed, $TOTAL total"
if [ "$FAIL" -eq 0 ]; then
  green "  ALL TESTS PASSED ✓"
else
  red "  SOME TESTS FAILED ✗"
fi
bold "═══════════════════════════════════════════"

exit "$FAIL"
