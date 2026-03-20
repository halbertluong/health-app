-- =====================
-- ENUMS
-- =====================

CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
CREATE TYPE meal_status AS ENUM ('planned', 'cooked', 'eaten_as_planned', 'modified', 'skipped', 'replaced');
CREATE TYPE workout_type AS ENUM ('weight_training', 'pickleball', 'tennis', 'swimming', 'cardio', 'recovery', 'mobility', 'other');
CREATE TYPE workout_status AS ENUM ('planned', 'completed', 'skipped', 'partial');
CREATE TYPE grocery_category AS ENUM ('produce', 'meat_seafood', 'dairy', 'pantry', 'frozen', 'beverages', 'household', 'other');
CREATE TYPE log_source AS ENUM ('ate_as_planned', 'quick_add', 'manual', 'ai_photo');

-- =====================
-- USERS
-- =====================

CREATE TABLE users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  email       TEXT NOT NULL UNIQUE,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- =====================
-- MACRO TARGETS
-- =====================

CREATE TABLE macro_targets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date        DATE,
  calories    INT NOT NULL,
  protein_g   NUMERIC(6,1) NOT NULL,
  carbs_g     NUMERIC(6,1) NOT NULL,
  fat_g       NUMERIC(6,1) NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- =====================
-- RECIPES
-- =====================

CREATE TABLE recipes (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name                  TEXT NOT NULL,
  description           TEXT,
  instructions          TEXT,
  prep_time             INT,
  cook_time             INT,
  servings              NUMERIC(4,1) NOT NULL DEFAULT 1,
  image_url             TEXT,
  calories_per_serving  NUMERIC(7,1),
  protein_g_per_serving NUMERIC(6,1),
  carbs_g_per_serving   NUMERIC(6,1),
  fat_g_per_serving     NUMERIC(6,1),
  is_public             BOOLEAN NOT NULL DEFAULT FALSE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE recipe_ingredients (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id         UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_name   TEXT NOT NULL,
  quantity          NUMERIC(8,2) NOT NULL,
  unit              TEXT NOT NULL,
  grocery_category  grocery_category NOT NULL DEFAULT 'other',
  calories          NUMERIC(7,1),
  protein_g         NUMERIC(6,1),
  carbs_g           NUMERIC(6,1),
  fat_g             NUMERIC(6,1),
  notes             TEXT,
  sort_order        INT NOT NULL DEFAULT 0
);

-- =====================
-- MEAL PLAN SLOTS
-- =====================

CREATE TABLE meal_plan_slots (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date                DATE NOT NULL,
  meal_type           meal_type NOT NULL,
  planned_recipe_id   UUID REFERENCES recipes(id) ON DELETE SET NULL,
  planned_servings    NUMERIC(4,1) NOT NULL DEFAULT 1,
  planned_calories    NUMERIC(7,1),
  planned_protein_g   NUMERIC(6,1),
  planned_carbs_g     NUMERIC(6,1),
  planned_fat_g       NUMERIC(6,1),
  notes               TEXT,
  status              meal_status NOT NULL DEFAULT 'planned',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date, meal_type)
);

-- =====================
-- GROCERY LISTS & ITEMS
-- =====================

CREATE TABLE grocery_lists (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  week_start   DATE NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, week_start)
);

CREATE TABLE grocery_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grocery_list_id  UUID NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
  ingredient_name  TEXT NOT NULL,
  aggregated_qty   NUMERIC(8,2) NOT NULL,
  unit             TEXT NOT NULL,
  category         grocery_category NOT NULL DEFAULT 'other',
  have_on_hand     BOOLEAN NOT NULL DEFAULT FALSE,
  checked          BOOLEAN NOT NULL DEFAULT FALSE,
  notes            TEXT,
  sort_order       INT NOT NULL DEFAULT 0
);

-- =====================
-- PANTRY
-- =====================

CREATE TABLE pantry_items (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ingredient_name  TEXT NOT NULL,
  quantity         NUMERIC(8,2),
  unit             TEXT,
  in_stock         BOOLEAN NOT NULL DEFAULT TRUE,
  category         grocery_category NOT NULL DEFAULT 'other',
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, ingredient_name)
);

-- =====================
-- WORKOUTS
-- =====================

CREATE TABLE workouts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  type        workout_type NOT NULL,
  notes       TEXT,
  is_template BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE workout_exercises (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workout_id  UUID NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  sets        INT,
  reps        INT,
  weight_kg   NUMERIC(6,2),
  duration_s  INT,
  distance_m  NUMERIC(8,2),
  notes       TEXT,
  sort_order  INT NOT NULL DEFAULT 0
);

