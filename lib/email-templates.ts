type TemplateType = "signup-otp" | "password-reset-otp" | "account-deletion-otp";

const subjects: Record<TemplateType, string> = {
  "signup-otp": "Your Verification Code",
  "password-reset-otp": "Password Reset Code",
  "account-deletion-otp": "Account Deletion Code",
};

const bodyText: Record<TemplateType, (code: string) => string> = {
  "signup-otp": (code) =>
    `Welcome aboard! Your verification code is: ${code}. Expires in 90 seconds.`,
  "password-reset-otp": (code) =>
    `Your password reset code is: ${code}. Expires in 90 seconds. Didn't request this? Just ignore it.`,
  "account-deletion-otp": (code) =>
    `Your account deletion code is: ${code}. Expires in 90 seconds. Didn't request this? Please secure your account.`,
};

const headings: Record<TemplateType, string> = {
  "signup-otp": "Welcome Aboard",
  "password-reset-otp": "Reset Your Password",
  "account-deletion-otp": "Confirm Deletion",
};

const descriptions: Record<TemplateType, string> = {
  "signup-otp":
    "Enter The Code Below To Verify Your Email And Get Started.",
  "password-reset-otp":
    "Enter The Code Below To Set A New Password.",
  "account-deletion-otp":
    "Enter The Code Below To Confirm. This Action Cannot Be Undone.",
};

const signoffs: Record<TemplateType, string> = {
  "signup-otp": "Happy studying!",
  "password-reset-otp": "You'll be back in no time.",
  "account-deletion-otp": "We're sorry to see you go.",
};

function buildHtml({
  name,
  code,
  heading,
  description,
  signoff,
}: {
  name: string;
  code: string;
  heading: string;
  description: string;
  signoff: string;
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
        <!-- Card -->
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
                Here's your code:
              </p>

              <!-- OTP Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="font-size: 32px; font-weight: 600; letter-spacing: 6px; color: #FFFFFF; padding: 20px 32px; background-image: url('https://lib.thevibecodedcompany.com/images/email-bg.jpg'); background-size: cover; background-position: center; background-color: #5227FF; border-radius: 12px; display: inline-block; text-shadow: 0 1px 4px rgba(0,0,0,0.2);">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Expiry -->
              <p style="margin: 0 0 24px; font-size: 14px; line-height: 1.6; color: #78716C;">
                Heads up — this expires in 90 seconds.
              </p>

              <!-- Safety note -->
              <p style="margin: 0 0 28px; font-size: 14px; line-height: 1.6; color: #78716C;">
                Didn't request this? No worries, just ignore it. Need help? Reach out at <a href="mailto:support@libraryyy.com" style="color: #5227FF; text-decoration: underline;">support@libraryyy.com</a>.
              </p>

              <!-- Sign-off -->
              <p style="margin: 0; font-size: 15px; line-height: 1.6; color: #44403C;">
                ${signoff}<br />— The Libraryyy Team
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
      signoff: signoffs[type],
    }),
    text: bodyText[type](code),
  };
}
