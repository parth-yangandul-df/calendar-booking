#!/usr/bin/env bash
# =============================================================================
#  Calendar Booking System - End-to-End API Test Suite
#
#  Usage:
#    ./run.sh
#    BASE_URL=https://localhost:5001 ./run.sh
#
#  Requirements: curl, jq
# =============================================================================

set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:5000}"
API="$BASE_URL/api/v1"

GREEN="\033[0;32m"
RED="\033[0;31m"
YELLOW="\033[1;33m"
CYAN="\033[0;36m"
BOLD="\033[1m"
RESET="\033[0m"

RESP_FILE=$(mktemp /tmp/calendar_e2e_resp_XXXXXX.txt)
COOKIE_A=$(mktemp /tmp/calendar_e2e_cookies_a_XXXXXX.txt)
COOKIE_B=$(mktemp /tmp/calendar_e2e_cookies_b_XXXXXX.txt)
COOKIE_C=$(mktemp /tmp/calendar_e2e_cookies_c_XXXXXX.txt)
COOKIE_STALE=$(mktemp /tmp/calendar_e2e_cookies_stale_XXXXXX.txt)

cleanup() {
  rm -f "$RESP_FILE" "$COOKIE_A" "$COOKIE_B" "$COOKIE_C" "$COOKIE_STALE"
}
trap cleanup EXIT

PASS=0
FAIL=0
SKIP=0
STATUS=""
BODY=""

if date --version >/dev/null 2>&1; then
  BOOKING_DATE=$(date -d "+2 days" +%Y-%m-%d)
  BOOKING_DATE2=$(date -d "+3 days" +%Y-%m-%d)
  OVERRIDE_DATE=$(date -d "+4 days" +%Y-%m-%d)
  OUTSIDE_AVAILABILITY_DATE=$(date -d "+5 days" +%Y-%m-%d)
  CURRENT_MONTH=$(date +%Y-%m)
  NEAR_START_EPOCH=$(date -d "+2 hours" +%s)
  NEAR_END_EPOCH=$(date -d "+3 hours" +%s)
  NEAR_DATE=$(date -d "@$NEAR_START_EPOCH" +%Y-%m-%d)
  NEAR_TIME=$(date -d "@$NEAR_START_EPOCH" +%H:00)
  NEAR_TIME_END=$(date -d "@$NEAR_END_EPOCH" +%H:00)
else
  BOOKING_DATE=$(date -v+2d +%Y-%m-%d)
  BOOKING_DATE2=$(date -v+3d +%Y-%m-%d)
  OVERRIDE_DATE=$(date -v+4d +%Y-%m-%d)
  OUTSIDE_AVAILABILITY_DATE=$(date -v+5d +%Y-%m-%d)
  CURRENT_MONTH=$(date +%Y-%m)
  NEAR_DATE=$(date -v+2H +%Y-%m-%d)
  NEAR_TIME=$(date -v+2H +%H:00)
  NEAR_TIME_END=$(date -v+3H +%H:00)
fi

if [[ "$NEAR_TIME_END" < "$NEAR_TIME" || "$NEAR_TIME_END" == "$NEAR_TIME" ]]; then
  NEAR_TIME="10:00"
  NEAR_TIME_END="11:00"
fi

SUFFIX=$(date +%s)
USER_A_EMAIL="owner_${SUFFIX}@test.com"
USER_B_EMAIL="booker_${SUFFIX}@test.com"
USER_C_EMAIL="observer_${SUFFIX}@test.com"
PASSWORD="Test1234!"
WEAK_PASSWORD="weakpass"

USER_A_ID=""
USER_B_ID=""
USER_C_ID=""
BOOKING_ID=""
NEAR_BOOKING_ID=""
PENDING_BOOKING_ID=""
DECLINED_BOOKING_ID=""
OVERRIDE_ID=""

block() {
  echo ""
  echo -e "${CYAN}${BOLD}[$1]${RESET}"
}

pass() {
  echo -e "  ${GREEN}✓ PASS${RESET}  $1"
  (( PASS++ )) || true
}

fail() {
  echo -e "  ${RED}✗ FAIL${RESET}  $1"
  if [[ "${2:-}" != "" ]]; then
    echo -e "           ${YELLOW}$2${RESET}"
  fi
  (( FAIL++ )) || true
}

skip() {
  echo -e "  ${YELLOW}SKIP${RESET}    $1"
  (( SKIP++ )) || true
}

