#!/usr/bin/env node
/**
 * Fetches universities from ROR API for non-EU countries.
 * Run: node scripts/fetch-intl-universities.js
 * Output: database/intl-universities.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const COUNTRIES = {
  CN: "China",
  IN: "India",
  IR: "Iran",
  JP: "Japan",
  MX: "Mexico",
  PK: "Pakistan",
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

      let displayName = "";
      let localName = "";
      for (const n of item.names || []) {
        if (n.types && n.types.includes("ror_display")) displayName = n.value;
        if (n.types && n.types.includes("label") && n.lang === "en") {
          if (!displayName) displayName = n.value;
        }
        if (n.types && n.types.includes("label") && n.lang && n.lang !== "en") {
          if (!localName) localName = n.value;
        }
      }
      if (!displayName) {
        const label = (item.names || []).find(n => n.types && n.types.includes("label"));
        displayName = label ? label.value : (item.names[0] || {}).value || "Unknown";
      }

      const loc = (item.locations || [])[0] || {};
      const geo = loc.geonames_details || {};
      const city = geo.name || "";
      const country = COUNTRIES[cc] || geo.country_name || cc;

      unis.push({
        name: displayName,
        localName: localName,
        city: city,
        country: country,
        countryCode: cc,
      });
    }

    if (unis.length >= total || res.items.length === 0) break;
    page++;
    await sleep(500);
  }

  return unis;
}

async function main() {
  const allCountries = Object.entries(COUNTRIES);
  const results = [];

  for (const [cc, countryName] of allCountries) {
    process.stdout.write(`${countryName} (${cc})... `);
    const unis = await fetchRORCountry(cc);
    console.log(`${unis.length} universities`);
    results.push(...unis);
    await sleep(300);
  }

  const outPath = path.join(__dirname, "../database/intl-universities.json");
  fs.writeFileSync(outPath, JSON.stringify(results, null, 2));

  console.log(`\n=== Summary ===`);
  console.log(`Total: ${results.length} universities`);

  const byCountry = {};
  results.forEach(u => { byCountry[u.country] = (byCountry[u.country] || 0) + 1; });
  Object.entries(byCountry).sort((a, b) => b[1] - a[1]).forEach(([c, n]) => {
    console.log(`  ${c}: ${n}`);
  });
  console.log(`\nWritten to database/intl-universities.json`);
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
