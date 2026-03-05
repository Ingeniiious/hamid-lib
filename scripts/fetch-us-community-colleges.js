#!/usr/bin/env node
/**
 * Fetches US community colleges (2-year, associate's degree) from College Scorecard API
 * and merges them into the existing us-universities.json.
 * Uses DEMO_KEY (rate limited to ~1000 req/hour).
 * Run: node scripts/fetch-us-community-colleges.js
 */

const https = require("https");
const fs = require("fs");
const path = require("path");

const API_KEY = process.env.DATA_GOV_API_KEY || "DEMO_KEY";
const PER_PAGE = 100;
const DELAY_MS = 1500;

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function fetchPage(page) {
  return new Promise((resolve, reject) => {
    // predominant=2 = 2-year (associate's / community colleges)
    const url = `https://api.data.gov/ed/collegescorecard/v1/schools?api_key=${API_KEY}&school.degrees_awarded.predominant=2&fields=school.name,school.city,school.state&per_page=${PER_PAGE}&page=${page}`;
    https.get(url, res => {
      let data = "";
      res.on("data", c => data += c);
      res.on("end", () => {
        try { resolve(JSON.parse(data)); }
        catch (e) { reject(new Error("Parse error: " + data.slice(0, 200))); }
      });
    }).on("error", reject);
  });
}

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia", PR: "Puerto Rico", GU: "Guam", VI: "US Virgin Islands",
  AS: "American Samoa", MP: "Northern Mariana Islands", PW: "Palau", FM: "Micronesia", MH: "Marshall Islands",
};

async function main() {
  console.log("Fetching US community colleges from College Scorecard API...");

  const first = await fetchPage(0);
  if (first.error) {
    console.error("API error:", first.error.message);
    process.exit(1);
  }

  const total = first.metadata.total;
  const pages = Math.ceil(total / PER_PAGE);
  console.log(`Total: ${total} community colleges, ${pages} pages`);

  let all = [...first.results];

  for (let i = 1; i < pages; i++) {
    await sleep(DELAY_MS);
    const page = await fetchPage(i);
    if (!page.results) {
      console.log(`Rate limited at page ${i + 1}, waiting 10s...`);
      await sleep(10000);
      const retry = await fetchPage(i);
      if (retry.results) all.push(...retry.results);
      else { console.error(`Failed page ${i + 1}, skipping`); continue; }
    } else {
      all.push(...page.results);
    }
    console.log(`Page ${i + 1}/${pages} (${all.length} so far)`);
  }

  const newColleges = all.map(u => ({
    name: u["school.name"],
    city: u["school.city"],
    state: STATE_NAMES[u["school.state"]] || u["school.state"],
    stateCode: u["school.state"],
  }));

  // Load existing and merge (deduplicate by name)
  const existingPath = path.join(__dirname, "../database/us-universities.json");
  const existing = JSON.parse(fs.readFileSync(existingPath, "utf8"));
  const existingNames = new Set(existing.map(u => u.name));

  const added = newColleges.filter(u => !existingNames.has(u.name));
  const merged = [...existing, ...added].sort((a, b) => a.name.localeCompare(b.name));

  fs.writeFileSync(existingPath, JSON.stringify(merged, null, 2));
  console.log(`\nDone! Added ${added.length} community colleges (${newColleges.length} fetched, ${newColleges.length - added.length} duplicates skipped)`);
  console.log(`Total US institutions: ${merged.length}`);
}

main().catch(e => {
  console.error("Failed:", e.message);
  process.exit(1);
});
