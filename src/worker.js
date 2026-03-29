export default {
  async fetch(request, env) {
    const url = new URL(request.url);

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

  const formData = await request.formData();
  const email = clean(formData.get("email"));
  const interest = clean(formData.get("interest"));
  const message = clean(formData.get("message"));

  if (!email || !isValidEmail(email)) {
    return json({ error: "Please enter a valid email address." }, 400);
  }

  if (!interest) {
    return json({ error: "Please choose what you are interested in." }, 400);
  }

  const id = crypto.randomUUID();
  const submittedAt = new Date().toISOString();

  const record = {
    id,
    email,
    interest,
    message,
    submittedAt,
    ipCountry: request.cf?.country || "unknown",
    userAgent: request.headers.get("user-agent") || ""
  };

  await env.WAITLIST.put(`lead:${id}`, JSON.stringify(record));
  await env.WAITLIST.put(`email:${email.toLowerCase()}`, id);

  return json(
    { ok: true, message: "Thanks. We will reach out when early access opens." },
    200
  );
}

function clean(value) {
  return String(value || "").trim().slice(0, 500);
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function json(body, status) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=UTF-8"
    }
  });
}
