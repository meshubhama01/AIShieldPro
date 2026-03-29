export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname === "/api/config" && request.method === "GET") {
      return json(
        { turnstileSiteKey: env.TURNSTILE_SITE_KEY || "" },
        200
      );
    }

    if (url.pathname === "/api/waitlist" && request.method === "POST") {
      return handleWaitlist(request, env);
    }

    if (env.ASSETS) {
      return env.ASSETS.fetch(request);
    }

    return new Response("Asset binding is not configured.", { status: 500 });
  }
};

async function handleWaitlist(request, env) {
  if (!env.WAITLIST) {
    return json(
      { error: "Waitlist storage is not configured yet." },
      500
    );
  }

  if (!env.TURNSTILE_SECRET_KEY || !env.TURNSTILE_SITE_KEY) {
    return json(
      { error: "Turnstile is not configured yet." },
      500
    );
  }

  if (!env.BREVO_API_KEY || !env.BREVO_SENDER_EMAIL || !env.BREVO_SENDER_NAME) {
    return json(
      { error: "Email delivery is not configured yet." },
      500
    );
  }

  const formData = await request.formData();
  const email = clean(formData.get("email"));
  const interest = clean(formData.get("interest"));
  const message = clean(formData.get("message"));
  const turnstileToken = clean(formData.get("cf-turnstile-response"));
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";

  if (!email || !isValidEmail(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  if (!interest) {
    return json({ error: "Please choose what you are interested in." }, 400);
  }

  if (!turnstileToken) {
    return json({ error: "Please complete the verification check." }, 400);
  }

  const passedTurnstile = await verifyTurnstile(turnstileToken, ip, env.TURNSTILE_SECRET_KEY);
  if (!passedTurnstile) {
    return json({ error: "Verification failed. Please try again." }, 400);
  }

  const rateLimitKey = `rate:${hashKey(ip)}`;
  const rateLimitRecord = await env.WAITLIST.get(rateLimitKey, { type: "json" });
  const now = Date.now();

  if (rateLimitRecord && now - rateLimitRecord.firstSeen < 60 * 60 * 1000 && rateLimitRecord.count >= 3) {
    return json({ error: "Too many requests. Please wait a bit and try again." }, 429);
  }

  await env.WAITLIST.put(
    rateLimitKey,
    JSON.stringify({
      count: (rateLimitRecord?.count || 0) + 1,
      firstSeen: rateLimitRecord?.firstSeen || now
    }),
    { expirationTtl: 60 * 60 }
  );

  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();
  const leadCount = await nextLeadCount(env.WAITLIST);

  const record = {
    id,
    email,
    interest,
    message,
    leadCount,
    submittedAt,
    ipCountry: request.cf?.country || "unknown",
    userAgent: request.headers.get("user-agent") || ""
  };

  await env.WAITLIST.put(`lead:${id}`, JSON.stringify(record));
  await env.WAITLIST.put(`email:${email.toLowerCase()}`, id);
  await sendBrevoEmail({
    apiKey: env.BREVO_API_KEY,
    senderEmail: env.BREVO_SENDER_EMAIL,
    senderName: env.BREVO_SENDER_NAME,
    to: email,
    leadCount
  });

  return json(
    { ok: true, message: "Thank you. Check your inbox for your waitlist confirmation." },
    200
  );
}

function clean(value) {
  return String(value || "").trim().slice(0, 500);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

async function verifyTurnstile(token, ip, secret) {
  const body = new URLSearchParams();
  body.set("secret", secret);
  body.set("response", token);
  if (ip && ip !== "unknown") {
    body.set("remoteip", ip);
  }

  const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded"
    },
    body
  });

  if (!response.ok) {
    return false;
  }

  const payload = await response.json();
  return Boolean(payload.success);
}

async function nextLeadCount(namespace) {
  const currentValue = await namespace.get("meta:lead-count");
  const currentNumber = Number.parseInt(currentValue || "999", 10);
  const nextValue = Number.isFinite(currentNumber) ? currentNumber + 1 : 1000;
  await namespace.put("meta:lead-count", String(nextValue));
  return nextValue;
}

async function sendBrevoEmail({ apiKey, senderEmail, senderName, to, leadCount }) {
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "api-key": apiKey
    },
    body: JSON.stringify({
      sender: {
        name: senderName,
        email: senderEmail
      },
      to: [
        {
          email: to
        }
      ],
      subject: "You are on the AI ShieldPro waitlist",
      htmlContent: `
        <html>
          <body style="font-family:Arial,sans-serif;color:#11202b;line-height:1.7;">
            <p>Thank you for your interest.</p>
            <p>You have been added to the waitlist.</p>
            <p>Current count: <strong>${leadCount}</strong></p>
            <p>We will reach out when early access opens.</p>
            <p>AI ShieldPro</p>
          </body>
        </html>
      `
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Brevo email failed: ${errorText}`);
  }
}

function hashKey(value) {
  const bytes = new TextEncoder().encode(value);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8"
    }
  });
}
