# TEAM WORKS — 로컬 PC 서버 배포 가이드

## 문서 이력

| 버전 | 날짜 | 내용 |
|------|------|------|
| 1.0 | 2026-04-18 | 최초 작성 — PC 1대 로컬 서비스 배포 기준 |

---

## 1. 아키텍처 개요

```
인터넷/LAN 사용자
       │
       ▼
  [ Nginx :80/:443 ]  ← 리버스 프록시 (단일 진입점)
       │
       ├── /api/*  ──────► [ Backend  :3001 ]  Next.js API Routes
       │                        │
       │                        ▼
       │                  [ PostgreSQL :5432 ]
       │
       └── /*      ──────► [ Frontend :3000 ]  Next.js React App
```

### 서비스 포트 할당

| 서비스 | 포트 | 설명 |
|--------|------|------|
| Nginx | 80 (HTTP) / 443 (HTTPS) | 외부 단일 진입점 |
| Frontend | 3000 | Next.js 프론트엔드 |
| Backend | 3001 | Next.js API 서버 |
| PostgreSQL | 5432 | 데이터베이스 |

### 권장 서버 사양

| 항목 | 최소 | 권장 |
|------|------|------|
| OS | Ubuntu 22.04 LTS / Windows 11 | Ubuntu 22.04 LTS |
| CPU | 2코어 | 4코어 이상 |
| RAM | 4GB | 8GB 이상 |
| 저장공간 | 20GB | 50GB 이상 (SSD 권장) |
| 네트워크 | 100Mbps | 1Gbps |

> **이 가이드는 Ubuntu 22.04 LTS 기준**으로 작성되었습니다. Windows 사용 시 각 단계의 Windows 대응 명령어를 참고하세요.

---

## 2. 사전 준비

### 2.1 Node.js 설치 (v20 LTS 권장)

```bash
# nvm으로 설치 (권장)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc

nvm install 20
nvm use 20
nvm alias default 20

node -v   # v20.x.x 확인
npm -v    # 10.x.x 확인
```

### 2.2 PM2 설치 (프로세스 관리자)

```bash
npm install -g pm2
pm2 -v   # 설치 확인
```

### 2.3 Nginx 설치

```bash
sudo apt update
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
nginx -v   # 설치 확인
```

### 2.4 PostgreSQL 설치

```bash
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable postgresql
sudo systemctl start postgresql
psql --version   # 설치 확인
```

---

## 3. PostgreSQL 데이터베이스 설정

### 3.1 DB 사용자 및 데이터베이스 생성

```bash
sudo -u postgres psql
```

```sql
-- psql 프롬프트에서 실행
CREATE USER teamworks WITH PASSWORD '안전한_비밀번호_여기에';
CREATE DATABASE teamworks_db OWNER teamworks;
GRANT ALL PRIVILEGES ON DATABASE teamworks_db TO teamworks;
\q
```

### 3.2 스키마 초기화

```bash
# 프로젝트 루트에서 실행
psql -U teamworks -d teamworks_db -h localhost -f database/schema.sql
```

> `database/schema.sql`이 없으면 프로젝트 README 또는 ERD(`docs/6-erd.md`)를 참고하여 테이블을 생성합니다.

스키마 실행 후 생성되는 테이블 (12개):

```
users, teams, team_members, team_join_requests,
schedules, postits, chat_messages, work_performance_permissions,
projects, project_schedules, sub_schedules, notices
```

### 3.3 DB 연결 테스트

```bash
psql -U teamworks -d teamworks_db -h localhost -c "SELECT version();"
```

---

## 4. 소스코드 준비

### 4.1 코드 Clone

```bash
cd /opt
sudo git clone https://github.com/kreon720-ctrl/team-works.git teamworks
sudo chown -R $USER:$USER /opt/teamworks
cd /opt/teamworks
```

### 4.2 의존성 설치

```bash
# Backend
cd /opt/teamworks/backend
npm install

# Frontend
cd /opt/teamworks/frontend
npm install
```

---

## 5. 환경변수 설정

### 5.1 Backend 환경변수 (`backend/.env.local`)

