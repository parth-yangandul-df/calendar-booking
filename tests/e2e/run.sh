#!/usr/bin/env bash
# =============================================================================
#  Calendar Booking System — End-to-End API Test Suite
#  Phase 3: Booking Engine
#
#  Usage:
#    ./run.sh                          # uses http://localhost:5000
#    BASE_URL=http://localhost:5001 ./run.sh
#
#  Requirements: curl, jq
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
API="$BASE_URL/api/v1"

# ── Colours ──────────────────────────────────────────────────────────────────
GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

# ── Temp cookie files (one per user) ─────────────────────────────────────────
COOKIE_A=$(mktemp /tmp/cookies_a_XXXXXX.txt)
COOKIE_B=$(mktemp /tmp/cookies_b_XXXXXX.txt)

# ── Cleanup on exit ──────────────────────────────────────────────────────────
cleanup() {
  rm -f "$COOKIE_A" "$COOKIE_B"
}
trap cleanup EXIT

# ── Counters ─────────────────────────────────────────────────────────────────
PASS=0
FAIL=0
CURRENT_BLOCK=""

# ── Dates ────────────────────────────────────────────────────────────────────
# BOOKING_DATE  : 2 days from now  — safely outside 24h cancel window
# BOOKING_DATE2 : 3 days from now  — used for the decline block
# NEAR_DATE     : today            — used for the within-24h cancel test
# NEAR_TIME     : current hour+1   — slot that starts in ~1h (within 24h)
# NEAR_TIME_END : current hour+2

if date --version >/dev/null 2>&1; then
  # GNU date (Linux / Git Bash on Windows)
  BOOKING_DATE=$(date -d "+2 days" +%Y-%m-%d)
  BOOKING_DATE2=$(date -d "+3 days" +%Y-%m-%d)
  NEAR_DATE=$(date +%Y-%m-%d)
  NEAR_HOUR=$(date -d "+1 hour" +%H)
  NEAR_HOUR_END=$(date -d "+2 hours" +%H)
else
  # BSD date (macOS)
  BOOKING_DATE=$(date -v+2d +%Y-%m-%d)
  BOOKING_DATE2=$(date -v+3d +%Y-%m-%d)
  NEAR_DATE=$(date +%Y-%m-%d)
  NEAR_HOUR=$(date -v+1H +%H)
  NEAR_HOUR_END=$(date -v+2H +%H)
fi

NEAR_TIME="${NEAR_HOUR}:00"
NEAR_TIME_END="${NEAR_HOUR_END}:00"
CURRENT_MONTH=$(date +%Y-%m)

# ── User credentials (unique per run to avoid conflicts on repeated runs) ────
SUFFIX=$(date +%s)
USER_A_EMAIL="owner_${SUFFIX}@test.com"
USER_B_EMAIL="booker_${SUFFIX}@test.com"
PASSWORD="Test1234!"

# ── Shared state (populated during tests) ────────────────────────────────────
USER_A_ID=""
USER_B_ID=""
BOOKING_ID=""
NEAR_BOOKING_ID=""
BOOKING2_ID=""
TOKEN_A=""   # not used for auth (cookies) but useful for debug prints

# =============================================================================
#  Helper functions
# =============================================================================

block() {
  CURRENT_BLOCK="$1"
  echo ""
  echo -e "${CYAN}${BOLD}[$CURRENT_BLOCK]${RESET}"
}

# assert_status <label> <expected_http_code> <actual_http_code>
assert_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $label"
    (( PASS++ )) || true
  else
    echo -e "  ${RED}✗ FAIL${RESET}  $label  ${YELLOW}(expected HTTP $expected, got $actual)${RESET}"
    (( FAIL++ )) || true
  fi
}

# assert_contains <label> <needle> <haystack>
assert_contains() {
  local label="$1"
  local needle="$2"
  local haystack="$3"
  if echo "$haystack" | grep -qi "$needle"; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $label"
    (( PASS++ )) || true
  else
    echo -e "  ${RED}✗ FAIL${RESET}  $label  ${YELLOW}(expected to contain \"$needle\")${RESET}"
    echo -e "           ${YELLOW}actual: $haystack${RESET}"
    (( FAIL++ )) || true
  fi
}

