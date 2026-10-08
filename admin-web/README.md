# Goody Star Admin Web

Standalone Arabic right-to-left administration website for Goody Star. It uses
the existing API; it does not add or change any backend endpoints.

## Local development

```powershell
npm install
$env:NOW_API_URL = "https://api.now-eg.com/api"
npm run dev
```

Open `http://localhost:3000`. The local development API can also be selected
with `NOW_API_URL=http://localhost:5000/api`.

## Deploy as a separate Vercel project

Create or select the Vercel project linked to `admin-web/` and set its Root
Directory to `admin-web`. The included `vercel.json` selects the Next.js
framework for this project. Add `NOW_API_URL=https://api.now-eg.com/api` to the
Production, Preview, and Development environments, then deploy. Admin sessions
are stored in an HttpOnly, SameSite cookie; the API token is never exposed to
browser JavaScript.

Only admin and sub-admin accounts can sign in. The existing API remains
responsible for authenticating accounts and enforcing each account's
permissions.
