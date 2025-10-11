# lab-react-ionic

Small demo project combining an Express-like Koa backend (with WebSocket updates) and an Ionic + React + Vite frontend.

This README explains the repository layout and how to run both backend and frontend on Windows.

---

## Repository layout

- `backend/` — Node.js Koa backend providing a small REST API plus WebSocket push updates.

  - `package.json` — backend dependencies and start script
  - `src/index.js` — the server entry point

- `frontend/` — Ionic + React application built with Vite
  - `package.json` — frontend scripts
  - `src/` — React sources

---

## Prerequisites

- Node.js 18+ (the project was tested with Node 22.x)
- npm (comes with Node) or pnpm/yarn if you prefer
- (Optional) Android Studio / Xcode if you intend to run mobile builds

On Windows: run commands in Command Prompt (cmd.exe) or PowerShell. If you use PowerShell and see an error about `npm.ps1` being disabled, see Troubleshooting below.

---

## Run backend (development)

1. Open a terminal in the `backend` folder.
2. Install dependencies:

```powershell
cd backend
npm install
```

3. Start the backend (it uses `nodemon` so it will restart on changes):

```powershell
npm start
```

The server listens on port `3000` by default and exposes a small REST API and a WebSocket server.

---

## Run frontend (development)

1. Open a terminal in the `frontend` folder.
2. Install dependencies and start dev server:

```powershell
cd frontend
npm install
npm run dev
```

The frontend uses Vite; by default it will run on `http://localhost:5173` (or another port if 5173 is taken).

If the frontend needs the backend API to be running, start the backend first.

---

## Backend API (quick reference)

Base URL: `http://localhost:3000`

Endpoints:

- `GET /item` — returns the list of items
- `GET /item/:id` — returns a single item or 404
- `POST /item` — create item; body must contain `text` field
- `PUT /item/:id` — update item (uses version/ETag semantics)
- `DELETE /item/:id` — delete item

WebSocket:

- The backend opens a WebSocket server on the same HTTP server (same port). It broadcasts events when items are created/updated/deleted.
- Broadcast message format:
  ```json
  { "event": "created|updated|deleted", "payload": { "item": { ... } } }
  ```

---

## Troubleshooting

- PowerShell `npm.ps1` execution error:

  - If you see `npm.ps1 cannot be loaded because running scripts is disabled on this system`, run npm from `cmd.exe` or change PowerShell execution policy for the current user:

  ```powershell
  Set-ExecutionPolicy RemoteSigned -Scope CurrentUser
  ```

  - Alternatively run commands in Command Prompt (cmd.exe):

  ```cmd
  cd backend
  npm start
  ```

---

## Development notes

- The backend seeds a few example items and periodically (every 5s) adds new items and broadcasts creation events over WebSocket.
- The backend uses Koa with `@koa/router`, `koa-bodyparser` and `@koa/cors`.

---
