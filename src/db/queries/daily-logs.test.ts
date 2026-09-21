import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { getOrCreateTodayLog } from "@/db/queries/daily-logs";

const hasDb = Boolean(process.env.DATABASE_URL);

async function getTestContext(): Promise<{
  sql: NeonQueryFunction<false, false>;
  userId: string;
} | null> {
  if (!hasDb) {
    return null;
  }

  const sql = neon(process.env.DATABASE_URL!);
  const users = await sql`SELECT id FROM "user" LIMIT 1`;
  if (users.length === 0) {
    return null;
  }

  return {
    sql,
    userId: users[0]!.id as string,
  };
}

const testContext = await getTestContext();

if (testContext) {
  describe("getOrCreateTodayLog day rollover", () => {
    const { sql, userId } = testContext;
    const yesterdayDate = "2099-02-01";
    const todayDate = "2099-02-02";
    let yesterdayLogId: string;

    beforeAll(async () => {
      await sql`
        UPDATE user_preferences
        SET timezone = 'America/New_York'
        WHERE user_id = ${userId}
      `;

      const inserted = await sql`
        INSERT INTO daily_logs (user_id, date, timezone, status, wake_time)
        VALUES (
          ${userId},
          ${yesterdayDate}::date,
          'America/New_York',
          'in_progress',
          '07:00:00'::time
        )
        ON CONFLICT (user_id, date) DO UPDATE
        SET status = 'in_progress', wake_time = '07:00:00'::time
        RETURNING id
      `;
      yesterdayLogId = inserted[0]!.id as string;

      await sql`
        DELETE FROM daily_logs
        WHERE user_id = ${userId} AND date = ${todayDate}::date
      `;
    });

    afterAll(async () => {
      await sql`
        DELETE FROM daily_logs
        WHERE user_id = ${userId}
          AND date IN (${yesterdayDate}::date, ${todayDate}::date)
      `;
    });

    it("resumes yesterday before 4am when it is still open", async () => {
      const now = new Date("2099-02-02T06:30:00.000Z"); // 01:30 EST
      const log = await getOrCreateTodayLog(userId, now);

      expect(log.date).toBe(yesterdayDate);
    });

    it("starts today after yesterday is closed at 1am", async () => {
      await sql`
        UPDATE daily_logs
        SET status = 'closed', updated_at = now()
        WHERE id = ${yesterdayLogId}::uuid
      `;

      const now = new Date("2099-02-02T06:30:00.000Z"); // 01:30 EST
      const log = await getOrCreateTodayLog(userId, now);

      expect(log.date).toBe(todayDate);
      expect(log.status).toBe("draft");
    });
  });
} else {
  describe.skip("getOrCreateTodayLog day rollover", () => {
    it("requires DATABASE_URL and at least one user row", () => {});
  });
}
