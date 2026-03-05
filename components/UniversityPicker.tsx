"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CaretLeft, CaretUpDown, Check } from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { UNIVERSITY_DATA, type CountryGroup, type CityGroup } from "@/lib/universities";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

interface UniversityPickerProps {
  value: string;
  onChange: (name: string) => void;
  customValue?: string;
  onCustomChange?: (v: string) => void;
  /** "auth" = dark glass style (signup), "settings" = light/dark adaptive (settings page) */
  variant?: "auth" | "settings";
  inputClass?: string;
}

export function UniversityPicker({
  value,
  onChange,
  customValue = "",
  onCustomChange,
  variant = "settings",
  inputClass,
}: UniversityPickerProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"country" | "city" | "university">("country");
  const [selectedCountry, setSelectedCountry] = useState<CountryGroup | null>(null);
  const [selectedCity, setSelectedCity] = useState<CityGroup | null>(null);
  const [search, setSearch] = useState("");

  const isAuth = variant === "auth";

  const triggerClass = isAuth
    ? "relative flex h-10 w-full items-center justify-center rounded-full border border-white/20 bg-white/10 px-5 text-center text-sm text-white transition-colors hover:bg-white/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
    : "relative flex h-10 w-full items-center justify-center rounded-full border border-gray-900/15 bg-gray-900/5 px-5 text-center text-sm text-gray-900 transition-colors hover:bg-gray-900/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/20 dark:border-white/20 dark:bg-white/10 dark:text-white dark:hover:bg-white/15 dark:focus-visible:ring-white/30";

  const labelClass = isAuth
    ? value ? "text-white" : "text-white/50"
    : value ? "text-gray-900 dark:text-white" : "text-gray-900/40 dark:text-white/50";

  const caretClass = isAuth
    ? "absolute right-5 text-white/40"
    : "absolute right-5 text-gray-900/30 dark:text-white/40";

  const popoverClass = isAuth
    ? "!w-[--radix-popover-trigger-width] rounded-2xl border-gray-900/15 bg-white/70 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-white/10"
    : "!w-[--radix-popover-trigger-width] rounded-2xl border-gray-900/15 bg-white/90 p-1 backdrop-blur-xl dark:border-white/20 dark:bg-gray-900/95 dark:backdrop-blur-xl";

  const itemClass = "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/80 transition-colors hover:bg-gray-900/5 hover:text-gray-900 dark:text-white/80 dark:hover:bg-white/10 dark:hover:text-white";
  const mutedItemClass = "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm text-gray-900/40 transition-colors hover:bg-gray-900/5 hover:text-gray-900/60 dark:text-white/40 dark:hover:bg-white/10 dark:hover:text-white/60";
  const backClass = "flex w-full items-center justify-center gap-1 shrink-0 pb-1 pt-2 text-xs font-medium text-gray-900/40 transition-colors hover:text-gray-900/60 dark:text-white/40 dark:hover:text-white/60";
  const headingClass = "shrink-0 pb-1.5 pt-2 text-center text-xs font-medium text-gray-900/40 dark:text-white/40";
  const searchInputClass = "w-full rounded-lg border border-gray-900/10 bg-gray-900/5 px-3 py-1.5 text-center text-sm text-gray-900 placeholder:text-gray-900/30 focus:outline-none dark:border-white/10 dark:bg-white/5 dark:text-white dark:placeholder:text-white/30";

  const filtered = selectedCity
    ? selectedCity.universities.filter((uni) => {
        const q = search.toLowerCase();
        return (
          uni.name.toLowerCase().includes(q) ||
          uni.localName.toLowerCase().includes(q)
        );
      })
    : [];

  return (
    <>
      <Popover
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) {
            setStep("country");
            setSelectedCountry(null);
            setSelectedCity(null);
            setSearch("");
          }
        }}
      >
        <PopoverTrigger asChild>
          <button
            type="button"
            role="combobox"
            aria-expanded={open}
            className={triggerClass}
          >
            <span className={labelClass}>
              {value === "__other__"
                ? "Other"
                : value || (isAuth ? "University" : "Select University")}
            </span>
            <CaretUpDown size={16} weight="duotone" className={caretClass} />
          </button>
        </PopoverTrigger>
        <PopoverContent className={popoverClass} sideOffset={4}>
          <div className="flex h-[260px] flex-col">
            <AnimatePresence mode="wait" initial={false}>
              {step === "country" && (
                <motion.div
                  key="country"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-full flex-col"
                >
                  <p className={headingClass}>Country</p>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {UNIVERSITY_DATA.map((country) => (
                      <button
                        key={country.country}
                        type="button"
                        onClick={() => {
                          setSelectedCountry(country);
                          setStep(country.cities.length === 1 ? "university" : "city");
                          if (country.cities.length === 1) setSelectedCity(country.cities[0]);
                        }}
                        className={itemClass}
                      >
                        {country.country}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => {
                        onChange("__other__");
                        setOpen(false);
                      }}
                      className={mutedItemClass}
                    >
                      Other
                    </button>
                  </div>
                </motion.div>
              )}

              {step === "city" && selectedCountry && (
                <motion.div
                  key="city"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-full flex-col"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setStep("country");
                      setSelectedCountry(null);
                    }}
                    className={backClass}
                  >
                    <CaretLeft size={12} weight="bold" />
                    {selectedCountry.country === "United States" ? "States" : selectedCountry.country === "Canada" ? "Provinces" : selectedCountry.country}
                  </button>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {selectedCountry.cities.map((city) => (
                      <button
                        key={city.city}
                        type="button"
                        onClick={() => {
                          setSelectedCity(city);
                          setStep("university");
                        }}
                        className={itemClass}
                      >
                        {city.city}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}

              {step === "university" && selectedCity && (
                <motion.div
                  key="university"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.15 }}
                  className="flex h-full flex-col"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setSearch("");
                      if (selectedCountry && selectedCountry.cities.length > 1) {
                        setStep("city");
                        setSelectedCity(null);
                      } else {
                        setStep("country");
                        setSelectedCountry(null);
                        setSelectedCity(null);
                      }
                    }}
                    className={backClass}
                  >
                    <CaretLeft size={12} weight="bold" />
                    {selectedCity.city}
                  </button>
                  <div className="shrink-0 px-1 pb-1.5">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Search..."
                      className={searchInputClass}
                      autoFocus
                    />
                  </div>
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {filtered.map((uni) => (
                      <button
                        key={uni.name}
                        type="button"
                        onClick={() => {
                          onChange(uni.name);
                          onCustomChange?.("");
                          setSearch("");
                          setOpen(false);
                        }}
                        className={itemClass}
                      >
                        {value === uni.name && (
                          <Check size={14} className="absolute left-3 text-gray-900 dark:text-white" />
                        )}
                        {uni.name}
                      </button>
                    ))}
                    {filtered.length === 0 && (
                      <p className="py-3 text-center text-sm text-gray-900/40 dark:text-white/40">
                        No match found.
                      </p>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        onChange("__other__");
                        setSearch("");
                        setOpen(false);
                      }}
                      className={mutedItemClass}
                    >
                      Other — Type Your University
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </PopoverContent>
      </Popover>

      {/* Custom university input — when "Other" is selected */}
      <AnimatePresence>
        {value === "__other__" && onCustomChange && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25, ease }}
          >
            <Input
              type="text"
              placeholder="Your University Name"
              value={customValue}
              onChange={(e) => onCustomChange(e.target.value)}
              className={inputClass}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
