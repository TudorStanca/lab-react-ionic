import Koa from "koa";
import http from "http";
import { WebSocketServer, WebSocket } from "ws";
import Router from "@koa/router";
import cors from "@koa/cors";
import bodyparser from "koa-bodyparser";
import { randomUUID } from "crypto";

const app = new Koa();
const server = http.createServer(app.callback());

const wss = new WebSocketServer({ server });

app.use(bodyparser());
app.use(cors());

app.use(async (ctx, next) => {
  const start = new Date();
  await next();
  const ms = new Date() - start;
  console.log(`${ctx.method} ${ctx.url} ${ctx.response.status} - ${ms}ms.`);
});

app.use(async (ctx, next) => {
  try {
    await next();
  } catch (err) {
    ctx.response.body = { message: err.message || "Unexpected error." };
    ctx.response.status = 500;
  }
});

class Game {
  constructor({ id, name, price, launchDate, isCracked, version }) {
    this.id = id;
    this.name = name;
    this.price = price;
    this.launchDate = launchDate;
    this.isCracked = isCracked;
    this.version = version;
  }
}

const games = [];
for (let i = 0; i < 3; i++) {
  games.push(
    new Game({
      id: randomUUID(),
      name: `Game ${i}`,
      price: (i + 1) * 10,
      launchDate: new Date(Date.now() + i).toISOString(),
      isCracked: false,
      version: 1,
    })
  );
}

const broadcast = (data) =>
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(data));
    }
  });

const router = new Router();

router.get("/games", (ctx) => {
  ctx.response.body = games;
  ctx.response.status = 200;
});

router.get("/games/:id", async (ctx) => {
  const gameId = ctx.params.id;
  const game = games.find((g) => gameId === g.id);

  if (game) {
    ctx.response.body = game;
    ctx.response.status = 200; // ok
  } else {
    ctx.response.body = { message: `Game with id ${gameId} not found.` };
    ctx.response.status = 404; // NOT FOUND
  }
});

const validateGame = (game) => {
  const errorMessages = [];

  if (!game.name) {
    errorMessages.push("Name is missing.");
  }

  if (!game.launchDate || isNaN(Date.parse(game.launchDate))) {
    errorMessages.push("LaunchDate is missing or invalid.");
  }

  if (!game.price || game.price < 0) {
    errorMessages.push("Price is missing or invalid.");
  }

  if (game.isCracked === null) {
    errorMessages.push("IsCracked is missing.");
  }

  return errorMessages.length > 0 ? errorMessages : null;
};

const createGame = async (ctx) => {
  const game = ctx.request.body;

  const errorMessage = validateGame(game);

  if (errorMessage) {
    ctx.response.body = { message: errorMessage.join(" ") };
    ctx.response.status = 400; // BAD REQUEST

    return;
  }

  game.id = randomUUID();
  game.version = 1;
  games.push(game);

  ctx.response.body = game;
  ctx.response.status = 201; // CREATED

  broadcast({ event: "created", payload: { game } });
};

router.post("/games", async (ctx) => {
  await createGame(ctx);
});

router.put("/games/:id", async (ctx) => {
  const id = ctx.params.id;
  const game = ctx.request.body;
  const gameId = game.id;

  if (!gameId) {
    ctx.response.body = { message: `Game body id is missing.` };
    ctx.response.status = 400; // BAD REQUEST

    return;
  }

  if (id !== game.id) {
    ctx.response.body = { message: `Param id and body id should be the same.` };
    ctx.response.status = 400; // BAD REQUEST

    return;
  }

  const errorMessage = validateGame(game);

  if (errorMessage) {
    ctx.response.body = { message: errorMessage.join(" ") };
    ctx.response.status = 400; // BAD REQUEST
    
    return;
  }

  const index = games.findIndex((g) => g.id === id);

  if (index === -1) {
    ctx.response.body = { message: `Game with id ${id} not found.` };
    ctx.response.status = 400; // BAD REQUEST

    return;
  }

  const gameVersion = parseInt(ctx.get("ETag")) || game.version;

  if (gameVersion < games[index].version) {
    ctx.response.body = { message: `Version conflict.` };
    ctx.response.status = 409; // CONFLICT

    return;
  }

  game.version++;
  games[index] = game;

  ctx.response.body = game;
  ctx.response.status = 200; // OK

  broadcast({ event: "updated", payload: { game } });
});

router.del("/games/:id", (ctx) => {
  const id = ctx.params.id;
  const index = games.findIndex((g) => id === g.id);

  if (index !== -1) {
    const game = games[index];
    games.splice(index, 1);

    broadcast({ event: "deleted", payload: { game } });
  }

  ctx.response.status = 204; // no content
});

// setInterval(() => {
//   lastUpdated = new Date();
//   const game = new Game({
//     id: randomUUID(),
//     name: `game ${games.length}`,
//     price: 0,
//     launchDate: lastUpdated,
//     isCracked: false,
//     version: 1,
//   });
//   games.push(game);
//   console.log(`New game: ${game.name}`);
//   broadcast({ event: "created", payload: { game } });
// }, 5000);

app.use(router.routes());
app.use(router.allowedMethods());

server.listen(3000);
