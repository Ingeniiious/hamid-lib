import { ImapFlow } from "imapflow";
import nodemailer from "nodemailer";
import { simpleParser, ParsedMail } from "mailparser";

const ZOHO_USER = process.env.ZOHO_MAIL_USER || "hello@libraryyy.com";
const ZOHO_PASSWORD = process.env.ZOHO_MAIL_PASSWORD || "";

const IMAP_CONFIG = {
  host: "imappro.zoho.eu",
  port: 993,
  secure: true,
  auth: {
    user: ZOHO_USER,
    pass: ZOHO_PASSWORD,
  },
  logger: false as const,
};

const SMTP_CONFIG = {
  host: "smtppro.zoho.eu",
  port: 465,
  secure: true,
  auth: {
    user: ZOHO_USER,
    pass: ZOHO_PASSWORD,
  },
};

export interface EmailListItem {
  uid: number;
  subject: string;
  from: { name: string; address: string };
  to: { name: string; address: string }[];
  date: string;
  seen: boolean;
  snippet: string;
  messageId: string;
}

export interface EmailDetail extends EmailListItem {
  html: string;
  text: string;
  cc: { name: string; address: string }[];
  attachments: { filename: string; size: number; contentType: string }[];
  inReplyTo: string | null;
  references: string[];
}

function parseAddress(
  addr: { name?: string; address?: string } | undefined
): { name: string; address: string } {
  return {
    name: addr?.name || "",
    address: addr?.address || "",
  };
}

function parseAddressList(
  addrs: ParsedMail["to"]
): { name: string; address: string }[] {
  if (!addrs) return [];
  if (Array.isArray(addrs)) {
    return addrs.flatMap((a) =>
      "value" in a
        ? a.value.map((v) => parseAddress(v))
        : [parseAddress(a as { name?: string; address?: string })]
    );
  }
  if ("value" in addrs) {
    return addrs.value.map((v) => parseAddress(v));
  }
  return [];
}

async function withImapClient<T>(fn: (client: ImapFlow) => Promise<T>): Promise<T> {
  const client = new ImapFlow(IMAP_CONFIG);
  try {
    await client.connect();
    return await fn(client);
  } finally {
    await client.logout().catch(() => {});
  }
}

export async function fetchInboxEmails(
  page: number = 1,
  limit: number = 25,
  search?: string
): Promise<{ emails: EmailListItem[]; total: number }> {
  return withImapClient(async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const mailbox = client.mailbox;
      if (!mailbox) return { emails: [], total: 0 };
      const total = (mailbox as unknown as Record<string, unknown>).exists as number;

      if (total === 0) return { emails: [], total: 0 };

      let uids: number[];
      if (search) {
        const searchResults = await client.search(
          {
            or: [{ subject: search }, { from: search }, { body: search }],
          },
          { uid: true }
        );
        uids = (searchResults as number[]).sort((a, b) => b - a);
      } else {
        const allUids = await client.search({ all: true }, { uid: true });
        uids = (allUids as number[]).sort((a, b) => b - a);
      }

      const totalResults = uids.length;
      const startIdx = (page - 1) * limit;
      const pageUids = uids.slice(startIdx, startIdx + limit);

      if (pageUids.length === 0) return { emails: [], total: totalResults };

      const emails: EmailListItem[] = [];
      const uidSet = pageUids.join(",");

      for await (const msg of client.fetch(
        uidSet,
        {
          uid: true,
          envelope: true,
          flags: true,
          bodyStructure: true,
          headers: ["message-id"],
        },
        { uid: true }
      )) {
        const env = msg.envelope;
        if (!env) continue;
        emails.push({
          uid: msg.uid,
          subject: env.subject || "(No subject)",
          from: parseAddress(env.from?.[0]),
          to: (env.to || []).map((a) => parseAddress(a)),
          date: env.date?.toISOString() || new Date().toISOString(),
          seen: msg.flags?.has("\\Seen") ?? false,
          snippet: env.subject?.substring(0, 120) || "",
          messageId: env.messageId || "",
        });
      }

      emails.sort((a, b) => b.uid - a.uid);

      return { emails, total: totalResults };
    } finally {
      lock.release();
    }
  });
}

export async function fetchEmailById(uid: number): Promise<EmailDetail | null> {
  return withImapClient(async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      const msg = await client.fetchOne(
        String(uid),
        {
          uid: true,
          envelope: true,
          flags: true,
          source: true,
        },
        { uid: true }
      );

      if (!msg || !msg.source) return null;

      const parsed = await simpleParser(msg.source);
      const env = msg.envelope;
      if (!env) return null;

      return {
        uid: msg.uid,
        subject: env.subject || "(No subject)",
        from: parseAddress(env.from?.[0]),
        to: (env.to || []).map((a) => parseAddress(a)),
        cc: parseAddressList(parsed.cc),
        date: env.date?.toISOString() || new Date().toISOString(),
        seen: msg.flags?.has("\\Seen") ?? false,
        snippet: parsed.text?.substring(0, 200) || "",
        messageId: env.messageId || "",
        html: parsed.html || parsed.textAsHtml || "",
        text: parsed.text || "",
        inReplyTo:
          typeof parsed.inReplyTo === "string" ? parsed.inReplyTo : null,
        references: Array.isArray(parsed.references)
          ? parsed.references
          : parsed.references
            ? [parsed.references]
            : [],
        attachments: (parsed.attachments || []).map((a) => ({
          filename: a.filename || "unnamed",
          size: a.size,
          contentType: a.contentType,
        })),
      };
    } finally {
      lock.release();
    }
  });
}

export async function markAsRead(uid: number): Promise<void> {
  return withImapClient(async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function deleteEmail(uid: number): Promise<void> {
  return withImapClient(async (client) => {
    const lock = await client.getMailboxLock("INBOX");
    try {
      await client.messageFlagsAdd(String(uid), ["\\Deleted"], { uid: true });
      await client.messageDelete(String(uid), { uid: true });
    } finally {
      lock.release();
    }
  });
}

export async function sendEmailViaZoho({
  to,
  cc,
  subject,
  html,
  inReplyTo,
  references,
}: {
  to: string;
  cc?: string;
  subject: string;
  html: string;
  inReplyTo?: string;
  references?: string[];
}): Promise<{ messageId: string }> {
  const transporter = nodemailer.createTransport(SMTP_CONFIG);

  const result = await transporter.sendMail({
    from: `"Libraryyy" <${ZOHO_USER}>`,
    to,
    ...(cc && { cc }),
    subject,
    html,
    ...(inReplyTo && { inReplyTo }),
    ...(references && references.length > 0 && { references }),
  });

  return { messageId: result.messageId };
}
