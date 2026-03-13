/**
 * Generic notification email HTML builder.
 * Brand-consistent: #5227FF CTA button, center-aligned, pill-shaped button.
 */

const LOGO_URL = "https://lib.thevibecodedcompany.com/images/logo.png";
const BRAND_COLOR = "#5227FF";

export function buildNotificationEmail({
  title,
  body,
  ctaText,
  ctaUrl,
}: {
  title: string;
  body: string;
  ctaText?: string;
  ctaUrl?: string;
}): { subject: string; html: string; text: string } {
  const ctaButton = ctaText && ctaUrl
    ? `<tr>
        <td align="center" style="padding: 24px 0 0;">
          <a href="https://libraryyy.com${ctaUrl}" style="
            display: inline-block;
            background-color: ${BRAND_COLOR};
            color: #ffffff;
            text-decoration: none;
            padding: 12px 32px;
            border-radius: 9999px;
            font-weight: 600;
            font-size: 14px;
          ">${ctaText}</a>
        </td>
      </tr>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin: 0; padding: 0; background-color: #f9fafb; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 32px 32px 0;">
              <img src="${LOGO_URL}" alt="Libraryyy" width="40" height="40" style="border-radius: 8px;" />
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 24px 32px 0;">
              <h1 style="margin: 0; font-size: 20px; font-weight: 700; color: #111827;">${title}</h1>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding: 16px 32px 0;">
              <p style="margin: 0; font-size: 15px; color: #4b5563; line-height: 1.6;">${body}</p>
            </td>
          </tr>
          ${ctaButton}
          <tr>
            <td align="center" style="padding: 32px; color: #9ca3af; font-size: 12px;">
              Libraryyy &mdash; libraryyy.com
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${title}\n\n${body}${ctaUrl ? `\n\nView: https://libraryyy.com${ctaUrl}` : ""}\n\n— Libraryyy`;

  return { subject: `${title} — Libraryyy`, html, text };
}
