#!/usr/bin/env node
/**
 * Seeds professors for Turkish universities using Wikidata SPARQL API.
 * Wikidata has no daily quota — unlimited free queries.
 *
 * Strategy:
 * 1. Query Wikidata for ALL Turkish university entities
 * 2. Fuzzy-match to our faculty table universities
 * 3. For each matched university, query Wikidata for affiliated academics
 * 4. Insert directly into professor table using OUR university names
 *
 * Run: node scripts/seed-wikidata-professors.js
 */

const https = require("https");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const postgres = require("postgres");

const DELAY_MS = 2000; // Wikidata wants <=1 req/s for bots
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
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 500))); }
      });
    }).on("error", reject);
  });
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  // Step 1: Get missing Turkish universities
  const allOurs = await sql`SELECT DISTINCT university FROM faculty ORDER BY university`;
  const alreadyHave = await sql`SELECT DISTINCT university FROM professor`;
  const haveSet = new Set(alreadyHave.map(r => r.university));
  const missing = allOurs.map(r => r.university).filter(u => !haveSet.has(u));

  console.log(`Missing: ${missing.length} Turkish universities need professors\n`);

  // Step 2: Fetch ALL Turkish universities from Wikidata
  console.log("Fetching Turkish universities from Wikidata...");
  const uniQuery = `
    SELECT ?uni ?uniLabel ?uniAltLabel WHERE {
      ?uni wdt:P17 wd:Q43 .           # country: Turkey
      ?uni wdt:P31/wdt:P279* wd:Q3918 . # instance of university (or subclass)
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

  console.log(`Found ${wdUniversities.length} Turkish universities in Wikidata\n`);

  // Step 3: Match our universities to Wikidata entities
  console.log("Matching...\n");
  const matches = [];
  const unmatched = [];

  for (const uniName of missing) {
    let bestMatch = null;
    let bestScore = 0;

    for (const wdUni of wdUniversities) {
      const names = [wdUni.name];
      if (wdUni.altName) {
        // altLabel can have multiple comma-separated values
        names.push(...wdUni.altName.split(", "));
      }
      for (const n of names) {
        const score = similarity(uniName, n);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = wdUni;
        }
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      matches.push({ ourName: uniName, wdId: bestMatch.id, wdName: bestMatch.name, score: bestScore });
      console.log(`  ✓ ${uniName} → ${bestMatch.name} [${bestMatch.id}] (${(bestScore * 100).toFixed(0)}%)`);
    } else {
      unmatched.push(uniName);
      const hint = bestMatch ? `best: ${bestMatch.name} (${(bestScore * 100).toFixed(0)}%)` : "no match";
      console.log(`  ✗ ${uniName} — ${hint}`);
    }
  }

  console.log(`\nMatched: ${matches.length}, Unmatched: ${unmatched.length}\n`);

  // Step 4: For each matched university, fetch academics from Wikidata
  console.log("Fetching academics...\n");

  const existingSlugs = await sql`SELECT slug FROM professor`;
  const slugSet = new Set(existingSlugs.map(r => r.slug));
  let totalAdded = 0;

  // Batch universities into groups to query more efficiently
  const BATCH_SIZE = 10;
  for (let batchStart = 0; batchStart < matches.length; batchStart += BATCH_SIZE) {
    const batch = matches.slice(batchStart, batchStart + BATCH_SIZE);
    const wdIds = batch.map(m => `wd:${m.wdId}`).join(" ");
    const idToMatch = {};
    batch.forEach(m => { idToMatch[m.wdId] = m; });

    process.stdout.write(`[${batchStart + 1}-${Math.min(batchStart + BATCH_SIZE, matches.length)}/${matches.length}] Batch query...`);

    // Query for people affiliated with these universities
    const academicQuery = `
      SELECT ?person ?personLabel ?uni ?field ?fieldLabel WHERE {
        VALUES ?uni { ${wdIds} }
        {
          ?person wdt:P108 ?uni .          # employer
        } UNION {
          ?person wdt:P1416 ?uni .         # affiliation
        } UNION {
          ?person wdt:P69 ?uni .           # educated at (alumni who are also academics)
          ?person wdt:P106 ?occupation .
          VALUES ?occupation { wd:Q1622272 wd:Q121594 wd:Q15995642 wd:Q37226 }
        }
        ?person wdt:P31 wd:Q5 .           # instance of human
        OPTIONAL { ?person wdt:P101 ?field . }
        SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" . }
      }
      LIMIT ${PROFESSORS_PER_UNI * BATCH_SIZE * 2}
    `;

    try {
      const result = await sparqlQuery(academicQuery);
      await sleep(DELAY_MS);

      // Group by university
      const byUni = {};
      for (const b of (result.results?.bindings || [])) {
        const wdId = b.uni.value.replace("http://www.wikidata.org/entity/", "");
        const personName = b.personLabel?.value || "";
        const field = b.fieldLabel?.value || null;

        // Skip if name looks like a Wikidata ID (unresolved label)
        if (!personName || personName.startsWith("Q") || personName.length < 3) continue;

        if (!byUni[wdId]) byUni[wdId] = [];
        // Dedup within uni
        if (byUni[wdId].length < PROFESSORS_PER_UNI && !byUni[wdId].some(p => p.name === personName)) {
          byUni[wdId].push({ name: personName, field });
        }
      }

      // Insert into DB per university
      let batchAdded = 0;
      for (const m of batch) {
        const academics = byUni[m.wdId] || [];
        if (academics.length === 0) continue;

        const rows = [];
        for (const a of academics) {
          let slug = slugify(a.name);
          let suffix = 0;
          while (slugSet.has(slug)) {
            suffix++;
            slug = slugify(a.name) + "-" + suffix;
          }
          slugSet.add(slug);
          rows.push({ name: a.name, slug, university: m.ourName, department: a.field });
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

        batchAdded += rows.length;
      }

      totalAdded += batchAdded;
      console.log(` ${batchAdded} professors`);
    } catch (err) {
      console.log(` ERROR: ${err.message}`);
      await sleep(DELAY_MS * 3); // Back off on error
    }
  }

  // Step 5: For unmatched universities, try direct search by name
  if (unmatched.length > 0) {
    console.log(`\nTrying direct search for ${unmatched.length} unmatched universities...\n`);

    for (let i = 0; i < unmatched.length; i++) {
      const uniName = unmatched[i];
      // Simplify the name for search
      const searchName = uniName
        .replace(/ University$/i, "")
        .replace(/\(.*\)/g, "")
        .trim();

      process.stdout.write(`[${i + 1}/${unmatched.length}] ${uniName}...`);

      const searchQuery = `
        SELECT ?uni ?uniLabel WHERE {
          ?uni wdt:P17 wd:Q43 .
          ?uni wdt:P31/wdt:P279* wd:Q3918 .
          ?uni rdfs:label ?label .
          FILTER(LANG(?label) = "en" || LANG(?label) = "tr")
          FILTER(CONTAINS(LCASE(?label), "${searchName.toLowerCase().replace(/"/g, '\\"')}"))
          SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" . }
        }
        LIMIT 1
      `;

      try {
        const searchResult = await sparqlQuery(searchQuery);
        await sleep(DELAY_MS);

        if (searchResult.results?.bindings?.length > 0) {
          const wdId = searchResult.results.bindings[0].uni.value.replace("http://www.wikidata.org/entity/", "");
          const wdName = searchResult.results.bindings[0].uniLabel?.value || "";

          // Now fetch academics for this university
          const academicQuery = `
            SELECT ?person ?personLabel ?fieldLabel WHERE {
              {
                ?person wdt:P108 wd:${wdId} .
              } UNION {
                ?person wdt:P1416 wd:${wdId} .
              }
              ?person wdt:P31 wd:Q5 .
              OPTIONAL { ?person wdt:P101 ?field . }
              SERVICE wikibase:label { bd:serviceParam wikibase:language "en,tr" . }
            }
            LIMIT ${PROFESSORS_PER_UNI}
          `;

          const acResult = await sparqlQuery(academicQuery);
          await sleep(DELAY_MS);

          const academics = (acResult.results?.bindings || [])
            .filter(b => b.personLabel?.value && !b.personLabel.value.startsWith("Q") && b.personLabel.value.length > 3)
            .map(b => ({ name: b.personLabel.value, field: b.fieldLabel?.value || null }));

          // Dedup by name
          const seen = new Set();
          const unique = academics.filter(a => {
            if (seen.has(a.name)) return false;
            seen.add(a.name);
            return true;
          }).slice(0, PROFESSORS_PER_UNI);

          if (unique.length > 0) {
            const rows = [];
            for (const a of unique) {
              let slug = slugify(a.name);
              let suffix = 0;
              while (slugSet.has(slug)) {
                suffix++;
                slug = slugify(a.name) + "-" + suffix;
              }
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
            console.log(` ${rows.length} professors via "${wdName}"`);
          } else {
            console.log(` found "${wdName}" but 0 academics`);
          }
        } else {
          console.log(` not found`);
        }
      } catch (err) {
        console.log(` error: ${err.message.slice(0, 80)}`);
        await sleep(DELAY_MS * 2);
      }
    }
  }

  console.log(`\n=== Done ===`);
  console.log(`Added: ${totalAdded} professors`);

  const [count] = await sql`SELECT count(*) as total, count(DISTINCT university) as unis FROM professor`;
  console.log(`DB total: ${count.total} professors across ${count.unis} universities`);

  // Show still-missing
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
