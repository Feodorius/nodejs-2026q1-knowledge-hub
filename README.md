# Knowledge Hub

## Prerequisites

- Git - [Download & Install Git](https://git-scm.com/downloads).
- Node.js - [Download & Install Node.js](https://nodejs.org/en/download/) and the npm package manager.
- Docker - [Download & Install Docker](https://docs.docker.com/engine/install/) (optional, for containerized deployment).

## Downloading

```
git clone https://github.com/Feodorius/nodejs-2026q1-knowledge-hub
```

## Installing NPM modules

```
npm install
```

## Environment setup

Copy `.env.example` to `.env`:

```
cp .env.example .env
```

## AI Integration (Google Gemini)

> **Full setup guide:** [AI_INTEGRATION.md](AI_INTEGRATION.md)

The API includes AI-powered endpoints for article summarization, translation, and analysis powered by Google Gemini (`gemini-2.0-flash`).

## Running application

### Local development

Start the database:

```
docker-compose up -d db
```

Apply database migrations:

```
npx prisma migrate deploy --schema=prisma/schema.prisma
```

Start the application:

```
npm run start:dev
```

### Docker

```
docker-compose up --build
```

## Docker Hub

Application image is available on Docker Hub:
- **Repository:** [wedster/knowledge-hub](https://hub.docker.com/r/wedster/knowledge-hub)
- **Pull command:** `docker pull wedster/knowledge-hub:latest`

After starting the app on port (4000 as default) you can open
in your browser OpenAPI documentation by typing http://localhost:4000/doc/.
For more information about OpenAPI/Swagger please visit https://swagger.io/.

## Testing

> **Logging & Error Handling tests:** see [LOGGING_TESTING.md](LOGGING_TESTING.md)

> **Important:** Before running tests, make sure the app is running:
> ```
> docker-compose up -d db
> npx prisma migrate deploy --schema=prisma/schema.prisma
> npm run start:dev
> ```
> Then open a new terminal and run the test commands below.

### Authentication & Authorization tests

Run all auth-related tests (requires the app to be running):

```
npm run test:auth
```

Run refresh token tests:

```
npm run test:refresh
```

Run RBAC (role-based access control) tests:

```
npm run test:rbac
```

### Other test commands

To run all tests without authorization:

```
npm run test
```

To run only one specific test suite with authorization:

```
npm run test:auth -- <path to suite>
```

### Auto-fix and format

```
npm run lint
```

```
npm run format
```

### Debugging in VSCode

Press <kbd>F5</kbd> to debug.

For more information, visit: https://code.visualstudio.com/docs/editor/debugging