assert_status() {
  local label="$1"
  local expected="$2"
  local actual="$3"
  if [[ "$actual" == "$expected" ]]; then
    pass "$label"
  else
    fail "$label" "expected HTTP $expected, got $actual; body: ${BODY:0:500}"
  fi
}

assert_contains() {
  local label="$1"
  local needle="$2"
  local haystack="$3"
  if echo "$haystack" | grep -qi "$needle"; then
    pass "$label"
  else
    fail "$label" "expected to contain \"$needle\"; actual: ${haystack:0:500}"
  fi
}

assert_jq() {
  local label="$1"
  local json="$2"
  local filter="$3"
  if echo "$json" | jq -e "$filter" >/dev/null 2>&1; then
    pass "$label"
  else
    fail "$label" "jq assertion failed: $filter; actual: ${json:0:500}"
  fi
}

jq_val() {
  echo "$1" | jq -r "$2" 2>/dev/null || echo ""
}

request() {
  local method="$1"
  local cookie_file="$2"
  local url="$3"
  local data="${4:-}"

  local args=(-sS -k -o "$RESP_FILE" -w "%{http_code}" -X "$method" -H "Content-Type: application/json")

  if [[ "$cookie_file" != "none" ]]; then
    args+=(--cookie "$cookie_file" --cookie-jar "$cookie_file")
  fi

  if [[ "$data" != "" ]]; then
    args+=(-d "$data")
  fi

  local code
  code=$(curl "${args[@]}" "$url" || true)
  printf "%s|||%s" "$code" "$(cat "$RESP_FILE")"
}

parse() {
  local raw="$1"
  STATUS="${raw%%|||*}"
  BODY="${raw#*|||}"
}

get_nc() { request GET none "$1"; }
post_nc() { request POST none "$1" "${2:-}"; }
put_nc() { request PUT none "$1" "${2:-}"; }

get_a() { request GET "$COOKIE_A" "$1"; }
post_a() { request POST "$COOKIE_A" "$1" "${2:-}"; }
put_a() { request PUT "$COOKIE_A" "$1" "${2:-}"; }
patch_a() { request PATCH "$COOKIE_A" "$1" "${2:-}"; }
delete_a() { request DELETE "$COOKIE_A" "$1"; }

get_b() { request GET "$COOKIE_B" "$1"; }
post_b() { request POST "$COOKIE_B" "$1" "${2:-}"; }
put_b() { request PUT "$COOKIE_B" "$1" "${2:-}"; }
patch_b() { request PATCH "$COOKIE_B" "$1" "${2:-}"; }
delete_b() { request DELETE "$COOKIE_B" "$1"; }

get_c() { request GET "$COOKIE_C" "$1"; }
post_c() { request POST "$COOKIE_C" "$1" "${2:-}"; }
patch_c() { request PATCH "$COOKIE_C" "$1" "${2:-}"; }
delete_c() { request DELETE "$COOKIE_C" "$1"; }

post_stale() { request POST "$COOKIE_STALE" "$1" "${2:-}"; }