```bash
cd /opt/teamworks/backend
cat > .env.local << 'EOF'
# Database
DATABASE_URL=postgresql://teamworks:안전한_비밀번호_여기에@localhost:5432/teamworks_db

# JWT Secrets (각각 다른 값으로 설정)
JWT_ACCESS_SECRET=여기에_64자_이상_랜덤_문자열_입력
JWT_REFRESH_SECRET=여기에_또_다른_64자_이상_랜덤_문자열_입력
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# CORS — 프론트엔드 접근 허용 도메인
FRONTEND_URL=http://서버_IP_또는_도메인
EOF
```

**JWT Secret 생성 명령어:**

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

위 명령을 2번 실행해서 서로 다른 값을 `JWT_ACCESS_SECRET`과 `JWT_REFRESH_SECRET`에 각각 입력합니다.

### 5.2 Frontend 환경변수 (`frontend/.env.local`)

```bash
cd /opt/teamworks/frontend
cat > .env.local << 'EOF'
# 같은 서버이므로 Nginx가 /api/* 를 backend로 프록시
NEXT_PUBLIC_API_URL=http://서버_IP_또는_도메인
EOF
```

> **같은 서버**에서 Nginx가 `/api/*`를 backend로 프록시하므로, Frontend의 API URL은 Nginx 주소(서버 IP)를 가리킵니다.

---

## 6. 빌드

```bash
# Backend 빌드
cd /opt/teamworks/backend
npm run build

# Frontend 빌드
cd /opt/teamworks/frontend
npm run build
```

두 빌드 모두 오류 없이 완료되어야 합니다.

---

## 7. PM2로 서비스 실행

### 7.1 PM2 ecosystem 파일 생성

```bash
cat > /opt/teamworks/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'teamworks-backend',
      cwd: '/opt/teamworks/backend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      env: {
        NODE_ENV: 'production',
        PORT: 3001,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
    {
      name: 'teamworks-frontend',
      cwd: '/opt/teamworks/frontend',
      script: 'node_modules/.bin/next',
      args: 'start -p 3000',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
    },
  ],
};
EOF
```

### 7.2 서비스 시작

```bash
cd /opt/teamworks
pm2 start ecosystem.config.js
pm2 status   # 두 서비스 모두 online 확인
```

### 7.3 서버 재시작 시 자동 시작 설정

```bash
pm2 save
pm2 startup   # 출력된 명령어를 복사해서 실행
# 예: sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
```

### 7.4 PM2 주요 명령어

```bash
pm2 status                        # 서비스 상태 확인
pm2 logs teamworks-backend        # Backend 로그
pm2 logs teamworks-frontend       # Frontend 로그
pm2 restart teamworks-backend     # Backend 재시작
pm2 restart all                   # 전체 재시작
pm2 stop all                      # 전체 중지
```

---

## 8. Nginx 리버스 프록시 설정

### 8.1 Nginx 설정 파일 작성

```bash
sudo nano /etc/nginx/sites-available/teamworks
```

```nginx
server {
    listen 80;
    server_name 서버_IP_또는_도메인;  # 예: 192.168.1.100 또는 teamworks.example.com

    # 요청 크기 제한 (파일 업로드 등)
    client_max_body_size 10M;

    # /api/* → Backend (3001)
    location /api/ {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
    }

    # /* → Frontend (3000)
    location / {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 30s;
    }
}
```

### 8.2 Nginx 활성화 및 재시작

```bash
sudo ln -s /etc/nginx/sites-available/teamworks /etc/nginx/sites-enabled/
sudo nginx -t        # 설정 문법 검사
sudo systemctl reload nginx
```

---

## 9. 방화벽 설정

```bash
sudo ufw allow 22/tcp    # SSH (관리용)
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS (나중에 SSL 적용 시)
sudo ufw deny 3000/tcp   # Frontend 직접 접근 차단 (Nginx 경유만 허용)
sudo ufw deny 3001/tcp   # Backend 직접 접근 차단
sudo ufw deny 5432/tcp   # PostgreSQL 외부 접근 차단
sudo ufw enable
sudo ufw status
```

