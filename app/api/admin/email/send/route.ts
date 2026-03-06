import { NextRequest, NextResponse } from "next/server";
import { getAdminSessionForAPI } from "@/lib/admin/auth";
import { sendEmailViaZoho } from "@/lib/email/zoho";
import { sendEmail as sendViaAutosend } from "@/lib/email";

export async function POST(request: NextRequest) {
  const session = await getAdminSessionForAPI();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!session.admin.permissions.includes("email.send")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit: 20 emails per minute per admin
  const { rateLimit } = await import("@/lib/rate-limit");
  const rl = await rateLimit(`admin:email:send:${session.user.id}`, 20, 60);
  if (!rl.allowed) {
    return NextResponse.json({ error: "Too many emails sent. Please wait." }, { status: 429 });
  }

  try {
    const body = await request.json();
    const { to, cc, subject, html, inReplyTo, references, via } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(to)) {
      return NextResponse.json(
        { error: "Invalid email address" },
        { status: 400 }
      );
    }

    // Send via AutoSend (transactional / noreply address)
    if (via === "autosend") {
      const textContent = html.replace(/<[^>]*>/g, "");
      const result = await sendViaAutosend({
        to,
        subject,
        html,
        text: textContent,
      });

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Failed to send via AutoSend" },
          { status: 500 }
        );
      }

      return NextResponse.json({ messageId: "autosend", via: "autosend" });
    }

    // Default: send via Zoho SMTP
    const result = await sendEmailViaZoho({
      to,
      cc,
      subject,
      html,
      inReplyTo,
      references,
    });

    return NextResponse.json({ ...result, via: "zoho" });
  } catch (error) {
    console.error("Email send error:", error);
    return NextResponse.json(
      { error: "Failed to send email" },
      { status: 500 }
    );
  }
}
