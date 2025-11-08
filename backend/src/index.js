import Koa from "koa";
import http from "http";
import { WebSocketServer } from "ws";
import cors from "@koa/cors";
import bodyparser from "koa-bodyparser";
import { initWss } from "./wss.js";
import Router from "@koa/router";
import { authRouter } from "./auth.js";
import { gamesRouter } from "./routes.js";
import { exceptionHandler, timingLogger } from "./utils.js";
import jwt from "koa-jwt";
import { jwtConfig } from "./utils.js";

const app = new Koa();
const server = http.createServer(app.callback());

const wss = new WebSocketServer({ server });
initWss(wss);

const bp = bodyparser();
app.use(async (ctx, next) => {
  if (ctx.path && ctx.path.startsWith("/api/games")) {
    return next();
  }
  return bp(ctx, next);
});

app.use(cors());
app.use(exceptionHandler);
app.use(timingLogger);

const prefix = "/api";

const publicApiRouter = new Router({ prefix });

publicApiRouter.use("/auth", authRouter.routes());

app.use(publicApiRouter.routes());
app.use(publicApiRouter.allowedMethods());

app.use(
  jwt(jwtConfig).unless({
    path: [/^\/api\/auth(\/|$)/, /^\/api\/games\/[^/]+\/photo$/],
  })
);

const protectedApiRouter = new Router({ prefix });
protectedApiRouter.use("/games", gamesRouter.routes());

app.use(protectedApiRouter.routes());
app.use(protectedApiRouter.allowedMethods());

server.listen(3000);
console.log("Server running on http://localhost:3000");
