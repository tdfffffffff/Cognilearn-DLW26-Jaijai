#!/usr/bin/env python3
"""
CogniLearn — Backend API Test Suite (Python)

Runs automated tests against all major backend API endpoints.
Uses only the standard library (urllib) so no extra installs needed.

Usage:
    python3 testbench/test_backend.py

Prerequisites:
    Backend running at http://localhost:8000
    Start it with:  python3 -m uvicorn Backend.mindmap.app:app --port 8000
"""

import json
import sys
import urllib.request
import urllib.error
import urllib.parse
from typing import Optional

BASE_URL = "http://localhost:8000"
PASS = 0
FAIL = 0
SKIP = 0

# ── Colours ──────────────────────────────────────────────────────────────────

GREEN = "\033[32m"
RED = "\033[31m"
YELLOW = "\033[33m"
BOLD = "\033[1m"
RESET = "\033[0m"


def ok(name: str, detail: str = ""):
    global PASS
    PASS += 1
    extra = f"  {detail}" if detail else ""
    print(f"  {GREEN}✓{RESET} {name}{extra}")


def fail(name: str, reason: str):
    global FAIL
    FAIL += 1
    print(f"  {RED}✗{RESET} {name} — {reason}")


def skip(name: str, reason: str):
    global SKIP
    SKIP += 1
    print(f"  {YELLOW}⊘{RESET} {name} — skipped ({reason})")


# ── HTTP helpers ─────────────────────────────────────────────────────────────

def get(path: str) -> tuple[int, dict | str]:
    """GET request. Returns (status_code, parsed_body)."""
    url = f"{BASE_URL}{path}"
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = resp.read().decode()
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body
    except urllib.error.URLError as e:
        return 0, str(e.reason)


def post(path: str, data: dict) -> tuple[int, dict | str]:
    """POST JSON request. Returns (status_code, parsed_body)."""
    url = f"{BASE_URL}{path}"
    payload = json.dumps(data).encode("utf-8")
    req = urllib.request.Request(
        url, data=payload, headers={"Content-Type": "application/json"}, method="POST"
    )
    try:
        with urllib.request.urlopen(req, timeout=60) as resp:
            body = resp.read().decode()
            try:
                return resp.status, json.loads(body)
            except json.JSONDecodeError:
                return resp.status, body
    except urllib.error.HTTPError as e:
        body = e.read().decode() if e.fp else ""
        try:
            return e.code, json.loads(body)
        except json.JSONDecodeError:
            return e.code, body
    except urllib.error.URLError as e:
        return 0, str(e.reason)


# ── Test Sections ────────────────────────────────────────────────────────────

def test_health():
    print(f"\n{BOLD}1. Health Check{RESET}")
    code, body = get("/health")
    if code == 200:
        ok("GET /health", f"status={body.get('status', '?')}" if isinstance(body, dict) else "")
    else:
        fail("GET /health", f"HTTP {code}")


def test_demo_profiles():
    print(f"\n{BOLD}2. Demo Profiles{RESET}")
    for name in ["aisha", "marcus"]:
        code, body = get(f"/demo/{name}")
        if code == 200:
            ok(f"GET /demo/{name}")
        else:
            fail(f"GET /demo/{name}", f"HTTP {code}")


def test_student_dashboard():
    print(f"\n{BOLD}3. Student Dashboard Pipeline{RESET}")
    student_id = "test-student-001"
    endpoints = [
        "dashboard",
        "diagnose",
        "temporal",
        "attention",
        "knowledge-graph",
        "report",
    ]
    for ep in endpoints:
        code, body = get(f"/student/{student_id}/{ep}")
        if code == 200:
            ok(f"GET /student/{{id}}/{ep}")
        else:
            fail(f"GET /student/{{id}}/{ep}", f"HTTP {code}: {str(body)[:120]}")


def test_privacy():
    print(f"\n{BOLD}4. Privacy Endpoints{RESET}")
    student_id = "test-student-001"
    for ep in ["privacy", "data-export"]:
        code, body = get(f"/student/{student_id}/{ep}")
        if code == 200:
            ok(f"GET /student/{{id}}/{ep}")
        else:
            fail(f"GET /student/{{id}}/{ep}", f"HTTP {code}")


