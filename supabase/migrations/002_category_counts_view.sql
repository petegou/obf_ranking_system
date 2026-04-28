-- Aggregated fund counts per (category, as_of_date) for fast home-page rendering.
CREATE OR REPLACE VIEW category_counts AS
SELECT
  f.category,
  fr.as_of_date,
  COUNT(*)::int AS fund_count
FROM fund_rankings fr
JOIN funds f ON f.ticker = fr.ticker
GROUP BY f.category, fr.as_of_date;

GRANT SELECT ON category_counts TO authenticated, service_role;
