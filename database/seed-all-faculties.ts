import "dotenv/config";
import { createHash } from "crypto";
import { drizzle } from "drizzle-orm/postgres-js";
import { eq } from "drizzle-orm";
import postgres from "postgres";
import { faculty, program } from "./schema";
import data from "./turkey-universities.json";

// Map Turkish faculty names to English
const FACULTY_NAME_MAP: Record<string, string> = {
  // Common faculty names
  "Tıp Fakültesi": "Faculty of Medicine",
  "Diş Hekimliği Fakültesi": "Faculty of Dentistry",
  "Eczacılık Fakültesi": "Faculty of Pharmacy",
  "Hukuk Fakültesi": "Faculty of Law",
  "İlahiyat Fakültesi": "Faculty of Theology",
  "Mühendislik Fakültesi": "Faculty of Engineering",
  "Mühendislik ve Doğa Bilimleri Fakültesi": "Faculty of Engineering and Natural Sciences",
  "Mühendislik ve Mimarlık Fakültesi": "Faculty of Engineering and Architecture",
  "Fen Fakültesi": "Faculty of Science",
  "Fen-Edebiyat Fakültesi": "Faculty of Arts and Sciences",
  "Edebiyat Fakültesi": "Faculty of Letters",
  "Eğitim Fakültesi": "Faculty of Education",
  "İktisadi ve İdari Bilimler Fakültesi": "Faculty of Economics and Administrative Sciences",
  "İktisadi, İdari ve Sosyal Bilimler Fakültesi": "Faculty of Economics, Administrative and Social Sciences",
  "İşletme Fakültesi": "Faculty of Business",
  "Siyasal Bilgiler Fakültesi": "Faculty of Political Sciences",
  "İletişim Fakültesi": "Faculty of Communication",
  "Güzel Sanatlar Fakültesi": "Faculty of Fine Arts",
  "Güzel Sanatlar Tasarım ve Mimarlık Fakültesi": "Faculty of Fine Arts, Design and Architecture",
  "Mimarlık Fakültesi": "Faculty of Architecture",
  "Mimarlık ve Tasarım Fakültesi": "Faculty of Architecture and Design",
  "Sağlık Bilimleri Fakültesi": "Faculty of Health Sciences",
  "Hemşirelik Fakültesi": "Faculty of Nursing",
  "Veteriner Fakültesi": "Faculty of Veterinary Medicine",
  "Ziraat Fakültesi": "Faculty of Agriculture",
  "Orman Fakültesi": "Faculty of Forestry",
  "Su Ürünleri Fakültesi": "Faculty of Fisheries",
  "Spor Bilimleri Fakültesi": "Faculty of Sport Sciences",
  "Teknoloji Fakültesi": "Faculty of Technology",
  "Turizm Fakültesi": "Faculty of Tourism",
  "Denizcilik Fakültesi": "Faculty of Maritime",
  "Havacılık ve Uzay Bilimleri Fakültesi": "Faculty of Aeronautics and Astronautics",
  "İnsan ve Toplum Bilimleri Fakültesi": "Faculty of Humanities and Social Sciences",
  "Sanat ve Tasarım Fakültesi": "Faculty of Art and Design",
  "Uygulamalı Bilimler Fakültesi": "Faculty of Applied Sciences",
  "Açık ve Uzaktan Eğitim Fakültesi": "Faculty of Open and Distance Education",
};

// Map Turkish university names to our English names in the universities.ts dropdown
const UNI_NAME_MAP: Record<string, string> = {
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

function slugify(text: string): string {
  return fixTurkishChars(text)
    .toLowerCase()
    .replace(/[çÇ]/g, "c")
    .replace(/[ğĞ]/g, "g")
    .replace(/[ıİ]/g, "i")
    .replace(/[öÖ]/g, "o")
    .replace(/[şŞ]/g, "s")
    .replace(/[üÜ]/g, "u")
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}

function fixTurkishChars(text: string): string {
  // Fix JavaScript's broken Turkish İ lowercasing (İ → i̇ instead of i)
  return text.replace(/i\u0307/g, "i");
}

function getEnglishUniName(turkishName: string): string {
  // Check direct map first
  if (UNI_NAME_MAP[turkishName]) return UNI_NAME_MAP[turkishName];

  // Auto-translate: "X ÜNİVERSİTESİ" -> "X University"
  let name = turkishName
    .replace(" ÜNİVERSİTESİ", "")
    .split(" ")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
  return fixTurkishChars(name) + " University";
}

function getEnglishFacultyName(turkishName: string): string {
  if (FACULTY_NAME_MAP[turkishName]) return FACULTY_NAME_MAP[turkishName];
  // Return with Turkish chars fixed if no mapping
  return fixTurkishChars(turkishName);
}

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  console.log(`Seeding ${(data as any[]).length} universities...`);

  let totalFaculties = 0;
  let totalPrograms = 0;

  for (const uni of data as any[]) {
    const uniName = getEnglishUniName(uni.name);
    const faculties = uni.faculties || {};
    const facultyEntries = Object.entries(faculties) as [string, string[]][];

    for (let i = 0; i < facultyEntries.length; i++) {
      const [turkishFacName, programs] = facultyEntries[i];
      const englishFacName = getEnglishFacultyName(turkishFacName);

      const longSlug = slugify(uniName + " " + englishFacName);
      const facSlug = createHash("md5").update(longSlug).digest("hex").slice(0, 8);

      const [inserted] = await db
        .insert(faculty)
        .values({
          name: englishFacName,
          slug: facSlug,
          university: uniName,
          displayOrder: i + 1,
        })
        .onConflictDoNothing()
        .returning({ id: faculty.id });

      // If faculty was already inserted (conflict), look it up
      let facultyId = inserted?.id;
      if (!facultyId) {
        const existing = await db
          .select({ id: faculty.id })
          .from(faculty)
          .where(eq(faculty.slug, facSlug))
          .limit(1);
        facultyId = existing[0]?.id;
      }

      totalFaculties++;

      // Seed programs for this faculty
      if (facultyId && programs && programs.length > 0) {
        for (let j = 0; j < programs.length; j++) {
          const progName = programs[j];
          const progLongSlug = slugify(uniName + " " + englishFacName + " " + progName);
          const progSlug = createHash("md5").update(progLongSlug).digest("hex").slice(0, 8);

          await db
            .insert(program)
            .values({
              name: progName,
              slug: progSlug,
              facultyId,
              displayOrder: j + 1,
            })
            .onConflictDoNothing();

          totalPrograms++;
        }
      }
    }
  }

  console.log(`Seeded ${totalFaculties} faculties and ${totalPrograms} programs across ${(data as any[]).length} universities.`);
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
