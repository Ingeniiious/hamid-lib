import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy",
};

export default function PrivacyPage() {
  const lastUpdated = "March 5, 2026";

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — Grainient visible at top, smoothly fading to background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Fixed header */}
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-16 sm:pt-20">
          <PageHeader
            title="Privacy Policy"
            subtitle={`Last updated: ${lastUpdated}`}
          />
        </div>

        {/* Scrollable content */}
        <div
          className="min-h-0 flex-1 overflow-y-auto px-6 pb-24"
          style={{
            maskImage:
              "linear-gradient(to bottom, transparent 0%, black 64px)",
            WebkitMaskImage:
              "linear-gradient(to bottom, transparent 0%, black 64px)",
          }}
        >
          <article className="mx-auto max-w-2xl pt-8">
            <div className="space-y-8 text-sm leading-relaxed text-gray-900/70 dark:text-white/70">
              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  1. Information We Collect
                </h2>
                <p className="mt-2">
                  When you create an account on Libraryyy, we collect the
                  following information:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>
                    <strong>Account information:</strong> your name, email
                    address, and password (encrypted).
                  </li>
                  <li>
                    <strong>Profile information:</strong> university, gender, and
                    profile photo (if uploaded).
                  </li>
                  <li>
                    <strong>Usage data:</strong> session information, IP
                    addresses, browser type, and pages visited.
                  </li>
                  <li>
                    <strong>Exam and progress data:</strong> your practice
                    attempts, scores, and course progress.
                  </li>
                </ul>
                <p className="mt-2">
                  If you become a Contributor, we additionally collect:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>
                    <strong>University email address:</strong> used to verify
                    your enrollment and eligibility to contribute.
                  </li>
                  <li>
                    <strong>Contributed documents:</strong> course materials you
                    submit for review and moderation.
                  </li>
                </ul>
                <p className="mt-2">
                  If you are a professor or teacher applying as a Core
                  Contributor, we may also collect identity verification
                  materials such as a photo or university credentials.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  2. How We Use Your Information
                </h2>
                <p className="mt-2">We use the collected information to:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>Provide and operate the Service.</li>
                  <li>Authenticate your identity and manage your account.</li>
                  <li>
                    Send transactional emails (verification, password reset).
                  </li>
                  <li>
                    Verify contributor eligibility through university email
                    confirmation.
                  </li>
                  <li>
                    Review, moderate, and validate contributed course materials,
                    including through the use of AI models.
                  </li>
                  <li>
                    Create original study resources (examples, practices, mock
                    exams) based on verified contributions, with the assistance
                    of AI models.
                  </li>
                  <li>Track your exam progress and study history.</li>
                  <li>Monitor usage for security and abuse prevention.</li>
                </ul>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  3. Data Storage And Security
                </h2>
                <p className="mt-2">
                  Your data is stored on secure, third-party cloud
                  infrastructure (Neon PostgreSQL, Cloudflare R2, Vercel). We
                  implement reasonable security measures to protect your
                  information, but no method of transmission or storage is 100%
                  secure. We cannot guarantee absolute security.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  4. Data Sharing
                </h2>
                <p className="mt-2">
                  We do not sell, rent, or trade your personal information to
                  third parties. We may share data with third-party service
                  providers solely to operate the Service (e.g., email delivery,
                  hosting, authentication). We may disclose information if
                  required by law. Your contributed documents are used
                  internally for moderation and content creation and are not
                  shared publicly in their original form.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  5. Cookies, Sessions, And Local Storage
                </h2>
                <p className="mt-2">
                  We use cookies and session tokens to maintain your
                  authentication state. We also use your browser&apos;s local
                  storage to save preferences such as theme choice and language
                  selection. These are essential for the Service to function and
                  cannot be disabled.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  6. Your Rights
                </h2>
                <p className="mt-2">You have the right to:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>Access and update your personal information.</li>
                  <li>Delete your account and associated data.</li>
                  <li>Request a copy of your data.</li>
                  <li>
                    Withdraw from the Contributor program at any time. Note that
                    study resources already created from your contributions may
                    remain on the platform.
                  </li>
                </ul>
                <p className="mt-2">
                  You can manage your account and delete it from the Settings
                  page in your dashboard.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  7. Data Retention
                </h2>
                <p className="mt-2">
                  We retain your data for as long as your account is active.
                  When you delete your account, your personal data will be
                  removed. Contributed documents that have already been processed
                  and used to create study resources may be retained in
                  anonymized form. We may retain anonymized usage data for
                  analytics purposes.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  8. Children&apos;s Privacy
                </h2>
                <p className="mt-2">
                  The Service is intended for university students and is not
                  directed at children under 13. We do not knowingly collect
                  personal information from children under 13.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  9. Changes To This Policy
                </h2>
                <p className="mt-2">
                  We may update this Privacy Policy at any time. Continued use
                  of the Service after changes constitutes acceptance of the
                  updated policy.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  10. Contact
                </h2>
                <p className="mt-2">
                  For privacy-related questions, contact us at{" "}
                  <a
                    href="mailto:hello@libraryyy.com"
                    className="text-[#5227FF] underline underline-offset-2"
                  >
                    hello@libraryyy.com
                  </a>
                  .
                </p>
              </section>
            </div>
          </article>
        </div>

        <BackButton href="/auth" label="Back" floating closeTab />
      </div>
    </div>
  );
}
