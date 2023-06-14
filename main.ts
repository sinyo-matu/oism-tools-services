import {
  Application,
  Context,
  Router,
  State,
} from "https://deno.land/x/oak@v12.0.0/mod.ts";
import { WsHandler } from "./ws/mod.ts";
import { AuthClient } from "https://esm.sh/oism-auth@0.3.8";
import { getQuery } from "https://deno.land/x/oak@v12.0.0/helpers.ts";
import { CORS } from "https://deno.land/x/oak_cors@v0.1.1/mod.ts";
import { MessageHandler } from "./message.ts";

const authUrl = Deno.env.get("AUTH_API_URL") || "http://localhost:8080";
const authClientCode = Deno.env.get("AUTH_CLIENT_CODE") || "test";
const app = new Application();
const router = new Router();
const auth = new AuthClient(authUrl, authClientCode);

app.use(CORS());
const messageHandler = await MessageHandler.createNew();

app.addEventListener("error", (evt) => {
  // Will log the thrown error to the console.
  console.log(evt.error);
});

app.use(async (ctx, next) => {
  await next();
  const rt = ctx.response.headers.get("X-Response-Time");
  console.log(`${ctx.request.method} ${ctx.request.url} - ${rt}`);
});

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.response.headers.set("X-Response-Time", `${ms}ms`);
});

messageHandler.subscribe((message) => {
  wsHandler.broadcast(message);
});

window.onunload = () => {
  messageHandler.cleanUp();
  wsHandler.cleanUp();
};

async function needAuth(ctx: Context<State>, next: () => Promise<unknown>) {
  console.log("need auth");
  const Bearer = ctx.request.headers.get("Authorization");
  const token = Bearer?.split(" ")[1];
  if (!token) {
    ctx.throw(401);
  }
  let user;
  try {
    user = await auth.getUser(token);
  } catch (e) {
    console.log(e);
    ctx.throw(401);
  }
  if (!user) {
    console.log("user not found");
    ctx.throw(401);
  }
  await next();
}

const wsHandler = new WsHandler();

router.post(
  "/db_update",
  async (ctx) => {
    const { message } = await ctx.request.body({ type: "json" }).value;
    wsHandler.broadcast(message);
    ctx.response.status = 200;
  },
  needAuth
);

router.get("/ws_ticket", async (ctx) => {
  const Bearer = ctx.request.headers.get("Authorization");
  const token = Bearer?.split(" ")[1];
  if (!token) {
    ctx.throw(401);
    return;
  }
  let user;
  try {
    user = await auth.getUser(token);
  } catch (e) {
    console.log(e);
    ctx.throw(401);
    return;
  }
  if (!user) {
    console.log("user not found");
    ctx.throw(401);
    return;
  }
  const ticket = wsHandler.acquireTicket(user);
  ctx.response.body = JSON.stringify({ ticket });
});

router.get("/wss", (ctx) => {
  if (!ctx.isUpgradable) {
    ctx.throw(501);
  }
  const { ticket } = getQuery(ctx);
  if (ticket === "") {
    ctx.throw(400);
    return;
  }
  wsHandler.activateTicket(ticket, ctx.upgrade(), (m, id, sender) => {
    sender.broadcastExcept([id], `got message: ${m} from ${id}`);
  });
});

router.get("/", (ctx) => {
  ctx.response.body = "Hello World!";
});
app.use(router.routes());
app.use(router.allowedMethods());
await app.listen({ port: 8080 });
