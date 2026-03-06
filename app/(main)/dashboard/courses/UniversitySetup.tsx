"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Image from "next/image";
import { UniversityPicker } from "@/components/UniversityPicker";
import { FacultyPicker } from "@/components/FacultyPicker";
import { ProgramPicker } from "@/components/ProgramPicker";
import { Button } from "@/components/ui/button";
import { saveUniversityAndRevalidate } from "./actions";
import {
  getFacultiesForUniversity,
  getProgramsForFaculty,
} from "@/app/(main)/auth/actions";

const ease = [0.25, 0.46, 0.45, 0.94] as const;
const R2_BASE = "https://lib.thevibecodedcompany.com";

export function UniversitySetup() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [university, setUniversity] = useState("");
  const [customUniversity, setCustomUniversity] = useState("");
  const [facultyId, setFacultyId] = useState<number | null>(null);
  const [availableFaculties, setAvailableFaculties] = useState<
    { id: number; name: string; slug: string }[]
  >([]);
  const [programId, setProgramId] = useState<number | null>(null);
  const [availablePrograms, setAvailablePrograms] = useState<
    { id: number; name: string; slug: string }[]
  >([]);

  // Load faculties when university changes
  useEffect(() => {
    if (!university || university === "__other__") {
      setAvailableFaculties([]);
      setFacultyId(null);
      setAvailablePrograms([]);
      setProgramId(null);
      return;
    }
    let cancelled = false;
    getFacultiesForUniversity(university).then(({ faculties }) => {
      if (!cancelled) {
        setAvailableFaculties(faculties);
        setFacultyId(null);
        setAvailablePrograms([]);
        setProgramId(null);
      }
    });
    return () => { cancelled = true; };
  }, [university]);

  // Load programs when faculty changes
  useEffect(() => {
    if (!facultyId) {
      setAvailablePrograms([]);
      setProgramId(null);
      return;
    }
    let cancelled = false;
    getProgramsForFaculty(facultyId).then(({ programs }) => {
      if (!cancelled) {
        setAvailablePrograms(programs);
        setProgramId(null);
      }
    });
    return () => { cancelled = true; };
  }, [facultyId]);

  const handleSave = async () => {
    const finalUniversity = university === "__other__" ? customUniversity : university;
    if (!finalUniversity) return;

    setSaving(true);
    await saveUniversityAndRevalidate({
      university: finalUniversity,
      facultyId,
      programId,
    });
    setSaved(true);
  };

  const finalUniversity = university === "__other__" ? customUniversity : university;
  const savedUniversity = university === "__other__" ? customUniversity : university;

  return (
    <AnimatePresence mode="wait">
      {!saved ? (
        <motion.div
          key="setup"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease }}
          className="flex w-full max-w-sm flex-col items-center text-center -mt-16"
        >
          <Image
            src={`${R2_BASE}/images/complete-profile.webp`}
            alt="Select your university"
            width={320}
            height={320}
            className="-mb-8 opacity-90"
          />

          <h2 className="font-display text-xl font-light text-gray-900 dark:text-white">
            Select Your University
          </h2>
          <p className="mt-1 mb-5 text-sm text-gray-900/50 dark:text-white/50">
            Choose your university to browse available courses.
          </p>

          <LayoutGroup>
            <div className="flex w-full flex-col gap-2.5">
              <motion.div layout transition={{ duration: 0.3, ease }}>
                <UniversityPicker
                  value={university}
                  onChange={setUniversity}
                  customValue={customUniversity}
                  onCustomChange={setCustomUniversity}
                  variant="settings"
                />
              </motion.div>

              <AnimatePresence mode="popLayout">
                {availableFaculties.length > 0 && (
                  <motion.div
                    key="faculty-picker"
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <FacultyPicker
                      faculties={availableFaculties}
                      value={facultyId}
                      onChange={setFacultyId}
                      variant="settings"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <AnimatePresence mode="popLayout">
                {availablePrograms.length > 0 && (
                  <motion.div
                    key="program-picker"
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, ease }}
                  >
                    <ProgramPicker
                      programs={availablePrograms}
                      value={programId}
                      onChange={setProgramId}
                      variant="settings"
                    />
                  </motion.div>
                )}
              </AnimatePresence>

              <motion.div layout transition={{ duration: 0.3, ease }}>
                <Button
                  onClick={handleSave}
                  disabled={saving || !finalUniversity}
                  className="mt-2 w-full rounded-full bg-[#5227FF] font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save & Continue"}
                </Button>
              </motion.div>
            </div>
          </LayoutGroup>
        </motion.div>
      ) : (
        <motion.div
          key="success"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, ease }}
          className="flex w-full max-w-sm flex-col items-center text-center"
        >
          <h1 className="font-display text-5xl font-light text-gray-900 sm:text-7xl dark:text-white">
            All Set!
          </h1>
          <p className="mt-3 mb-8 text-base text-gray-900/50 sm:text-lg dark:text-white/50">
            {savedUniversity} — let&apos;s explore your courses.
          </p>

          <button
            onClick={() => window.location.reload()}
            className="inline-flex items-center justify-center rounded-full bg-[#5227FF] px-8 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            Go To My Courses
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
