import Fastify from "fastify";
import { PrismaClient } from "@prisma/client";
import { CURRENT_CONSENT_VERSION } from "@dunkhub/shared";
import { verifyTelegramInitData } from "./telegramAuth.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });
const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN ?? "";

app.decorateRequest("telegramUser", null);

app.addHook("preHandler", async (req, reply) => {
  if (req.url === "/health") return;
  const initData = req.headers["x-telegram-init-data"];
  if (typeof initData !== "string") {
    return reply.code(401).send({ error: "missing_init_data" });
  }
  const telegramUser = verifyTelegramInitData(initData, BOT_TOKEN);
  if (!telegramUser) {
    return reply.code(401).send({ error: "invalid_init_data" });
  }
  (req as any).telegramUser = telegramUser;
});

app.get("/health", async () => ({ status: "ok" }));

app.post("/consent", async (req, reply) => {
  const telegramUser = (req as any).telegramUser;
  const { scope } = req.body as { scope: string };

  const user = await prisma.user.upsert({
    where: { telegramId: telegramUser.userId },
    create: {
      telegramId: telegramUser.userId,
      username: telegramUser.username,
      firstName: telegramUser.firstName,
      lastName: telegramUser.lastName,
    },
    update: {},
  });

  const consent = await prisma.consentRecord.create({
    data: {
      userId: user.id,
      scope,
      version: CURRENT_CONSENT_VERSION,
    },
  });

  return reply.send(consent);
});

app.post("/jumps", async (req, reply) => {
  const telegramUser = (req as any).telegramUser;
  const user = await prisma.user.findUnique({ where: { telegramId: telegramUser.userId } });
  if (!user) return reply.code(404).send({ error: "user_not_found" });

  const activeConsent = await prisma.consentRecord.findFirst({
    where: { userId: user.id, scope: "anonymized_data_research", revokedAt: null },
  });
  if (!activeConsent) {
    return reply.code(403).send({ error: "consent_required" });
  }

  const { type, heightCm, flightTimeMs, contactTimeMs, leftLegLoadRatio, rightLegLoadRatio } =
    req.body as Record<string, unknown>;

  const jump = await prisma.jumpMeasurement.create({
    data: {
      userId: user.id,
      type: type as string,
      heightCm: heightCm as number,
      flightTimeMs: flightTimeMs as number,
      contactTimeMs: contactTimeMs as number | null,
      leftLegLoadRatio: leftLegLoadRatio as number | null,
      rightLegLoadRatio: rightLegLoadRatio as number | null,
    },
  });

  return reply.send(jump);
});

app.get("/jumps", async (req, reply) => {
  const telegramUser = (req as any).telegramUser;
  const user = await prisma.user.findUnique({ where: { telegramId: telegramUser.userId } });
  if (!user) return reply.send([]);

  const jumps = await prisma.jumpMeasurement.findMany({
    where: { userId: user.id },
    orderBy: { capturedAt: "desc" },
    take: 50,
  });
  return reply.send(jumps);
});

const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
