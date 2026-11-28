#!/usr/bin/env bash
# Culinary Blog - chạy kiểm thử trên Linux/macOS/Git Bash (bản tương đương run-tests.bat).
#   ./scripts/run-tests.sh            backend + frontend (không cần server)
#   ./scripts/run-tests.sh --e2e      thêm kiểm thử API và giao diện (cần API, MailHog, frontend đang chạy)
set -uo pipefail

cd "$(dirname "$0")/.."
failed=()

step() {
  local name="$1"
  shift
  echo -e "\n===== $name ====="
  if "$@"; then
    echo "-> đạt"
  else
    echo "-> THẤT BẠI"
    failed+=("$name")
  fi
}

step "Backend build (-warnaserror)" dotnet build CulinaryBlog.slnx -warnaserror --nologo -v q
step "Backend unit test" dotnet test tests/CulinaryBlog.UnitTests --nologo -v q

pushd frontend > /dev/null || exit 1
[ -d node_modules ] || npm ci
step "Frontend typecheck" npm run typecheck --silent
step "Frontend lint" npm run lint --silent
step "Frontend unit test" npm run test:utils --silent
popd > /dev/null || exit 1

if [[ "${1:-}" == "--e2e" ]]; then
  export PYTHONIOENCODING=utf-8
  step "API Lab 4" python scripts/test_api.py
  step "API mật khẩu (Lab 7)" python scripts/test_password.py
  step "API Lab 8" python scripts/test_lab8_api.py
  step "Giao diện Lab 7" python scripts/test_lab7_ui.py
  step "Giao diện Lab 8" python scripts/test_lab8_ui.py
fi

echo
if ((${#failed[@]} == 0)); then
  echo "===== TẤT CẢ ĐẠT ====="
else
  printf '===== THẤT BẠI: %s =====\n' "${failed[*]}"
  exit 1
fi
