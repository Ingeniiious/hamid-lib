export async function sendEmail({
  to,
  subject,
  html,
  text,
}: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const res = await fetch("https://api.autosend.com/v1/mails/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.AUTOSEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: {
          email: process.env.AUTOSEND_FROM_EMAIL,
          name: "Hamid Library",
        },
        to: { email: to },
        subject,
        html,
        text,
      }),
    });

    if (!res.ok) {
      return { success: false, error: "Failed to send email." };
    }

    return { success: true };
  } catch {
    return { success: false, error: "Failed to send email." };
  }
}