# assert_not_contains <label> <needle> <haystack>
assert_not_contains() {
  local label="$1"
  local needle="$2"
  local haystack="$3"
  if ! echo "$haystack" | grep -qi "$needle"; then
    echo -e "  ${GREEN}✓ PASS${RESET}  $label"
    (( PASS++ )) || true
  else
    echo -e "  ${RED}✗ FAIL${RESET}  $label  ${YELLOW}(expected NOT to contain \"$needle\")${RESET}"
    (( FAIL++ )) || true
  fi
}

# jq_val <json> <filter>  — extracts a value; returns empty string on failure
jq_val() {
  echo "$1" | jq -r "$2" 2>/dev/null || echo ""
}

# curl wrappers — always -k (dev cert), always follow redirects
# Returns: "<HTTP_STATUS>|||<BODY>"
get_a()   { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_A" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
get_b()   { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_B" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
post_a()  { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_A" --cookie-jar "$COOKIE_A" -X POST  -H "Content-Type: application/json" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
post_b()  { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_B" --cookie-jar "$COOKIE_B" -X POST  -H "Content-Type: application/json" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
post_nc() { curl -s -o /tmp/resp.txt -w "%{http_code}"                                                -X POST  -H "Content-Type: application/json" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }  # no cookies
patch_a() { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_A" --cookie-jar "$COOKIE_A" -X PATCH -H "Content-Type: application/json" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
patch_b() { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_B" --cookie-jar "$COOKIE_B" -X PATCH -H "Content-Type: application/json" "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
del_a()   { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_A" --cookie-jar "$COOKIE_A" -X DELETE "$@" ; echo "|||$(cat /tmp/resp.txt)"; }
del_b()   { curl -s -o /tmp/resp.txt -w "%{http_code}" --cookie "$COOKIE_B" --cookie-jar "$COOKIE_B" -X DELETE "$@" ; echo "|||$(cat /tmp/resp.txt)"; }

# Split "<code>|||<body>" into STATUS and BODY
parse() {
  local raw="$1"
  STATUS="${raw%%|||*}"
  BODY="${raw#*|||}"
}

# =============================================================================
#  Preflight checks
# =============================================================================

echo ""
echo -e "${BOLD}================================================${RESET}"
echo -e "${BOLD}  Calendar Booking — E2E Test Suite${RESET}"
echo -e "${BOLD}================================================${RESET}"
echo -e "  Base URL    : ${CYAN}$BASE_URL${RESET}"
echo -e "  Booking date: ${CYAN}$BOOKING_DATE${RESET}  (today+2d)"
echo -e "  Near date   : ${CYAN}$NEAR_DATE $NEAR_TIME${RESET}  (today, for 24h cancel test)"
echo -e "  User A      : ${CYAN}$USER_A_EMAIL${RESET}"
echo -e "  User B      : ${CYAN}$USER_B_EMAIL${RESET}"

if ! command -v jq &>/dev/null; then
  echo ""
  echo -e "${RED}ERROR: 'jq' is required but not installed.${RESET}"
  echo -e "  Install: https://stedolan.github.io/jq/download/"
  echo -e "  Windows (Scoop): scoop install jq"
  echo -e "  Windows (Choco): choco install jq"
  exit 1
fi

# Check server is reachable
if ! curl -s --connect-timeout 5 "$BASE_URL/api/v1/auth/login" -o /dev/null; then
  echo ""
  echo -e "${RED}ERROR: Cannot reach $BASE_URL${RESET}"
  echo -e "  Make sure the backend is running: cd src/backend/Api && dotnet run"
  exit 1
fi

# =============================================================================
#  BLOCK 1 — Auth  /api/v1/auth
# =============================================================================

block "Auth — /api/v1/auth"

# T01 — Register User A
parse "$(post_nc "$API/auth/register" -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
assert_status "Register User A" "200" "$STATUS"
assert_contains "Register User A — email in response" "$USER_A_EMAIL" "$BODY"

# T02 — Register User B
parse "$(post_nc "$API/auth/register" -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
assert_status "Register User B" "200" "$STATUS"

# T03 — Duplicate registration
parse "$(post_nc "$API/auth/register" -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
assert_status "Duplicate register returns 400" "400" "$STATUS"

# T04 — Login with wrong password
parse "$(post_nc "$API/auth/login" -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"WrongPass99!\"}")"
assert_status "Login wrong password returns 401" "401" "$STATUS"

# T05 — Login User A (saves cookies)
parse "$(post_a "$API/auth/login" -d "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\"}")"
assert_status "Login User A" "200" "$STATUS"
assert_contains "Login User A — email in response" "$USER_A_EMAIL" "$BODY"

# T06 — Login User B (saves cookies)
parse "$(post_b "$API/auth/login" -d "{\"email\":\"$USER_B_EMAIL\",\"password\":\"$PASSWORD\"}")"
assert_status "Login User B" "200" "$STATUS"

# =============================================================================
#  BLOCK 2 — Users  /api/v1/users
# =============================================================================

block "Users — /api/v1/users"

# T07 — Search without query returns 400
parse "$(get_a "$API/users?search=")"
assert_status "Search without query returns 400" "400" "$STATUS"

# T08 — Search for User A by email fragment
EMAIL_FRAGMENT="${SUFFIX}@test"
parse "$(get_a "$API/users?search=$EMAIL_FRAGMENT")"
assert_status "Search users by fragment" "200" "$STATUS"
assert_contains "Search result contains User A email" "$USER_A_EMAIL" "$BODY"

# Extract User A's ID
USER_A_ID=$(jq_val "$BODY" "[.[] | select(.email==\"$USER_A_EMAIL\")][0].id")
if [[ -z "$USER_A_ID" || "$USER_A_ID" == "null" ]]; then
  echo -e "  ${RED}✗ FATAL${RESET}  Could not extract User A ID — aborting"
  exit 1
fi
echo -e "  ${YELLOW}      User A ID: $USER_A_ID${RESET}"

# Extract User B's ID
USER_B_ID=$(jq_val "$BODY" "[.[] | select(.email==\"$USER_B_EMAIL\")][0].id")
if [[ -z "$USER_B_ID" || "$USER_B_ID" == "null" ]]; then
  echo -e "  ${RED}✗ FATAL${RESET}  Could not extract User B ID — aborting"
  exit 1
fi
echo -e "  ${YELLOW}      User B ID: $USER_B_ID${RESET}"

# T09 — Get User A by ID
parse "$(get_a "$API/users/$USER_A_ID")"
assert_status "Get User A by ID" "200" "$STATUS"
assert_contains "Get User A — correct email" "$USER_A_EMAIL" "$BODY"

# T10 — Get non-existent user returns 404
parse "$(get_a "$API/users/00000000-0000-0000-0000-000000000000")"
assert_status "Get non-existent user returns 404" "404" "$STATUS"

# =============================================================================
#  BLOCK 3 — Availability  /api/v1/availability
# =============================================================================

block "Availability — /api/v1/availability"

# T11 — Set weekly template for User A (Mon–Sun 09:00–17:00, all 7 days)
TEMPLATE_BODY=$(cat <<'EOF'
{
  "items": [
    {"dayOfWeek":"Monday",    "startTime":"09:00","endTime":"17:00"},
    {"dayOfWeek":"Tuesday",   "startTime":"09:00","endTime":"17:00"},
    {"dayOfWeek":"Wednesday", "startTime":"09:00","endTime":"17:00"},
    {"dayOfWeek":"Thursday",  "startTime":"09:00","endTime":"17:00"},
    {"dayOfWeek":"Friday",    "startTime":"09:00","endTime":"17:00"},
    {"dayOfWeek":"Saturday",  "startTime":"09:00","endTime":"17:00"},
    {"dayOfWeek":"Sunday",    "startTime":"09:00","endTime":"17:00"}
  ]
}
EOF
)
parse "$(curl -s -o /tmp/resp.txt -w "%{http_code}" \
  --cookie "$COOKIE_A" --cookie-jar "$COOKIE_A" \
  -X PUT -H "Content-Type: application/json" \
  -d "$TEMPLATE_BODY" \
  "$API/availability/template")|||$(cat /tmp/resp.txt)"
assert_status "Set weekly template for User A" "200" "$STATUS"

# T12 — Get template for User A
parse "$(get_a "$API/availability/template")"
assert_status "Get template returns 200" "200" "$STATUS"
assert_contains "Template contains Monday" "Monday" "$BODY"

# T13 — Get own calendar (current month)
parse "$(get_a "$API/availability/calendar?month=$CURRENT_MONTH")"
assert_status "Get own calendar" "200" "$STATUS"

# T14 — Get User A's calendar as User B (read-only cross-user)
parse "$(get_b "$API/availability/calendar?userId=$USER_A_ID&month=$CURRENT_MONTH")"
assert_status "Get another user's calendar" "200" "$STATUS"

# T15 — Bad month format returns 400
parse "$(get_a "$API/availability/calendar?month=June-2026")"
assert_status "Bad month format returns 400" "400" "$STATUS"
assert_contains "Bad month error message" "YYYY-MM" "$BODY"

# T16 — Get available slots on BOOKING_DATE for User A
parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=$BOOKING_DATE")"
assert_status "Get available slots" "200" "$STATUS"
assert_contains "Available slots array present" "availableSlots" "$BODY"

# T17 — Bad date format on slots endpoint
parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=2026/06/01")"
assert_status "Bad date format on slots returns 400" "400" "$STATUS"

# T18 — Non-existent owner on slots endpoint
parse "$(get_b "$API/availability/slots?ownerId=00000000-0000-0000-0000-000000000000&date=$BOOKING_DATE")"
assert_status "Non-existent owner on slots returns 404" "404" "$STATUS"

# =============================================================================
#  BLOCK 4 — Booking creation & validation  /api/v1/bookings
# =============================================================================

block "Booking creation & validation — /api/v1/bookings"

# T19 — Cannot book own calendar
parse "$(post_a "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$BOOKING_DATE\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}")"
assert_status "Cannot book own calendar returns 400" "400" "$STATUS"
assert_contains "Cannot book own calendar — correct error" "Cannot book your own calendar" "$BODY"

# T20 — Missing required field (no ownerId)
parse "$(post_b "$API/bookings" -d "{\"date\":\"$BOOKING_DATE\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}")"
assert_status "Missing ownerId returns 400" "400" "$STATUS"

# T21 — endTime before startTime
parse "$(post_b "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$BOOKING_DATE\",\"startTime\":\"11:00\",\"endTime\":\"10:00\"}")"
assert_status "endTime before startTime returns 400" "400" "$STATUS"

# T22 — Create booking (happy path) — User B books User A
parse "$(post_b "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$BOOKING_DATE\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}")"
assert_status "Create booking returns 201" "201" "$STATUS"
assert_contains "New booking has status Pending" "Pending" "$BODY"
assert_not_contains "New booking meetUrl is null" "meet.google.com" "$BODY"

BOOKING_ID=$(jq_val "$BODY" ".id")
if [[ -z "$BOOKING_ID" || "$BOOKING_ID" == "null" ]]; then
  echo -e "  ${RED}✗ FATAL${RESET}  Could not extract BOOKING_ID — aborting"
  exit 1
fi
echo -e "  ${YELLOW}      Booking ID: $BOOKING_ID${RESET}"

# T23 — Double-book same slot returns 409
parse "$(post_b "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$BOOKING_DATE\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}")"
assert_status "Double-book same slot returns 409" "409" "$STATUS"
assert_contains "Double-book error message" "already been booked" "$BODY"

# =============================================================================
#  BLOCK 5 — GET bookings  /api/v1/bookings
# =============================================================================

block "GET bookings — /api/v1/bookings"

# T24 — User B sees booking in myBookings
parse "$(get_b "$API/bookings")"
assert_status "GET bookings as User B returns 200" "200" "$STATUS"
assert_contains "User B myBookings contains booking" "$BOOKING_ID" "$BODY"

MY_BOOKING_STATUS=$(jq_val "$BODY" ".myBookings[] | select(.id==\"$BOOKING_ID\") | .status")
assert_contains "User B myBookings status is Pending" "Pending" "$MY_BOOKING_STATUS"

# T25 — User A sees booking in incoming
parse "$(get_a "$API/bookings")"
assert_status "GET bookings as User A returns 200" "200" "$STATUS"
assert_contains "User A incoming contains booking" "$BOOKING_ID" "$BODY"

INCOMING_STATUS=$(jq_val "$BODY" ".incoming[] | select(.id==\"$BOOKING_ID\") | .status")
assert_contains "User A incoming status is Pending" "Pending" "$INCOMING_STATUS"

# =============================================================================
#  BLOCK 6 — Accept booking  /api/v1/bookings/{id}/accept
# =============================================================================

block "Accept booking — PATCH /api/v1/bookings/{id}/accept"

# T26 — Booker (User B) cannot accept
parse "$(patch_b "$API/bookings/$BOOKING_ID/accept")"
assert_status "Booker cannot accept returns 403" "403" "$STATUS"

# T27 — Accept booking as owner (User A)
parse "$(patch_a "$API/bookings/$BOOKING_ID/accept")"
assert_status "Owner accepts booking returns 200" "200" "$STATUS"
assert_contains "Accepted booking status is Confirmed" "Confirmed" "$BODY"
assert_contains "Accepted booking has meetUrl" "meet.google.com/placeholder-" "$BODY"

MEET_URL=$(jq_val "$BODY" ".meetUrl")
echo -e "  ${YELLOW}      Meet URL: $MEET_URL${RESET}"

# T28 — Accept already-confirmed booking returns 400
parse "$(patch_a "$API/bookings/$BOOKING_ID/accept")"
assert_status "Accept already-confirmed returns 400" "400" "$STATUS"
assert_contains "Accept already-confirmed error" "not in Pending status" "$BODY"

# T29 — GET bookings confirms ownedConfirmed is populated for User A
parse "$(get_a "$API/bookings")"
OWNED_COUNT=$(jq_val "$BODY" ".ownedConfirmed | length")
assert_contains "ownedConfirmed has at least one entry" "1" "${OWNED_COUNT:-0}"

# =============================================================================
#  BLOCK 7 — 24h cancellation policy
# =============================================================================

block "24h cancellation policy — DELETE /api/v1/bookings/{id}"

# Create a near-future booking (today, within next hour → within 24h)
parse "$(post_b "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$NEAR_DATE\",\"startTime\":\"$NEAR_TIME\",\"endTime\":\"$NEAR_TIME_END\"}")"
if [[ "$STATUS" == "201" ]]; then
  NEAR_BOOKING_ID=$(jq_val "$BODY" ".id")
  echo -e "  ${YELLOW}      Near booking ID: $NEAR_BOOKING_ID${RESET}"

  # Accept it as User A so it's Confirmed
  parse "$(patch_a "$API/bookings/$NEAR_BOOKING_ID/accept")"

  # T30 — Cancel within 24h returns 400
  parse "$(del_b "$API/bookings/$NEAR_BOOKING_ID")"
  assert_status "Cancel within 24h returns 400" "400" "$STATUS"
  assert_contains "Cancel within 24h error message" "Cannot cancel within 24 hours" "$BODY"
