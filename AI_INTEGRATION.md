# AI Integration (Google Gemini)

The API includes AI-powered endpoints for article summarization, translation, and analysis, powered by [Google Gemini](https://ai.google.dev/).

## Step 1 — Obtain a Gemini API key

1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Sign in with your Google account
3. Click **Create API key**
4. Copy the generated key

## Step 2 — Configure the environment

Open your `.env` file and set the following variables:

```
GEMINI_API_KEY=<paste your key here>
GEMINI_API_BASE_URL=https://generativelanguage.googleapis.com
GEMINI_MODEL=gemini-2.0-flash
AI_RATE_LIMIT_RPM=20
AI_CACHE_TTL_SEC=300
```

| Variable | Description | Default |
|---|---|---|
| `GEMINI_API_KEY` | Your Gemini API key (required) | — |
| `GEMINI_API_BASE_URL` | Gemini API base URL | `https://generativelanguage.googleapis.com` |
| `GEMINI_MODEL` | Gemini model to use | `gemini-2.0-flash` |
| `AI_RATE_LIMIT_RPM` | Max AI requests per minute (server-wide) | `20` |
| `AI_CACHE_TTL_SEC` | Cache TTL in seconds for summarize/translate | `300` |

## Step 3 — Start the application

```bash
docker-compose up -d db
npx prisma migrate deploy --schema=prisma/schema.prisma
npm run start:dev
```

## Step 4 — Test AI endpoints

First, obtain a JWT token:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login": "admin", "password": "Admin123!"}'
```

Use the returned `accessToken` as `Bearer <token>` in all AI requests.

**Summarize an article:**
```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/summarize \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"maxLength": "medium"}'
```

**Translate an article:**
```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/translate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"targetLanguage": "Spanish"}'
```

**Analyze an article:**
```bash
curl -X POST http://localhost:4000/ai/articles/<articleId>/analyze \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"task": "review"}'
```

**Generic generation (with optional session context):**
```bash
curl -X POST http://localhost:4000/ai/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Explain the event loop in Node.js", "sessionId": "my-session-1"}'
```

**Usage statistics:**
```bash
curl http://localhost:4000/ai/usage \
  -H "Authorization: Bearer <token>"
```

**Diagnostics (latency + cache + usage):**
```bash
curl http://localhost:4000/ai/diagnostics \
  -H "Authorization: Bearer <token>"
```

## Known limitations (free tier)

- **Rate limit:** Free Gemini tier allows ~15 requests/minute and 1M tokens/day per API key. Set `AI_RATE_LIMIT_RPM=15` if you hit upstream 429 errors.
- **Latency:** Gemini API responses typically take 1–4 seconds depending on content length.
- **Regional availability:** Gemini API may be unavailable in some regions. Use a VPN or the Vertex AI endpoint if needed.
- **Context window:** `gemini-2.0-flash` supports up to 1M tokens, but very long articles may increase latency and token cost.
- **JSON output:** The analyze endpoint instructs Gemini to return structured JSON. On rare occasions Gemini may return non-JSON text; the API will fall back to a safe default response.
