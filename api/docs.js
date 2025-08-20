// api/docs.js - API documentation endpoint
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
    title: "Email Validation API Documentation",
    version: "1.0.0",
    description:
      "A comprehensive email validation service that checks syntax, domain validity, MX records, SMTP connectivity, and deliverability.",
    baseUrl,
    endpoints: [
      {
        method: "GET",
        path: "/api/health",
        description: "Check API health status",
        example: `${baseUrl}/api/health`,
      },
      {
        method: "GET",
        path: "/api/docs",
        description: "View this documentation",
        example: `${baseUrl}/api/docs`,
      },
      {
        method: "POST",
        path: "/api/verify",
        description: "Validate an email address",
        example: `${baseUrl}/api/verify`,
        requestBody: {
          required: true,
          contentType: "application/json",
          schema: {
            email: "string (required) - The email address to validate",
          },
          example: {
            email: "user@example.com",
          },
        },
        responses: {
          200: {
            description: "Validation result",
            schema: {
              status: "string - 'safe', 'risky', or 'bad'",
              overall_score: "number - Score from 0-100",
              overall_score_label: "string - Score with label (e.g., '85/100')",
              is_safe_to_send: "boolean - True if email is safe to send to",
              is_valid_syntax: "boolean - Valid email format",
              is_disposable: "boolean - Temporary/disposable email",
              is_role_account:
                "boolean - Role-based email (admin, support, etc.)",
              mx_accepts_mail: "boolean - Domain has valid MX records",
              mx_records: "array - List of MX record hostnames",
              can_connect_smtp: "boolean - SMTP server is reachable",
              has_inbox_full: "boolean - Mailbox appears to be full",
              is_catch_all: "boolean - Domain accepts all emails (catch-all)",
              is_deliverable: "boolean - Email appears to be deliverable",
              is_disabled: "boolean - Mailbox appears to be disabled",
              is_free_email:
                "boolean - Free email provider (Gmail, Yahoo, etc.)",
              checked_at: "string - ISO timestamp of validation",
              normalized: "string - Normalized email address",
              input: "string - Original input email",
            },
          },
          400: {
            description: "Bad request - missing or invalid email",
            example: {
              error: "Missing required field: email",
              code: "MISSING_EMAIL",
            },
          },
          500: {
            description: "Server error",
            example: {
              error: "Internal server error during email validation",
              code: "VALIDATION_ERROR",
              timestamp: "2023-12-07T10:30:00.000Z",
            },
          },
        },
      },
    ],
    examples: {
      curl: {
        description: "Example using cURL",
        command: `curl -X POST ${baseUrl}/api/verify \\
    -H "Content-Type: application/json" \\
    -d '{"email":"test@gmail.com"}'`,
      },
      javascript: {
        description: "Example using JavaScript fetch",
        code: `
  async function validateEmail(email) {
    try {
      const response = await fetch('${baseUrl}/api/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: email })
      });
      
      const result = await response.json();
      
      if (result.is_safe_to_send) {
        console.log('✅ Email is safe to send to');
      } else {
        console.log('⚠️ Email might be risky:', result.status);
      }
      
      return result;
    } catch (error) {
      console.error('Validation failed:', error);
      return null;
    }
  }
  
  // Usage
  validateEmail('user@example.com');`,
      },
      python: {
        description: "Example using Python requests",
        code: `
  import requests
  import json
  
  def validate_email(email):
      url = '${baseUrl}/api/verify'
      payload = {'email': email}
      headers = {'Content-Type': 'application/json'}
      
      try:
          response = requests.post(url, data=json.dumps(payload), headers=headers)
          result = response.json()
          
          if result.get('is_safe_to_send'):
              print(f"✅ {email} is safe to send to")
          else:
              print(f"⚠️ {email} might be risky: {result.get('status')}")
          
          return result
      except Exception as e:
          print(f"Validation failed: {e}")
          return None
  
  # Usage
  validate_email('user@example.com')`,
      },
    },
    rateLimit: {
      description: "Rate limiting is handled by Vercel's built-in protections",
      limits: "Generous limits for hobby projects, scalable for production",
    },
    features: [
      "✅ Syntax validation (RFC compliant)",
      "✅ Domain and MX record validation",
      "✅ SMTP server connectivity check",
      "✅ Disposable email detection",
      "✅ Role account detection",
      "✅ Catch-all domain detection",
      "✅ Inbox status checking (full, disabled)",
      "✅ Free email provider identification",
      "✅ Comprehensive scoring system",
    ],
    support: {
      documentation: `${baseUrl}/api/docs`,
      health_check: `${baseUrl}/api/health`,
    },
  });
}