else
  echo -e "  ${YELLOW}  SKIP  Near-future booking creation returned $STATUS (slot may be unavailable at $NEAR_TIME today — skipping 24h test)${RESET}"
fi

# T31 — Cancel only-Confirmed bookings (try to cancel a Pending booking)
# Create a fresh Pending booking (different slot) and immediately try DELETE
FUTURE_SLOT_START="15:00"
FUTURE_SLOT_END="16:00"
parse "$(post_b "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$BOOKING_DATE\",\"startTime\":\"$FUTURE_SLOT_START\",\"endTime\":\"$FUTURE_SLOT_END\"}")"
PENDING_BOOKING_ID=""
if [[ "$STATUS" == "201" ]]; then
  PENDING_BOOKING_ID=$(jq_val "$BODY" ".id")
  parse "$(del_b "$API/bookings/$PENDING_BOOKING_ID")"
  assert_status "Cancel Pending booking returns 400" "400" "$STATUS"
  assert_contains "Cancel Pending error message" "Only Confirmed bookings can be cancelled" "$BODY"
fi

# T32 — Cancel BOOKING_ID (outside 24h — BOOKING_DATE is today+2) as User A
parse "$(del_a "$API/bookings/$BOOKING_ID")"
assert_status "Cancel confirmed booking (outside 24h) returns 200" "200" "$STATUS"

