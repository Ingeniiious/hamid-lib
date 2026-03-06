"use server";

import { revalidatePath } from "next/cache";
import { updateUserProfile } from "@/app/(main)/dashboard/users/actions";

export async function saveUniversityAndRevalidate(
  data: { university: string; facultyId?: number | null; programId?: number | null }
) {
  const result = await updateUserProfile(data);
  revalidatePath("/dashboard/courses");
  return result;
}
