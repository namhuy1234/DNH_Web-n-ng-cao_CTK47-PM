#!/usr/bin/env bash
# Chay thu Lab 6 nhu tren mot may moi: Docker -> API (tu tao database culinaryblog_lab6 va du lieu mau)
# -> frontend -> goi thu cac dia chi chinh. CI tren GitHub chay script nay tren may Ubuntu sach.
# Chay tren may: bash scripts/smoke-test.sh   (Windows dung Git Bash; can tat chuong trinh dang dung cong 5000/3000).
set -uo pipefail
cd "$(dirname "$0")/.."
TMP=$(mktemp -d)
API_PID=""; WEB_PID=""
FAILED=0

ok()   { echo "[DAT] $1"; }
fail() { echo "[LOI] $1"; FAILED=1; }
stop() {
  for pid in $WEB_PID $API_PID; do
    # Tren Git Bash (Windows) phai dung ca cay tien trinh, kill thuong de lai CulinaryBlog.API.exe.
    if [ -r "/proc/$pid/winpid" ]; then taskkill //F //T //PID "$(cat /proc/$pid/winpid)" >/dev/null 2>&1; fi
    kill "$pid" 2>/dev/null || true
  done
}
trap stop EXIT
wait_url() { for _ in $(seq 1 "$2"); do curl -s -o /dev/null "$1" && return 0; sleep 2; done; return 1; }
check_api() {
  local code; code=$(curl -s -o "$TMP/body" -w '%{http_code}' "http://localhost:5000$1")
  [ "$code" = 200 ] && grep -q "$2" "$TMP/body" && ok "API $1" || fail "API $1 ($code)"
}
check_web() {
  local code; code=$(curl -s -o "$TMP/page" -w '%{http_code}' "http://localhost:3000$1")
  [ "$code" = 200 ] && grep -qi "culinary" "$TMP/page" && ok "Trang $1" || fail "Trang $1 ($code)"
}

echo "== Docker"
docker compose up -d --wait || { echo "[LOI] docker compose up that bai"; exit 1; }
ok "PostgreSQL san sang"

echo "== Backend"
ASPNETCORE_ENVIRONMENT=Development dotnet run --project src/CulinaryBlog.API --urls http://localhost:5000 > "$TMP/api.log" 2>&1 &
API_PID=$!
wait_url http://localhost:5000/ 150 || { cat "$TMP/api.log"; echo "[LOI] API khong chay"; exit 1; }
ok "API chay, tu tao database culinaryblog_lab6"
check_api "/" "running"
check_api "/api/v1/categories" "slug"
check_api "/api/v1/recipes" "slug"
check_api "/health" "Healthy"
count=$(docker exec culinary-postgres psql -U culinary -d culinaryblog_lab6 -tAc 'select count(*) from "Recipes"' | tr -d '[:space:]')
[ "${count:-0}" -gt 0 ] && ok "Du lieu mau: $count cong thuc" || fail "Khong co du lieu mau"

code=$(curl -s -o "$TMP/login" -w '%{http_code}' -X POST http://localhost:5000/api/v1/auth/login \
  -H 'Content-Type: application/json' -d '{"email":"admin@culinaryblog.local","password":"Dev@Culinary123"}')
[ "$code" = 200 ] && grep -q accessToken "$TMP/login" && ok "Dang nhap tai khoan mau admin" || fail "Dang nhap admin ($code)"

echo "== Frontend"
cd frontend
[ -f .env.local ] || cp .env.example .env.local
npm ci --no-audit --no-fund
npm run build
npm start > "$TMP/web.log" 2>&1 &
WEB_PID=$!
cd ..
wait_url http://localhost:3000/ 120 || { cat "$TMP/web.log"; fail "Frontend khong chay"; }
check_web "/"
check_web "/recipes"
check_web "/categories"
check_web "/login"

echo
if [ "$FAILED" = 0 ]; then echo "KET QUA: Lab 6 chay duoc tren may moi"; else echo "KET QUA: CO LOI"; exit 1; fi
