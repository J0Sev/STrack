CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS sleep_sessions (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    start_date TIMESTAMPTZ NOT NULL,
    end_date TIMESTAMPTZ NOT NULL,
    total_duration_seconds INTEGER NOT NULL,
    time_in_bed_seconds INTEGER NOT NULL,
    core_duration_seconds INTEGER,
    deep_duration_seconds INTEGER,
    rem_duration_seconds INTEGER,
    awake_duration_seconds INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (user_id, start_date)
);

CREATE TABLE IF NOT EXISTS goals (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    target_duration_hours NUMERIC(3,1) NOT NULL,
    target_bedtime_minutes INTEGER NOT NULL,   -- minutes since midnight
    target_wake_minutes INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS check_ins (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    date TIMESTAMPTZ NOT NULL,
    caffeine_after_2pm BOOLEAN NOT NULL DEFAULT false,
    screen_time_before_bed_minutes INTEGER,
    alcohol BOOLEAN NOT NULL DEFAULT false,
    exercised_today BOOLEAN NOT NULL DEFAULT false,
    stress_level SMALLINT,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
