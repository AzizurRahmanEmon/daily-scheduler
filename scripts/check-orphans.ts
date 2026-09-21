import { neon } from "@neondatabase/serverless";
import { config } from "dotenv";

config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);

async function main() {
  const orphanedLogs = await sql`
    SELECT id, user_id FROM daily_logs
    WHERE user_id NOT IN (SELECT id FROM "user")
  `;
  const orphanedPrefs = await sql`
    SELECT id, user_id FROM user_preferences
    WHERE user_id NOT IN (SELECT id FROM "user")
  `;
  const [{ c: dailyLogsCount }] = await sql`
    SELECT COUNT(*)::int AS c FROM daily_logs
  `;

  console.log(JSON.stringify({ orphanedLogs, orphanedPrefs, dailyLogsCount }, null, 2));
}

main().catch(console.error);
