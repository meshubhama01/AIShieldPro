# Cloudflare Setup

This site uses a Cloudflare Worker plus KV to store waitlist submissions.

## What you need to do in Cloudflare

1. Create a KV namespace named `aishieldpro-waitlist`
2. In your Cloudflare application settings, add a KV binding:
   - Variable name: `WAITLIST`
   - KV namespace: `aishieldpro-waitlist`
3. Redeploy the site

## What the form does

- POSTs to `/api/waitlist`
- The Worker stores each submission as JSON in KV
- Returns a success or error message to the page

## Notes

- This keeps the stack Cloudflare-native and avoids a separate database.
- You can later add Turnstile to reduce spam if needed.
