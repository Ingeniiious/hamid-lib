#!/usr/bin/env node
/**
 * Fetches professors/authors from OpenAlex API for universities in our database.
 * Uses the university_domain table as the source of all universities.
 *
 * OpenAlex is a free, open catalog of academic works, authors, and institutions.
 * Polite pool: 10 req/s with email in User-Agent.
 *
 * Run: node scripts/fetch-professors.js [--resume] [--limit N]
 * Output: database/professors.json (appends if --resume)
 *
 * Options:
 *   --resume    Continue from where we left off (reads existing JSON)
 *   --limit N   Max universities to process (default: all)
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

// Load .env.local for DATABASE_URL
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const postgres = require("postgres");

const EMAIL = "hello@libraryyy.com";
const DELAY_MS = 120; // ~8 req/s
const AUTHORS_PER_UNI = 20; // top 20 per university
const OUT_PATH = path.join(__dirname, "../database/professors.json");

const args = process.argv.slice(2);
const resume = args.includes("--resume");
const limitIdx = args.indexOf("--limit");
const uniLimit = limitIdx !== -1 ? parseInt(args[limitIdx + 1]) : Infinity;

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
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 300))); }
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

async function searchInstitution(name) {
  const encoded = encodeURIComponent(name);
  const url = `https://api.openalex.org/institutions?search=${encoded}&per_page=1&mailto=${EMAIL}`;
  try {
    const data = await fetchJSON(url);
    if (data.results && data.results.length > 0) {
      const inst = data.results[0];
      return {
        id: inst.id,
        name: inst.display_name,
        country: inst.country_code,
      };
    }
  } catch (e) {
    // silent fail for individual lookups
  }
  return null;
}

async function fetchAuthorsForInstitution(institutionId, institutionName) {
  const shortId = institutionId.replace("https://openalex.org/", "");
  const url = `https://api.openalex.org/authors?filter=last_known_institutions.id:${shortId}&sort=works_count:desc&per_page=${AUTHORS_PER_UNI}&mailto=${EMAIL}`;

  try {
    const data = await fetchJSON(url);
    if (!data.results) return [];

    return data.results
      .filter(a => a.display_name && a.display_name.length > 3)
      .map(a => {
        const topics = a.topics || [];
        const department = topics.length > 0
          ? topics[0].domain?.display_name || topics[0].field?.display_name || null
          : null;

        return {
          name: a.display_name,
          university: institutionName,
          department,
        };
      });
  } catch {
    return [];
  }
}

async function main() {
  console.log("Fetching professors from OpenAlex for all universities...\n");

  // Connect to DB to get all unique university names
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const rows = await sql`SELECT DISTINCT university_name FROM university_domain ORDER BY university_name`;
  await sql.end();

  const allUniNames = rows.map(r => r.university_name);
  console.log(`Found ${allUniNames.length} unique universities in database`);

  // Load existing data if resuming
  let allProfessors = [];
  const processedUnis = new Set();

  if (resume && fs.existsSync(OUT_PATH)) {
    allProfessors = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
    allProfessors.forEach(p => processedUnis.add(p.university));
    console.log(`Resuming: ${allProfessors.length} professors from ${processedUnis.size} universities already done`);
  }

  const slugSet = new Set(allProfessors.map(p => p.slug));
  const nameUniSet = new Set(allProfessors.map(p => `${p.name}::${p.university}`));

  let processed = 0;
  let skipped = 0;
  let notFound = 0;
  const toProcess = Math.min(allUniNames.length, uniLimit);

  for (let i = 0; i < allUniNames.length && processed < uniLimit; i++) {
    const uniName = allUniNames[i];

    // Skip already processed
    if (processedUnis.has(uniName)) {
      skipped++;
      continue;
    }

    processed++;
    process.stdout.write(`[${processed}/${toProcess - skipped}] ${uniName}...`);

    const institution = await searchInstitution(uniName);
    await sleep(DELAY_MS);

    if (!institution) {
      console.log(" not found");
      notFound++;
      // Mark as processed so we don't retry
      processedUnis.add(uniName);
      continue;
    }

    const authors = await fetchAuthorsForInstitution(institution.id, institution.name);
    await sleep(DELAY_MS);

    let added = 0;
    for (const author of authors) {
      const key = `${author.name}::${author.university}`;
      if (nameUniSet.has(key)) continue;
      nameUniSet.add(key);

      let slug = slugify(author.name);
      let suffix = 0;
      while (slugSet.has(slug)) {
        suffix++;
        slug = slugify(author.name) + "-" + suffix;
      }
      slugSet.add(slug);

      allProfessors.push({
        name: author.name,
        slug,
        university: author.university,
        department: author.department,
      });
      added++;
    }

    processedUnis.add(uniName);
    console.log(` ${added} professors (${allProfessors.length} total)`);

    // Save progress every 50 universities
    if (processed % 50 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(allProfessors, null, 2));
      console.log(`  [saved checkpoint: ${allProfessors.length} professors]`);
    }
  }

  // Final save
  fs.writeFileSync(OUT_PATH, JSON.stringify(allProfessors, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Total professors: ${allProfessors.length}`);
  console.log(`Universities processed: ${processedUnis.size}`);
  console.log(`Not found in OpenAlex: ${notFound}`);

  // Stats by country (top 20)
  const byUni = {};
  allProfessors.forEach(p => { byUni[p.university] = (byUni[p.university] || 0) + 1; });
  console.log(`\nUniversities with professors: ${Object.keys(byUni).length}`);
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
