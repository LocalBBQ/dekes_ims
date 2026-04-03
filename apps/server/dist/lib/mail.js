import nodemailer from "nodemailer";
function getSmtpConfig() {
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS;
    if (!host || !user || pass === undefined || pass === "")
        return null;
    const port = Number(process.env.SMTP_PORT || "587");
    const secure = process.env.SMTP_SECURE === "true" || process.env.SMTP_SECURE === "1";
    return { host, port, secure, user, pass };
}
export function isSmtpConfigured() {
    return getSmtpConfig() !== null;
}
/** Base URL for links emailed to users (no trailing slash). Required in production. */
export function getPublicAppUrl() {
    const raw = process.env.PUBLIC_APP_URL?.trim();
    if (raw)
        return raw.replace(/\/+$/, "");
    if (process.env.NODE_ENV === "production") {
        throw new Error("PUBLIC_APP_URL is required in production");
    }
    return "http://localhost:5173";
}
export function assertProductionMailEnv() {
    if (process.env.NODE_ENV !== "production")
        return;
    try {
        getPublicAppUrl();
    }
    catch (e) {
        console.error(e);
        process.exit(1);
    }
    if (!isSmtpConfigured()) {
        console.error("SMTP_HOST, SMTP_USER, and SMTP_PASS are required in production for password reset email.");
        process.exit(1);
    }
}
export async function sendPasswordResetEmail(to, resetUrl) {
    const from = process.env.EMAIL_FROM?.trim() || process.env.SMTP_FROM?.trim() || "noreply@localhost";
    const subject = "Reset your Coffee Shop Inventory password";
    const text = `You requested a password reset.\n\nOpen this link to choose a new password (valid for 1 hour):\n${resetUrl}\n\nIf you did not request this, you can ignore this email.`;
    const html = `<p>You requested a password reset.</p><p><a href="${resetUrl.replace(/"/g, "&quot;")}">Reset your password</a> (link valid for 1 hour)</p><p>If you did not request this, you can ignore this email.</p>`;
    const cfg = getSmtpConfig();
    if (!cfg) {
        if (process.env.NODE_ENV === "production") {
            throw new Error("SMTP not configured");
        }
        console.log("[mail] Password reset link (dev, no SMTP):", resetUrl);
        return;
    }
    const transporter = nodemailer.createTransport({
        host: cfg.host,
        port: cfg.port,
        secure: cfg.secure,
        auth: { user: cfg.user, pass: cfg.pass },
    });
    await transporter.sendMail({
        from,
        to,
        subject,
        text,
        html,
    });
}
