#!/usr/bin/env node
/**
 * Fetches EU + EEA/EFTA + UK universities from the ROR API,
 * cross-references with the Erasmus+ ECHE list for validation.
 *
 * Run: node scripts/fetch-eu-universities.js
 * Output: database/eu-universities.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

// EU-27 + UK + Norway + Switzerland + Iceland + Liechtenstein
const COUNTRIES = {
  AT: "Austria",
  BE: "Belgium",
  BG: "Bulgaria",
  HR: "Croatia",
  CY: "Cyprus",
  CZ: "Czech Republic",
  DK: "Denmark",
  EE: "Estonia",
  FI: "Finland",
  FR: "France",
  DE: "Germany",
  GR: "Greece",
  HU: "Hungary",
  IE: "Ireland",
  IT: "Italy",
  LV: "Latvia",
  LT: "Lithuania",
  LU: "Luxembourg",
  MT: "Malta",
  NL: "Netherlands",
  PL: "Poland",
  PT: "Portugal",
  RO: "Romania",
  SK: "Slovakia",
  SI: "Slovenia",
  ES: "Spain",
  SE: "Sweden",
  // EEA / EFTA
  GB: "United Kingdom",
  NO: "Norway",
  CH: "Switzerland",
  IS: "Iceland",
  LI: "Liechtenstein",
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "HamidLib/1.0" } }, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 300))); }
      });
    }).on("error", reject);
  });
}

// Parse ECHE Excel into a Set of normalized institution names per country
function loadECHE() {
  const raw = execSync("npx xlsx-cli /tmp/eche-list.xlsx 2>/dev/null", { encoding: "utf-8", maxBuffer: 50 * 1024 * 1024 });
  const lines = raw.split("\n").filter(l => l.trim());
  // Header: Proposal number,Erasmus code,PIC,OID,Legal Name,Street,Post Cd,City,Country Cd,...
  const eche = new Map(); // countryCode -> Set of normalized names
  const echeByCountry = new Map(); // countryCode -> [{name, city}]

  for (let i = 2; i < lines.length; i++) { // skip header rows
    // Parse CSV carefully (some fields have commas in quotes)
    const fields = parseCSVLine(lines[i]);
    if (fields.length < 9) continue;
    const name = (fields[4] || "").trim();
    const city = (fields[7] || "").trim();
    const cc = (fields[8] || "").trim().toUpperCase();
    if (!name || !cc) continue;

    if (!eche.has(cc)) eche.set(cc, new Set());
    eche.get(cc).add(normalizeName(name));

    if (!echeByCountry.has(cc)) echeByCountry.set(cc, []);
    echeByCountry.get(cc).push({ name, city });
  }
  return { eche, echeByCountry };
}

function parseCSVLine(line) {
  const fields = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === ',' && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

function normalizeName(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/gi, "")
    .replace(/\s+/g, " ")
    .trim();
}

// Fetch all ROR Education institutions for a country
async function fetchRORCountry(cc) {
  const unis = [];
  let page = 1;
  let total = null;

  while (true) {
    const url = `https://api.ror.org/v2/organizations?filter=types:Education,locations.geonames_details.country_code:${cc}&page=${page}`;
    const res = await fetchJSON(url);

    if (!res.items) {
      console.error(`  Error fetching ${cc} page ${page}:`, JSON.stringify(res).slice(0, 200));
      break;
    }

    if (total === null) total = res.number_of_results;

    for (const item of res.items) {
      if (item.status !== "active") continue;

      // Get display name (prefer ror_display, then label in English, then first name)
      let displayName = "";
      let localName = "";
      for (const n of item.names || []) {
        if (n.types && n.types.includes("ror_display")) displayName = n.value;
        if (n.types && n.types.includes("label") && n.lang === "en") {
          if (!displayName) displayName = n.value;
        }
        if (n.types && n.types.includes("label") && n.lang && n.lang !== "en") {
          localName = n.value;
        }
      }
      if (!displayName) {
        // Fallback to first label
        const label = (item.names || []).find(n => n.types && n.types.includes("label"));
        displayName = label ? label.value : (item.names[0] || {}).value || "Unknown";
      }

      // Get location
      const loc = (item.locations || [])[0] || {};
      const geo = loc.geonames_details || {};
      const city = geo.name || "";
      const country = geo.country_name || COUNTRIES[cc] || cc;

      unis.push({
        name: displayName,
        localName: localName,
        city: city,
        country: country,
        countryCode: cc,
        rorId: item.id,
      });
    }

    // ROR API returns max 20 per page
    if (unis.length >= total || res.items.length === 0) break;
    page++;
    await sleep(500); // Be nice to ROR API
  }

  return unis;
}

async function main() {
  console.log("Loading ECHE list for cross-reference...");
  const { eche, echeByCountry } = loadECHE();
  console.log(`ECHE: ${[...eche.values()].reduce((s, set) => s + set.size, 0)} institutions across ${eche.size} countries\n`);

  const allCountries = Object.entries(COUNTRIES);
  const results = [];
  let totalROR = 0;
  let totalConfirmed = 0;
  let totalROROnly = 0;

  for (const [cc, countryName] of allCountries) {
    process.stdout.write(`${countryName} (${cc})... `);
    const unis = await fetchRORCountry(cc);
    totalROR += unis.length;

    // Cross-reference with ECHE
    const echeNames = eche.get(cc) || new Set();
    let confirmed = 0;
    let rorOnly = 0;

    for (const uni of unis) {
      const normalized = normalizeName(uni.name);
      const normalizedLocal = normalizeName(uni.localName || "");
      // Check if institution appears in ECHE (fuzzy match)
      const inECHE = echeNames.has(normalized) ||
        echeNames.has(normalizedLocal) ||
        [...echeNames].some(e => {
          // Partial match: if ROR name contains ECHE name or vice versa
          return (normalized.length > 5 && e.includes(normalized)) ||
                 (e.length > 5 && normalized.includes(e)) ||
                 (normalizedLocal.length > 5 && e.includes(normalizedLocal)) ||
                 (e.length > 5 && normalizedLocal.includes(e));
        });

      if (inECHE) {
        uni.confirmedByECHE = true;
        confirmed++;
      } else {
        rorOnly++;
      }
    }

    totalConfirmed += confirmed;
    totalROROnly += rorOnly;

    console.log(`${unis.length} universities (${confirmed} confirmed by ECHE, ${rorOnly} ROR-only)`);

    results.push(...unis);
    await sleep(300);
  }

  // Include ALL universities (both confirmed and ROR-only are real universities)
  // ROR is authoritative — ECHE only covers Erasmus participants
  const output = results.map(u => ({
    name: u.name,
    localName: u.localName || "",
    city: u.city,
    country: u.country,
    countryCode: u.countryCode,
  }));

  const outPath = path.join(__dirname, "../database/eu-universities.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total from ROR: ${totalROR}`);
  console.log(`Confirmed by ECHE: ${totalConfirmed}`);
  console.log(`ROR-only (still included): ${totalROROnly}`);
  console.log(`Written to database/eu-universities.json`);

  // Per-country stats
  const byCountry = {};
  output.forEach(u => {
    byCountry[u.country] = (byCountry[u.country] || 0) + 1;
  });
  console.log(`\nPer country:`);
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    console.log(`  ${c}: ${n}`);
  });
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