register_user() {
  local email="$1"
  parse "$(post_nc "$API/auth/register" "{\"email\":\"$email\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
  assert_status "Register $email" "200" "$STATUS"
}

login_user() {
  local label="$1"
  local email="$2"
  local cookie_file="$3"
  parse "$(request POST "$cookie_file" "$API/auth/login" "{\"email\":\"$email\",\"password\":\"$PASSWORD\"}")"
  assert_status "Login $label" "200" "$STATUS"
  assert_contains "Login $label returns email" "$email" "$BODY"
}

extract_user_ids() {
  local search="$1"
  parse "$(get_a "$API/users?search=$search")"
  assert_status "Search registered users by run suffix" "200" "$STATUS"
  USER_A_ID=$(jq_val "$BODY" "[.[] | select(.email==\"$USER_A_EMAIL\")][0].id")
  USER_B_ID=$(jq_val "$BODY" "[.[] | select(.email==\"$USER_B_EMAIL\")][0].id")
  USER_C_ID=$(jq_val "$BODY" "[.[] | select(.email==\"$USER_C_EMAIL\")][0].id")

  if [[ -z "$USER_A_ID" || "$USER_A_ID" == "null" || -z "$USER_B_ID" || "$USER_B_ID" == "null" || -z "$USER_C_ID" || "$USER_C_ID" == "null" ]]; then
    echo -e "  ${RED}FATAL${RESET} Could not extract all user ids from: $BODY"
    exit 1
  fi

  echo -e "  ${YELLOW}owner id   : $USER_A_ID${RESET}"
  echo -e "  ${YELLOW}booker id  : $USER_B_ID${RESET}"
  echo -e "  ${YELLOW}observer id: $USER_C_ID${RESET}"
}

template_payload() {
  cat <<'JSON'
{
  "items": [
    {"dayOfWeek":"Monday","start":"09:00","end":"17:00"},
    {"dayOfWeek":"Tuesday","start":"09:00","end":"17:00"},
    {"dayOfWeek":"Wednesday","start":"09:00","end":"17:00"},
    {"dayOfWeek":"Thursday","start":"09:00","end":"17:00"},
    {"dayOfWeek":"Friday","start":"09:00","end":"17:00"},
    {"dayOfWeek":"Saturday","start":"09:00","end":"17:00"},
    {"dayOfWeek":"Sunday","start":"09:00","end":"17:00"}
  ]
}
JSON
}

booking_payload() {
  local owner_id="$1"
  local date="$2"
  local start_time="$3"
  local end_time="$4"
  printf '{"ownerId":"%s","date":"%s","startTime":"%s","endTime":"%s"}' "$owner_id" "$date" "$start_time" "$end_time"
}

echo ""
echo -e "${BOLD}================================================${RESET}"
echo -e "${BOLD}  Calendar Booking - E2E API Test Suite${RESET}"
echo -e "${BOLD}================================================${RESET}"
echo -e "  Base URL       : ${CYAN}$BASE_URL${RESET}"
echo -e "  Main date      : ${CYAN}$BOOKING_DATE${RESET}"
echo -e "  Override date  : ${CYAN}$OVERRIDE_DATE${RESET}"
echo -e "  Near slot      : ${CYAN}$NEAR_DATE $NEAR_TIME-$NEAR_TIME_END${RESET}"
echo -e "  Owner          : ${CYAN}$USER_A_EMAIL${RESET}"
echo -e "  Booker         : ${CYAN}$USER_B_EMAIL${RESET}"
echo -e "  Observer       : ${CYAN}$USER_C_EMAIL${RESET}"

if ! command -v jq >/dev/null 2>&1; then
  echo ""
  echo -e "${RED}ERROR: jq is required but not installed.${RESET}"
  exit 1
fi

if ! curl -sS -k --connect-timeout 5 "$API/auth/login" -o /dev/null; then
  echo ""
  echo -e "${RED}ERROR: Cannot reach $BASE_URL${RESET}"
  echo -e "  Start the backend first, for example: cd src/backend/Api && dotnet run"
  exit 1
fi

block "Auth validation and lifecycle"

parse "$(post_nc "$API/auth/register" "{\"email\":\"not-an-email\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
assert_status "Register rejects invalid email" "400" "$STATUS"
assert_contains "Invalid email validation response" "Validation Error" "$BODY"

parse "$(post_nc "$API/auth/register" "{\"email\":\"weak_${SUFFIX}@test.com\",\"password\":\"$WEAK_PASSWORD\",\"confirmPassword\":\"$WEAK_PASSWORD\"}")"
assert_status "Register rejects weak password" "400" "$STATUS"
assert_contains "Weak password validation response mentions uppercase" "uppercase" "$BODY"

parse "$(post_nc "$API/auth/register" "{\"email\":\"mismatch_${SUFFIX}@test.com\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"Different123!\"}")"
assert_status "Register rejects mismatched confirmation" "400" "$STATUS"
assert_contains "Mismatched password validation response" "Passwords do not match" "$BODY"

register_user "$USER_A_EMAIL"
register_user "$USER_B_EMAIL"
register_user "$USER_C_EMAIL"

parse "$(post_nc "$API/auth/register" "{\"email\":\"$USER_A_EMAIL\",\"password\":\"$PASSWORD\",\"confirmPassword\":\"$PASSWORD\"}")"
assert_status "Duplicate register returns 400" "400" "$STATUS"
assert_contains "Duplicate register has problem title" "Registration failed" "$BODY"

parse "$(post_nc "$API/auth/login" "{\"email\":\"not-an-email\",\"password\":\"$PASSWORD\"}")"
assert_status "Login rejects invalid email format" "400" "$STATUS"

parse "$(post_nc "$API/auth/login" "{\"email\":\"$USER_A_EMAIL\",\"password\":\"WrongPass99!\"}")"
assert_status "Login wrong password returns 401" "401" "$STATUS"

parse "$(post_nc "$API/auth/refresh")"
assert_status "Refresh without cookie returns 401" "401" "$STATUS"

parse "$(post_nc "$API/auth/logout")"
assert_status "Logout without auth returns 401" "401" "$STATUS"

login_user "User A" "$USER_A_EMAIL" "$COOKIE_A"
login_user "User B" "$USER_B_EMAIL" "$COOKIE_B"
login_user "User C" "$USER_C_EMAIL" "$COOKIE_C"

cp "$COOKIE_A" "$COOKIE_STALE"

block "Protected route boundaries"

parse "$(get_nc "$API/users?search=$SUFFIX")"
assert_status "Users search requires auth" "401" "$STATUS"

parse "$(get_nc "$API/availability/template")"
assert_status "Availability template requires auth" "401" "$STATUS"

parse "$(get_nc "$API/bookings")"
assert_status "Bookings list requires auth" "401" "$STATUS"

parse "$(put_nc "$API/availability/template" "$(template_payload)")"
assert_status "Availability template update requires auth" "401" "$STATUS"

parse "$(post_nc "$API/bookings" "$(booking_payload "00000000-0000-0000-0000-000000000000" "$BOOKING_DATE" "10:00" "11:00")")"
assert_status "Booking create requires auth" "401" "$STATUS"

block "Users API"

extract_user_ids "$SUFFIX@test"

parse "$(get_a "$API/users?search=")"
assert_status "Search with blank query returns 400" "400" "$STATUS"
assert_contains "Blank search error" "search query is required" "$BODY"

parse "$(get_a "$API/users?search=no_user_${SUFFIX}")"
assert_status "Search with no matches returns 200" "200" "$STATUS"
assert_jq "No-match search returns an empty array" "$BODY" '. == []'

parse "$(get_a "$API/users/$USER_A_ID")"
assert_status "Get user by id returns 200" "200" "$STATUS"
assert_jq "Get user by id returns expected email" "$BODY" ".email == \"$USER_A_EMAIL\""

parse "$(get_a "$API/users/not-a-real-user-id")"
assert_status "Get malformed/nonexistent user id returns 404" "404" "$STATUS"

parse "$(get_a "$API/users/00000000-0000-0000-0000-000000000000")"
assert_status "Get nonexistent GUID user returns 404" "404" "$STATUS"

block "Availability template"

parse "$(get_b "$API/availability/template")"
assert_status "New user starts with empty template" "200" "$STATUS"
assert_jq "Empty template is an array" "$BODY" 'type == "array"'

parse "$(put_a "$API/availability/template" "$(template_payload)")"
assert_status "Set full weekly template" "200" "$STATUS"

parse "$(get_a "$API/availability/template")"
assert_status "Get weekly template returns 200" "200" "$STATUS"
assert_jq "Template contains seven days" "$BODY" 'length == 7'
assert_contains "Template contains Monday" "Monday" "$BODY"

parse "$(put_a "$API/availability/template" '{"items":[{"dayOfWeek":"Monday","start":"09:00","end":"10:00"},{"dayOfWeek":"monday","start":"11:00","end":"12:00"}]}')"
assert_status "Template accepts multiple ranges per day" "200" "$STATUS"

# Re-set full template for downstream tests
parse "$(put_a "$API/availability/template" "$(template_payload)")"
assert_status "Re-set full weekly template" "200" "$STATUS"

parse "$(put_a "$API/availability/template" '{"items":[{"dayOfWeek":"Funday","start":"09:00","end":"10:00"}]}')"
assert_status "Template rejects invalid day name" "400" "$STATUS"
assert_contains "Invalid day validation response" "valid day name" "$BODY"

parse "$(put_a "$API/availability/template" '{"items":[{"dayOfWeek":"Tuesday","start":"9:00","end":"10:00"}]}')"
assert_status "Template rejects non-HH:mm start time" "400" "$STATUS"
assert_contains "Invalid template time validation response" "HH:mm" "$BODY"

parse "$(put_a "$API/availability/template" '{"items":[{"dayOfWeek":"Wednesday","start":"11:00","end":"10:00"}]}')"
assert_status "Template rejects end before start" "400" "$STATUS"
assert_contains "Template ordering validation response" "Start time must be before End time" "$BODY"

parse "$(put_b "$API/availability/template" '{"items":[]}' )"
assert_status "Template accepts empty items to clear availability" "200" "$STATUS"

block "Availability calendar and overrides"

parse "$(get_a "$API/availability/calendar?month=$CURRENT_MONTH")"
assert_status "Get own calendar returns 200" "200" "$STATUS"
assert_jq "Calendar returns days for the month" "$BODY" 'length >= 28 and length <= 31'

parse "$(get_b "$API/availability/calendar?userId=$USER_A_ID&month=$CURRENT_MONTH")"
assert_status "Get another user's calendar returns 200" "200" "$STATUS"
assert_jq "Cross-user calendar returns days" "$BODY" 'length >= 28 and length <= 31'

parse "$(get_a "$API/availability/calendar?month=June-2026")"
assert_status "Calendar rejects bad month format" "400" "$STATUS"
assert_contains "Bad month response mentions format" "YYYY-MM" "$BODY"

parse "$(get_a "$API/availability/calendar?month=2026-13")"
assert_status "Calendar with impossible month currently returns empty 200" "200" "$STATUS"
assert_jq "Impossible month is represented as empty list" "$BODY" '. == []'

parse "$(get_a "$API/availability/calendar?userId=00000000-0000-0000-0000-000000000000&month=$CURRENT_MONTH")"
assert_status "Calendar rejects nonexistent target user" "404" "$STATUS"

parse "$(get_a "$API/availability/overrides?from=$OVERRIDE_DATE&to=$OVERRIDE_DATE")"
assert_status "Get empty overrides returns 200" "200" "$STATUS"
assert_jq "Empty overrides returns an array" "$BODY" 'type == "array"'

parse "$(get_a "$API/availability/overrides?from=2026/01/01&to=$OVERRIDE_DATE")"
assert_status "Overrides rejects bad from date" "400" "$STATUS"
assert_contains "Bad from response" "from must be" "$BODY"

parse "$(get_a "$API/availability/overrides?from=$OVERRIDE_DATE&to=2026/01/01")"
assert_status "Overrides rejects bad to date" "400" "$STATUS"
assert_contains "Bad to response" "to must be" "$BODY"

parse "$(post_a "$API/availability/overrides" "{\"date\":\"$OVERRIDE_DATE\",\"items\":[{\"start\":\"08:00\",\"end\":\"09:00\"},{\"start\":\"13:00\",\"end\":\"18:00\"}]}")"
assert_status "Set override with two ranges returns 200" "200" "$STATUS"

parse "$(get_a "$API/availability/overrides?from=$OVERRIDE_DATE&to=$OVERRIDE_DATE")"
assert_status "Get override date returns 200" "200" "$STATUS"
assert_jq "Override response has two ranges" "$BODY" 'length == 2'
OVERRIDE_ID=$(jq_val "$BODY" '.[0].id')
if [[ -z "$OVERRIDE_ID" || "$OVERRIDE_ID" == "null" ]]; then
  echo -e "  ${RED}FATAL${RESET} Could not extract override id from: $BODY"
  exit 1
fi

parse "$(get_b "$API/availability/calendar?userId=$USER_A_ID&month=${OVERRIDE_DATE:0:7}")"
assert_status "Calendar exposes override to other users" "200" "$STATUS"
assert_jq "Calendar marks override day" "$BODY" ".[] | select(.date == \"$OVERRIDE_DATE\") | .isOverride == true"
assert_jq "Calendar override day has two ranges" "$BODY" ".[] | select(.date == \"$OVERRIDE_DATE\") | .ranges | length == 2"

parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=$OVERRIDE_DATE")"
assert_status "Slots use override windows" "200" "$STATUS"
assert_jq "Slots include override morning range" "$BODY" '.availableSlots[] | select(.start == "08:00" and .end == "09:00")'

parse "$(post_a "$API/availability/overrides" "{\"date\":\"$OVERRIDE_DATE\",\"items\":[{\"start\":\"08:00\",\"end\":\"10:00\"},{\"start\":\"09:30\",\"end\":\"11:00\"}]}")"
assert_status "Override rejects overlapping ranges" "400" "$STATUS"
assert_contains "Overlap validation response" "must not overlap" "$BODY"

parse "$(post_a "$API/availability/overrides" '{"date":"2026/01/01","items":[{"start":"08:00","end":"09:00"}]}')"
assert_status "Override rejects bad date format" "400" "$STATUS"

parse "$(post_a "$API/availability/overrides" "{\"date\":\"$OVERRIDE_DATE\",\"items\":[{\"start\":\"11:00\",\"end\":\"10:00\"}]}")"
assert_status "Override rejects end before start" "400" "$STATUS"

parse "$(delete_a "$API/availability/overrides?date=2026/01/01&overrideId=$OVERRIDE_ID")"
assert_status "Delete override rejects bad date format" "400" "$STATUS"

parse "$(delete_b "$API/availability/overrides?date=$OVERRIDE_DATE&overrideId=$OVERRIDE_ID")"
assert_status "Another user deleting someone else's override is idempotent 200" "200" "$STATUS"

parse "$(delete_a "$API/availability/overrides?date=$OVERRIDE_DATE&overrideId=$OVERRIDE_ID")"
assert_status "Delete own override returns 200" "200" "$STATUS"

parse "$(get_a "$API/availability/overrides?from=$OVERRIDE_DATE&to=$OVERRIDE_DATE")"
assert_status "Get overrides after delete returns 200" "200" "$STATUS"
assert_jq "Deleted override no longer appears" "$BODY" 'length == 1'

parse "$(post_a "$API/availability/overrides" "{\"date\":\"$OVERRIDE_DATE\",\"items\":[]}")"
assert_status "Posting empty override list clears override day" "200" "$STATUS"

parse "$(get_a "$API/availability/overrides?from=$OVERRIDE_DATE&to=$OVERRIDE_DATE")"
assert_status "Get overrides after clearing returns 200" "200" "$STATUS"
assert_jq "Override day is cleared" "$BODY" 'length == 0'

block "Availability slots"

parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=$BOOKING_DATE")"
assert_status "Get available slots for templated day returns 200" "200" "$STATUS"
assert_jq "Slots response has availableSlots and bookedSlots arrays" "$BODY" '(.availableSlots | type) == "array" and (.bookedSlots | type) == "array"'
assert_jq "Initial slots contain 09:00-17:00 window" "$BODY" '.availableSlots[] | select(.start == "09:00" and .end == "17:00")'

parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=2026/06/01")"
assert_status "Slots rejects bad date format" "400" "$STATUS"

parse "$(get_b "$API/availability/slots?ownerId=00000000-0000-0000-0000-000000000000&date=$BOOKING_DATE")"
assert_status "Slots rejects nonexistent owner" "404" "$STATUS"

parse "$(get_b "$API/availability/slots?ownerId=&date=$BOOKING_DATE")"
assert_status "Slots rejects blank owner through model binding" "400" "$STATUS"

block "Booking creation and validation"

parse "$(post_a "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE" "10:00" "11:00")")"
assert_status "Cannot book own calendar" "400" "$STATUS"
assert_contains "Self-booking error response" "Cannot book your own calendar" "$BODY"

parse "$(post_b "$API/bookings" "{\"date\":\"$BOOKING_DATE\",\"startTime\":\"10:00\",\"endTime\":\"11:00\"}")"
assert_status "Booking rejects missing ownerId" "400" "$STATUS"

parse "$(post_b "$API/bookings" "$(booking_payload "00000000-0000-0000-0000-000000000000" "$BOOKING_DATE" "10:00" "11:00")")"
assert_status "Booking rejects nonexistent owner" "404" "$STATUS"
assert_contains "Nonexistent owner response" "Calendar owner not found" "$BODY"

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "2026/01/01" "10:00" "11:00")")"
assert_status "Booking rejects bad date format" "400" "$STATUS"

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE" "10:00 AM" "11:00")")"
assert_status "Booking rejects bad start time format" "400" "$STATUS"

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE" "11:00" "10:00")")"
assert_status "Booking rejects end before start" "400" "$STATUS"
assert_contains "Booking time ordering response" "StartTime must be before EndTime" "$BODY"

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE" "10:00" "11:00")")"
assert_status "Create booking returns 201" "201" "$STATUS"
assert_jq "Created booking is pending with null meetUrl" "$BODY" '.status == "Pending" and .meetUrl == null'
assert_jq "Created booking has owner and booker emails" "$BODY" ".ownerEmail == \"$USER_A_EMAIL\" and .bookerEmail == \"$USER_B_EMAIL\""
BOOKING_ID=$(jq_val "$BODY" ".id")
if [[ -z "$BOOKING_ID" || "$BOOKING_ID" == "null" ]]; then
  echo -e "  ${RED}FATAL${RESET} Could not extract booking id from: $BODY"
  exit 1
