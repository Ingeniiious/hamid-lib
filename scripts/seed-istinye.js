#!/usr/bin/env node
/**
 * Seeds Istinye University professors from scraped website data.
 * Replaces any existing Wikidata-sourced professors with 622 real ones.
 *
 * Run: node scripts/seed-istinye.js
 */

const path = require("path");
const fs = require("fs");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const postgres = require("postgres");

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const data = JSON.parse(fs.readFileSync(path.join(__dirname, "../database/istinye-professors.json"), "utf-8"));

  console.log(`Loaded ${data.length} Istinye professors from JSON\n`);

  // Delete old Istinye professors (the 18 from Wikidata)
  const deleted = await sql`DELETE FROM professor WHERE university = 'Istinye University' RETURNING id`;
  console.log(`Deleted ${deleted.length} old Istinye professors`);

  // Get all existing slugs (for other universities)
  const existingSlugs = await sql`SELECT slug FROM professor`;
  const slugSet = new Set(existingSlugs.map(r => r.slug));

  // Build rows
  const rows = [];
  for (const p of data) {
    let slug = slugify(p.name);
    let suffix = 0;
    while (slugSet.has(slug)) {
      suffix++;
      slug = slugify(p.name) + "-" + suffix;
    }
    slugSet.add(slug);

    rows.push({
      name: p.name,
      slug,
      university: "Istinye University",
      department: p.department || p.faculty || null,
    });
  }

  // Batch insert (chunks of 100 for safety)
  const CHUNK = 100;
  let total = 0;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const chunk = rows.slice(i, i + CHUNK);
    const names = chunk.map(r => r.name);
    const slugs = chunk.map(r => r.slug);
    const universities = chunk.map(r => r.university);
    const departments = chunk.map(r => r.department);

    await sql`
      INSERT INTO professor (name, slug, university, department)
      SELECT * FROM unnest(${names}::text[], ${slugs}::text[], ${universities}::text[], ${departments}::text[])
      ON CONFLICT (slug) DO NOTHING
    `;
    total += chunk.length;
    console.log(`  Inserted ${total}/${rows.length}`);
  }

  const [count] = await sql`
    SELECT count(*) as total FROM professor WHERE university = 'Istinye University'
  `;
  console.log(`\nIstinye University now has ${count.total} professors`);

  const [overall] = await sql`SELECT count(*) as total, count(DISTINCT university) as unis FROM professor`;
  console.log(`DB total: ${overall.total} professors across ${overall.unis} universities`);

  await sql.end();
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
