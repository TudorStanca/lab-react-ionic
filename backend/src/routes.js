import Router from "@koa/router";
import Game from "./game.js";
import GameStore from "./games.js";
import { randomUUID } from "crypto";
import { broadcast } from "./wss.js";

const gameStore = new GameStore({
  filename: "./db/games.json",
  autoload: true,
});

export const gamesRouter = new Router();

gamesRouter.get("/", async (ctx) => {
  const userId = ctx.state.user._id;
  const skip = Number(ctx.query.skip) || 0;
  const limit = Number(ctx.query.limit) || 20;

  try {
    const { games, total } = await gameStore.find({ userId }, { skip, limit, sort: { name: 1 } });
    ctx.response.body = { games, total };
    ctx.response.status = 200;
  } catch (error) {
    ctx.response.body = { message: error.message };
    ctx.response.status = 500;
  }
});

gamesRouter.get("/:id", async (ctx) => {
  const userId = ctx.state.user._id;
  const gameId = ctx.params.id;

  const game = await gameStore.findOne({ _id: gameId });
  if (game) {
    if (game.userId === userId) {
      ctx.response.body = game;
      ctx.response.status = 200; // ok
    } else {
      ctx.response.status = 403; // FORBIDDEN
    }
  } else {
    ctx.response.status = 404; // NOT FOUND
  }
});

const createGame = async (ctx, game, response) => {
  try {
    const userId = ctx.state.user._id;

    const dbGame = new Game({
      id: randomUUID(),
      name: game.name,
      price: game.price,
      launchDate: game.launchDate,
      isCracked: game.isCracked,
      version: 1,
      userId: userId,
    });

    const inserted = await gameStore.insert(dbGame);
    response.body = inserted;
    response.status = 201; // CREATED
    broadcast(userId, { type: "created", payload: { game: inserted } });
  } catch (error) {
    response.body = { message: error.message };
    response.status = 400; // bad request
  }
};

gamesRouter.post("/", async (ctx) => {
  await createGame(ctx, ctx.request.body, ctx.response);
});

gamesRouter.put("/:id", async (ctx) => {
  const id = ctx.params.id;
  const game = ctx.request.body;
  const response = ctx.response;

  if (game._id && game._id !== id) {
    response.body = {
      message: `Game id ${game._id} does not match URL id ${id}.`,
    };
    response.status = 400; // BAD REQUEST
    return;
  }

  try {
    const userId = ctx.state.user._id;

    const existingGame = await gameStore.findOne({ _id: id });

    if (!existingGame) {
      response.body = { message: `Game with id ${id} not found.` };
      response.status = 404;
      return;
    }

    if (game.version !== undefined && game.version !== existingGame.version) {
      response.body = {
        message: `Game version ${game.version} does not match existing version ${existingGame.version}.`,
      };
      response.status = 409; // CONFLICT
      return;
    }

    const dbGame = new Game({
      name: game.name,
      price: game.price,
      launchDate: game.launchDate,
      isCracked: game.isCracked,
      userId: userId,
      version: (existingGame.version || 0) + 1,
    });

    const updatedCount = await gameStore.update({ _id: id }, dbGame);

    if (updatedCount === 1) {
      dbGame._id = id;
      response.body = dbGame;
      response.status = 200;
      broadcast(userId, { type: "updated", payload: { game: dbGame } });
    } else {
      response.body = { message: `Game with id ${id} not found.` };
      response.status = 404;
    }
  } catch (error) {
    response.body = { message: error.message };
    response.status = 400; // bad request
  }
});

gamesRouter.delete("/:id", async (ctx) => {
  const userId = ctx.state.user._id;
  const id = ctx.params.id;
  const response = ctx.response;

  const game = await gameStore.findOne({ _id: id });
  if (game && userId !== game.userId) {
    response.status = 403; // FORBIDDEN
  } else {
    const deletedCount = await gameStore.remove({ _id: id });
    if (deletedCount === 1) {
      response.status = 204; // NO CONTENT
      broadcast(userId, { type: "deleted", payload: { id } });
    } else {
      response.status = 404; // NOT FOUND
    }
  }
});