fi
echo -e "  ${YELLOW}booking id: $BOOKING_ID${RESET}"

parse "$(post_c "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE" "10:30" "11:30")")"
assert_status "Overlapping pending booking returns 409" "409" "$STATUS"
assert_contains "Overlap conflict response" "already been booked" "$BODY"

parse "$(post_c "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE" "11:00" "12:00")")"
assert_status "Adjacent non-overlapping booking is allowed" "201" "$STATUS"
PENDING_BOOKING_ID=$(jq_val "$BODY" ".id")

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$OUTSIDE_AVAILABILITY_DATE" "02:00" "03:00")")"
assert_status "Current behavior: booking outside availability is accepted" "201" "$STATUS"
assert_jq "Outside-availability booking is pending" "$BODY" '.status == "Pending"'

block "Booking list projections"

parse "$(get_b "$API/bookings")"
assert_status "Booker can list bookings" "200" "$STATUS"
assert_jq "Booker sees booking in myBookings" "$BODY" ".myBookings[] | select(.id == \"$BOOKING_ID\" and .status == \"Pending\")"
assert_jq "Booker has no incoming bookings for this owner-owned booking" "$BODY" '[.incoming[] | select(.id == "'$BOOKING_ID'")] | length == 0'

parse "$(get_a "$API/bookings")"
assert_status "Owner can list bookings" "200" "$STATUS"
assert_jq "Owner sees pending booking in incoming" "$BODY" ".incoming[] | select(.id == \"$BOOKING_ID\" and .status == \"Pending\")"
assert_jq "Owner confirmed list is empty before accept" "$BODY" '[.ownedConfirmed[] | select(.id == "'$BOOKING_ID'")] | length == 0'