---

## 10. 동작 확인

### 10.1 서비스 상태 확인

```bash
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql
```

### 10.2 기능 체크리스트

브라우저에서 `http://서버_IP` 접속 후 순서대로 확인:

- [ ] 홈 화면 로딩 (TEAM WORKS 로고 표시)
- [ ] `/signup` — 회원가입
- [ ] `/login` — 로그인 후 팀 목록 이동
- [ ] 팀 생성 — 팀명 입력 후 생성 성공
- [ ] 팀 상세 — 캘린더 + 채팅 화면 정상 표시
- [ ] 채팅 메시지 전송 → 3초 후 자동 갱신
- [ ] 업무보고 메시지 전송 (teal 색상 표시)
- [ ] 공지사항 등록 → 최상단 고정 배너 확인
- [ ] 프로젝트 뷰 → Gantt 차트 표시

### 10.3 API 직접 테스트

```bash
# 공개 팀 목록 (인증 없이 호출 → 401 응답이면 정상)
curl http://localhost:3001/api/teams/public

# Nginx 경유 테스트
curl http://서버_IP/api/teams/public
```

---

## 11. HTTPS 설정 (선택, 도메인 있는 경우)

도메인이 있다면 Let's Encrypt 무료 인증서로 HTTPS를 설정합니다.

```bash
sudo apt install -y certbot python3-certbot-nginx

# 인증서 발급 (도메인이 이 서버를 가리키고 있어야 함)
sudo certbot --nginx -d teamworks.example.com

# 자동 갱신 확인
sudo systemctl status certbot.timer
```

Certbot이 자동으로 Nginx 설정에 SSL 블록을 추가합니다.

---

## 12. 외부 인터넷 접속 설정 (선택)

LAN이 아닌 외부 인터넷에서 접속하려면 추가 설정이 필요합니다.

### 방법 A — 공유기 포트 포워딩

1. 공유기 관리 페이지 접속 (보통 `192.168.1.1`)
2. **포트 포워딩** 설정:
   - 외부 포트 80 → 서버 내부 IP:80
   - 외부 포트 443 → 서버 내부 IP:443
3. 서버의 내부 IP를 고정 IP로 설정 (DHCP 예약)

### 방법 B — DDNS (동적 DNS) 서비스

고정 IP가 없는 경우 DDNS로 도메인을 유지합니다.

| 서비스 | URL | 무료 플랜 |
|--------|-----|-----------|
| DuckDNS | duckdns.org | 5개 서브도메인 무료 |
| No-IP | noip.com | 1개 호스트 무료 |
| Cloudflare Tunnel | cloudflare.com | 무료 (포트 포워딩 불필요) |

> **Cloudflare Tunnel 권장**: 공유기 설정 없이도 외부 접속 가능하며 보안이 우수합니다.

```bash
# Cloudflare Tunnel 설치 예시
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
cloudflared tunnel login
cloudflared tunnel create teamworks
cloudflared tunnel route dns teamworks teamworks.example.com
cloudflared tunnel run teamworks
```

---

## 13. 업데이트 배포 절차

코드 변경 후 서버에 반영하는 절차입니다.

```bash
cd /opt/teamworks

# 1. 최신 코드 Pull
git pull origin main

# 2. 의존성 업데이트 (package.json 변경 시)
cd backend && npm install
cd ../frontend && npm install
cd ..

# 3. 재빌드
cd backend && npm run build && cd ..
cd frontend && npm run build && cd ..

# 4. 서비스 재시작
pm2 restart all

# 5. 상태 확인
pm2 status
pm2 logs --lines 20
```

### 업데이트 스크립트 (선택)

```bash
cat > /opt/teamworks/update.sh << 'EOF'
#!/bin/bash
set -e
echo "=== TEAM WORKS 업데이트 시작 ==="
cd /opt/teamworks
git pull origin main
cd backend && npm install && npm run build && cd ..
cd frontend && npm install && npm run build && cd ..
pm2 restart all
echo "=== 업데이트 완료 ==="
pm2 status
EOF

chmod +x /opt/teamworks/update.sh
# 실행: /opt/teamworks/update.sh
```

