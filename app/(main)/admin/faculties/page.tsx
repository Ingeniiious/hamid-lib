import { getFacultyStats } from "./actions";
import { FacultiesClient } from "./FacultiesClient";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Faculties & Programs" };

export default async function AdminFacultiesPage() {
  const stats = await getFacultyStats();
  return <FacultiesClient stats={stats} />;
}
