import { neon, type NeonQueryFunction } from "@neondatabase/serverless";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  countMealsForLog,
  seedMealsIfNeeded,
} from "@/db/queries/planned-items";
import { getPresetMealTemplates } from "@/lib/meals/presets";

const hasDb = Boolean(process.env.DATABASE_URL);

async function getSeedTestContext(): Promise<{
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

const seedContext = await getSeedTestContext();

if (seedContext) {
  describe("seedMealsIfNeeded", () => {
    const { sql, userId } = seedContext;
    let logId: string;

    beforeAll(async () => {
      const inserted = await sql`
        INSERT INTO daily_logs (user_id, date, timezone, status)
        VALUES (${userId}, '2099-01-01', 'UTC', 'draft')
        RETURNING id
      `;
      logId = inserted[0]!.id as string;
    });

    afterAll(async () => {
      await sql`DELETE FROM daily_logs WHERE id = ${logId}::uuid`;
    });

    it("seeds once under parallel calls", async () => {
      const templates = getPresetMealTemplates(3);
      await Promise.all([
        seedMealsIfNeeded(logId, templates),
        seedMealsIfNeeded(logId, templates),
      ]);

      expect(await countMealsForLog(logId)).toBe(3);
    });

    it("does not re-seed after meals were deleted", async () => {
      await sql`DELETE FROM planned_items WHERE daily_log_id = ${logId}::uuid`;

      const templates = getPresetMealTemplates(3);
      await seedMealsIfNeeded(logId, templates);

      expect(await countMealsForLog(logId)).toBe(0);
    });
  });
} else {
  describe.skip("seedMealsIfNeeded", () => {
    it("requires DATABASE_URL and at least one user row", () => {});
  });
}
