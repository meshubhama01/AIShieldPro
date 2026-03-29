# Cloudflare Setup

This site uses a Cloudflare Worker plus KV to store waitlist submissions, Cloudflare Turnstile for bot checks, and Brevo for confirmation emails.

## What you need to do in Cloudflare

1. Create a KV namespace named `aishieldpro-waitlist`
2. In your Cloudflare application settings, add a KV binding:
   - Variable name: `WAITLIST`
   - KV namespace: `aishieldpro-waitlist`
3. Create a Cloudflare Turnstile widget for your domain
4. Add Worker environment variables:
   - `TURNSTILE_SITE_KEY`
   - `TURNSTILE_SECRET_KEY`
   - `BREVO_API_KEY`
   - `BREVO_SENDER_EMAIL`
   - `BREVO_SENDER_NAME`
5. Redeploy the site

## What the form does

- Loads the Turnstile site key from `/api/config`
- POSTs to `/api/waitlist`
- Verifies Turnstile before accepting the form
- Applies simple rate limiting in KV
- Stores each submission as JSON in KV
- Sends a Brevo confirmation email with a waitlist count starting at 1000

## Notes

- This keeps the stack lightweight and avoids a separate database.
