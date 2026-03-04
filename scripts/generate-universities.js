#!/usr/bin/env node
/**
 * Reads turkey-universities.json + the UNI_NAME_MAP from seed-all-faculties.ts
 * and generates lib/universities.ts with all 202 universities across 81 cities.
 */

const fs = require("fs");
const path = require("path");

const data = JSON.parse(
  fs.readFileSync(path.join(__dirname, "../database/turkey-universities.json"), "utf-8")
);

// Same mapping from seed-all-faculties.ts
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
  // Auto-translate: "X ÜNİVERSİTESİ" -> "X University"
  let name = turkishName
    .replace(" ÜNİVERSİTESİ", "")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
  return fixTurkishChars(name) + " University";
}

// Group by city
const cityMap = new Map();
for (const uni of data) {
  const city = uni.city;
  if (!cityMap.has(city)) cityMap.set(city, []);
  cityMap.get(city).push({
    name: getEnglishUniName(uni.name),
    turkishName: uni.name,
    city: uni.city,
    country: "Türkiye",
  });
}

// Sort cities alphabetically, sort universities within each city
const sortedCities = [...cityMap.keys()].sort((a, b) => a.localeCompare(b, "tr"));

const cityGroups = sortedCities.map((city) => {
  const unis = cityMap.get(city).sort((a, b) => a.name.localeCompare(b.name));
  return { city, universities: unis };
});

// Stats
const totalUnis = data.length;
const totalCities = sortedCities.length;
console.log(`Generating ${totalUnis} universities across ${totalCities} cities...`);

// Generate TypeScript
let ts = `export interface UniversityEntry {
  name: string;
  turkishName: string;
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

const UNIVERSITY_DATA: CountryGroup[] = [
  {
    country: "Türkiye",
    cities: [\n`;

for (const cg of cityGroups) {
  ts += `      {\n        city: ${JSON.stringify(cg.city)},\n        universities: [\n`;
  for (const u of cg.universities) {
    ts += `          { name: ${JSON.stringify(u.name)}, turkishName: ${JSON.stringify(u.turkishName)}, city: ${JSON.stringify(u.city)}, country: "Türkiye" },\n`;
  }
  ts += `        ],\n      },\n`;
}

ts += `    ],
  },
];

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
console.log(`Written lib/universities.ts (${totalUnis} universities, ${totalCities} cities)`);
