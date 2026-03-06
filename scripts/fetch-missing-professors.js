#!/usr/bin/env node
/**
 * Fetches professors for Turkish universities that were missed by the main fetch.
 * Uses smarter search: tries multiple name variations per university.
 *
 * Run: node scripts/fetch-missing-professors.js
 * Appends to: database/professors.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, "../.env.local") });
const postgres = require("postgres");

const EMAIL = "hello@libraryyy.com";
const DELAY_MS = 130;
const AUTHORS_PER_UNI = 20;
const OUT_PATH = path.join(__dirname, "../database/professors.json");

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

// Generate search variations for Turkish university names
function getSearchVariations(name) {
  const variations = [name];

  // Try without "University" suffix
  const noUni = name.replace(/ University$/i, "").replace(/ Üniversitesi$/i, "");

  // Common Turkish character replacements for OpenAlex search
  const turkified = name
    .replace(/ş/gi, "s").replace(/ç/gi, "c").replace(/ğ/gi, "g")
    .replace(/ı/gi, "i").replace(/ö/gi, "o").replace(/ü/gi, "u")
    .replace(/Ş/gi, "S").replace(/Ç/gi, "C").replace(/Ğ/gi, "G")
    .replace(/İ/gi, "I").replace(/Ö/gi, "O").replace(/Ü/gi, "U")
    .replace(/â/gi, "a").replace(/î/gi, "i");

  if (turkified !== name) variations.push(turkified);

  // Add Turkish version: "X University" -> "X Üniversitesi"
  if (name.endsWith(" University")) {
    variations.push(noUni + " Üniversitesi");
  }

  // Try just the core name
  variations.push(noUni);

  // For names like "Istanbul Technical University (ITU)", try the abbreviation
  const parenMatch = name.match(/\(([^)]+)\)/);
  if (parenMatch) {
    variations.push(parenMatch[1]);
    variations.push(name.replace(/\s*\([^)]+\)/, ""));
  }

  // Dedupe
  return [...new Set(variations)];
}

async function searchInstitution(name) {
  const encoded = encodeURIComponent(name);
  const url = `https://api.openalex.org/institutions?search=${encoded}&filter=type:education&per_page=3&mailto=${EMAIL}`;
  try {
    const data = await fetchJSON(url);
    if (data.results && data.results.length > 0) {
      // Try to find the best match (prefer Turkey)
      const trMatch = data.results.find(r => r.country_code === "TR");
      const inst = trMatch || data.results[0];
      return {
        id: inst.id,
        name: inst.display_name,
        country: inst.country_code,
      };
    }
  } catch {}
  return null;
}

async function fetchAuthors(institutionId, institutionName) {
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
        return { name: a.display_name, university: institutionName, department };
      });
  } catch { return []; }
}

async function main() {
  console.log("Fetching professors for missing Turkish universities...\n");

  const sql = postgres(process.env.DATABASE_URL, { max: 1 });

  // Get Turkish universities that have no professors
  const missing = await sql`
    SELECT DISTINCT f.university
    FROM faculty f
    WHERE f.university NOT IN (SELECT DISTINCT university FROM professor)
    ORDER BY f.university
  `;
  await sql.end();

  console.log(`${missing.length} Turkish universities missing professors\n`);

  // Load existing professors
  let allProfessors = [];
  if (fs.existsSync(OUT_PATH)) {
    allProfessors = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
  }
  const slugSet = new Set(allProfessors.map(p => p.slug));
  const nameUniSet = new Set(allProfessors.map(p => `${p.name}::${p.university}`));

  let found = 0;
  let notFound = 0;

  for (let i = 0; i < missing.length; i++) {
    const uniName = missing[i].university;
    const variations = getSearchVariations(uniName);

    process.stdout.write(`[${i + 1}/${missing.length}] ${uniName}...`);

    let institution = null;
    for (const variant of variations) {
      institution = await searchInstitution(variant);
      await sleep(DELAY_MS);
      if (institution) break;
    }

    if (!institution) {
      console.log(` not found (tried ${variations.length} variations)`);
      notFound++;
      continue;
    }

    const authors = await fetchAuthors(institution.id, uniName); // Use OUR name, not OpenAlex's
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

    found++;
    console.log(` ${added} professors via "${institution.name}" (${allProfessors.length} total)`);

    // Checkpoint every 25
    if (found % 25 === 0) {
      fs.writeFileSync(OUT_PATH, JSON.stringify(allProfessors, null, 2));
      console.log(`  [checkpoint saved]`);
    }
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(allProfessors, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`Found: ${found} / ${missing.length}`);
  console.log(`Still missing: ${notFound}`);
  console.log(`Total professors: ${allProfessors.length}`);
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
