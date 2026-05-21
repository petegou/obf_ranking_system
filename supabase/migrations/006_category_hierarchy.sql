-- Category hierarchy dimension table: maps each "Assigned Category"
-- (matches funds.category) to a 4-level grouping for sidebar rendering.
-- Idempotent + additive; safe to re-run.

CREATE TABLE IF NOT EXISTS category_hierarchy (
  category TEXT PRIMARY KEY,
  level_1  TEXT NOT NULL,
  level_2  TEXT,
  level_3  TEXT,
  level_4  TEXT
);

ALTER TABLE category_hierarchy ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read category hierarchy"
  ON category_hierarchy;
CREATE POLICY "Authenticated users can read category hierarchy"
  ON category_hierarchy FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Service role can manage category hierarchy"
  ON category_hierarchy;
CREATE POLICY "Service role can manage category hierarchy"
  ON category_hierarchy FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Seed 59 rows from the source Excel (Book1.xlsx, sheet Sheet1).
INSERT INTO category_hierarchy (category, level_1, level_2, level_3, level_4) VALUES
  ('Alternatives', 'Alternatives', NULL, NULL, NULL),
  ('Asset Allocation', 'Asset Allocation', NULL, NULL, NULL),
  ('Cash / Money Market - Tax-Free', 'Cash / Money Market', 'Tax-Free', NULL, NULL),
  ('Cash / Money Market - Taxable', 'Cash / Money Market', 'Taxable', NULL, NULL),
  ('Commodities', 'Commodities', NULL, NULL, NULL),
  ('Crypto / Digital Assets', 'Crypto / Digital Assets', NULL, NULL, NULL),
  ('Emerging Markets', 'Emerging Markets', NULL, NULL, NULL),
  ('FI - Bank Loan', 'Fixed Income', 'Bank Loan', NULL, NULL),
  ('FI - Convertibles', 'Fixed Income', 'Convertibles', NULL, NULL),
  ('FI - Core', 'Fixed Income', 'Core', NULL, NULL),
  ('FI - Core Plus', 'Fixed Income', 'Core Plus', NULL, NULL),
  ('FI - Emerging Markets Bond', 'Fixed Income', 'Emerging Markets Bond', NULL, NULL),
  ('FI - Global Bond', 'Fixed Income', 'Global Bond', NULL, NULL),
  ('FI - High Yield', 'Fixed Income', 'High Yield', NULL, NULL),
  ('FI - Long-Term', 'Fixed Income', 'Long-Term', NULL, NULL),
  ('FI - Mortgage Backed Security', 'Fixed Income', 'Mortgage Backed Security', NULL, NULL),
  ('FI - Multisector', 'Fixed Income', 'Multisector', NULL, NULL),
  ('FI - Muni High Yield', 'Fixed Income', 'Muni Bonds', 'National', 'High Yield'),
  ('FI - Muni Long - National', 'Fixed Income', 'Muni Bonds', 'National', 'Long'),
  ('FI - Muni Long - Single State', 'Fixed Income', 'Muni Bonds', 'Single State', 'Long'),
  ('FI - Muni Short - National', 'Fixed Income', 'Muni Bonds', 'National', 'Short'),
  ('FI - Muni Short - Single State', 'Fixed Income', 'Muni Bonds', 'Single State', 'Short'),
  ('FI - Municipal - National', 'Fixed Income', 'Muni Bonds', 'National', 'Municipal'),
  ('FI - Municipal - Single State', 'Fixed Income', 'Muni Bonds', 'Single State', 'Municipal'),
  ('FI - Nontraditional', 'Fixed Income', 'Nontraditional', NULL, NULL),
  ('FI - Other', 'Fixed Income', 'Other', NULL, NULL),
  ('FI - Preferred', 'Fixed Income', 'Preferred', NULL, NULL),
  ('FI - Private Debt', 'Fixed Income', 'Private Debt', NULL, NULL),
  ('FI - Securitized', 'Fixed Income', 'Securitized', NULL, NULL),
  ('FI - Short-Term', 'Fixed Income', 'Short-Term', NULL, NULL),
  ('FI - TIPS', 'Fixed Income', 'TIPS', 'TIPS', NULL),
  ('FI - TIPS Short-Term', 'Fixed Income', 'TIPS', 'Short-Term', NULL),
  ('FI - US Government Intermediate', 'Fixed Income', 'US Government', 'Intermediate', NULL),
  ('FI - US Government Long', 'Fixed Income', 'US Government', 'Long', NULL),
  ('FI - US Government Short', 'Fixed Income', 'US Government', 'Short', NULL),
  ('FI - Ultrashort', 'Fixed Income', 'Ultrashort', NULL, NULL),
  ('Foreign Large Cap Blend', 'Foreign Equities', 'Large Cap', 'Blend', NULL),
  ('Foreign Large Cap Growth', 'Foreign Equities', 'Large Cap', 'Growth', NULL),
  ('Foreign Large Cap Value', 'Foreign Equities', 'Large Cap', 'Value', NULL),
  ('Foreign Small/Mid Cap Blend', 'Foreign Equities', 'Small/Mid Cap', 'Blend', NULL),
  ('Foreign Small/Mid Cap Growth', 'Foreign Equities', 'Small/Mid Cap', 'Growth', NULL),
  ('Foreign Small/Mid Cap Value', 'Foreign Equities', 'Small/Mid Cap', 'Value', NULL),
  ('Global Large Cap Blend', 'Global Equities', 'Large Cap', 'Blend', NULL),
  ('Global Large Cap Growth', 'Global Equities', 'Large Cap', 'Growth', NULL),
  ('Global Large Cap Value', 'Global Equities', 'Large Cap', 'Value', NULL),
  ('Global Small/Mid Cap Blend', 'Global Equities', 'Small/Mid Cap', 'Blend', NULL),
  ('Global Real Estate', 'Real Estate', 'Global Real Estate', NULL, NULL),
  ('Real Estate', 'Real Estate', 'Real Estate', NULL, NULL),
  ('Sector Equity', 'Sector Equity', NULL, NULL, NULL),
  ('Trading / Inverse', 'Trading / Inverse', NULL, NULL, NULL),
  ('US Large Cap Blend', 'US Equities', 'Large Cap', 'Blend', NULL),
  ('US Large Cap Growth', 'US Equities', 'Large Cap', 'Growth', NULL),
  ('US Large Cap Value', 'US Equities', 'Large Cap', 'Value', NULL),
  ('US Mid Cap Blend', 'US Equities', 'Mid Cap', 'Blend', NULL),
  ('US Mid Cap Growth', 'US Equities', 'Mid Cap', 'Growth', NULL),
  ('US Mid Cap Value', 'US Equities', 'Mid Cap', 'Value', NULL),
  ('US Small Cap Blend', 'US Equities', 'Small Cap', 'Blend', NULL),
  ('US Small Cap Growth', 'US Equities', 'Small Cap', 'Growth', NULL),
  ('US Small Cap Value', 'US Equities', 'Small Cap', 'Value', NULL)
ON CONFLICT (category) DO UPDATE SET
  level_1 = EXCLUDED.level_1,
  level_2 = EXCLUDED.level_2,
  level_3 = EXCLUDED.level_3,
  level_4 = EXCLUDED.level_4;

-- Recreate category_counts to expose L1-L4 alongside counts.
-- LEFT JOIN so funds whose category is missing from the hierarchy still appear
-- (the sidebar will bucket them under an "Uncategorized" group).
CREATE OR REPLACE VIEW category_counts
WITH (security_invoker = true) AS
SELECT
  f.category,
  fr.as_of_date,
  COUNT(*)::int AS fund_count,
  h.level_1,
  h.level_2,
  h.level_3,
  h.level_4
FROM fund_rankings fr
JOIN funds f ON f.ticker = fr.ticker
LEFT JOIN category_hierarchy h ON h.category = f.category
GROUP BY f.category, fr.as_of_date, h.level_1, h.level_2, h.level_3, h.level_4;

GRANT SELECT ON category_counts TO authenticated, service_role;
GRANT SELECT ON category_hierarchy TO authenticated, service_role;