# T33 — Cancel already-cancelled booking returns 400
parse "$(del_a "$API/bookings/$BOOKING_ID")"
assert_status "Cancel already-cancelled returns 400" "400" "$STATUS"
assert_contains "Cancel already-cancelled error" "Only Confirmed bookings can be cancelled" "$BODY"

# T34 — Slots updated after cancellation — 10:00–11:00 should be free again
parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=$BOOKING_DATE")"
assert_status "Slots endpoint still returns 200 after cancel" "200" "$STATUS"
# bookedSlots should not include a Confirmed entry for 10:00 anymore
CONFIRMED_SLOTS=$(jq_val "$BODY" ".bookedSlots[] | select(.status==\"Confirmed\") | .startTime" 2>/dev/null | tr -d '"' || echo "")
assert_not_contains "Cancelled slot removed from confirmed bookedSlots" "10:00" "${CONFIRMED_SLOTS:-none}"

# =============================================================================
#  BLOCK 8 — Decline booking
# =============================================================================

block "Decline booking — PATCH /api/v1/bookings/{id}/decline"

# Create a fresh booking for the decline tests
parse "$(post_b "$API/bookings" -d "{\"ownerId\":\"$USER_A_ID\",\"date\":\"$BOOKING_DATE2\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"}")"
assert_status "Create booking for decline test returns 201" "201" "$STATUS"
BOOKING2_ID=$(jq_val "$BODY" ".id")
echo -e "  ${YELLOW}      Booking2 ID: $BOOKING2_ID${RESET}"

