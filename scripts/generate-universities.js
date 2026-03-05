#!/usr/bin/env node
/**
 * Reads all university JSON files and generates lib/universities.ts.
 * Sources: turkey-universities.json, us-universities.json,
 *          canada-universities.json, eu-universities.json
 *
 * Run: node scripts/generate-universities.js
 */

const fs = require("fs");
const path = require("path");

const DB = (...p) => path.join(__dirname, "../database", ...p);

// --- Turkey data ---
const turkeyData = JSON.parse(fs.readFileSync(DB("turkey-universities.json"), "utf-8"));

const UNI_NAME_MAP = {
  "İSTİNYE ÜNİVERSİTESİ": "Istinye University",
  "ALTINBAŞ ÜNİVERSİTESİ": "Altinbas University",
  "İSTANBUL ATLAS ÜNİVERSİTESİ": "Atlas University",
  "BAHÇEŞEHİR ÜNİVERSİTESİ": "Bahcesehir University",
  "İSTANBUL BEYKENT ÜNİVERSİTESİ": "Beykent University",
  "BEYKOZ ÜNİVERSİTESİ": "Beykoz University",
  "İSTANBUL BİLGİ ÜNİVERSİTESİ": "Bilgi University (Istanbul Bilgi)",
  "BİRUNİ ÜNİVERSİTESİ": "Biruni University",
  "BOĞAZİÇİ ÜNİVERSİTESİ": "Bogazici University",
  "İSTANBUL ÜNİVERSİTESİ-CERRAHPAŞA": "Cerrahpasa University (Istanbul University-Cerrahpasa)",
  "DOĞUŞ ÜNİVERSİTESİ": "Dogus University",
  "İSTANBUL ESENYURT ÜNİVERSİTESİ": "Esenyurt University",
  "GALATASARAY ÜNİVERSİTESİ": "Galatasaray University",
  "İSTANBUL GEDİK ÜNİVERSİTESİ": "Gedik University",
  "HALİÇ ÜNİVERSİTESİ": "Halic University",
  "IŞIK ÜNİVERSİTESİ": "Isik University",
  "İSTANBUL AREL ÜNİVERSİTESİ": "Istanbul Arel University",
  "İSTANBUL AYDIN ÜNİVERSİTESİ": "Istanbul Aydin University",
  "İSTANBUL TİCARET ÜNİVERSİTESİ": "Istanbul Commerce University (Istanbul Ticaret)",
  "İSTANBUL GELİŞİM ÜNİVERSİTESİ": "Istanbul Gelisim University",
  "İSTANBUL KENT ÜNİVERSİTESİ": "Istanbul Kent University",
  "İSTANBUL KÜLTÜR ÜNİVERSİTESİ": "Istanbul Kultur University",
  "İSTANBUL MEDENİYET ÜNİVERSİTESİ": "Istanbul Medeniyet University",
  "İSTANBUL MEDİPOL ÜNİVERSİTESİ": "Istanbul Medipol University",
  "İSTANBUL OKAN ÜNİVERSİTESİ": "Istanbul Okan University",
  "İSTANBUL SABAHATTİN ZAİM ÜNİVERSİTESİ": "Istanbul Sabahattin Zaim University",
  "İSTANBUL TEKNİK ÜNİVERSİTESİ": "Istanbul Technical University (ITU)",
  "İSTANBUL TOPKAPI ÜNİVERSİTESİ": "Istanbul Topkapi University",
  "İSTANBUL ÜNİVERSİTESİ": "Istanbul University",
  "KADİR HAS ÜNİVERSİTESİ": "Kadir Has University",
  "KOÇ ÜNİVERSİTESİ": "Koc University",
  "MALTEPE ÜNİVERSİTESİ": "Maltepe University",
  "MARMARA ÜNİVERSİTESİ": "Marmara University",
  "MEF ÜNİVERSİTESİ": "MEF University",
  "İSTANBUL NİŞANTAŞI ÜNİVERSİTESİ": "Nisantasi University",
  "PİRİ REİS ÜNİVERSİTESİ": "Piri Reis University",
  "SABANCI ÜNİVERSİTESİ": "Sabanci University",
  "TÜRK-ALMAN ÜNİVERSİTESİ": "Turkish-German University",
  "ÜSKÜDAR ÜNİVERSİTESİ": "Uskudar University",
  "YEDİTEPE ÜNİVERSİTESİ": "Yeditepe University",
  "YILDIZ TEKNİK ÜNİVERSİTESİ": "Yildiz Technical University",
};

function fixTurkishChars(text) {
  return text.replace(/i\u0307/g, "i");
}

function getEnglishUniName(turkishName) {
  if (UNI_NAME_MAP[turkishName]) return UNI_NAME_MAP[turkishName];
  let name = turkishName
    .replace(" ÜNİVERSİTESİ", "")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
  return fixTurkishChars(name) + " University";
}

