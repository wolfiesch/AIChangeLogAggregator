import { Resend } from "resend";

// Lazy-load Resend client to avoid build-time errors when API key is not set
let resendClient: Resend | null = null;

function getResend(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(apiKey);
  }
  return resendClient;
}

const FROM_EMAIL = "AI Changelog <digest@changelog.wolfgangschoenberger.com>";
const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://changelog.wolfgangschoenberger.com")
  .trim()
  .replace(/\/$/, "");

/**
 * Send verification email to new subscriber
 */
export async function sendVerificationEmail(
  email: string,
  verificationToken: string
) {
  const verifyUrl = `${SITE_URL}/api/verify?token=${verificationToken}`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Confirm your AI Changelog subscription",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Welcome to AI Changelog!</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Thanks for subscribing to the weekly AI changelog digest. You'll receive updates about the latest changes from OpenAI, Anthropic, Google, and 50+ other AI providers.
    </p>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Please confirm your email address by clicking the button below:
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${verifyUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Confirm Subscription
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">
      Or copy this link: <a href="${verifyUrl}" style="color: #0066cc;">${verifyUrl}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #888; font-size: 12px;">
      If you didn't subscribe to AI Changelog, you can safely ignore this email.
    </p>
  </div>
</body>
</html>
    `,
  });

  if (error) {
    console.error("Failed to send verification email:", error);
    throw new Error("Failed to send verification email");
  }
}

/**
 * Send passwordless sign-in email (magic link)
 */
 export async function sendSignInEmail(
  email: string,
  token: string,
  nextPath?: string
 ) {
  const nextParam = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";
  const signInUrl = `${SITE_URL}/api/auth/callback?token=${encodeURIComponent(token)}${nextParam}`;

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: "Sign in to AI Changelog",
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <h1 style="color: #1a1a1a; font-size: 24px; margin-bottom: 16px;">Sign in to AI Changelog</h1>
    <p style="color: #4a4a4a; font-size: 16px; line-height: 1.6;">
      Click the button below to sign in. This link expires soon.
    </p>
    <div style="text-align: center; margin: 32px 0;">
      <a href="${signInUrl}" style="display: inline-block; background-color: #0066cc; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        Sign in
      </a>
    </div>
    <p style="color: #666; font-size: 14px;">
      Or copy this link: <a href="${signInUrl}" style="color: #0066cc;">${signInUrl}</a>
    </p>
    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #888; font-size: 12px;">
      If you didn't request this email, you can safely ignore it.
    </p>
  </div>
</body>
</html>
    `,
  });

  if (error) {
    console.error("Failed to send sign-in email:", error);
    throw new Error("Failed to send sign-in email");
  }
}

/**
 * Send weekly digest email
 */
export interface DigestEntry {
  providerName: string;
  productName: string;
  title: string | null;
  content: string;
  publishedDate: string | null;
  url: string | null;
}

export async function sendDigestEmail(
  email: string,
  unsubscribeToken: string,
  entries: DigestEntry[],
  weekStart: Date,
  weekEnd: Date,
  options?: {
    manageUrl?: string;
    personalized?: boolean;
  }
) {
  const unsubscribeUrl = `${SITE_URL}/api/unsubscribe?token=${unsubscribeToken}`;
  const manageUrl = options?.manageUrl;
  const personalized = options?.personalized === true;

  // Group entries by provider
  const entriesByProvider = entries.reduce((acc, entry) => {
    const key = entry.providerName;
    if (!acc[key]) acc[key] = [];
    acc[key].push(entry);
    return acc;
  }, {} as Record<string, DigestEntry[]>);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  // Generate HTML for entries
  const entriesHtml = Object.entries(entriesByProvider)
    .map(([provider, providerEntries]) => `
      <div style="margin-bottom: 24px;">
        <h2 style="color: #1a1a1a; font-size: 18px; margin-bottom: 12px; border-bottom: 2px solid #0066cc; padding-bottom: 8px;">
          ${provider}
        </h2>
        ${providerEntries
          .map(
            (e) => `
          <div style="margin-bottom: 16px; padding-left: 12px; border-left: 3px solid #e0e0e0;">
            <div style="font-weight: 600; color: #333; margin-bottom: 4px;">
              ${e.productName}${e.title ? `: ${e.title}` : ""}
            </div>
            <div style="color: #666; font-size: 14px; line-height: 1.5;">
              ${truncateContent(e.content, 200)}
            </div>
            ${e.url ? `<a href="${e.url}" style="color: #0066cc; font-size: 13px;">Read more →</a>` : ""}
          </div>
        `
          )
          .join("")}
      </div>
    `)
    .join("");

  const { error } = await getResend().emails.send({
    from: FROM_EMAIL,
    to: email,
    subject: `AI Changelog Digest: ${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f5f5f5;">
  <div style="background-color: white; border-radius: 8px; padding: 32px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1a1a1a; font-size: 24px; margin: 0;">AI Changelog Digest</h1>
      <p style="color: #666; font-size: 14px; margin-top: 8px;">
        ${formatDate(weekStart)} - ${formatDate(weekEnd)} | ${entries.length} updates
      </p>
      <p style="color: #666; font-size: 13px; margin-top: 8px;">
        ${personalized ? "Personalized to the products you follow." : "Tip: follow products to personalize this digest."}
      </p>
      ${
        manageUrl
          ? `<div style="margin-top: 14px;">
        <a href="${manageUrl}" style="display: inline-block; background-color: #111; color: white; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 13px;">
          Manage followed products
        </a>
      </div>`
          : ""
      }
    </div>

    ${entriesHtml}

    <div style="text-align: center; margin-top: 32px; padding-top: 24px; border-top: 1px solid #eee;">
      <a href="${SITE_URL}" style="display: inline-block; background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
        View All Updates
      </a>
    </div>

    <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;">
    <p style="color: #888; font-size: 12px; text-align: center;">
      You're receiving this because you subscribed to AI Changelog updates.<br>
      <a href="${unsubscribeUrl}" style="color: #888;">Unsubscribe</a>
    </p>
  </div>
</body>
</html>
    `,
  });

  if (error) {
    console.error(`Failed to send digest email to ${email}:`, error);
    throw error;
  }
}

/**
 * Truncate content to specified length
 */
function truncateContent(content: string, maxLength: number): string {
  if (content.length <= maxLength) return content;
  return content.substring(0, maxLength).trim() + "...";
}
