import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";
import { readFileSync, existsSync } from "fs";
import { join } from "path";

interface ProfessorEntry {
  name: string;
  slug: string;
  university: string;
  department: string | null;
}

async function seed() {
  const jsonPath = join(__dirname, "professors.json");
  if (!existsSync(jsonPath)) {
    console.error("database/professors.json not found. Run `node scripts/fetch-professors.js` first.");
    process.exit(1);
  }

  const data: ProfessorEntry[] = JSON.parse(readFileSync(jsonPath, "utf-8"));
  console.log(`Loaded ${data.length} professors from professors.json`);

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  // Batch insert with unnest for efficiency
  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < data.length; i += BATCH_SIZE) {
    const batch = data.slice(i, i + BATCH_SIZE);
    const names = batch.map((r) => r.name);
    const slugs = batch.map((r) => r.slug);
    const universities = batch.map((r) => r.university);
    const departments = batch.map((r) => r.department || null);

    await sql`
      INSERT INTO professor (name, slug, university, department)
      SELECT * FROM unnest(
        ${names}::text[],
        ${slugs}::text[],
        ${universities}::text[],
        ${departments}::text[]
      )
      ON CONFLICT (slug) DO NOTHING
    `;
    inserted += batch.length;
    if (inserted % 200 === 0 || i + BATCH_SIZE >= data.length) {
      console.log(`  Progress: ${inserted}/${data.length}`);
    }
  }

  console.log(`Done! Seeded ${data.length} professors.`);
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