# T35 — Booker cannot decline
parse "$(patch_b "$API/bookings/$BOOKING2_ID/decline")"
assert_status "Booker cannot decline returns 403" "403" "$STATUS"

# T36 — Owner declines booking
parse "$(patch_a "$API/bookings/$BOOKING2_ID/decline")"
assert_status "Owner declines booking returns 200" "200" "$STATUS"

# T37 — Decline already-declined returns 400
parse "$(patch_a "$API/bookings/$BOOKING2_ID/decline")"
assert_status "Decline already-declined returns 400" "400" "$STATUS"
assert_contains "Decline already-declined error" "not in Pending status" "$BODY"

# T38 — User B sees declined status in myBookings
parse "$(get_b "$API/bookings")"
DECLINED_STATUS=$(jq_val "$BODY" ".myBookings[] | select(.id==\"$BOOKING2_ID\") | .status")
assert_contains "myBookings reflects Declined status" "Declined" "$DECLINED_STATUS"

# =============================================================================
#  BLOCK 9 — Non-existent resource edge cases
# =============================================================================

block "Non-existent resource edge cases"

FAKE_ID="00000000-0000-0000-0000-000000000001"

# T39 — Accept non-existent booking
parse "$(patch_a "$API/bookings/$FAKE_ID/accept")"
assert_status "Accept non-existent booking returns 404" "404" "$STATUS"

