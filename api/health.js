// api/health.js - Health check endpoint
export default function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "GET") {
    return res.status(405).json({
      error: "Method not allowed. Use GET.",
      code: "METHOD_NOT_ALLOWED",
    });
  }

  return res.status(200).json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "production",
    smtp_validation:
      (process.env.VALIDATE_SMTP || "true").toLowerCase() === "true",
    service: "Email Validation API",
    version: "1.0.0",
  });
}
