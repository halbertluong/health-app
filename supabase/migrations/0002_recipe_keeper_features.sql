-- Recipe Keeper feature parity: add missing columns to recipes table

ALTER TABLE recipes
  ADD COLUMN IF NOT EXISTS source_url         TEXT,
  ADD COLUMN IF NOT EXISTS source_name        TEXT,
  ADD COLUMN IF NOT EXISTS serving_size       TEXT,
  ADD COLUMN IF NOT EXISTS notes              TEXT,
  ADD COLUMN IF NOT EXISTS rating             SMALLINT CHECK (rating BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS difficulty         TEXT CHECK (difficulty IN ('easy', 'medium', 'hard')),
  ADD COLUMN IF NOT EXISTS is_favorite        BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS categories         TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS fiber_g_per_serving        NUMERIC,
  ADD COLUMN IF NOT EXISTS sugar_g_per_serving        NUMERIC,
  ADD COLUMN IF NOT EXISTS sodium_mg_per_serving      NUMERIC,
  ADD COLUMN IF NOT EXISTS cholesterol_mg_per_serving NUMERIC,
  ADD COLUMN IF NOT EXISTS saturated_fat_g_per_serving NUMERIC;
