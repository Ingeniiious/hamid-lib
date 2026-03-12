"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import Link from "next/link";
import { PortalCodeInput } from "@/components/portal/PortalCodeInput";
import { FileViewer } from "@/components/portal/FileViewer";
import { verifyPortalCode, checkApprovalStatus } from "./actions";
import { useTranslation } from "@/lib/i18n";

const ease = [0.25, 0.46, 0.45, 0.94] as const;

type PortalState =
  | { step: "input" }
  | { step: "loading" }
  | { step: "waiting"; codeId: number; fileName: string }
  | { step: "rejected" }
  | { step: "expired" }
  | {
      step: "viewing";
      fileName: string;
      fileUrl: string;
      fileType: string;
      fileSize: number;
    };

export default function PortalPage() {
  const { t } = useTranslation();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<PortalState>({ step: "input" });

  const handleSubmit = useCallback(async (value: string) => {
    setState({ step: "loading" });
    setError(null);

    const result = await verifyPortalCode(value);

    if ("error" in result && result.error) {
      setError(result.error);
      setState({ step: "input" });
      return;
    }

    if (result.status === "pending_approval") {
      setState({
        step: "waiting",
        codeId: result.codeId!,
        fileName: result.fileName!,
      });
      return;
    }

    if (result.status === "approved") {
      setState({
        step: "viewing",
        fileName: result.fileName!,
        fileUrl: result.fileUrl!,
        fileType: result.fileType!,
        fileSize: result.fileSize!,
      });
    }
  }, []);

  // Poll for approval when waiting
  useEffect(() => {
    if (state.step !== "waiting") return;

    const interval = setInterval(async () => {
      const result = await checkApprovalStatus(state.codeId);

      if ("error" in result && result.error) {
        clearInterval(interval);
        setState({ step: "input" });
        return;
      }

      if (result.status === "approved") {
        clearInterval(interval);
        setState({
          step: "viewing",
          fileName: result.fileName!,
          fileUrl: result.fileUrl!,
          fileType: result.fileType!,
          fileSize: result.fileSize!,
        });
      } else if (result.status === "rejected") {
        clearInterval(interval);
        setState({ step: "rejected" });
      } else if (result.status === "expired") {
        clearInterval(interval);
        setState({ step: "expired" });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [state]);

  const handleReset = () => {
    setCode("");
    setError(null);
    setState({ step: "input" });
  };

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      {/* Back To Home — same pattern as auth page */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.6, ease, delay: 0.2 }}
        className="absolute bottom-8 text-center sm:bottom-10"
      >
        <Link
          href="/"
          className="inline-flex items-center rounded-full bg-white/10 px-8 py-3 text-sm font-medium text-white backdrop-blur-sm transition-all duration-300 hover:bg-white/20"
        >
          {t("common.backToHome")}
        </Link>
      </motion.div>

      {/* Portal illustration — pinned to page center, independent of card */}
      <AnimatePresence>
        {state.step !== "viewing" && (
          <motion.div
            key="portal-img"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease, delay: state.step === "input" ? 0.5 : 0 }}
            className="pointer-events-none absolute z-0 flex w-full max-w-xl justify-center px-3 sm:px-6"
            style={{ bottom: "calc(50% + 16px)" }}
          >
            <img
              src="https://lib.thevibecodedcompany.com/images/portal-new.webp"
              alt=""
              className="h-64 w-64 object-contain sm:h-80 sm:w-80"
              draggable={false}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <AnimatePresence mode="wait">
        {state.step === "viewing" ? (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="w-full max-w-4xl px-6"
          >
            <FileViewer
              fileName={state.fileName}
              fileUrl={state.fileUrl}
              fileType={state.fileType}
              fileSize={state.fileSize}
              onBack={handleReset}
            />
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="relative w-full max-w-xl px-3 sm:px-6"
          >
            <LayoutGroup>
              <motion.div
                layout
                className="relative z-10 rounded-3xl border border-white/20 bg-white/10 px-4 py-6 shadow-2xl backdrop-blur-xl sm:px-8 sm:py-8"
                style={{ borderRadius: "1.5rem" }}
                transition={{ layout: { duration: 0.35, ease } }}
              >

                <AnimatePresence mode="wait" initial={false}>
                  {state.step === "input" && (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <motion.h2
                        layout
                        className="mb-2 text-center font-display text-2xl font-light text-white"
                        transition={{ layout: { duration: 0.3, ease } }}
                      >
                        {t("portal.title")}
                      </motion.h2>
                      <motion.p
                        layout
                        className="mb-6 text-center text-sm text-white/50"
                        transition={{ layout: { duration: 0.3, ease } }}
                      >
                        {t("portal.subtitle")}
                      </motion.p>

                      <PortalCodeInput
                        value={code}
                        onChange={setCode}
                        onComplete={handleSubmit}
                      />
                      <AnimatePresence>
                        {error && (
                          <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3, ease }}
                            className="mt-5 text-center text-xs text-red-400"
                          >
                            {error}
                          </motion.p>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  )}

                  {state.step === "loading" && (
                    <motion.div
                      key="loading"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center py-6"
                    >
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-white/20 border-t-white/70" />
                      <p className="mt-4 text-sm text-white/50">{t("portal.verifying")}</p>
                    </motion.div>
                  )}

                  {state.step === "waiting" && (
                    <motion.div
                      key="waiting"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center py-4"
                    >
                      <div className="h-7 w-7 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400/80" />
                      <p className="mt-4 text-sm font-medium text-amber-400/90">
                        {t("portal.waitingForApproval")}
                      </p>
                      <p className="mt-1.5 text-center text-xs leading-relaxed text-white/40">
                        {t("portal.presenterNeedsApproval")}
                      </p>
                      <p className="mt-3 max-w-full truncate text-xs text-white/30">
                        {state.fileName}
                      </p>
                    </motion.div>
                  )}

                  {state.step === "rejected" && (
                    <motion.div
                      key="rejected"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center py-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-500/10">
                        <div className="h-3 w-3 rounded-full bg-red-400" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-red-400">
                        {t("portal.accessDenied")}
                      </p>
                      <p className="mt-1.5 text-center text-xs text-white/40">
                        {t("portal.presenterRejected")}
                      </p>
                      <button
                        onClick={handleReset}
                        className="mt-5 rounded-full bg-white/10 px-5 py-2 text-xs font-medium text-white/70 transition-all duration-300 hover:bg-white/15 hover:text-white/90"
                      >
                        {t("portal.tryAnotherCode")}
                      </button>
                    </motion.div>
                  )}

                  {state.step === "expired" && (
                    <motion.div
                      key="expired"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="flex flex-col items-center py-4"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/5">
                        <div className="h-3 w-3 rounded-full bg-white/30" />
                      </div>
                      <p className="mt-4 text-sm font-medium text-white/60">
                        {t("portal.codeExpired")}
                      </p>
                      <p className="mt-1.5 text-center text-xs text-white/40">
                        {t("portal.askForNewCode")}
                      </p>
                      <button
                        onClick={handleReset}
                        className="mt-5 rounded-full bg-white/10 px-5 py-2 text-xs font-medium text-white/70 transition-all duration-300 hover:bg-white/15 hover:text-white/90"
                      >
                        {t("common.tryAgain")}
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </LayoutGroup>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
