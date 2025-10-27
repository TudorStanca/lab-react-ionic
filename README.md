A small example app that combines an Ionic + React front-end (Vite + TypeScript) with a lightweight Koa-based backend and a WebSocket server. The project demonstrates CRUD operations for a simple "Game" model and realtime updates via WebSockets. It's intended as an educational/demo repository for offline-first UX and realtime updates.

## Repository layout

- `frontend/` — Ionic React app (Vite + TypeScript). UI components, pages, contexts and services live here.
- `backend/` — Koa HTTP server with WebSocket (`ws`) support. Routes and in-memory data are implemented in `backend/src`.

## Requirements

- Node.js 18+ (recommended)
- npm (or another Node package manager)

## Quick start (Windows PowerShell)

Run backend and frontend in separate terminals.

Backend

```powershell
cd backend
npm install
npm run start
```

The backend serves HTTP on port `3000` by default.

Frontend (development)

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses Vite and will usually be available at `http://localhost:5173`.

Notes:

- The backend enables CORS for local development so the frontend can call the API.

## Useful scripts

Backend (`backend/package.json`)

- `npm start` — starts the server using `nodemon` and watches `src/`.

Frontend (`frontend/package.json`)

- `ionic serve` — start Vite dev server

## Backend API

Base URL: `http://localhost:3000`

Model: Game

Example Game JSON

```json
{
  "_id": "<guid>",
  "name": "Game 1",
  "price": 10,
  "launchDate": "2025-10-13T12:00:00.000Z",
  "isCracked": false,
  "version": 1
}
```

Validation rules (server)

- `name`: required
- `launchDate`: required, must be a valid date (ISO)
- `price`: required, must be >= 0
- `isCracked`: must not be null

Endpoints

- GET `/games`

  - Returns: `200` and an array of games

- GET `/games/:id`

  - Returns: `200` and the game, or `404` if not found

- POST `/games`

  - Body: Game JSON without `_id`/`version`
  - Returns: `201` and the created game (server assigns `_id` and `version`)
  - Validation errors return `400` with a message

- PUT `/games/:id`

  - Body: full Game JSON (must include `_id` and `version`)
  - The URL `:id` and body `_id` must match
  - Uses an optimistic concurrency check via the `ETag` header (or `version` in the body). A stale version results in `409` (Version conflict).
  - Returns: `200` and the updated game, or `400`/`409` on errors

- DELETE `/games/:id`
  - Returns: `204` (no content). If the game existed, the server broadcasts the deletion to WebSocket clients.

## WebSocket (realtime)

The backend runs a WebSocket server on the same HTTP port (`3000`). When games are created/updated/deleted the server broadcasts a JSON message to all connected clients.

Message envelope:

```json
{
  "event": "created|updated|deleted",
  "payload": { "game": { ... } }
}
```

Client example (browser JS):

```javascript
const ws = new WebSocket("ws://localhost:3000");
ws.addEventListener("message", (ev) => {
  const data = JSON.parse(ev.data);
  console.log("ws event", data.event, data.payload.game);
});
```

## Frontend notes

- The React app uses contexts and services located in `frontend/src/` (look for `GameProvider`, `AuthProvider`, and `services/GameApi.ts`).
- Offline behaviour: the app can enqueue pending game saves in `localStorage` (key: `pendingOfflineGames`) when the network is unavailable. Pending items are retried when connectivity is restored.

## Troubleshooting

- If the backend doesn't start, ensure `nodemon` is installed (`npm install` in `backend`). Use `npm run start` and check console logs.
- If the frontend cannot reach the backend, confirm both are running and that the backend is on port `3000`. Also check browser console for CORS or network errors.
- If local pending items reappear unexpectedly, check `localStorage` under `pendingOfflineGames`.

## Where to look in the code

- Backend entry: `backend/src/index.js` — routes, in-memory store and WebSocket broadcast logic.
- Frontend: `frontend/src/` — components, pages, context providers (`GameProvider.tsx`, `AuthProvider.tsx`), and API services.
