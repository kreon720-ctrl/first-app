-- =============================================
-- Database Reset Script for Team CalTalk
-- Run this with: psql -U postgres -d caltalk -f database/reset-and-reapply.sql
-- =============================================

-- 1. Drop all existing tables (in reverse dependency order)
DROP TABLE IF EXISTS postits CASCADE;
DROP TABLE IF EXISTS chat_messages CASCADE;
DROP TABLE IF EXISTS schedules CASCADE;
DROP TABLE IF EXISTS team_join_requests CASCADE;
DROP TABLE IF EXISTS team_members CASCADE;
DROP TABLE IF EXISTS teams CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- 2. Drop extensions
DROP EXTENSION IF EXISTS "pgcrypto";

-- 3. Recreate extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 4. Recreate all tables (from schema.sql)

-- users
CREATE TABLE IF NOT EXISTS users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(255) NOT NULL,
    name          VARCHAR(50)  NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at    TIMESTAMP    NOT NULL DEFAULT now(),
    CONSTRAINT uq_users_email UNIQUE (email)
);

-- teams
CREATE TABLE IF NOT EXISTS teams (
    id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    name       VARCHAR(100) NOT NULL,
    description TEXT        NULL,
    is_public  BOOLEAN     NOT NULL DEFAULT false,
    leader_id  UUID         NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    created_at TIMESTAMP    NOT NULL DEFAULT now()
);

-- team_members
CREATE TABLE IF NOT EXISTS team_members (
    team_id    UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    user_id    UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role       VARCHAR(20)  NOT NULL,
    created_at TIMESTAMP    NOT NULL DEFAULT now(),
    PRIMARY KEY (team_id, user_id),
    CONSTRAINT chk_team_members_role CHECK (role IN ('LEADER', 'MEMBER'))
);

-- team_join_requests
CREATE TABLE IF NOT EXISTS team_join_requests (
    id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id      UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    requester_id UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    status       VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    requested_at TIMESTAMP    NOT NULL DEFAULT now(),
    responded_at TIMESTAMP    NULL,
    CONSTRAINT chk_team_join_requests_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

-- schedules
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

-- postits
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

-- chat_messages
CREATE TABLE IF NOT EXISTS chat_messages (
    id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id   UUID        NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
    sender_id UUID        NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    type      VARCHAR(30)  NOT NULL DEFAULT 'NORMAL',
    content   TEXT         NOT NULL,
    sent_at   TIMESTAMP    NOT NULL DEFAULT now(),
    created_at TIMESTAMP   NOT NULL DEFAULT now(),
    CONSTRAINT chk_chat_messages_type    CHECK (type IN ('NORMAL', 'SCHEDULE_REQUEST')),
    CONSTRAINT chk_chat_messages_content CHECK (char_length(content) <= 2000)
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_teams_leader_id ON teams(leader_id);
CREATE INDEX IF NOT EXISTS idx_team_members_user_id ON team_members(user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_team_id ON team_members(team_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_team_join_requests_pending_unique ON team_join_requests(team_id, requester_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_team_join_requests_team_id_status ON team_join_requests(team_id, status);
CREATE INDEX IF NOT EXISTS idx_team_join_requests_requester_id ON team_join_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_schedules_team_id_start_at ON schedules(team_id, start_at);
CREATE INDEX IF NOT EXISTS idx_schedules_team_id_end_at ON schedules(team_id, end_at);
CREATE INDEX IF NOT EXISTS idx_postits_team_id_date ON postits(team_id, date);
CREATE INDEX IF NOT EXISTS idx_chat_messages_team_id_sent_at ON chat_messages(team_id, sent_at DESC);

-- Done!
SELECT 'Database reset and schema applied successfully!' AS result;