block "Accept and decline permissions"

parse "$(patch_b "$API/bookings/$BOOKING_ID/accept")"
assert_status "Booker cannot accept own request" "403" "$STATUS"

parse "$(patch_c "$API/bookings/$BOOKING_ID/accept")"
assert_status "Unrelated user cannot accept booking" "403" "$STATUS"

parse "$(patch_a "$API/bookings/$BOOKING_ID/accept")"
assert_status "Owner accepts booking" "200" "$STATUS"
assert_jq "Accepted booking is confirmed with placeholder Meet URL" "$BODY" '.status == "Confirmed" and (.meetUrl | startswith("https://meet.google.com/placeholder-"))'

parse "$(patch_a "$API/bookings/$BOOKING_ID/accept")"
assert_status "Accept already-confirmed booking returns 400" "400" "$STATUS"
assert_contains "Accept non-pending response" "not in Pending status" "$BODY"

parse "$(patch_b "$API/bookings/$BOOKING_ID/decline")"
assert_status "Booker cannot decline booking" "403" "$STATUS"

parse "$(patch_a "$API/bookings/$BOOKING_ID/decline")"
assert_status "Decline confirmed booking returns 400" "400" "$STATUS"

parse "$(get_a "$API/bookings")"
assert_status "Owner list after accept returns 200" "200" "$STATUS"
assert_jq "Confirmed booking appears in ownedConfirmed" "$BODY" ".ownedConfirmed[] | select(.id == \"$BOOKING_ID\" and .status == \"Confirmed\")"
assert_jq "Confirmed booking leaves incoming list" "$BODY" '[.incoming[] | select(.id == "'$BOOKING_ID'")] | length == 0'

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE2" "14:00" "15:00")")"
assert_status "Create booking for decline returns 201" "201" "$STATUS"
DECLINED_BOOKING_ID=$(jq_val "$BODY" ".id")

