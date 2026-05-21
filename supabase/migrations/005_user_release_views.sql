-- Migration 005: per-user "release notes seen" cursor.
-- One row per user; surfaced via the auto-popup on login and the
-- voluntary "Release notes" entry in the sidebar account menu.

CREATE TABLE IF NOT EXISTS user_release_views (
  user_id           uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  last_seen_version text NOT NULL,
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_user_release_views_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_release_views_updated_at
  ON user_release_views;

CREATE TRIGGER user_release_views_updated_at
  BEFORE UPDATE ON user_release_views
  FOR EACH ROW
  EXECUTE FUNCTION update_user_release_views_updated_at();

ALTER TABLE user_release_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can read own release view"
  ON user_release_views;

CREATE POLICY "Users can read own release view"
  ON user_release_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can create own release view"
  ON user_release_views;

CREATE POLICY "Users can create own release view"
  ON user_release_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update own release view"
  ON user_release_views;

CREATE POLICY "Users can update own release view"
  ON user_release_views
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can delete own release view"
  ON user_release_views;

CREATE POLICY "Users can delete own release view"
  ON user_release_views
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());
