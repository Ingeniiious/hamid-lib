#!/usr/bin/env node
/**
 * Fetches Canadian universities from Hipo/university-domains-list.
 * Run: node scripts/fetch-canada-universities.js
 * Output: database/canada-universities.json
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

function fetch(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

async function main() {
  console.log("Fetching world universities from Hipo...");
  const raw = await fetch("https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json");
  const data = JSON.parse(raw);

  const ca = data
    .filter(u => u.country === "Canada" && u["state-province"])
    .map(u => ({
      name: u.name,
      province: u["state-province"],
    }))
    .sort((a, b) => a.province.localeCompare(b.province) || a.name.localeCompare(b.name));

  const outPath = path.join(__dirname, "../database/canada-universities.json");
  fs.writeFileSync(outPath, JSON.stringify(ca, null, 2));

  // Stats
  const provinces = {};
  ca.forEach(u => { provinces[u.province] = (provinces[u.province] || 0) + 1; });
  console.log(`Written ${ca.length} universities across ${Object.keys(provinces).length} provinces`);
  Object.entries(provinces).sort().forEach(([p, c]) => console.log(`  ${p}: ${c}`));
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
