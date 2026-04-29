-- TEAM WORKS — Database Schema
-- PostgreSQL 초기 마이그레이션 (schema v1)
-- 실행: docker exec -i postgres-db psql -U teamworks-manager -d teamworks < database/schema.sql

-- =====================
-- EXTENSIONS
-- =====================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================
-- TABLES
-- =====================

-- 1. users
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    name          VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- 2. teams
CREATE TABLE IF NOT EXISTS teams (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    description TEXT        NULL,
    is_public  BOOLEAN     NOT NULL DEFAULT false,
    leader_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

-- 3. team_members
CREATE TABLE IF NOT EXISTS team_members (
    team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT chk_team_members_role CHECK (role IN ('LEADER', 'MEMBER'))
);

-- 4. team_join_requests
CREATE TABLE IF NOT EXISTS team_join_requests (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    requester_id UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP    NOT NULL DEFAULT now(),
    responded_at TIMESTAMP    NULL,
    CONSTRAINT chk_team_join_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- 5. schedules
CREATE TABLE IF NOT EXISTS schedules (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title       VARCHAR(200) NOT NULL,
    description TEXT         NULL,
    color       VARCHAR(20)  NOT NULL DEFAULT 'indigo',
    start_at    TIMESTAMP    NOT NULL,
    end_at      TIMESTAMP    NOT NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT chk_schedules_end_after_start CHECK (end_at > start_at),
    CONSTRAINT chk_schedules_color CHECK (color IN ('indigo', 'blue', 'emerald', 'amber', 'rose'))
);

-- 6. postits
CREATE TABLE IF NOT EXISTS postits (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    date       DATE        NOT NULL,
    color      VARCHAR(20) NOT NULL DEFAULT 'amber',
    content    TEXT        NOT NULL DEFAULT '',
    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    updated_at TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT chk_postits_color CHECK (color IN ('indigo', 'blue', 'emerald', 'amber', 'rose'))
);

-- 7. chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id   UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sender_id UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type      VARCHAR(30)  NOT NULL DEFAULT 'NORMAL',
    content   TEXT         NOT NULL,
    sent_at   TIMESTAMP    NOT NULL DEFAULT now(),
    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT chk_chat_messages_type    CHECK (type IN ('NORMAL', 'WORK_PERFORMANCE')),
    CONSTRAINT chk_chat_messages_content CHECK (char_length(content) <= 2000)
);

CREATE TABLE IF NOT EXISTS work_performance_permissions (
    team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (team_id, user_id)
);

-- =====================
-- INDEXES
-- =====================

-- users
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
    ON users(email);

-- teams
CREATE INDEX IF NOT EXISTS idx_teams_leader_id
    ON teams(leader_id);

-- team_members
CREATE INDEX IF NOT EXISTS idx_team_members_user_id
    ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id
    ON team_members(team_id);

-- team_join_requests
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id_status
    ON team_join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_requester_id
    ON team_join_requests(requester_id);
-- PENDING 중복 신청 방지 (동일 사용자가 동일 팀에 PENDING 상태 요청 중복 불가)
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_requests_pending_unique
    ON team_join_requests(team_id, requester_id)
    WHERE status = 'PENDING';

-- schedules
CREATE INDEX IF NOT EXISTS idx_schedules_team_id_start_at
    ON schedules(team_id, start_at);
CREATE INDEX IF NOT EXISTS idx_schedules_team_id_end_at
    ON schedules(team_id, end_at);

-- postits
CREATE INDEX IF NOT EXISTS idx_postits_team_id_date
    ON postits(team_id, date);

-- chat_messages
CREATE INDEX IF NOT EXISTS idx_chat_messages_team_id_sent_at
    ON chat_messages(team_id, sent_at DESC);

-- work_performance_permissions
CREATE INDEX IF NOT EXISTS idx_wpp_team
    ON work_performance_permissions(team_id);

-- =====================
-- 9. projects
-- =====================
CREATE TABLE IF NOT EXISTS projects (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id     UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    name        VARCHAR(200) NOT NULL,
    description TEXT         NULL,
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    progress    INTEGER      NOT NULL DEFAULT 0,
    manager     VARCHAR(100) NOT NULL DEFAULT '',
    phases      JSONB        NOT NULL DEFAULT '[]',
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT chk_projects_end_after_start CHECK (end_date >= start_date),
    CONSTRAINT chk_projects_progress CHECK (progress BETWEEN 0 AND 100)
);

-- 10. project_schedules
CREATE TABLE IF NOT EXISTS project_schedules (
    id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id  UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id     UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title       VARCHAR(200) NOT NULL,
    description TEXT         NULL,
    color       VARCHAR(20)  NOT NULL DEFAULT 'indigo',
    start_date  DATE         NOT NULL,
    end_date    DATE         NOT NULL,
    leader      VARCHAR(100) NOT NULL DEFAULT '',
    progress    INTEGER      NOT NULL DEFAULT 0,
    is_delayed  BOOLEAN      NOT NULL DEFAULT false,
    phase_id    UUID         NULL,
    created_at  TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at  TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT chk_project_schedules_end_after_start CHECK (end_date >= start_date),
    CONSTRAINT chk_project_schedules_progress CHECK (progress BETWEEN 0 AND 100),
    CONSTRAINT chk_project_schedules_color CHECK (color IN ('indigo', 'blue', 'emerald', 'amber', 'rose'))
);

-- 11. sub_schedules
CREATE TABLE IF NOT EXISTS sub_schedules (
    id                  UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    project_schedule_id UUID         NOT NULL REFERENCES project_schedules(id) ON DELETE CASCADE,
    project_id          UUID         NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    team_id             UUID         NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    created_by          UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title               VARCHAR(200) NOT NULL,
    description         TEXT         NULL,
    color               VARCHAR(20)  NOT NULL DEFAULT 'indigo',
    start_date          DATE         NOT NULL,
    end_date            DATE         NOT NULL,
    leader              VARCHAR(100) NOT NULL DEFAULT '',
    progress            INTEGER      NOT NULL DEFAULT 0,
    is_delayed          BOOLEAN      NOT NULL DEFAULT false,
    created_at          TIMESTAMP    NOT NULL DEFAULT now(),
    updated_at          TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT chk_sub_schedules_end_after_start CHECK (end_date >= start_date),
    CONSTRAINT chk_sub_schedules_progress CHECK (progress BETWEEN 0 AND 100),
    CONSTRAINT chk_sub_schedules_color CHECK (color IN ('indigo', 'blue', 'emerald', 'amber', 'rose'))
);

-- projects indexes
CREATE INDEX IF NOT EXISTS idx_projects_team_id ON projects(team_id);

-- project_schedules indexes
CREATE INDEX IF NOT EXISTS idx_project_schedules_project_id ON project_schedules(project_id);
CREATE INDEX IF NOT EXISTS idx_project_schedules_team_id ON project_schedules(team_id);

-- sub_schedules indexes
CREATE INDEX IF NOT EXISTS idx_sub_schedules_project_schedule_id ON sub_schedules(project_schedule_id);
CREATE INDEX IF NOT EXISTS idx_sub_schedules_project_id ON sub_schedules(project_id);

-- 12. notices
CREATE TABLE IF NOT EXISTS notices (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sender_id  UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    content    TEXT        NOT NULL,
    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT chk_notices_content CHECK (char_length(content) <= 2000)
);

CREATE INDEX IF NOT EXISTS idx_notices_team_id ON notices(team_id);
