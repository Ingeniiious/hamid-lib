#!/usr/bin/env node
/**
 * Directly seeds professors for ALL Turkish universities in our faculty table.
 *
 * 1. Gets all Turkish institutions from OpenAlex
 * 2. Fuzzy-matches to our faculty universities
 * 3. Fetches authors and inserts directly into the professor table
 *    using OUR university name (not OpenAlex's)
 *
 * Run: node scripts/seed-turkish-professors.js
 */

const https = require("https");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const postgres = require("postgres");

const EMAIL = "hello@libraryyy.com";
const DELAY_MS = 130;
const AUTHORS_PER_UNI = 20;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: { "User-Agent": `LibraryyyBot/1.0 (mailto:${EMAIL})` },
    };
    https.get(url, options, (res) => {
      let data = "";
      res.on("data", (c) => (data += c));
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Parse error")); }
      });
    }).on("error", reject);
  });
}

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

// Normalize for fuzzy comparison
function norm(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/\b(university|universitesi|uni)\b/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// Word-level similarity with bonus for exact word matches
function similarity(ourName, oaName) {
  const a = norm(ourName).split(" ").filter(w => w.length > 1);
  const b = norm(oaName).split(" ").filter(w => w.length > 1);
  if (a.length === 0 || b.length === 0) return 0;

  let matches = 0;
  for (const wa of a) {
    for (const wb of b) {
      if (wa === wb) { matches += 1; break; }
      if (wa.length >= 4 && wb.length >= 4 && (wa.includes(wb) || wb.includes(wa))) {
        matches += 0.7; break;
      }
    }
  }
  return matches / Math.max(a.length, b.length);
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  // Step 1: Get all our Turkish universities that need professors
  const allOurs = await sql`SELECT DISTINCT university FROM faculty ORDER BY university`;
  const alreadyHave = await sql`SELECT DISTINCT university FROM professor`;
  const haveSet = new Set(alreadyHave.map(r => r.university));
  const missing = allOurs.map(r => r.university).filter(u => !haveSet.has(u));

  console.log(`Our Turkish universities: ${allOurs.length}`);
  console.log(`Already have professors: ${haveSet.size} that overlap`);
  console.log(`Missing: ${missing.length}\n`);

  // Step 2: Get ALL Turkish institutions from OpenAlex
  console.log("Fetching Turkish institutions from OpenAlex...");
  let oaInstitutions = [];
  let page = 1;
  while (true) {
    const url = `https://api.openalex.org/institutions?filter=country_code:TR,type:education&per_page=200&page=${page}&mailto=${EMAIL}`;
    const data = await fetchJSON(url);
    await sleep(DELAY_MS);
    if (!data.results || data.results.length === 0) break;
    oaInstitutions.push(...data.results);
    console.log(`  Page ${page}: ${data.results.length} institutions (${oaInstitutions.length} total)`);
    if (data.results.length < 200) break;
    page++;
  }
  console.log(`\nOpenAlex has ${oaInstitutions.length} Turkish institutions\n`);

  // Step 3: Match with higher threshold and manual verification
  console.log("Matching...\n");
  const matches = [];
  const unmatched = [];

  for (const uniName of missing) {
    let bestMatch = null;
    let bestScore = 0;

    for (const inst of oaInstitutions) {
      const names = [inst.display_name, ...(inst.display_name_alternatives || [])];
      for (const n of names) {
        const score = similarity(uniName, n);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = inst;
        }
      }
    }

    // Higher threshold (0.6) to avoid bad matches like Bogazici -> Gazi
    if (bestMatch && bestScore >= 0.6) {
      matches.push({ ourName: uniName, oaId: bestMatch.id, oaName: bestMatch.display_name, score: bestScore });
      console.log(`  ✓ ${uniName} → ${bestMatch.display_name} (${(bestScore * 100).toFixed(0)}%)`);
    } else {
      unmatched.push(uniName);
      const hint = bestMatch ? `best: ${bestMatch.display_name} (${(bestScore * 100).toFixed(0)}%)` : "no match";
      console.log(`  ✗ ${uniName} — ${hint}`);
    }
  }

  console.log(`\nMatched: ${matches.length}, Unmatched: ${unmatched.length}\n`);

  // Step 4: Fetch authors and insert directly into DB
  console.log("Fetching and inserting professors...\n");

  // Get existing slugs to avoid conflicts
  const existingSlugs = await sql`SELECT slug FROM professor`;
  const slugSet = new Set(existingSlugs.map(r => r.slug));

  let totalAdded = 0;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const shortId = m.oaId.replace("https://openalex.org/", "");
    const url = `https://api.openalex.org/authors?filter=last_known_institutions.id:${shortId}&sort=works_count:desc&per_page=${AUTHORS_PER_UNI}&mailto=${EMAIL}`;

    process.stdout.write(`[${i + 1}/${matches.length}] ${m.ourName}...`);

    let authors;
    try {
      const data = await fetchJSON(url);
      authors = (data.results || []).filter(a => a.display_name && a.display_name.length > 3);
    } catch {
      authors = [];
    }
    await sleep(DELAY_MS);

    if (authors.length === 0) {
      console.log(" 0 authors");
      continue;
    }

    // Build batch insert
    const rows = [];
    for (const a of authors) {
      let slug = slugify(a.display_name);
      let suffix = 0;
      while (slugSet.has(slug)) {
        suffix++;
        slug = slugify(a.display_name) + "-" + suffix;
      }
      slugSet.add(slug);

      const topics = a.topics || [];
      const department = topics.length > 0
        ? topics[0].domain?.display_name || topics[0].field?.display_name || null
        : null;

      rows.push({ name: a.display_name, slug, university: m.ourName, department });
    }

    // Batch insert
    const names = rows.map(r => r.name);
    const slugs = rows.map(r => r.slug);
    const universities = rows.map(r => r.university);
    const departments = rows.map(r => r.department || null);

    await sql`
      INSERT INTO professor (name, slug, university, department)
      SELECT * FROM unnest(${names}::text[], ${slugs}::text[], ${universities}::text[], ${departments}::text[])
      ON CONFLICT (slug) DO NOTHING
    `;

    totalAdded += rows.length;
    console.log(` ${rows.length} professors`);
  }

  console.log(`\n=== Done ===`);
  console.log(`Added: ${totalAdded} professors`);
  console.log(`Unmatched universities: ${unmatched.length}`);
  if (unmatched.length > 0) {
    console.log(`\nUnmatched (not in OpenAlex):`);
    unmatched.forEach(u => console.log(`  - ${u}`));
  }

  const [count] = await sql`SELECT count(*) as total, count(DISTINCT university) as unis FROM professor`;
  console.log(`\nDB total: ${count.total} professors across ${count.unis} universities`);

  await sql.end();
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
