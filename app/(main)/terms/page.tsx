import { BackButton } from "@/components/BackButton";
import { PageHeader } from "@/components/PageHeader";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms Of Service",
};

export default function TermsPage() {
  const lastUpdated = "March 5, 2026";

  return (
    <div className="relative h-full w-full">
      {/* Gradient overlay — Grainient visible at top, smoothly fading to background */}
      <div className="pointer-events-none absolute inset-0 z-0 bg-gradient-to-b from-transparent from-0% via-[var(--background)]/60 via-[20%] to-[var(--background)] to-[45%]" />

      <div className="relative z-10 flex h-full flex-col">
        {/* Fixed header */}
        <div className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-16 sm:pt-20">
          <PageHeader
            title="Terms Of Service"
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
                  1. Acceptance Of Terms
                </h2>
                <p className="mt-2">
                  By creating an account on Libraryyy (&quot;the Service&quot;),
                  you agree to be bound by these Terms of Service. If you do not
                  agree, do not use the Service.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  2. Description Of Service
                </h2>
                <p className="mt-2">
                  Libraryyy is an open-source, community-driven university
                  course library. The platform follows a contribution-based
                  model: students submit their own course documents, which are
                  then reviewed, moderated, and used as a foundation to create
                  original study resources — including examples, practice
                  exercises, presentations, study guides, and mock exams. The
                  Service does not collect or host university course materials
                  directly. The Service is operated by Hamid Sadkhosravi
                  (&quot;the Operator&quot;).
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  3. Free And Paid Services
                </h2>
                <p className="mt-2">
                  The Service currently offers full access to all features at no
                  cost. To sustain the Service and continue providing quality
                  study resources, the Operator may gradually introduce paid
                  subscription plans. The Operator reserves the right to, at any
                  time and without prior notice:
                </p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>
                    Introduce paid subscription plans with additional or
                    enhanced features.
                  </li>
                  <li>Move existing free features to a paid plan.</li>
                  <li>
                    Reduce, limit, or remove features available under the free
                    plan.
                  </li>
                  <li>
                    Change pricing, billing cycles, or payment terms for any
                    paid plan.
                  </li>
                  <li>Discontinue the free plan entirely.</li>
                </ul>
                <p className="mt-2">
                  By using the Service, you acknowledge and accept that access
                  to any features currently provided for free is not guaranteed
                  to remain free indefinitely.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  4. User Accounts
                </h2>
                <p className="mt-2">
                  You are responsible for maintaining the confidentiality of
                  your account credentials. You agree to provide accurate
                  information during registration and to keep it up to date. You
                  may not share your account with others. The Operator reserves
                  the right to suspend or terminate accounts at any time for any
                  reason.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  5. Contributors And Contributions
                </h2>
                <p className="mt-2">
                  Students may apply to become Contributors to provide course
                  documents and materials from their university courses. By
                  contributing, you confirm that you have the right to share the
                  documents you provide. You grant the Operator a non-exclusive,
                  royalty-free license to use, process, and build upon your
                  contributions to create original study resources for the
                  Service.
                </p>
                <p className="mt-2">
                  Contributions are not published instantly. All submissions go
                  through a moderation process where they are reviewed, compared
                  across multiple student contributions, and verified before
                  being used as a basis for any published content. We use AI
                  models to assist with moderation, content validation, and
                  the creation of study resources from verified contributions.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  6. Contributor Verification
                </h2>
                <p className="mt-2">
                  To become a Contributor, you must verify your university email
                  address. This confirms your enrollment at the university and
                  your eligibility to contribute to courses offered there. The
                  Operator may request additional verification at any time.
                </p>
                <p className="mt-2">
                  Professors and teachers may also become Core Contributors by
                  verifying their identity through their university email
                  address and additional confirmation (such as student
                  verification on course pages). Core Contributors may provide
                  course information directly, which may receive priority in the
                  moderation process.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  7. Platform-Created Content
                </h2>
                <p className="mt-2">
                  All study resources, examples, practice exercises,
                  presentations, study guides, and mock exams created by the
                  Service based on contributions are the intellectual property
                  of the Operator. You may use these resources for personal
                  study purposes only. You may not copy, redistribute,
                  republish, or commercially exploit any platform-created
                  content without written permission from the Operator.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  8. Acceptable Use
                </h2>
                <p className="mt-2">You agree not to:</p>
                <ul className="mt-2 list-inside list-disc space-y-1 pl-2">
                  <li>
                    Share your account credentials or let others use your
                    account.
                  </li>
                  <li>
                    Submit false, misleading, or fabricated course materials as
                    contributions.
                  </li>
                  <li>
                    Redistribute or republish platform-created study resources.
                  </li>
                  <li>
                    Scrape, automate access to, or reverse-engineer the Service.
                  </li>
                  <li>
                    Engage in any activity that disrupts or interferes with the
                    Service.
                  </li>
                </ul>
                <p className="mt-2">
                  The Operator reserves the right to suspend or ban users who
                  violate these terms and to reject or remove any contributions.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  9. Service Availability
                </h2>
                <p className="mt-2">
                  The Service is provided &quot;as is&quot; without warranties
                  of any kind. The Operator does not guarantee uninterrupted or
                  error-free operation. The Service may be modified, suspended,
                  or discontinued at any time without notice.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  10. Limitation Of Liability
                </h2>
                <p className="mt-2">
                  To the maximum extent permitted by law, the Operator shall not
                  be liable for any indirect, incidental, or consequential
                  damages arising from your use of the Service, including but
                  not limited to loss of data, academic outcomes, or
                  interruption of access. The study resources provided are for
                  supplemental learning only and should not be relied upon as a
                  sole academic resource.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  11. Changes To Terms
                </h2>
                <p className="mt-2">
                  The Operator may update these Terms at any time. Continued use
                  of the Service after changes constitutes acceptance of the
                  updated Terms. It is your responsibility to review these Terms
                  periodically.
                </p>
              </section>

              <section>
                <h2 className="font-display text-lg font-light text-gray-900 dark:text-white">
                  12. Contact
                </h2>
                <p className="mt-2">
                  For questions about these Terms, contact us at{" "}
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
