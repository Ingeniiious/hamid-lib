import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "./db";

export const auth = betterAuth({
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      await fetch("https://api.autosend.io/v1/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AUTOSEND_API_KEY}`,
        },
        body: JSON.stringify({
          to: user.email,
          from: process.env.AUTOSEND_FROM_EMAIL,
          subject: "Reset your password — Hamid Library",
          html: `<p>Click <a href="${url}">here</a> to reset your password.</p>`,
        }),
      });
    },
  },
  emailVerification: {
    sendVerificationEmail: async ({ user, url }) => {
      await fetch("https://api.autosend.io/v1/email/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.AUTOSEND_API_KEY}`,
        },
        body: JSON.stringify({
          to: user.email,
          from: process.env.AUTOSEND_FROM_EMAIL,
          subject: "Verify your email — Hamid Library",
          html: `<p>Click <a href="${url}">here</a> to verify your email address.</p>`,
        }),
      });
    },
    sendOnSignUp: true,
  },
});