parse "$(patch_c "$API/bookings/$DECLINED_BOOKING_ID/decline")"
assert_status "Unrelated user cannot decline booking" "403" "$STATUS"

parse "$(patch_a "$API/bookings/$DECLINED_BOOKING_ID/decline")"
assert_status "Owner declines pending booking" "200" "$STATUS"

parse "$(patch_a "$API/bookings/$DECLINED_BOOKING_ID/decline")"
assert_status "Decline already-declined booking returns 400" "400" "$STATUS"

parse "$(get_b "$API/bookings")"
assert_status "Booker list after decline returns 200" "200" "$STATUS"
assert_jq "Declined bookings are omitted from myBookings by current repository filter" "$BODY" '[.myBookings[] | select(.id == "'$DECLINED_BOOKING_ID'")] | length == 0'

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$BOOKING_DATE2" "14:00" "15:00")")"
assert_status "Declined slot can be rebooked" "201" "$STATUS"

block "Booking cancellation policy"

if [[ -n "$PENDING_BOOKING_ID" && "$PENDING_BOOKING_ID" != "null" ]]; then
  parse "$(delete_c "$API/bookings/$PENDING_BOOKING_ID")"
  assert_status "Cannot cancel pending booking" "400" "$STATUS"
  assert_contains "Cancel pending response" "Only Confirmed bookings can be cancelled" "$BODY"
