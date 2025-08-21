// api/verify.js - Main email validation endpoint
import punycode from "punycode";
import psl from "psl";
import { promises as dns } from "node:dns";
import deep from "deep-email-validator";

/** ---- Config ---- */
const VALIDATE_SMTP =
  (process.env.VALIDATE_SMTP || "true").toLowerCase() === "true";
// Fixed: Use a valid domain - replace with your actual domain
const SENDER = process.env.SMTP_SENDER || "no-reply@verifier.local";
const MAX_CATCHALL_CHECK_MS = Number(process.env.CATCHALL_TIMEOUT_MS || 5000); // Reduced timeout
const SMTP_TIMEOUT_MS = Number(process.env.SMTP_TIMEOUT_MS || 8000); // New SMTP timeout

// Enhanced free providers list
const FREE_PROVIDERS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "yahoo.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "gmx.de",
  "gmx.com",
  "web.de",
  "proton.me",
  "protonmail.com",
  "zoho.com",
  "yandex.com",
  "mail.com",
  "fastmail.com",
  "tuta.com",
  "tutanota.com",
  "pm.me",
  "inbox.com",
  "mail.ru",
  "rambler.ru",
  "163.com",
  "126.com",
  "qq.com",
  "sina.com",
  "sohu.com",
  "naver.com",
  "daum.net",
  "hanmail.net",
]);

const ROLE_LOCALS = new Set([
  "admin",
  "administrator",
  "info",
  "support",
  "help",
  "hello",
  "sales",
  "contact",
  "team",
  "abuse",
  "postmaster",
  "webmaster",
  "security",
  "noc",
  "billing",
  "accounts",
  "payments",
  "hr",
  "careers",
  "jobs",
  "legal",
  "press",
  "no-reply",
  "noreply",
  "do-not-reply",
  "mailer-daemon",
  "root",
  "www",
]);

/** ---- Helpers ---- */
function normalizeEmail(raw) {
  if (typeof raw !== "string") return { normalized: null, error: "not_string" };

  const trimmed = raw.trim().normalize("NFC");
  if (trimmed.length > 320) return { normalized: null, error: "too_long" };

  const at = trimmed.lastIndexOf("@");
  if (at === -1) return { normalized: null, error: "no_at" };
  if (at === 0) return { normalized: null, error: "no_local" };
  if (at === trimmed.length - 1)
    return { normalized: null, error: "no_domain" };

  const local = trimmed.slice(0, at);
  let domain = trimmed.slice(at + 1).toLowerCase();

  if (local.length > 64) return { normalized: null, error: "local_too_long" };
  if (domain.length > 253)
    return { normalized: null, error: "domain_too_long" };

  try {
    domain = punycode.toASCII(domain);
  } catch {
    return { normalized: null, error: "idn_conversion_failed" };
  }

  return { normalized: `${local}@${domain}`, error: null };
}

function parseParts(email) {
  const [local, domain] = email.split("@");
  const parsed = psl.parse(domain);
  const registrable = parsed.domain || domain;
  return { local, domain, registrable };
}

function isRole(local) {
  const first = String(local || "")
    .toLowerCase()
    .replace(/^"+|"+$/g, "")
    .split(/[+._-]/)[0];
  return ROLE_LOCALS.has(first);
}

function isFreeDomain(registrable) {
  return FREE_PROVIDERS.has(String(registrable).toLowerCase());
}

function parseInboxHints(reason = "") {
  const t = String(reason);
  const has_inbox_full = /(?:552|quota|mailbox.*full|over quota)/i.test(t);
  const is_disabled =
    /(mailbox.*disabled|inactive|deactivated|account.*disabled)/i.test(t);
  const user_unknown =
    /(user unknown|mailbox unavailable|no such user|550 5\.1\.1)/i.test(t);
  return { has_inbox_full, is_disabled, user_unknown };
}

// Fixed scoring algorithm - less harsh on SMTP failures
function computeScore(flags) {
  let score = 100;

  // Critical issues (major deductions)
  if (!flags.is_valid_syntax) score -= 50;
  if (!flags.mx_accepts_mail) score -= 40;
  if (flags.is_disabled) score -= 40;
  if (flags.has_inbox_full) score -= 30;
  if (flags.is_disposable) score -= 25;

  // Moderate issues (smaller deductions)
  if (flags.is_role_account) score -= 15;
  if (flags.is_catch_all) score -= 10;

  // Minor issues (very small deductions)
  if (flags.is_free_email) score -= 2;

  // Fixed: Don't penalize SMTP connection issues as heavily in serverless environments
  // Only penalize if we know for sure the email is bad, not just unreachable
  if (
    !flags.is_deliverable &&
    flags.smtp_checked &&
    (flags.has_inbox_full || flags.is_disabled)
  ) {
    score -= 15; // Only penalize if we have concrete evidence of issues
  }

  return Math.max(0, Math.min(100, score));
}

// Fixed status derivation - more lenient for production environments
function deriveStatus(score, flags) {
  // If basic validation fails, it's definitely bad
  if (!flags.is_valid_syntax || !flags.mx_accepts_mail) {
    return "bad";
  }

  // If we have concrete evidence of problems, it's bad
  if (flags.is_disabled || flags.has_inbox_full || flags.is_disposable) {
    return "bad";
  }

  // Safe: Good syntax, valid MX, no concrete issues
  if (
    score >= 75 &&
    flags.is_valid_syntax &&
    flags.mx_accepts_mail &&
    !flags.is_disabled &&
    !flags.has_inbox_full &&
    !flags.is_disposable
  ) {
    return "safe";
  }

  // Risky: Medium score but no critical issues
  if (score >= 50) {
    return "risky";
  }

  // Bad: Low score or critical issues
  return "bad";
}

