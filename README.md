# Lab: React + Ionic (mobile)

A small example Ionic + React front-end with a lightweight Koa-based backend and a WebSocket server. The app demonstrates CRUD operations for a simple `Game` model and realtime updates via WebSockets.

## Contents

- `frontend/` — Ionic React app (Vite + TypeScript)
- `backend/` — Koa HTTP server with WebSocket (`ws`) support

## Quick start (Windows PowerShell)

Prerequisites

- Node.js 18+ (recommended)
- npm (comes with Node) or a compatible package manager

Install and run backend and frontend in separate terminals.

1. Install & run the backend

```powershell
cd backend
npm install
npm start
```

The backend listens on port `3000` by default.

2. Install & run the frontend

```powershell
cd frontend
npm install
npm install @ionic/cli
npx ionic serve
```

The frontend uses Vite; by default it will run on `http://localhost:5173` (or a similar free port).

## Backend API

Base URL: http://localhost:3000

Model: Game

A Game has the following shape (JSON):

```json
{
  "id": "<uuid>",
  "name": "Game 1",
  "price": 10,
  "launchDate": "2025-10-13T12:00:00.000Z",
  "isCracked": false,
  "version": 1
}
```

Validation (server-side rules)

- `name`: required
- `launchDate`: required, must be a valid date (ISO)
- `price`: required, must be >= 0
- `isCracked`: must not be null

Endpoints

- GET /games

  - Returns: 200 + array of games

- GET /games/:id

  - Returns: 200 + game or 404 if not found

- POST /games

  - Body: Game JSON (without id/version)
  - Returns: 201 + created game (id and version assigned)
  - Validation errors return 400 with message(s)

- PUT /games/:id

  - Body: full Game JSON (must include `id` and `version`)
  - The URL `:id` and body `id` must match
  - Uses an optimistic concurrency check: the server reads the integer version from the `ETag` header (if present) or from the `version` in the body. If a lower version is provided than the server's current version, the server returns 409 (Version conflict).
  - Returns: 200 + updated game or 400/409 on errors

- DELETE /games/:id
  - Returns: 204 (no content). If the game existed, the server broadcasts the deletion over WebSocket.

Notes

- The server sets simple JSON responses and uses HTTP status codes to indicate success or specific errors.
- CORS is enabled so the frontend can talk to the backend during local development.

## WebSocket (realtime)

The backend creates a WebSocket server on the same HTTP server (port `3000`). Clients can connect and will receive JSON messages each time a game is created, updated or deleted.

Event envelope

```json
{
  "event": "created|updated|deleted",
  "payload": { "game": { ... } }
}
```

## Contributing

This is a small educational project. Feel free to open issues or PRs to add features, improve validation, add auth, or containerize the services.
