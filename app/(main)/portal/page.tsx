"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { PortalCodeInput } from "@/components/portal/PortalCodeInput";
import { FileViewer } from "@/components/portal/FileViewer";
import { verifyPortalCode, checkApprovalStatus } from "./actions";

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
    <div className="flex w-full flex-col items-center justify-center">
      <AnimatePresence mode="wait">
        {state.step === "viewing" ? (
          <motion.div
            key="viewer"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="w-full px-4"
          >
            <FileViewer
              fileName={state.fileName}
              fileUrl={state.fileUrl}
              fileType={state.fileType}
              fileSize={state.fileSize}
            />
          </motion.div>
        ) : (
          <motion.div
            key="card"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease }}
            className="w-full max-w-sm px-6"
          >
            <div className="rounded-3xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl">
              <h2 className="mb-2 text-center font-display text-2xl font-light text-white">
                Portal
              </h2>

              <AnimatePresence mode="wait">
                {state.step === "input" && (
                  <motion.div
                    key="input"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                  >
                    <p className="mb-5 text-center text-sm text-white/50">
                      Enter Your 8-Character Code
                    </p>
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
                          className="mt-4 text-center text-xs text-red-400"
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
                    transition={{ duration: 0.3, ease }}
                    className="py-8 text-center"
                  >
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white/80" />
                    <p className="mt-3 text-sm text-white/50">Verifying...</p>
                  </motion.div>
                )}

                {state.step === "waiting" && (
                  <motion.div
                    key="waiting"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="py-4 text-center"
                  >
                    <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-amber-400/30 border-t-amber-400" />
                    <p className="mt-3 text-sm font-medium text-amber-400">
                      Waiting For Approval
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      The presenter needs to approve your request.
                    </p>
                    <p className="mt-2 truncate text-xs text-white/30">
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
                    transition={{ duration: 0.3, ease }}
                    className="py-4 text-center"
                  >
                    <p className="text-sm font-medium text-red-400">
                      Access Denied
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      The presenter rejected your request.
                    </p>
                    <button
                      onClick={handleReset}
                      className="mt-4 text-xs text-white/50 transition-colors hover:text-white/80"
                    >
                      Try Another Code
                    </button>
                  </motion.div>
                )}

                {state.step === "expired" && (
                  <motion.div
                    key="expired"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3, ease }}
                    className="py-4 text-center"
                  >
                    <p className="text-sm font-medium text-white/60">
                      Code Expired
                    </p>
                    <p className="mt-1 text-xs text-white/40">
                      Ask the presenter for a new code.
                    </p>
                    <button
                      onClick={handleReset}
                      className="mt-4 text-xs text-white/50 transition-colors hover:text-white/80"
                    >
                      Try Again
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
          Back To Home
        </Link>
      </motion.div>
    </div>
  );
}
