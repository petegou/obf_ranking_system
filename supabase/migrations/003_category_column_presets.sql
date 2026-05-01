CREATE TABLE IF NOT EXISTS category_column_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  schema_version integer NOT NULL DEFAULT 1,
  visible_column_ids text[] NOT NULL,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT category_column_presets_name_not_blank
    CHECK (length(trim(name)) > 0),

  CONSTRAINT category_column_presets_visible_column_ids_not_empty
    CHECK (array_length(visible_column_ids, 1) IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS category_column_presets_user_name_idx
  ON category_column_presets (user_id, lower(name));

CREATE UNIQUE INDEX IF NOT EXISTS category_column_presets_one_default_per_user_idx
  ON category_column_presets (user_id)
  WHERE is_default;

CREATE OR REPLACE FUNCTION update_category_column_presets_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS category_column_presets_updated_at
  ON category_column_presets;

CREATE TRIGGER category_column_presets_updated_at
  BEFORE UPDATE ON category_column_presets
  FOR EACH ROW
  EXECUTE FUNCTION update_category_column_presets_updated_at();

ALTER TABLE category_column_presets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own category column presets"
  ON category_column_presets;

CREATE POLICY "Users can read own category column presets"
  ON category_column_presets
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own category column presets"
  ON category_column_presets;

CREATE POLICY "Users can create own category column presets"
  ON category_column_presets
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own category column presets"
  ON category_column_presets;

CREATE POLICY "Users can update own category column presets"
  ON category_column_presets
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own category column presets"
  ON category_column_presets;

CREATE POLICY "Users can delete own category column presets"
  ON category_column_presets
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
