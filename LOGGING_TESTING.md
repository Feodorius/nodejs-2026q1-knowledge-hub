# Logging & Error Handling — Testing Guide

## Setup

Start the app via Docker (recommended — production JSON logs are easier to read):

```bash
cp .env.example .env
docker-compose up --build -d
```

Open logs in real time:

```bash
docker-compose logs -f app
```

---
## !!! For testing trigger SWAGGER endpoints or run the commands below in the separate terminal


## Test 1 — Request logging & password sanitization

Register a user:

```bash
curl -X POST http://localhost:4000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"secret123"}'
```

Login with wrong password:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"wrongpass"}'
```

**Expected in logs:**
```json
{"timestamp":"...","level":"log","message":"→ POST /auth/login query={} body={\"login\":\"testuser\",\"password\":\"[REDACTED]\"}","context":"HTTP"}

{"timestamp":"...","level":"error","message":"ForbiddenError: Invalid credentials","context":"AllExceptionsFilter","trace":"..."}

{"timestamp":"...","level":"log","message":"← POST /auth/login 403 ...ms","context":"HTTP"}
```

Password must appear as `[REDACTED]`, never as the actual value.

---

## Test 2 — Response logging

Login with correct password:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"secret123"}'
```

**Expected in logs:**
```json
{"timestamp":"...","level":"log","message":"→ POST /auth/login query={} body={\"login\":\"testuser\",\"password\":\"[REDACTED]\"}","context":"HTTP"}
{"timestamp":"...","level":"log","message":"← POST /auth/login 201 ...ms","context":"HTTP"}
```

Both request (`→`) and response (`←`) lines must appear.

---

## Test 3 — 401 Unauthorized (missing token)

```bash
curl http://localhost:4000/users
```

**Expected in logs:**
```json
{"timestamp":"...","level":"error","message":"UnauthorizedError: Missing or invalid Authorization header","context":"AllExceptionsFilter","trace":"..."}
```

---

## Test 4 — 404 Not Found

First get a valid token:

```bash
curl -X POST http://localhost:4000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"login":"testuser","password":"secret123"}'
```

Copy the `accessToken` from the response, then:

```bash
curl http://localhost:4000/users/00000000-0000-0000-0000-000000000000 \
  -H "Authorization: Bearer <accessToken>"
```

**Expected in logs:**
```json
{"timestamp":"...","level":"error","message":"NotFoundError: User 00000000-0000-0000-0000-000000000000 not found","context":"AllExceptionsFilter","trace":"..."}
```

---

## Test 5 — Log file

```bash
# PowerShell / CMD:
docker exec -it knowledge-hub-app cat /app/logs/app.log

# Git Bash (Windows) — double slash prevents path conversion:
MSYS_NO_PATHCONV=1 docker exec -it knowledge-hub-app cat /app/logs/app.log
```

The file must contain the same entries as the console output.

---

## Test 6 — Log level filtering (optional)

Stop the containers, set `LOG_LEVEL=warn` in `.env`, restart:

```bash
docker-compose down
# edit .env: LOG_LEVEL=warn
docker-compose up --build -d
```

Make a normal request — `"level":"log"` entries must NOT appear. Only `warn` and `error` levels should be logged.

---

## Test 7 — Log file rotation

Set a tiny limit (1 KB) in `.env`:

```
LOG_MAX_FILE_SIZE=1
```

Restart the container:

```bash
docker-compose down
docker-compose up --build -d
```

Generate enough requests to exceed 1 KB:

Git Bash / Linux:

```bash
for i in $(seq 1 30); do
  curl -s -X POST http://localhost:4000/auth/login \
    -H "Content-Type: application/json" \
    -d '{"login":"testuser","password":"wrong"}' > /dev/null
done
```

PowerShell:

```powershell
1..30 | ForEach-Object {
  Invoke-RestMethod -Method POST -Uri http://localhost:4000/auth/login `
    -ContentType "application/json" `
    -Body '{"login":"testuser","password":"wrong"}' -ErrorAction SilentlyContinue
}
```

Check that a rotated file appeared:

```bash
# PowerShell / CMD:
docker exec -it knowledge-hub-app ls /app/logs/

# Git Bash:
MSYS_NO_PATHCONV=1 docker exec -it knowledge-hub-app ls /app/logs/
```

**Expected result:**
```
app-2026-04-25T20-30-00-000Z.log   ← rotated (old)
app.log                             ← current (new, small)
```

The rotated file has a timestamp in its name. A new `app.log` continues receiving entries.

---

## JSON log format (production)

All log lines must be valid JSON with these fields:

| Field         | Description                                                  |
|---------------|--------------------------------------------------------------|
| `timestamp`   | ISO 8601 date                                                |
| `level`       | `log`, `warn`, `error`                                       |
| `message`     | Log message                                                  |
| `context`     | Source (`HTTP`, `AllExceptionsFilter`, `NestFactory`, etc.)  |
| `trace`       | Stack trace (errors only)                                    |
