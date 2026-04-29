#!/usr/bin/env bash
# =============================================================================
# reset-dev.sh — Team Works 개발 환경 초기화 스크립트 (macOS / Linux)
#
# 수행 작업:
#   1. PostgreSQL DB 전체 초기화 (Docker 컨테이너 postgres-db 사용)
#   2. JWT 시크릿 재생성 → 기존 로그인 토큰 자동 무효화
#
# 사용법: bash scripts/reset-dev.sh
# 사전 조건:
#   - Docker 컨테이너 `postgres-db` 가 실행 중 (docs/13-local-deploy.md §3 참고)
#   - backend/.env.local 에 DATABASE_URL / JWT_*_SECRET 정의되어 있음
# =============================================================================

set -euo pipefail

# ── 색상 출력 ────────────────────────────────────────────────────────────────
if [[ -t 1 ]]; then
  C_INFO=$'\033[36m'; C_OK=$'\033[32m'; C_WARN=$'\033[33m'; C_ERR=$'\033[31m'; C_END=$'\033[0m'
else
  C_INFO=""; C_OK=""; C_WARN=""; C_ERR=""; C_END=""
fi
info()    { echo "${C_INFO}[INFO]${C_END}  $*"; }
success() { echo "${C_OK}[OK]${C_END}    $*"; }
warn()    { echo "${C_WARN}[WARN]${C_END}  $*"; }
err()     { echo "${C_ERR}[ERROR]${C_END} $*" >&2; exit 1; }

# ── 경로 설정 ────────────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$ROOT_DIR/backend/.env.local"
SQL_FILE="$ROOT_DIR/database/reset-and-reapply.sql"
CONTAINER="postgres-db"

[[ -f "$ENV_FILE" ]] || err ".env.local 파일을 찾을 수 없습니다: $ENV_FILE"
[[ -f "$SQL_FILE" ]] || err "SQL 파일을 찾을 수 없습니다: $SQL_FILE"

# ── DATABASE_URL 파싱 ───────────────────────────────────────────────────────
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -n 1 | sed 's/^DATABASE_URL=//')"
[[ -n "$DATABASE_URL" ]] || err "DATABASE_URL을 .env.local 에서 찾을 수 없습니다."

if [[ "$DATABASE_URL" =~ ^postgresql://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+) ]]; then
  DB_USER="${BASH_REMATCH[1]}"
  DB_NAME="${BASH_REMATCH[5]}"
  DB_HOST="${BASH_REMATCH[3]}"
  DB_PORT="${BASH_REMATCH[4]}"
else
  err "DATABASE_URL 형식을 파싱할 수 없습니다: $DATABASE_URL"
fi

# ── Docker 컨테이너 확인 ─────────────────────────────────────────────────────
if ! docker ps --filter "name=^${CONTAINER}$" --format '{{.Names}}' | grep -q "^${CONTAINER}$"; then
  err "Docker 컨테이너 '${CONTAINER}' 가 실행 중이 아닙니다. 'docker start ${CONTAINER}' 또는 docs/13-local-deploy.md §3 참고."
fi

# ── 위험 경고 + 확인 ─────────────────────────────────────────────────────────
echo ""
echo "${C_ERR}══════════════════════════════════════════════════════${C_END}"
echo "${C_ERR}  ⚠  경고: 이 작업은 되돌릴 수 없습니다!${C_END}"
echo "${C_ERR}══════════════════════════════════════════════════════${C_END}"
echo ""
echo "  DB:   ${C_WARN}${DB_NAME}${C_END} @ ${DB_HOST}:${DB_PORT} (컨테이너 ${CONTAINER})"
echo ""
echo "  수행 작업:"
echo "    * 모든 테이블 삭제 후 스키마 재적용 (전체 데이터 삭제)"
echo "    * JWT 시크릿 재생성 (기존 로그인 토큰 전체 무효화)"
echo ""
read -r -p "  계속 진행하시겠습니까? (yes 입력) " CONFIRM
echo ""
[[ "$CONFIRM" == "yes" ]] || { warn "취소되었습니다."; exit 0; }

# ── Step 1: DB 초기화 ───────────────────────────────────────────────────────
info "Step 1/2 — 데이터베이스 초기화 중..."
docker exec -i "$CONTAINER" psql -U "$DB_USER" -d "$DB_NAME" -q < "$SQL_FILE"
success "데이터베이스 초기화 완료"

# ── Step 2: JWT 시크릿 재생성 ───────────────────────────────────────────────
info "Step 2/2 — JWT 시크릿 재생성 중..."
NEW_ACCESS_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"
NEW_REFRESH_SECRET="$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")"

TMP_ENV="$(mktemp)"
awk -v acc="$NEW_ACCESS_SECRET" -v ref="$NEW_REFRESH_SECRET" '
  /^JWT_ACCESS_SECRET=/  { print "JWT_ACCESS_SECRET="  acc; next }
  /^JWT_REFRESH_SECRET=/ { print "JWT_REFRESH_SECRET=" ref; next }
  { print }
' "$ENV_FILE" > "$TMP_ENV"
mv "$TMP_ENV" "$ENV_FILE"
success "JWT 시크릿 재생성 완료"

# ── 완료 메시지 ──────────────────────────────────────────────────────────────
echo ""
echo "${C_OK}══════════════════════════════════════════════════════${C_END}"
echo "${C_OK}  ✓  초기화 완료!${C_END}"
echo "${C_OK}══════════════════════════════════════════════════════${C_END}"
echo ""
echo "  다음 단계:"
echo "    1. 백엔드 서버를 재시작하세요  (JWT 시크릿 반영)"
echo "    2. 브라우저에서 새로고침 → 자동으로 로그아웃됩니다"
echo "    3. 새 계정으로 회원가입 후 사용하세요"
echo ""
