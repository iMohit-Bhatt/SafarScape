import type { DB } from "@/db";
import { emailLog } from "@/db/schema";

export type OutgoingEmail = {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
};

export type EmailProvider = {
  name: string;
  send(msg: OutgoingEmail): Promise<void>;
};

/** Development/test provider: nothing leaves the server; messages are visible in email_log. */
const outbox: EmailProvider = { name: "outbox", async send() {} };

/** Always fails — handy to exercise the failure + retry path (EMAIL_PROVIDER=fail). */
const failing: EmailProvider = {
  name: "fail",
  async send() {
    throw new Error("Simulated provider failure");
  },
};

function resend(apiKey: string, from: string): EmailProvider {
  return {
    name: "resend",
    async send(msg) {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from,
          to: [msg.to],
          subject: msg.subject,
          text: msg.text,
          html: msg.html,
          reply_to: msg.replyTo,
        }),
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`Resend responded ${res.status}`);
    },
  };
}

let override: EmailProvider | null = null;
/** Tests can swap the provider. */
export function setEmailProviderForTests(p: EmailProvider | null) {
  override = p;
}

export function getEmailProvider(): EmailProvider {
  if (override) return override;
  const choice = process.env.EMAIL_PROVIDER;
  if (choice === "fail") return failing;
  if (process.env.RESEND_API_KEY && choice !== "outbox") {
    return resend(process.env.RESEND_API_KEY, process.env.EMAIL_FROM || "Safarscape <enquiries@example.com>");
  }
  return outbox;
}

export type SendResult = { ok: boolean; error?: string };

/** Sends and records every attempt in email_log. Never throws. */
export async function sendLogged(
  db: DB,
  msg: OutgoingEmail,
  meta: { kind: "team" | "autoreply" | "reset" | "test"; enquiryId?: number | null; attempts?: number },
): Promise<SendResult> {
  const provider = getEmailProvider();
  let error: string | undefined;
  try {
    await provider.send(msg);
  } catch (e) {
    error = e instanceof Error ? e.message : String(e);
    console.error(`[email] ${meta.kind} to ${msg.to} failed: ${error}`);
  }
  await db.insert(emailLog).values({
    enquiryId: meta.enquiryId ?? null,
    to: msg.to,
    subject: msg.subject,
    body: msg.text,
    kind: meta.kind,
    provider: provider.name,
    status: error ? "failed" : "sent",
    error: error ?? null,
    attempts: meta.attempts ?? 1,
  });
  return error ? { ok: false, error } : { ok: true };
}

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
