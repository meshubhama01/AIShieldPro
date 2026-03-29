# Cloudflare Setup

This site uses a Cloudflare Pages Function to store waitlist submissions in KV.

## What you need to do in Cloudflare

1. Create a KV namespace named `aishieldpro-waitlist`
2. Copy its namespace ID
3. In Pages project settings, add a KV binding:
   - Variable name: `WAITLIST`
   - KV namespace: `aishieldpro-waitlist`
4. If you use Wrangler locally later, replace the placeholder ID in `wrangler.toml`
5. Redeploy the site

## What the form does

- POSTs to `/api/waitlist`
- Stores each submission as JSON in KV
- Returns a success or error message to the page

## Notes

- This keeps the stack Cloudflare-native and avoids a separate database.
- You can later add Turnstile to reduce spam if needed.