CREATE TABLE workout_schedule (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  workout_id       UUID REFERENCES workouts(id) ON DELETE SET NULL,
  workout_type     workout_type NOT NULL,
  planned_duration INT,
  actual_duration  INT,
  status           workout_status NOT NULL DEFAULT 'planned',
  notes            TEXT,
  health_kit_id    TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- =====================
-- MEAL LOGS
-- =====================

CREATE TABLE meal_logs (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  meal_type            meal_type,
  linked_plan_slot_id  UUID REFERENCES meal_plan_slots(id) ON DELETE SET NULL,
  source_type          log_source NOT NULL,
  notes                TEXT,
  image_url            TEXT,
  confidence_score     NUMERIC(3,2),
  total_calories       NUMERIC(7,1),
  total_protein_g      NUMERIC(6,1),
  total_carbs_g        NUMERIC(6,1),
  total_fat_g          NUMERIC(6,1)
);

CREATE TABLE meal_log_items (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meal_log_id  UUID NOT NULL REFERENCES meal_logs(id) ON DELETE CASCADE,
  food_name    TEXT NOT NULL,
  quantity     NUMERIC(8,2) NOT NULL,
  unit         TEXT NOT NULL,
  calories     NUMERIC(7,1),
  protein_g    NUMERIC(6,1),
  carbs_g      NUMERIC(6,1),
  fat_g        NUMERIC(6,1)
);

-- =====================
-- HEALTH METRICS
-- =====================

CREATE TABLE health_metrics_daily (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  steps            INT,
  active_calories  INT,
  sleep_hours      NUMERIC(4,1),
  weight_kg        NUMERIC(5,2),
  resting_hr       INT,
  workout_minutes  INT,
  source           TEXT DEFAULT 'apple_health',
  synced_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (user_id, date)
);

-- =====================
-- INDEXES
-- =====================

CREATE INDEX idx_recipes_user ON recipes(user_id);
CREATE INDEX idx_meal_plan_slots_user_date ON meal_plan_slots(user_id, date);
CREATE INDEX idx_recipe_ingredients_recipe ON recipe_ingredients(recipe_id);
CREATE INDEX idx_grocery_items_list ON grocery_items(grocery_list_id);
CREATE INDEX idx_workouts_user ON workouts(user_id);
CREATE INDEX idx_workout_exercises_workout ON workout_exercises(workout_id);
CREATE INDEX idx_workout_schedule_user_date ON workout_schedule(user_id, date);
CREATE INDEX idx_meal_logs_user_date ON meal_logs(user_id, logged_at);
CREATE INDEX idx_meal_log_items_log ON meal_log_items(meal_log_id);
CREATE INDEX idx_health_metrics_user_date ON health_metrics_daily(user_id, date);
CREATE INDEX idx_pantry_user ON pantry_items(user_id);

-- =====================
-- ROW LEVEL SECURITY
-- =====================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE macro_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_plan_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE grocery_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE pantry_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE workouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_schedule ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_log_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics_daily ENABLE ROW LEVEL SECURITY;

-- Users: own row only
CREATE POLICY "users_select_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());

-- Recipes: own or public
CREATE POLICY "recipes_select" ON recipes FOR SELECT USING (user_id = auth.uid() OR is_public = TRUE);
CREATE POLICY "recipes_insert" ON recipes FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "recipes_update" ON recipes FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "recipes_delete" ON recipes FOR DELETE USING (user_id = auth.uid());

-- Recipe ingredients: via recipe ownership
CREATE POLICY "recipe_ingredients_select" ON recipe_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND (r.user_id = auth.uid() OR r.is_public)));
CREATE POLICY "recipe_ingredients_insert" ON recipe_ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "recipe_ingredients_update" ON recipe_ingredients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));
CREATE POLICY "recipe_ingredients_delete" ON recipe_ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM recipes r WHERE r.id = recipe_id AND r.user_id = auth.uid()));

-- Generic own-row policies for remaining tables
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'macro_targets', 'meal_plan_slots', 'grocery_lists',
    'pantry_items', 'workouts', 'workout_schedule',
    'meal_logs', 'health_metrics_daily'
  ]
  LOOP
    EXECUTE format('CREATE POLICY "%s_own" ON %I FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', tbl, tbl);
  END LOOP;
END $$;

-- Grocery items: via grocery list ownership
CREATE POLICY "grocery_items_own" ON grocery_items FOR ALL
  USING (EXISTS (SELECT 1 FROM grocery_lists gl WHERE gl.id = grocery_list_id AND gl.user_id = auth.uid()));

-- Workout exercises: via workout ownership
CREATE POLICY "workout_exercises_own" ON workout_exercises FOR ALL
  USING (EXISTS (SELECT 1 FROM workouts w WHERE w.id = workout_id AND w.user_id = auth.uid()));

-- Meal log items: via meal log ownership
CREATE POLICY "meal_log_items_own" ON meal_log_items FOR ALL
  USING (EXISTS (SELECT 1 FROM meal_logs ml WHERE ml.id = meal_log_id AND ml.user_id = auth.uid()));

-- =====================
-- STORAGE BUCKETS
-- =====================

INSERT INTO storage.buckets (id, name, public) VALUES ('meal-photos', 'meal-photos', TRUE);
INSERT INTO storage.buckets (id, name, public) VALUES ('recipe-images', 'recipe-images', TRUE);

CREATE POLICY "meal_photos_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'meal-photos' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "meal_photos_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'meal-photos');

CREATE POLICY "recipe_images_upload" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-images' AND auth.uid()::TEXT = (storage.foldername(name))[1]);

CREATE POLICY "recipe_images_select" ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');
