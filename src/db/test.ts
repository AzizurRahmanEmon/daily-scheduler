import { db } from "./index";
import { sql } from "drizzle-orm";

async function main() {
  const result = await db.execute(sql`SELECT NOW()`);
  console.log(result);
}

main();
