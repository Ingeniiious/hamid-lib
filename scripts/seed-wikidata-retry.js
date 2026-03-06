#!/usr/bin/env node
/**
 * Retries Wikidata professor seeding for universities that failed due to timeouts.
 * Queries one university at a time (smaller queries = no timeouts).
 *
 * Run: node scripts/seed-wikidata-retry.js
 */

const https = require("https");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const postgres = require("postgres");

const DELAY_MS = 1500;
const PROFESSORS_PER_UNI = 20;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function slugify(text) {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function norm(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/\b(university|universitesi|uni|enstitüsü|yüksekokulu)\b/gi, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(ourName, wdName) {
  const a = norm(ourName).split(" ").filter(w => w.length > 1);
  const b = norm(wdName).split(" ").filter(w => w.length > 1);
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

function sparqlQuery(query) {
  return new Promise((resolve, reject) => {
    const url = `https://query.wikidata.org/sparql?query=${encodeURIComponent(query)}&format=json`;
    const options = {
      headers: {
        "User-Agent": "LibraryyyBot/1.0 (mailto:hello@libraryyy.com)",
        "Accept": "application/sparql-results+json",
      },
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

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  // Get missing Turkish universities
  const missingRows = await sql`
    SELECT DISTINCT f.university FROM faculty f
    WHERE f.university NOT IN (SELECT DISTINCT university FROM professor)
    ORDER BY f.university
  `;
  const missing = missingRows.map(r => r.university);
  console.log(`${missing.length} Turkish universities still need professors\n`);

  if (missing.length === 0) {
    console.log("All done!");
    await sql.end();
    return;
  }

  // Get all Turkish universities from Wikidata
  console.log("Fetching Turkish universities from Wikidata...");
  const uniQuery = `
    SELECT ?uni ?uniLabel ?uniAltLabel WHERE {
      ?uni wdt:P17 wd:Q43 .
      ?uni wdt:P31/wdt:P279* wd:Q3918 .
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" . }
    }
  `;
  const uniData = await sparqlQuery(uniQuery);
  await sleep(DELAY_MS);

  const wdUniversities = uniData.results.bindings.map(b => ({
    id: b.uni.value.replace("http://www.wikidata.org/entity/", ""),
    name: b.uniLabel?.value || "",
    altName: b.uniAltLabel?.value || "",
  }));
  console.log(`Found ${wdUniversities.length} Wikidata universities\n`);

  // Get existing slugs
  const existingSlugs = await sql`SELECT slug FROM professor`;
  const slugSet = new Set(existingSlugs.map(r => r.slug));
  let totalAdded = 0;

  for (let i = 0; i < missing.length; i++) {
    const uniName = missing[i];

    // Match to Wikidata
    let bestMatch = null;
    let bestScore = 0;
    for (const wdUni of wdUniversities) {
      const names = [wdUni.name];
      if (wdUni.altName) names.push(...wdUni.altName.split(", "));
      for (const n of names) {
        const score = similarity(uniName, n);
        if (score > bestScore) { bestScore = score; bestMatch = wdUni; }
      }
    }

    process.stdout.write(`[${i + 1}/${missing.length}] ${uniName}...`);

    if (!bestMatch || bestScore < 0.5) {
      // Try direct search
      const searchName = uniName.replace(/ University$/i, "").replace(/\(.*\)/g, "").trim();
      try {
        const searchQuery = `
          SELECT ?uni ?uniLabel WHERE {
            ?uni wdt:P17 wd:Q43 .
            ?uni wdt:P31/wdt:P279* wd:Q3918 .
            ?uni rdfs:label ?label .
            FILTER(LANG(?label) = "en" || LANG(?label) = "tr")
            FILTER(CONTAINS(LCASE(?label), "${searchName.toLowerCase().replace(/"/g, '\\"')}"))
            SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" . }
          } LIMIT 1
        `;
        const sr = await sparqlQuery(searchQuery);
        await sleep(DELAY_MS);
        if (sr.results?.bindings?.length > 0) {
          bestMatch = {
            id: sr.results.bindings[0].uni.value.replace("http://www.wikidata.org/entity/", ""),
            name: sr.results.bindings[0].uniLabel?.value || "",
          };
        }
      } catch {}
    }

    if (!bestMatch) {
      console.log(" no match");
      continue;
    }

    // Query academics for THIS SINGLE university
    const academicQuery = `
      SELECT ?person ?personLabel ?fieldLabel WHERE {
        {
          ?person wdt:P108 wd:${bestMatch.id} .
        } UNION {
          ?person wdt:P1416 wd:${bestMatch.id} .
        }
        ?person wdt:P31 wd:Q5 .
        OPTIONAL { ?person wdt:P101 ?field . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" . }
      }
      LIMIT ${PROFESSORS_PER_UNI}
    `;

    try {
      const result = await sparqlQuery(academicQuery);
      await sleep(DELAY_MS);

      const seen = new Set();
      const academics = (result.results?.bindings || [])
        .filter(b => {
          const name = b.personLabel?.value;
          if (!name || name.startsWith("Q") || name.length < 3 || seen.has(name)) return false;
          seen.add(name);
          return true;
        })
        .slice(0, PROFESSORS_PER_UNI)
        .map(b => ({ name: b.personLabel.value, field: b.fieldLabel?.value || null }));

      if (academics.length === 0) {
        console.log(` 0 academics via "${bestMatch.name}"`);
        continue;
      }

      const rows = [];
      for (const a of academics) {
        let slug = slugify(a.name);
        let suffix = 0;
        while (slugSet.has(slug)) { suffix++; slug = slugify(a.name) + "-" + suffix; }
        slugSet.add(slug);
        rows.push({ name: a.name, slug, university: uniName, department: a.field });
      }

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
      console.log(` ${rows.length} professors via "${bestMatch.name}"`);
    } catch (err) {
      console.log(` error: ${err.message.slice(0, 60)}`);
      await sleep(DELAY_MS * 2);
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Added: ${totalAdded} professors`);

  const [count] = await sql`SELECT count(*) as total, count(DISTINCT university) as unis FROM professor`;
  console.log(`DB total: ${count.total} professors across ${count.unis} universities`);

  const stillMissing = await sql`
    SELECT DISTINCT f.university FROM faculty f
    WHERE f.university NOT IN (SELECT DISTINCT university FROM professor)
    ORDER BY f.university
  `;
  if (stillMissing.length > 0) {
    console.log(`\nStill missing (${stillMissing.length}):`);
    stillMissing.forEach(r => console.log(`  - ${r.university}`));
  }

  await sql.end();
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
