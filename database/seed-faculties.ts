import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { faculty } from "./schema";

const R2_BASE = "https://lib.thevibecodedcompany.com";

const faculties = [
  { name: "Medicine", slug: "medicine", illustration: `${R2_BASE}/images/majors/medicine.webp`, displayOrder: 1 },
  { name: "Dentistry", slug: "dentistry", illustration: `${R2_BASE}/images/dentistry.webp`, displayOrder: 2 },
  { name: "Pharmacy", slug: "pharmacy", illustration: `${R2_BASE}/images/majors/pharmacy.webp`, displayOrder: 3 },
  { name: "Engineering And Natural Sciences", slug: "engineering-and-natural-sciences", illustration: `${R2_BASE}/images/majors/engineering.webp`, displayOrder: 4 },
  { name: "Economics, Administrative And Social Sciences", slug: "economics-administrative-and-social-sciences", illustration: `${R2_BASE}/images/majors/business.webp`, displayOrder: 5 },
  { name: "Humanities And Social Sciences", slug: "humanities-and-social-sciences", illustration: `${R2_BASE}/images/majors/social-sciences.webp`, displayOrder: 6 },
  { name: "Fine Arts, Design And Architecture", slug: "fine-arts-design-and-architecture", illustration: `${R2_BASE}/images/majors/arts-and-design.webp`, displayOrder: 7 },
  { name: "Communication", slug: "communication", illustration: `${R2_BASE}/images/majors/communication.webp`, displayOrder: 8 },
  { name: "Health Sciences", slug: "health-sciences", illustration: `${R2_BASE}/images/majors/health-sciences.webp`, displayOrder: 9 },
];

async function seed() {
  const client = postgres(process.env.DATABASE_URL!);
  const db = drizzle(client);

  console.log("Seeding faculties for Istinye University...");

  for (const f of faculties) {
    await db.insert(faculty).values({
      name: f.name,
      slug: f.slug,
      university: "Istinye University",
      illustration: f.illustration,
      displayOrder: f.displayOrder,
    }).onConflictDoNothing();
  }

  console.log(`Seeded ${faculties.length} faculties.`);
  await client.end();
}

seed().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
