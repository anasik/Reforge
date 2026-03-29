# Reforge GTM - Setup Guide

This site uses Cloudflare Pages with Workers + KV for form submissions.

## Prerequisites

- Node.js 16+
- Wrangler CLI: `npm install -g wrangler`
- Cloudflare account

## Local Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Run the Worker (in one terminal):**
   ```bash
   npm run dev
   ```
   This starts on `http://localhost:8787`

3. **In another terminal, serve the HTML:**
   ```bash
   python3 -m http.server 8000
   ```
   Or if you have Node's `http-server`:
   ```bash
   npx http-server -p 8000
   ```

4. **Open your site:**
   - Go to `http://localhost:8000` in your browser
   - The forms will POST to `http://localhost:8787/submit-form` (the Worker)

5. **Test the forms:**
   - Submit a form and it will store in KV
   - View submissions at `http://localhost:8787/submissions?key=YOUR_ADMIN_KEY`

## Deployment to Cloudflare

### Step 1: Create KV Namespace (one-time)

```bash
# Create production KV namespace
wrangler kv:namespace create "reforge-forms"

# Create preview KV namespace (for testing)
wrangler kv:namespace create "reforge-forms" --preview
```

This will output IDs to add to `wrangler.toml`. Update the namespace IDs in the `[[kv_namespaces]]` section.

### Step 2: Add Admin Key (Environment Variable)

Set an admin key for viewing submissions. In your Cloudflare dashboard:

1. Go to Workers → Your Worker
2. Settings → Environment Variables
3. Add: `ADMIN_KEY` = (choose a secure secret)

Or via CLI:
```bash
wrangler secret put ADMIN_KEY
```

### Step 3: Deploy

```bash
npm run deploy
```

Or:
```bash
wrangler deploy
```

## Accessing Form Submissions

Once deployed, fetch all submissions:

```bash
curl "https://your-worker.workers.dev/submissions?key=YOUR_ADMIN_KEY"
```

Returns JSON array of all form submissions sorted by newest first.

### Submission Format

```json
{
  "timestamp": "2025-03-29T12:34:56.789Z",
  "formType": "contact" | "quickstart",
  "name": "John Doe",
  "email": "john@company.com",
  "company": "Acme Corp",
  "message": "Your message here",
  "ip": "192.0.2.1"
}
```

## Notes

- Each submission is stored in KV with a unique key (format: `{formType}-{timestamp}-{random}`)
- No database required — data lives in Cloudflare KV (1GB free tier included)
- Forms are client-side validated but also validated on the Worker
- CORS is enabled for form submissions
- Admin key is required to view submissions (use a strong, unique value)

## Integrations (Optional)

To add email notifications or webhooks:

1. **Email notifications:** Add a call to a service like SendGrid/Resend in the Worker
2. **Discord webhook:** POST submission to a Discord channel
3. **Slack webhook:** POST submission to a Slack channel

Let me know if you want to add any of these!
