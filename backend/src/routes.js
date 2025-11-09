import Router from "@koa/router";
import Game from "./game.js";
import GameStore from "./games.js";
import { randomUUID } from "crypto";
import { broadcast } from "./wss.js";
import fs from "fs/promises";
import path from "path";
import { koaBody } from "koa-body";

const gameStore = new GameStore({
  filename: "./db/games.json",
  autoload: true,
});

export const gamesRouter = new Router();

gamesRouter.get("/", async (ctx) => {
  const userId = ctx.state.user._id;
  const skip = Number(ctx.query.skip) || 0;
  const limit = Number(ctx.query.limit) || 20;
  const q = ctx.query.q ? String(ctx.query.q) : undefined;
  const isCrackedParam = ctx.query.isCracked;

  const filter = { userId };

  if (q) {
    filter.name = new RegExp(q, "i");
  }

  if (typeof isCrackedParam !== "undefined") {
    if (isCrackedParam === "true") filter.isCracked = true;
    else if (isCrackedParam === "false") filter.isCracked = false;
  }

  try {
    const { games, total } = await gameStore.find(
      { userId, ...filter },
      { skip, limit, sort: { name: 1 } }
    );
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

gamesRouter.get("/:id/photo", async (ctx) => {
  const gameId = ctx.params.id;
  console.log("Fetching photo for game:", gameId);

  const game = await gameStore.findOne({ _id: gameId });
  if (!game) {
    console.log("Game not found");
    ctx.response.status = 404;
    return;
  }

  if (
    !game.photo ||
    typeof game.photo !== "string" ||
    !(game.photo.includes("/images/") || game.photo.includes("/api/games/"))
  ) {
    console.log("No valid photo URL in game record");
    ctx.response.status = 404;
    return;
  }

  try {
    let filename;
    if (game.photo.includes("/images/")) {
      filename = game.photo.split("/images/")[1];
    } else {
      const parts = game.photo.split("/api/games/");
      if (parts.length > 1) {
        const rest = parts[1];
        const idPart = rest.split("/photo")[0];
        const imagesDir = path.join(process.cwd(), "public", "images");
        const files = await fs.readdir(imagesDir).catch(() => []);
        const found = files.find((f) => f.startsWith(`photo-${idPart}.`));
        if (found) filename = found;
      }
    }

    if (!filename) {
      console.log("Filename not determined from photo URL");
      ctx.response.status = 404;
      return;
    }

    const filePath = path.join(process.cwd(), "public", "images", filename);
    console.log("Reading photo file:", filePath);
    const data = await fs.readFile(filePath);
    const ext = path.extname(filename).toLowerCase();
    if (ext === ".png") ctx.type = "image/png";
    else ctx.type = "image/jpeg";
    ctx.body = data;
    console.log("Photo served successfully");
  } catch (err) {
    console.log("Error reading photo file:", err.message);
    ctx.response.status = 404;
  }
});

const createGame = async (ctx, game, response) => {
  try {
    const userId = ctx.state.user._id;

    const id = game.id || randomUUID();

    let photoUrl = game.photo;
    try {
      if (typeof game.photo === "string" && game.photo.startsWith("data:")) {
        const match = game.photo.match(
          /^data:(image\/(png|jpeg|jpg));base64,(.*)$/i
        );
        if (match) {
          const ext = match[2] === "png" ? "png" : "jpeg";
          const b64 = match[3];
          const filename = `photo-${id}.${ext}`;
          const imagesDir = path.join(process.cwd(), "public", "images");
          await fs.mkdir(imagesDir, { recursive: true });
          const filePath = path.join(imagesDir, filename);
          await fs.writeFile(filePath, Buffer.from(b64, "base64"));
          photoUrl = `${ctx.origin}/api/games/${id}/photo`;
        }
      }
    } catch (err) {
      console.warn("Failed to save uploaded photo on create:", err);
    }

    const dbGame = new Game({
      id,
      name: game.name,
      price: game.price,
      launchDate: game.launchDate,
      isCracked: game.isCracked,
      photo: photoUrl,
      lat: game.lat,
      lng: game.lng,
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

gamesRouter.post(
  "/",
  koaBody({ multipart: true, formidable: { keepExtensions: true } }),
  async (ctx) => {
    const body = ctx.request.body || {};
    const files = ctx.request.files || {};

    const newId = randomUUID();
    body.id = newId;

    if (body.price !== undefined) body.price = Number(body.price);
    if (body.isCracked !== undefined)
      body.isCracked = body.isCracked === "true" || body.isCracked === true;
    if (body.lat !== undefined) body.lat = Number(body.lat);
    if (body.lng !== undefined) body.lng = Number(body.lng);

    if (files.photo) {
      try {
        const photoFile = files.photo;
        const origName =
          photoFile.originalFilename || photoFile.name || "photo";
        const ext = path.extname(origName) || "";
        const filename = `photo-${newId}${ext}`;
        const imagesDir = path.join(process.cwd(), "public", "images");
        await fs.mkdir(imagesDir, { recursive: true });
        const dest = path.join(imagesDir, filename);
        const sourcePath = photoFile.filepath || photoFile.path;
        console.log(`Moving uploaded file from ${sourcePath} to ${dest}`);
        await fs.rename(sourcePath, dest);
        body.photo = `${ctx.origin}/api/games/${newId}/photo`;
        console.log(`Photo saved successfully: ${body.photo}`);
      } catch (err) {
        console.warn("Failed to move uploaded photo on create:", err);
      }
    }

    await createGame(ctx, body, ctx.response);
  }
);

gamesRouter.put(
  "/:id",
  koaBody({ multipart: true, formidable: { keepExtensions: true } }),
  async (ctx) => {
    const id = ctx.params.id;
    const game = ctx.request.body;
    const files = ctx.request.files || {};
    const response = ctx.response;

    console.log(`PUT /games/${id} - game:`, game);
    console.log(`PUT /games/${id} - files:`, files);
    console.log(`PUT /games/${id} - game.lat:`, game.lat, typeof game.lat);
    console.log(`PUT /games/${id} - game.lng:`, game.lng, typeof game.lng);

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

      // Convert version to number if it's a string (from multipart form-data)
      const gameVersion =
        game.version !== undefined ? Number(game.version) : undefined;

      if (gameVersion !== undefined && gameVersion !== existingGame.version) {
        response.body = {
          message: `Game version ${gameVersion} does not match existing version ${existingGame.version}.`,
        };
        response.status = 409; // CONFLICT
        return;
      }

      let photoUrl = game.photo;
      try {
        if (files.photo) {
          console.log(
            `Processing uploaded photo file for game ${id}:`,
            files.photo
          );
          const photoFile = files.photo;
          const origName =
            photoFile.originalFilename || photoFile.name || "photo";
          const ext = path.extname(origName) || "";
          const filename = `photo-${id}${ext}`;
          const imagesDir = path.join(process.cwd(), "public", "images");
          await fs.mkdir(imagesDir, { recursive: true });
          const dest = path.join(imagesDir, filename);
          const sourcePath = photoFile.filepath || photoFile.path;
          console.log(`Moving photo from ${sourcePath} to ${dest}`);
          await fs.rename(sourcePath, dest).catch(async () => {
            console.log(`Rename failed, trying copy instead`);
            const data = await fs.readFile(sourcePath);
            await fs.writeFile(dest, data);
            await fs.unlink(sourcePath).catch(() => {});
          });
          photoUrl = `${ctx.origin}/api/games/${id}/photo`;
          console.log(`Photo saved successfully: ${photoUrl}`);

          try {
            const imagesDir = path.join(process.cwd(), "public", "images");
            const files = await fs.readdir(imagesDir).catch(() => []);
            for (const f of files) {
              if (f.startsWith(`photo-${id}.`) && f !== filename) {
                await fs.unlink(path.join(imagesDir, f)).catch(() => {});
              }
            }
          } catch (e) {
            // ignore delete errors
          }
        } else if (
          typeof game.photo === "string" &&
          game.photo.startsWith("data:")
        ) {
          const match = game.photo.match(
            /^data:(image\/(png|jpeg|jpg));base64,(.*)$/i
          );
          if (match) {
            const ext = match[2] === "png" ? "png" : "jpeg";
            const b64 = match[3];
            const filename = `photo-${id}.${ext}`;
            const imagesDir = path.join(process.cwd(), "public", "images");
            await fs.mkdir(imagesDir, { recursive: true });
            const filePath = path.join(imagesDir, filename);
            await fs.writeFile(filePath, Buffer.from(b64, "base64"));
            photoUrl = `${ctx.origin}/images/${filename}`;

            try {
              if (
                existingGame &&
                typeof existingGame.photo === "string" &&
                existingGame.photo.includes("/images/")
              ) {
                const oldFilename = existingGame.photo.split("/images/")[1];
                if (oldFilename && oldFilename !== filename) {
                  const oldPath = path.join(
                    process.cwd(),
                    "public",
                    "images",
                    oldFilename
                  );
                  await fs.unlink(oldPath).catch(() => {});
                }
              }
            } catch (e) {
              // ignore
            }
          }
        }
      } catch (err) {
        console.warn("Failed to save uploaded photo on update:", err);
      }

      const dbGame = new Game({
        name: game.name,
        price: Number(game.price),
        launchDate: game.launchDate,
        isCracked: game.isCracked === "true" || game.isCracked === true,
        photo: photoUrl,
        lat: game.lat !== undefined ? Number(game.lat) : undefined,
        lng: game.lng !== undefined ? Number(game.lng) : undefined,
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
  }
);

gamesRouter.delete("/:id", async (ctx) => {
  const userId = ctx.state.user._id;
  const id = ctx.params.id;
  const response = ctx.response;

  const game = await gameStore.findOne({ _id: id });
  if (game && userId !== game.userId) {
    response.status = 403; // FORBIDDEN
  } else {
    try {
      if (
        game &&
        typeof game.photo === "string" &&
        (game.photo.includes("/images/") || game.photo.includes("/api/games/"))
      ) {
        // delete any files matching photo-<id>.*
        const imagesDir = path.join(process.cwd(), "public", "images");
        const files = await fs.readdir(imagesDir).catch(() => []);
        for (const f of files) {
          if (f.startsWith(`photo-${id}.`)) {
            await fs.unlink(path.join(imagesDir, f)).catch(() => {});
          }
        }
      }
    } catch (e) {
      // ignore removal errors
    }

    const deletedCount = await gameStore.remove({ _id: id });
    if (deletedCount === 1) {
      response.status = 204; // NO CONTENT
      broadcast(userId, { type: "deleted", payload: { id } });
    } else {
      response.status = 404; // NOT FOUND
    }
  }
});