def test_ai_chat():
    print(f"\n{BOLD}5. AI Endpoints (require OpenAI API key){RESET}")

    # Ask Mode
    code, body = post("/chat/tutor", {"message": "What is photosynthesis?", "topic": "Biology"})
    if code == 200:
        ok("POST /chat/tutor (Ask Mode)")
    elif code == 500 and "openai" in str(body).lower():
        skip("POST /chat/tutor", "OpenAI key not configured")
    else:
        fail("POST /chat/tutor", f"HTTP {code}: {str(body)[:120]}")


def test_quiz_generate_questions():
    code, body = post("/quiz/generate-questions", {"topic": "Mathematics", "num_questions": 2})
    if code == 200:
        ok("POST /quiz/generate-questions")
    elif code == 500 and "openai" in str(body).lower():
        skip("POST /quiz/generate-questions", "OpenAI key not configured")
    else:
        fail("POST /quiz/generate-questions", f"HTTP {code}: {str(body)[:120]}")


def test_quiz_generate_from_materials():
    code, body = post(
        "/quiz/generate-from-materials",
        {
            "topic": "Physics",
            "materials_text": "Newtons laws of motion describe force and acceleration.",
            "num_questions": 2,
        },
    )
    if code == 200:
        ok("POST /quiz/generate-from-materials (Practice Mode)")
    elif code == 500 and "openai" in str(body).lower():
        skip("POST /quiz/generate-from-materials", "OpenAI key not configured")
    else:
        fail("POST /quiz/generate-from-materials", f"HTTP {code}: {str(body)[:120]}")


def test_quiz_assess_answer():
    code, body = post(
        "/quiz/assess-answer",
        {
            "question": "What is F=ma?",
            "student_answer": "Force equals mass times acceleration",
            "topic": "Physics",
        },
    )
    if code == 200:
        ok("POST /quiz/assess-answer (Test Mode)")
    elif code == 500 and "openai" in str(body).lower():
        skip("POST /quiz/assess-answer", "OpenAI key not configured")
    else:
        fail("POST /quiz/assess-answer", f"HTTP {code}: {str(body)[:120]}")


def test_voice_analysis():
    code, body = post(
        "/voice/analyze-understanding",
        {
            "transcript": "Photosynthesis is when plants use sunlight to make food",
            "topic": "Biology",
        },
    )
    if code == 200:
        ok("POST /voice/analyze-understanding")
    elif code == 500 and "openai" in str(body).lower():
        skip("POST /voice/analyze-understanding", "OpenAI key not configured")
    else:
        fail("POST /voice/analyze-understanding", f"HTTP {code}: {str(body)[:120]}")


# ── Main ─────────────────────────────────────────────────────────────────────

def main():
    print(f"{BOLD}{'═' * 50}")
    print(f"  CogniLearn Backend API Tests (Python)")
    print(f"  Server: {BASE_URL}")
    print(f"{'═' * 50}{RESET}")

    # Pre-flight
    code, _ = get("/health")
    if code == 0:
        print(f"\n{RED}ERROR: Backend server is not running at {BASE_URL}{RESET}")
        print(f"Start it first:")
        print(f"  python3 -m uvicorn Backend.mindmap.app:app --port 8000")
        sys.exit(1)

    test_health()
    test_demo_profiles()
    test_student_dashboard()
    test_privacy()
    test_ai_chat()
    test_quiz_generate_questions()
    test_quiz_generate_from_materials()
    test_quiz_assess_answer()
    test_voice_analysis()

    total = PASS + FAIL + SKIP
    print(f"\n{BOLD}{'═' * 50}")
    print(f"  Results: {GREEN}{PASS} passed{RESET}, {RED}{FAIL} failed{RESET}, {YELLOW}{SKIP} skipped{RESET}, {total} total")
    if FAIL == 0:
        print(f"  {GREEN}ALL TESTS PASSED ✓{RESET}")
    else:
        print(f"  {RED}SOME TESTS FAILED ✗{RESET}")
    print(f"{BOLD}{'═' * 50}{RESET}")

    sys.exit(FAIL)


if __name__ == "__main__":
    main()
