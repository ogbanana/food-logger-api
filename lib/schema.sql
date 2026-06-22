-- Registered accounts. `id` is the verified identity embedded in the JWT and
-- stored as the owner key on logs/meals. Email is stored lowercased by the app;
-- UNIQUE enforces no duplicate accounts. `guest_id` records the pre-signup guest
-- identifier so guest data can be migrated on signup.
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  guest_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Per-day analysis counter backing the rate limiter. `user_id` is the
-- rate-limit key, not necessarily a registered user: a user's UUID,
-- "guest:<id>", or "ip:<addr>" (see getRateLimitKey) — hence TEXT. The
-- (user_id, date) primary key backs the ON CONFLICT upsert in checkAndIncrementUsage.
CREATE TABLE IF NOT EXISTS daily_usage (
  user_id TEXT NOT NULL,
  date DATE NOT NULL,
  analysis_count INT NOT NULL DEFAULT 0,
  PRIMARY KEY (user_id, date)
);

CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Owner key. A registered user's verified UUID, or "guest:<uuid>" for an
  -- unauthenticated guest. TEXT (not UUID) because of the guest namespace.
  user_id TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  intro TEXT,
  closing TEXT,
  cal_low INT,
  cal_high INT,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  fiber_g INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Logs are looked up by (user_id, date) on nearly every request.
CREATE INDEX IF NOT EXISTS idx_logs_user_date ON logs (user_id, date);

CREATE TABLE IF NOT EXISTS meals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  log_id UUID REFERENCES logs(id) ON DELETE CASCADE,
  -- Denormalized owner key, mirrors logs.user_id. Used to scope meal
  -- updates/deletes directly to the caller.
  user_id TEXT NOT NULL,
  meal TEXT,
  items TEXT[],
  cal_low INT,
  cal_high INT,
  protein_g INT,
  carbs_g INT,
  fat_g INT,
  fiber_g INT,
  assumption TEXT
);

CREATE INDEX IF NOT EXISTS idx_meals_log_id ON meals (log_id);

-- Failed-login throttling. `identifier` is "ip:<addr>" (preferred) or
-- "email:<addr>". Rows are pruned opportunistically once outside the window.
CREATE TABLE IF NOT EXISTS login_attempts (
  id BIGSERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_login_attempts_identifier_time
  ON login_attempts (identifier, attempted_at);