---

## 14. 모니터링 및 로그

### 14.1 실시간 로그

```bash
pm2 logs              # 전체 로그 (실시간)
pm2 logs --lines 100  # 최근 100줄
pm2 monit             # CPU/메모리 실시간 모니터링 대시보드
```

### 14.2 Nginx 로그

```bash
sudo tail -f /var/log/nginx/access.log   # 접근 로그
sudo tail -f /var/log/nginx/error.log    # 에러 로그
```

### 14.3 PostgreSQL 로그

```bash
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 14.4 시스템 리소스 모니터링

```bash
htop        # CPU/메모리 (apt install htop)
df -h       # 디스크 사용량
free -h     # 메모리 사용량
```

---

## 15. 장애 대응

### 서비스가 멈춘 경우

```bash
pm2 status              # 상태 확인
pm2 restart all         # 재시작
pm2 logs --lines 50     # 에러 로그 확인
```

### Nginx 오류

```bash
sudo nginx -t                    # 설정 문법 오류 확인
sudo systemctl restart nginx     # 재시작
sudo journalctl -u nginx -n 50   # 시스템 로그
```

### DB 연결 실패

```bash
sudo systemctl status postgresql
sudo systemctl restart postgresql

# 연결 테스트
psql -U teamworks -d teamworks_db -h localhost -c "SELECT 1;"
```

### 디스크 공간 부족

```bash
df -h
pm2 flush          # PM2 로그 파일 비우기
sudo journalctl --vacuum-size=100M   # 시스템 로그 정리
```

---

## 16. 환경변수 전체 목록

### Backend (`.env.local`)

| 변수명 | 필수 | 예시값 | 설명 |
|--------|------|--------|------|
| `DATABASE_URL` | ✅ | `postgresql://teamworks:pw@localhost:5432/teamworks_db` | PostgreSQL 연결 문자열 |
| `JWT_ACCESS_SECRET` | ✅ | 64자 이상 랜덤 hex | Access Token 서명 키 |
| `JWT_REFRESH_SECRET` | ✅ | 64자 이상 랜덤 hex | Refresh Token 서명 키 |
| `JWT_ACCESS_EXPIRES_IN` | ✅ | `15m` | Access Token 만료 시간 |
| `JWT_REFRESH_EXPIRES_IN` | ✅ | `7d` | Refresh Token 만료 시간 |
| `FRONTEND_URL` | ✅ | `http://192.168.1.100` | CORS 허용 도메인 |

### Frontend (`.env.local`)

| 변수명 | 필수 | 예시값 | 설명 |
|--------|------|--------|------|
| `NEXT_PUBLIC_API_URL` | ✅ | `http://192.168.1.100` | Nginx 경유 API Base URL |

---

## 17. Windows PC 서버 대응 (참고)

Ubuntu가 아닌 Windows PC에서 서비스할 경우의 대안입니다.

| 항목 | Ubuntu 방법 | Windows 대안 |
|------|-------------|-------------|
| Node.js 설치 | nvm | nvm-windows 또는 직접 설치 |
| 프로세스 관리 | PM2 | PM2 (Windows 지원) or NSSM |
| 리버스 프록시 | Nginx | Nginx for Windows 또는 IIS ARR |
| PostgreSQL | apt install | PostgreSQL Windows 설치 프로그램 |
| 방화벽 | ufw | Windows 방화벽 (고급 설정) |
| 자동 시작 | pm2 startup | PM2 Windows Service or Task Scheduler |

```powershell
# Windows에서 PM2 서비스 등록
npm install -g pm2 pm2-windows-startup
pm2-startup install
pm2 start ecosystem.config.js
pm2 save
```

---

## 18. 관련 문서

| 문서 | 경로 |
|------|------|
| Vercel 배포 가이드 | docs/12-deploy.md |
| ERD (테이블 구조) | docs/6-erd.md |
| API 명세 | docs/7-api-spec.md |
| PRD | docs/2-prd.md |
