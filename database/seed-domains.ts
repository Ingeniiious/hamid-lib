import { config } from "dotenv";
config({ path: ".env.local" });
import postgres from "postgres";

const HIPO_URL =
  "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";

interface HipoEntry {
  name: string;
  domains: string[];
  country: string;
  alpha_two_code: string;
  "state-province": string | null;
  web_pages: string[];
}

async function seed() {
  console.log("Fetching university domains from Hipo dataset...");
  const res = await fetch(HIPO_URL);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  const data: HipoEntry[] = await res.json();
  console.log(`Fetched ${data.length} universities`);

  // Flatten: one row per domain
  const rows: { name: string; domain: string; country: string }[] = [];
  const seen = new Set<string>();

  for (const uni of data) {
    for (const d of uni.domains) {
      const domain = d.toLowerCase().trim();
      if (!domain || seen.has(domain)) continue;
      seen.add(domain);
      rows.push({
        name: uni.name,
        domain,
        country: uni.alpha_two_code || uni.country,
      });
    }
  }

  console.log(`Prepared ${rows.length} unique domain rows`);

  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });

  // Use raw SQL COPY-style insert with unnest for efficiency
  const BATCH_SIZE = 200;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    const names = batch.map((r) => r.name);
    const domains = batch.map((r) => r.domain);
    const countries = batch.map((r) => r.country);

    await sql`
      INSERT INTO university_domain (university_name, domain, country)
      SELECT * FROM unnest(${names}::text[], ${domains}::text[], ${countries}::text[])
      ON CONFLICT (domain) DO NOTHING
    `;
    inserted += batch.length;
    if (inserted % 2000 === 0 || i + BATCH_SIZE >= rows.length) {
      console.log(`  Progress: ${inserted}/${rows.length}`);
    }
  }

  console.log(`Done! Inserted ${rows.length} university domains.`);
  await sql.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
