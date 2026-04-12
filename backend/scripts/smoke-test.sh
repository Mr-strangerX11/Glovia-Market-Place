#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3001/api/v1}"

function ensure_api_available() {
  local health_url="$BASE_URL/health"
  local status
  status=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 3 --max-time 5 "$health_url" || true)

  if [[ "$status" == "000" ]]; then
    echo "API unavailable at $BASE_URL"
    echo "Start backend first (example: npm run start:dev) or set BASE_URL to a running API."
    exit 1
  fi
}

function check() {
  local name="$1"
  local url="$2"
  local header="${3:-}"
  local code
  if [[ -n "$header" ]]; then
    code=$(curl -s -o /dev/null -w "%{http_code}" -H "$header" "$url")
  else
    code=$(curl -s -o /dev/null -w "%{http_code}" "$url")
  fi
  echo "$name:$code"
}

echo "Smoke test base: $BASE_URL"
ensure_api_available
check "products" "$BASE_URL/products"
check "categories" "$BASE_URL/categories"
check "brands" "$BASE_URL/brands"

if [[ -n "${TOKEN:-}" ]]; then
  echo "Auth smoke: using TOKEN env"
  check "profile" "$BASE_URL/users/profile" "Authorization: Bearer $TOKEN"
  check "cart" "$BASE_URL/cart" "Authorization: Bearer $TOKEN"
else
  echo "Auth smoke: skipped (set TOKEN env)"
fi