# T40 — Decline non-existent booking
parse "$(patch_a "$API/bookings/$FAKE_ID/decline")"
assert_status "Decline non-existent booking returns 404" "404" "$STATUS"

# T41 — Cancel non-existent booking
parse "$(del_a "$API/bookings/$FAKE_ID")"
assert_status "Cancel non-existent booking returns 404" "404" "$STATUS"

# =============================================================================
#  BLOCK 10 — Auth lifecycle (refresh + logout)
# =============================================================================

block "Auth lifecycle — refresh & logout"

# T42 — Refresh token rotates cookies
parse "$(post_a "$API/auth/refresh")"
assert_status "Refresh token returns 200" "200" "$STATUS"
assert_contains "Refresh returns email" "$USER_A_EMAIL" "$BODY"

# T43 — Authenticated request with fresh cookies still works
parse "$(get_a "$API/bookings")"
assert_status "Authenticated request after refresh still works" "200" "$STATUS"

# T44 — Logout
parse "$(post_a "$API/auth/logout")"
assert_status "Logout returns 200" "200" "$STATUS"

# T45 — Request after logout returns 401
parse "$(get_a "$API/bookings")"
assert_status "Request after logout returns 401" "401" "$STATUS"

# =============================================================================
#  Summary
# =============================================================================

TOTAL=$(( PASS + FAIL ))
echo ""
echo -e "${BOLD}================================================${RESET}"
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  $TOTAL tests | $PASS passed | $FAIL failed${RESET}"
  echo -e "${GREEN}${BOLD}  All tests passed!${RESET}"
else
  echo -e "${BOLD}  $TOTAL tests | ${GREEN}$PASS passed${RESET}${BOLD} | ${RED}$FAIL failed${RESET}"
fi
echo -e "${BOLD}================================================${RESET}"
echo ""

[[ $FAIL -eq 0 ]]