else
  skip "Pending booking id unavailable; cannot test pending cancellation"
fi

parse "$(delete_c "$API/bookings/$BOOKING_ID")"
assert_status "Unrelated user cannot cancel confirmed booking" "403" "$STATUS"

parse "$(post_b "$API/bookings" "$(booking_payload "$USER_A_ID" "$NEAR_DATE" "$NEAR_TIME" "$NEAR_TIME_END")")"
if [[ "$STATUS" == "201" ]]; then
  NEAR_BOOKING_ID=$(jq_val "$BODY" ".id")
  parse "$(patch_a "$API/bookings/$NEAR_BOOKING_ID/accept")"
  assert_status "Owner accepts near-future booking" "200" "$STATUS"

  parse "$(delete_b "$API/bookings/$NEAR_BOOKING_ID")"
  assert_status "Cannot cancel within 24 hours" "400" "$STATUS"
  assert_contains "24h cancellation response" "Cannot cancel within 24 hours" "$BODY"
else
  skip "Near-future booking could not be created (HTTP $STATUS); 24h policy path skipped"
fi

parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=$BOOKING_DATE")"
assert_status "Slots after confirmation return 200" "200" "$STATUS"
assert_jq "Confirmed booking appears as booked slot" "$BODY" ".bookedSlots[] | select(.startTime == \"10:00\" and .endTime == \"11:00\" and .status == \"Confirmed\")"

