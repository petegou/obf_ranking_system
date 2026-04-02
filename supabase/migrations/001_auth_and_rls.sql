-- User roles table
CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(10) NOT NULL CHECK (role IN ('admin', 'viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Helper function to check if current user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM user_roles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE funds ENABLE ROW LEVEL SECURITY;
ALTER TABLE scoring_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE upload_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- funds: authenticated can read, service_role can write
CREATE POLICY "Authenticated users can read funds"
  ON funds FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage funds"
  ON funds FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- scoring_config: authenticated can read, admins and service_role can write
CREATE POLICY "Authenticated users can read config"
  ON scoring_config FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can update config"
  ON scoring_config FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

CREATE POLICY "Admins can insert config"
  ON scoring_config FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

CREATE POLICY "Service role can manage config"
  ON scoring_config FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- upload_log: authenticated can read, service_role can insert
CREATE POLICY "Authenticated users can read upload log"
  ON upload_log FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Service role can manage upload log"
  ON upload_log FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- user_roles: users can read their own role, admins can read all
CREATE POLICY "Users can read own role"
  ON user_roles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR is_admin());

CREATE POLICY "Service role can manage roles"
  ON user_roles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
