# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.
- Docker - [Download & Install Docker](https://docs.docker.com/engine/install/).

## Downloading

```
git clone https://github.com/Feodorius/nodejs-2026q1-knowledge-hub
```

## Environment setup

Copy `.env.example` to `.env` and fill in the required values (see [AI Integration](#ai-integration-google-gemini)):

```
cp .env.example .env
```

## AI Integration (Google Gemini)

> **Full setup guide:** [AI_INTEGRATION.md](AI_INTEGRATION.md)

The API includes AI-powered endpoints for article summarization, translation, and analysis powered by Google Gemini (`gemini-2.5-flash`). Add your API key to `.env` before starting the app.

## RAG (Retrieval-Augmented Generation)

> **Full RAG guide:** [RAG_INTEGRATION.md](RAG_INTEGRATION.md)

Articles stored in the Knowledge Hub can be indexed into a **Qdrant** vector database and queried with natural language. The RAG layer supports hybrid search, Gemini re-ranking, conversation memory, and source attribution.

## Running application

### Docker (recommended)

Build and start everything (migrations run automatically on container startup):

```
docker-compose up --build -d
```

Seed the database (run from host — port 5432 is exposed):

```
npx prisma db seed
```

App will be available at **http://localhost:4000**, Swagger UI at **http://localhost:4000/doc/**.

### Local development

Install dependencies:

```
npm install
```

Start the database:

```
docker-compose up -d db
```

Apply database migrations:

```
set -a && source .env && set +a
DATABASE_URL=$DATABASE_URL_LOCAL npx prisma migrate deploy --schema=prisma/schema.prisma
```

Seed the database:

```
npx prisma db seed
```

Start the application:

```
npm run start:dev
```

## Docker Hub

Application image is available on Docker Hub:
- **Repository:** [wedster/knowledge-hub](https://hub.docker.com/r/wedster/knowledge-hub)
- **Pull command:** `docker pull wedster/knowledge-hub:latest`

After starting the app you can open the OpenAPI documentation at http://localhost:4000/doc/.

## Testing

> **Logging & Error Handling tests:** see [LOGGING_TESTING.md](LOGGING_TESTING.md)

> **Important:** Before running tests, make sure the app is running (see [Running application](#running-application) above).

### Authentication & Authorization tests

```
npm run test:auth
```

### Refresh token tests

```
npm run test:refresh
```

### RBAC tests

```
npm run test:rbac
```

### All tests

```
npm run test
```

### Auto-fix and format

```
npm run lint
npm run format
```