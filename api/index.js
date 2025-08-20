// api/index.js - Welcome/info endpoint
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

  const baseUrl = `https://${req.headers.host}`;

  return res.status(200).json({
    service: "Email Validation API",
    version: "1.0.0",
    description:
      "A comprehensive email validation service for checking email deliverability, syntax, and more.",
    status: "operational",
    endpoints: {
      health: `${baseUrl}/api/health`,
      documentation: `${baseUrl}/api/docs`,
      verify: `${baseUrl}/api/verify (POST)`,
    },
    quickStart: {
      example: `curl -X POST ${baseUrl}/api/verify -H "Content-Type: application/json" -d '{"email":"test@gmail.com"}'`,
      documentation: `Visit ${baseUrl}/api/docs for complete API documentation`,
    },
    features: [
      "Email syntax validation",
      "Domain and MX validation",
      "SMTP connectivity testing",
      "Disposable email detection",
      "Role account identification",
      "Comprehensive scoring system",
    ],
    powered_by: "Vercel Serverless Functions",
  });
}
