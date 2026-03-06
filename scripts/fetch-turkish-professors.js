#!/usr/bin/env node
/**
 * Fetches Turkish professors by querying OpenAlex for ALL institutions in Turkey,
 * then matching them to our faculty table universities.
 *
 * Strategy:
 * 1. Get ALL Turkish institutions from OpenAlex (filter by country_code:TR)
 * 2. Match them to our 202 faculty universities by fuzzy name comparison
 * 3. Fetch top authors for each matched institution
 *
 * Run: node scripts/fetch-turkish-professors.js
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

// Normalize for comparison: lowercase, strip diacritics, remove "university"/"üniversitesi"
function normalize(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ü/g, "u").replace(/ö/g, "o").replace(/ç/g, "c")
    .replace(/ş/g, "s").replace(/ğ/g, "g").replace(/ı/g, "i")
    .replace(/\buniversit(y|esi)\b/g, "")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarity(a, b) {
  const wordsA = normalize(a).split(" ").filter(Boolean);
  const wordsB = normalize(b).split(" ").filter(Boolean);
  if (wordsA.length === 0 || wordsB.length === 0) return 0;

  let matches = 0;
  for (const wa of wordsA) {
    for (const wb of wordsB) {
      if (wa === wb || wa.includes(wb) || wb.includes(wa)) {
        matches++;
        break;
      }
    }
  }
  return matches / Math.max(wordsA.length, wordsB.length);
}

async function fetchAuthors(institutionId, universityName) {
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
        return { name: a.display_name, university: universityName, department };
      });
  } catch { return []; }
}

async function main() {
  console.log("Step 1: Getting all Turkish institutions from OpenAlex...\n");

  // Fetch all Turkish institutions (paginated)
  let allInstitutions = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const url = `https://api.openalex.org/institutions?filter=country_code:TR,type:education&per_page=200&page=${page}&mailto=${EMAIL}`;
    const data = await fetchJSON(url);
    await sleep(DELAY_MS);

    if (!data.results || data.results.length === 0) {
      hasMore = false;
    } else {
      allInstitutions.push(...data.results);
      console.log(`  Page ${page}: got ${data.results.length} (${allInstitutions.length} total)`);
      if (data.results.length < 200) hasMore = false;
      page++;
    }
  }

  console.log(`\nFound ${allInstitutions.length} Turkish institutions in OpenAlex\n`);

  // Step 2: Get our universities that need professors
  const sql = postgres(process.env.DATABASE_URL, { max: 1 });
  const missingRows = await sql`
    SELECT DISTINCT f.university
    FROM faculty f
    WHERE f.university NOT IN (SELECT DISTINCT university FROM professor)
    ORDER BY f.university
  `;
  await sql.end();

  const missingUnis = missingRows.map(r => r.university);
  console.log(`${missingUnis.length} Turkish universities still need professors\n`);

  // Step 3: Match OpenAlex institutions to our universities
  console.log("Step 2: Matching OpenAlex institutions to our universities...\n");

  const matches = [];
  for (const uniName of missingUnis) {
    let bestMatch = null;
    let bestScore = 0;

    for (const inst of allInstitutions) {
      // Try matching against display_name and any alternative names
      const names = [inst.display_name, ...(inst.display_name_alternatives || [])];
      for (const n of names) {
        const score = similarity(uniName, n);
        if (score > bestScore) {
          bestScore = score;
          bestMatch = inst;
        }
      }
    }

    if (bestMatch && bestScore >= 0.5) {
      matches.push({
        ourName: uniName,
        openAlexName: bestMatch.display_name,
        openAlexId: bestMatch.id,
        score: bestScore,
      });
      console.log(`  ✓ ${uniName} → ${bestMatch.display_name} (${(bestScore * 100).toFixed(0)}%)`);
    } else {
      console.log(`  ✗ ${uniName} — best: ${bestMatch?.display_name || "none"} (${(bestScore * 100).toFixed(0)}%)`);
    }
  }

  console.log(`\nMatched ${matches.length} / ${missingUnis.length} universities\n`);

  // Step 3: Fetch authors for matched institutions
  console.log("Step 3: Fetching professors for matched universities...\n");

  let allProfessors = [];
  if (fs.existsSync(OUT_PATH)) {
    allProfessors = JSON.parse(fs.readFileSync(OUT_PATH, "utf-8"));
  }
  const slugSet = new Set(allProfessors.map(p => p.slug));
  const nameUniSet = new Set(allProfessors.map(p => `${p.name}::${p.university}`));
  const startCount = allProfessors.length;

  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    process.stdout.write(`[${i + 1}/${matches.length}] ${m.ourName}...`);

    const authors = await fetchAuthors(m.openAlexId, m.ourName);
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

    console.log(` ${added} professors`);
  }

  fs.writeFileSync(OUT_PATH, JSON.stringify(allProfessors, null, 2));

  console.log(`\n=== Done ===`);
  console.log(`New professors added: ${allProfessors.length - startCount}`);
  console.log(`Total professors: ${allProfessors.length}`);
  console.log(`Turkish universities now covered: ${matches.length + 24} / 202`);
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
