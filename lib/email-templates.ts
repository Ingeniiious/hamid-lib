type TemplateType = "signup-otp" | "password-reset-otp" | "account-deletion-otp";

const subjects: Record<TemplateType, string> = {
  "signup-otp": "Your Verification Code — Hamid Library",
  "password-reset-otp": "Your Password Reset Code — Hamid Library",
  "account-deletion-otp": "Account Deletion Confirmation — Hamid Library",
};

const bodyText: Record<TemplateType, (code: string) => string> = {
  "signup-otp": (code) =>
    `Welcome to Hamid Library! Your verification code is: ${code}. This code expires in 5 minutes.`,
  "password-reset-otp": (code) =>
    `Your Hamid Library password reset code is: ${code}. This code expires in 5 minutes. If you didn't request this, you can safely ignore this email.`,
  "account-deletion-otp": (code) =>
    `Your account deletion confirmation code is: ${code}. This code expires in 5 minutes. If you didn't request this, please secure your account immediately.`,
};

const headings: Record<TemplateType, string> = {
  "signup-otp": "Verify Your Email",
  "password-reset-otp": "Reset Your Password",
  "account-deletion-otp": "Confirm Account Deletion",
};

const descriptions: Record<TemplateType, string> = {
  "signup-otp":
    "Use the code below to verify your email and complete your sign-up.",
  "password-reset-otp":
    "Use the code below to reset your password. If you didn't request a password reset, you can safely ignore this email.",
  "account-deletion-otp":
    "Use the code below to confirm your account deletion. This action cannot be undone.",
};

function buildHtml({
  name,
  code,
  heading,
  description,
}: {
  name: string;
  code: string;
  heading: string;
  description: string;
}): string {
  const greeting = name ? `Hey ${name},` : "Hey there,";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${heading}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAFAF9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #FAFAF9; padding: 40px 16px;">
    <tr>
      <td align="center">
        <!-- Logo -->
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
          <tr>
            <td align="center">
              <img src="https://library.hamidproject.xyz/icon-192.png" alt="Hamid Library" height="24" style="display: block; height: 24px; width: auto;" />
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="max-width: 520px; width: 100%; background-color: #FFFFFF; border-radius: 16px; border: 1px solid #E7E5E4; overflow: hidden;">
          <tr>
            <td style="padding: 40px 36px;">
              <!-- Heading -->
              <h1 style="margin: 0 0 8px; font-size: 20px; font-weight: 600; color: #1C1917; text-align: center;">
                ${heading}
              </h1>

              <!-- Description -->
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #78716C; text-align: center;">
                ${description}
              </p>

              <!-- Greeting -->
              <p style="margin: 0 0 20px; font-size: 15px; line-height: 1.6; color: #44403C;">
                ${greeting}
              </p>

              <!-- Message -->
              <p style="margin: 0 0 24px; font-size: 15px; line-height: 1.6; color: #44403C;">
                Your verification code is:
              </p>

              <!-- OTP Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="font-size: 32px; font-weight: 600; letter-spacing: 6px; color: #1C1917; padding: 16px 24px; background-color: #F5F5F4; border-radius: 12px; display: inline-block;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              <p style="margin: 0 0 20px; font-size: 14px; line-height: 1.6; color: #78716C;">
                This code expires in 5 minutes.
              </p>

              <!-- Safety note -->
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #78716C;">
                If you didn't request this code, you can safely ignore this email. If you need help, contact us at <a href="mailto:support@hamidproject.xyz" style="color: #78716C; text-decoration: underline;">support@hamidproject.xyz</a>.
              </p>

              <!-- Sign-off -->
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #44403C;">
                Thanks,<br />The Hamid Library Team
              </p>
            </td>
          </tr>

          <!-- Divider + Footer -->
          <tr>
            <td style="padding: 0 36px;">
              <hr style="margin: 0; border: none; border-top: 1px solid #E7E5E4;" />
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 36px 24px;">
              <p style="margin: 0; font-size: 12px; line-height: 1.5; color: #A8A29E; text-align: center;">
                Hamid Library &mdash; library.hamidproject.xyz<br />
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
}

export function getEmailTemplate(
  type: TemplateType,
  { code, name }: { code: string; name?: string }
): { subject: string; html: string; text: string } {
  return {
    subject: subjects[type],
    html: buildHtml({
      name: name || "",
      code,
      heading: headings[type],
      description: descriptions[type],
    }),
    text: bodyText[type](code),
  };
}
