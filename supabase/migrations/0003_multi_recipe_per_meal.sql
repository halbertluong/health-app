-- Allow multiple recipes per meal slot by dropping the unique constraint
ALTER TABLE meal_plan_slots DROP CONSTRAINT IF EXISTS meal_plan_slots_user_id_date_meal_type_key;
