export function buildSupportReplyEmail(
  userName: string,
  ticketSubject: string,
  replyText: string,
  ticketUrl: string
): { subject: string; html: string; text: string } {
  const greeting = userName ? `Hey ${userName},` : "Hey there,";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Support Reply</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAF9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E7E5E4; overflow: hidden;">
          <tr>
            <td style="padding: 40px 36px;">
              <!-- Logo -->
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin: 0 auto 28px;">
                <tr>
                  <td align="center">
                    <img src="https://lib.thevibecodedcompany.com/images/logo.png" alt="Libraryyy" height="56" style="display: block; height: 56px; width: auto; border-radius: 14px;" />
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #5227FF; text-align: center;">
                Support Reply
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #78716C; text-align: center;">
                An Admin Has Replied To Your Support Ticket.
              </p>

              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #44403C;">
                ${greeting}
              </p>

              <!-- Ticket subject -->
              <p style="margin: 0 0 16px; font-size: 15px; line-height: 1.6; color: #44403C;">
                Your ticket <strong>"${ticketSubject}"</strong> has a new reply:
              </p>

              <!-- Reply blockquote -->
              <div style="margin: 0 0 24px; padding: 16px 20px; background-color: #F5F3FF; border-left: 4px solid #5227FF; border-radius: 8px; font-size: 14px; line-height: 1.7; color: #44403C;">
                ${replyText.replace(/\n/g, "<br />")}
              </div>

              <!-- CTA Button -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <a href="${ticketUrl}" style="display: inline-block; padding: 14px 32px; background-color: #5227FF; color: #FFFFFF; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 999px;">
                      View Ticket
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Sign-off -->
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #44403C;">
                We're here to help!<br />— The Libraryyy Team
              </p>
            </td>
          </tr>

          <tr>
            <td style="padding: 0 36px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #E7E5E4;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 36px 24px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #B19EEF; text-align: center;">
                Libraryyy &mdash; libraryyy.com<br />
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const text = `${greeting}\n\nYour support ticket "${ticketSubject}" has a new reply:\n\n${replyText}\n\nView your ticket: ${ticketUrl}\n\nWe're here to help!\n— The Libraryyy Team`;

  return {
    subject: `Re: ${ticketSubject} — Libraryyy Support`,
    html,
    text,
  };
}
