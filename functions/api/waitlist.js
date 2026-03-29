export async function onRequestPost(context) {
  const { request, env } = context;

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
