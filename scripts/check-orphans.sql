-- Orphaned daily_logs (user_id not in user table)
SELECT 'daily_logs' AS table_name, id, user_id
FROM daily_logs
WHERE user_id NOT IN (SELECT id FROM "user");

-- Orphaned user_preferences (user_id not in user table)
SELECT 'user_preferences' AS table_name, id, user_id
FROM user_preferences
WHERE user_id NOT IN (SELECT id FROM "user");

-- Row counts for backfill check
SELECT 'daily_logs_count' AS label, COUNT(*)::text AS value FROM daily_logs;