async function listMx(domain) {
  try {
    const mx = await dns.resolveMx(domain);
    mx.sort((a, b) => a.priority - b.priority);
    return mx.map((m) => m.exchange);
  } catch {
    return [];
  }
}

const validator = deep?.default ?? deep;

// Fixed email validation with better error handling and timeouts
const validateEmail = async (email, options = {}) => {
  try {
    if (validator && typeof validator.validate === "function") {
      return await Promise.race([
        validator.validate(email, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP timeout")), SMTP_TIMEOUT_MS)
        ),
      ]);
    }
    if (typeof validator === "function") {
      return await Promise.race([
        validator(email, options),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("SMTP timeout")), SMTP_TIMEOUT_MS)
        ),
      ]);
    }
    throw new Error(
      "deep-email-validator: validate() not found on module export"
    );
  } catch (error) {
    console.error("Email validation error:", error.message);

    // Return partial validation result when SMTP fails
    return {
      validators: {
        regex: { valid: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) }, // Basic regex fallback
        mx: { valid: false },
        smtp: { valid: false, reason: error.message },
      },
      reason: error.message,
    };
  }
};

async function runValidation(email) {
  // Fixed: Better validation options for production
  return await validateEmail(email, {
    sender: SENDER,
    validateRegex: true,
    validateTypo: false, // Disable to reduce timeout issues
    validateDisposable: true,
    validateMx: true,
    validateSMTP: VALIDATE_SMTP,
  });
}

async function detectCatchAll(domain) {
  if (!VALIDATE_SMTP) return false;

  const fake = `catchall-test-${Math.random()
    .toString(36)
    .slice(2, 10)}@${domain}`;

  try {
    const res = await Promise.race([
      runValidation(fake),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), MAX_CATCHALL_CHECK_MS)
      ),
    ]);
    return !!res?.validators?.smtp?.valid;
  } catch {
    return false;
  }
}

// CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return res.status(200).json({});
  }

  // Only allow POST method
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed. Use POST.",
      code: "METHOD_NOT_ALLOWED",
    });
  }

  // Set CORS headers
  Object.entries(corsHeaders).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  try {
    const { email } = req.body || {};
    const ts = new Date().toISOString();

    if (!email) {
      return res.status(400).json({
        error: "Missing required field: email",
        code: "MISSING_EMAIL",
      });
    }

    const { normalized, error: normErr } = normalizeEmail(email);
    if (normErr) {
      return res.status(200).json({
        status: "bad",
        overall_score: 0,
        overall_score_label: "0/100",
        is_safe_to_send: false,
        is_valid_syntax: false,
        is_disposable: null,
        is_role_account: null,
        mx_accepts_mail: false,
        mx_records: [],
        can_connect_smtp: false,
        has_inbox_full: false,
        is_catch_all: false,
        is_deliverable: false,
        is_disabled: false,
        is_free_email: null,
        checked_at: ts,
        normalized: null,
        input: email,
        error: normErr,
      });
    }

    const { local, domain, registrable } = parseParts(normalized);
    const is_role_account = isRole(local);
    const is_free_email = isFreeDomain(registrable);

    // Fixed: Reduced timeout for Vercel serverless
    const result = await Promise.race([
      runValidation(normalized),
      new Promise(
        (_, reject) =>
          setTimeout(() => reject(new Error("Validation timeout")), 20000) // Reduced to 20s
      ),
    ]);

    const v = result?.validators || {};

    const is_valid_syntax = !!v.regex?.valid;
    const mx_accepts_mail = !!v.mx?.valid;
    const smtpValid = !!v.smtp?.valid;
    const smtpReason = v.smtp?.reason || result?.reason || "";
    const is_disposable = v.disposable?.valid === false;

    // Fixed: Better SMTP connection detection
    const smtp_checked = VALIDATE_SMTP && typeof v.smtp?.reason !== "undefined";
    const can_connect_smtp =
      smtp_checked &&
      !smtpReason.includes("timeout") &&
      !smtpReason.includes("SMTP timeout");

    const { has_inbox_full, is_disabled, user_unknown } =
      parseInboxHints(smtpReason);

    // Fixed: More lenient deliverability check
    // Don't mark as undeliverable just because SMTP failed - could be timeout/network issue
    const is_deliverable =
      smtpValid || (!smtp_checked && mx_accepts_mail && is_valid_syntax);

    let is_catch_all = false;
    if (mx_accepts_mail && VALIDATE_SMTP && !smtpReason.includes("timeout")) {
      try {
        is_catch_all = await detectCatchAll(domain);
      } catch {
        is_catch_all = false;
      }
    }

    const mx_records = await listMx(domain);

    const flags = {
      is_valid_syntax,
      is_disposable,
      is_role_account,
      mx_accepts_mail,
      can_connect_smtp,
      has_inbox_full,
      is_catch_all,
      is_deliverable,
      is_disabled,
      is_free_email,
      smtp_checked, // Added flag to track if SMTP was actually checked
    };

    const overall_score = computeScore(flags);
    const status = deriveStatus(overall_score, flags);

    return res.status(200).json({
      status,
      overall_score,
      overall_score_label: `${overall_score}/100`,
      is_safe_to_send: status === "safe",
      is_valid_syntax,
      is_disposable,
      is_role_account,
      mx_accepts_mail,
      mx_records,
      can_connect_smtp,
      has_inbox_full,
      is_catch_all,
      is_deliverable,
      is_disabled,
      is_free_email,
      checked_at: ts,
      normalized,
      input: email,
      smtp_reason: smtpReason, // Added for debugging
    });
  } catch (error) {
    console.error("Validation error:", error);

    return res.status(500).json({
      error: "Internal server error during email validation",
      code: "VALIDATION_ERROR",
      timestamp: new Date().toISOString(),
    });
  }
}
