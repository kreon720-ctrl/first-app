-- Migration: postits 테이블 추가
-- 기존 DB에 포스트잇 기능을 추가할 때 실행합니다.
-- 실행: psql -U postgres -d caltalk -f database/add-postits.sql

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

CREATE INDEX IF NOT EXISTS idx_postits_team_id_date
    ON postits(team_id, date);

SELECT 'postits table created successfully!' AS result;
