# RAG Integration (Retrieval-Augmented Generation)

Articles stored in the Knowledge Hub can be indexed into a **Qdrant** vector database and queried with natural language. The RAG layer supports semantic + hybrid search, Gemini-powered re-ranking, conversation memory, and source attribution.

---

## Getting a Gemini API Key

1. Go to [Google AI Studio](https://aistudio.google.com/)
2. Sign in with your Google account
3. Click **Get API key** → **Create API key**
4. Copy the key and set it in `.env` as `GEMINI_API_KEY=<your-key>`
5. The free tier includes generous limits for both generation and embedding calls

---

## Models used

| Purpose | Model | Env var |
|---------|-------|---------|
| Answer generation, re-ranking | `gemini-2.5-flash` | `GEMINI_MODEL` |
| Vector embeddings | `gemini-embedding-001` (3072 dim) | `GEMINI_EMBEDDING_MODEL` |

---

## Vector Database: Qdrant

Qdrant runs as a dedicated Docker container in the same Compose environment. No separate installation is needed — `docker-compose up` starts everything.

| Endpoint | URL |
|----------|-----|
| REST API | `http://localhost:6333` |
| gRPC API | `http://localhost:6334` |
| Web UI | `http://localhost:6333/dashboard` |

Persistent data is stored in the named volume `knowledge-hub-vector-volume`.

---

## Full Startup Flow (after clone)

**1. Clone and set up environment**

```bash
git clone https://github.com/Feodorius/nodejs-2026q1-knowledge-hub
cd nodejs-2026q1-knowledge-hub
git checkout 10-ai-rag-vectordb
npm i
cp .env.example .env
# Edit .env — set GEMINI_API_KEY=<your-key>
```

**2. Start all services (app + PostgreSQL + Qdrant)**

```bash
docker-compose up --build -d
```

Wait for all three containers to be healthy:

```bash
docker-compose ps
```

**3. Seed the database**

```bash
npx prisma generate
npx prisma db seed
```

**4. Build the RAG index**

Obtain a JWT token first (via `POST /auth/login`), then:

```bash
curl -X POST http://localhost:4000/ai/rag/index \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-jwt-token>" \
  -d '{ "onlyPublished": true }'
```

Response example:
```json
{ "indexedArticles": 5, "indexedChunks": 23, "vectorCollection": "knowledge_hub_articles" }
```

**5. Sample RAG requests**

Semantic search:
```bash
curl -X POST http://localhost:4000/ai/rag/search \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{ "query": "how to configure authentication", "limit": 5 }'
```

RAG chat:
```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{ "question": "What authentication methods are supported?" }'
```

Follow-up in the same conversation (use `conversationId` from the previous response):
```bash
curl -X POST http://localhost:4000/ai/rag/chat \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <jwt-token>" \
  -d '{ "question": "How do I refresh a token?", "conversationId": "<id-from-previous-response>" }'
```

---

## RAG Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/ai/rag/index` | ADMIN | Build / refresh vector index |
| `POST` | `/ai/rag/search` | Any | Hybrid semantic + lexical search |
| `POST` | `/ai/rag/chat` | Any | RAG chat with conversation memory |
| `DELETE` | `/ai/rag/index/articles/:id` | ADMIN | Remove article vectors from index |
| `GET` | `/ai/rag/chat/:conversationId/history` | Any | Inspect conversation history |

---

## Known Limitations

- **Free-tier quota**: Gemini free tier allows ~1 500 requests/day for generation and ~1 500 for embeddings. Indexing large article sets may hit limits; re-run the index endpoint the next day or upgrade to a paid API key.
- **`gemini-2.0-flash` in the assignment spec**: The assignment specifies `gemini-2.0-flash` in its env example, but this model has a 0-request free quota in some regions and accounts. `gemini-2.5-flash` is used here as a working alternative — switch via `GEMINI_MODEL` in `.env` if needed.
- **Indexing latency**: Articles are embedded in batches of 5. For large datasets (100+ articles), indexing may take 1–2 minutes due to API rate limits.
- **Re-ranking latency**: Each `/ai/rag/search` call makes one additional Gemini generation call for re-ranking. Expect ~2–4 s per search request.
- **In-memory conversation history**: Conversation state is stored in memory and lost on app restart. Reuse `conversationId` only within the same session.
- **Regional availability**: Gemini API may be unavailable in some regions. Use a VPN or switch to a GCP project with billing enabled if you encounter 403 errors.
- **Qdrant collection initialisation**: On first startup the Qdrant collection is created automatically. If the vector DB is temporarily unavailable, restart the app container after Qdrant is healthy (`docker-compose restart app`).
