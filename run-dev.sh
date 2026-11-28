#!/usr/bin/env bash
# Culinary Blog - Lab 6: chay toan bo chuong trinh tren macOS hoac Linux.
# Can cai: Docker, .NET SDK 10, Node.js 20.9+.
# Cach dung:  bash run-dev.sh        (chay)
#             bash run-dev.sh check  (chi kiem tra may)
# May da cai PostgreSQL o cong 5432:  POSTGRES_PORT=5433 bash run-dev.sh
set -euo pipefail
cd "$(dirname "$0")"
DB_NAME="culinaryblog_lab6"
export POSTGRES_PORT="${POSTGRES_PORT:-5432}"

need() { command -v "$1" >/dev/null 2>&1 || { echo "[LOI] Chua cai $2"; exit 1; }; }
need docker "Docker (https://www.docker.com/products/docker-desktop)"
need dotnet ".NET SDK 10 (https://dotnet.microsoft.com/download)"
dotnet --list-sdks | grep -q '^10\.' || { echo "[LOI] Can .NET SDK 10.x"; dotnet --list-sdks; exit 1; }
need node "Node.js 20.9+ (https://nodejs.org)"
if [ "$(node -p 'process.versions.node.split(".")[0]')" -lt 20 ]; then
  echo "[LOI] Can Node.js 20.9 tro len, may nay dang co $(node -v)"; exit 1
fi
docker info >/dev/null 2>&1 || { echo "[LOI] Docker chua chay"; exit 1; }
echo "[OK] May da du phan mem can thiet."
[ "${1:-}" = "check" ] && exit 0

echo "[1/3] Khoi dong PostgreSQL (cong $POSTGRES_PORT)..."
docker compose up -d --wait || {
  echo "[LOI] Neu bao 'port is already allocated': chay lai voi POSTGRES_PORT=5433 bash run-dev.sh"; exit 1; }
if [ "$POSTGRES_PORT" != "5432" ]; then
  export ConnectionStrings__Default="Host=127.0.0.1;Port=$POSTGRES_PORT;Database=$DB_NAME;Username=culinary;Password=culinary_dev_only"
fi

echo "[2/3] Chay backend tai http://localhost:5000 ..."
dotnet run --project src/CulinaryBlog.API > api.log 2>&1 &
API_PID=$!
trap 'kill $API_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 90); do curl -s -o /dev/null http://localhost:5000/ && break; sleep 2; done
curl -s -o /dev/null http://localhost:5000/ || { echo "[LOI] Backend khong chay, xem api.log"; exit 1; }
echo "[OK] Backend da chay (log: api.log)."

echo "[3/3] Chay frontend tai http://localhost:3000 ..."
[ -f frontend/.env.local ] || cp frontend/.env.example frontend/.env.local
[ -d frontend/node_modules ] || (cd frontend && npm ci)
if [ "${1:-}" = "prod" ]; then
  (cd frontend && npm run build && npm start)
else
  (cd frontend && npm run dev)
fi