parse "$(delete_b "$API/bookings/$BOOKING_ID")"
assert_status "Booker cancels confirmed booking outside 24h" "200" "$STATUS"

parse "$(delete_a "$API/bookings/$BOOKING_ID")"
assert_status "Cannot cancel already-cancelled booking" "400" "$STATUS"
assert_contains "Cancel already-cancelled response" "Only Confirmed bookings can be cancelled" "$BODY"

parse "$(get_b "$API/availability/slots?ownerId=$USER_A_ID&date=$BOOKING_DATE")"
assert_status "Slots after cancellation return 200" "200" "$STATUS"
assert_jq "Cancelled 10:00-11:00 slot is covered by a free range before adjacent pending slot" "$BODY" '.availableSlots[] | select(.start <= "10:00" and .end >= "11:00")'
assert_jq "Cancelled booking is not returned in bookedSlots" "$BODY" '[.bookedSlots[] | select(.startTime == "10:00" and .endTime == "11:00" and .status == "Cancelled")] | length == 0'

block "Nonexistent and malformed booking resources"

FAKE_ID="00000000-0000-0000-0000-000000000001"

parse "$(patch_a "$API/bookings/$FAKE_ID/accept")"
assert_status "Accept nonexistent booking returns 404" "404" "$STATUS"

parse "$(patch_a "$API/bookings/$FAKE_ID/decline")"
assert_status "Decline nonexistent booking returns 404" "404" "$STATUS"

parse "$(delete_a "$API/bookings/$FAKE_ID")"
assert_status "Cancel nonexistent booking returns 404" "404" "$STATUS"

parse "$(patch_a "$API/bookings/not-a-guid/accept")"
assert_status "Accept malformed booking id returns 404 route miss" "404" "$STATUS"

parse "$(delete_a "$API/bookings/not-a-guid")"
assert_status "Cancel malformed booking id returns 404 route miss" "404" "$STATUS"

block "Auth refresh, token rotation, and logout"

parse "$(post_a "$API/auth/refresh")"
assert_status "Refresh with cookie returns 200" "200" "$STATUS"
assert_contains "Refresh returns current user email" "$USER_A_EMAIL" "$BODY"

parse "$(post_stale "$API/auth/refresh")"
assert_status "Old refresh token cannot be reused after rotation" "401" "$STATUS"

parse "$(get_a "$API/bookings")"
assert_status "Authenticated request still works after refresh" "200" "$STATUS"

parse "$(post_a "$API/auth/logout")"
assert_status "Logout returns 200" "200" "$STATUS"

parse "$(get_a "$API/bookings")"
assert_status "Request after logout returns 401" "401" "$STATUS"

parse "$(post_a "$API/auth/refresh")"
assert_status "Refresh after logout returns 401" "401" "$STATUS"

TOTAL=$(( PASS + FAIL ))
echo ""
echo -e "${BOLD}================================================${RESET}"
if [[ $FAIL -eq 0 ]]; then
  echo -e "${GREEN}${BOLD}  $TOTAL assertions | $PASS passed | $FAIL failed | $SKIP skipped${RESET}"
  echo -e "${GREEN}${BOLD}  All e2e assertions passed.${RESET}"
else
  echo -e "${BOLD}  $TOTAL assertions | ${GREEN}$PASS passed${RESET}${BOLD} | ${RED}$FAIL failed${RESET}${BOLD} | ${YELLOW}$SKIP skipped${RESET}"
fi
echo -e "${BOLD}================================================${RESET}"
echo ""

[[ $FAIL -eq 0 ]]