// Normalize country names from ROR
const COUNTRY_NORMALIZE = {
  "The Netherlands": "Netherlands",
  "Czechia": "Czech Republic",
};

// --- Helpers ---
function groupBy(data, keyFn, entryFn) {
  const map = new Map();
  for (const item of data) {
    const key = keyFn(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key).push(entryFn(item));
  }
  const sorted = [...map.keys()].sort((a, b) => a.localeCompare(b));
  return sorted.map((key) => ({
    city: key,
    universities: map.get(key).sort((a, b) => a.name.localeCompare(b.name)),
  }));
}

// --- Build country groups ---

function buildTurkeyGroups() {
  return groupBy(
    turkeyData,
    (u) => u.city,
    (u) => ({
      name: getEnglishUniName(u.name),
      localName: u.name,
      city: u.city,
      country: "Türkiye",
    })
  );
}

function buildUSAGroups() {
  const data = JSON.parse(fs.readFileSync(DB("us-universities.json"), "utf-8"));
  return groupBy(
    data,
    (u) => u.state,
    (u) => ({ name: u.name, localName: "", city: u.state, country: "United States" })
  );
}

function buildCanadaGroups() {
  const data = JSON.parse(fs.readFileSync(DB("canada-universities.json"), "utf-8"));
  return groupBy(
    data,
    (u) => u.province,
    (u) => ({ name: u.name, localName: "", city: u.province, country: "Canada" })
  );
}

function buildRORGroups(jsonFile) {
  const data = JSON.parse(fs.readFileSync(DB(jsonFile), "utf-8"));
  // Group by country, then by city within each country
  const byCountry = new Map();
  for (const uni of data) {
    const country = COUNTRY_NORMALIZE[uni.country] || uni.country;
    if (!byCountry.has(country)) byCountry.set(country, []);
    byCountry.get(country).push({ ...uni, country });
  }

  const results = [];
  for (const [country, unis] of [...byCountry.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const cityGroups = groupBy(
      unis,
      (u) => u.city || country,
      (u) => ({ name: u.name, localName: u.localName || "", city: u.city || country, country })
    );
    results.push({ country, cities: cityGroups });
  }
  return results;
}

// --- Generate ---
const turkeyGroups = buildTurkeyGroups();
const usaGroups = buildUSAGroups();
const canadaGroups = buildCanadaGroups();
const euCountries = buildRORGroups("eu-universities.json");
const intlCountries = buildRORGroups("intl-universities.json");

// Combine all countries, sorted alphabetically
const countries = [
  { country: "Canada", cities: canadaGroups },
  ...euCountries,
  ...intlCountries,
  { country: "Türkiye", cities: turkeyGroups },
  { country: "United States", cities: usaGroups },
].sort((a, b) => a.country.localeCompare(b.country));

// Stats
let grandTotal = 0;
for (const c of countries) {
  const total = c.cities.reduce((sum, g) => sum + g.universities.length, 0);
  grandTotal += total;
  console.log(`${c.country}: ${total} universities, ${c.cities.length} regions`);
}

// Generate TypeScript
let ts = `export interface UniversityEntry {
  name: string;
  /** Local/native name for bilingual search (e.g. Turkish, German, French) */
  localName: string;
  city: string;
  country: string;
}

export interface CityGroup {
  city: string;
  universities: UniversityEntry[];
}

export interface CountryGroup {
  country: string;
  cities: CityGroup[];
}

const UNIVERSITY_DATA: CountryGroup[] = [\n`;

for (const c of countries) {
  ts += `  {\n    country: ${JSON.stringify(c.country)},\n    cities: [\n`;
  for (const cg of c.cities) {
    ts += `      {\n        city: ${JSON.stringify(cg.city)},\n        universities: [\n`;
    for (const u of cg.universities) {
      ts += `          { name: ${JSON.stringify(u.name)}, localName: ${JSON.stringify(u.localName)}, city: ${JSON.stringify(u.city)}, country: ${JSON.stringify(u.country)} },\n`;
    }
    ts += `        ],\n      },\n`;
  }
  ts += `    ],\n  },\n`;
}

ts += `];

export { UNIVERSITY_DATA };

/** Flat list of all university entries (for search) */
export const ALL_UNIVERSITIES: UniversityEntry[] = UNIVERSITY_DATA.flatMap(
  (country) => country.cities.flatMap((city) => city.universities)
);

/** Flat list of university names (backwards compat) */
export const UNIVERSITIES = ALL_UNIVERSITIES.map((u) => u.name);

export type University = string;
`;

fs.writeFileSync(path.join(__dirname, "../lib/universities.ts"), ts, "utf-8");
console.log(`\nWritten lib/universities.ts — ${grandTotal} total universities across ${countries.length} countries`);
