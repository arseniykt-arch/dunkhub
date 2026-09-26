import Fastify from "fastify";
import cors from "@fastify/cors";
import { PrismaClient } from "@prisma/client";
import { CURRENT_CONSENT_VERSION } from "@dunkhub/shared";
import { hashPassword, verifyPassword, signToken, verifyToken } from "./auth.js";

const prisma = new PrismaClient();
const app = Fastify({ logger: true });

await app.register(cors, {
  origin: process.env.WEB_ORIGIN?.split(",") ?? true,
});

const PUBLIC_ROUTES = new Set(["/health", "/auth/register", "/auth/login"]);

app.addHook("preHandler", async (req, reply) => {
  if (PUBLIC_ROUTES.has(req.url)) return;

  const authHeader = req.headers["authorization"];
  const token = typeof authHeader === "string" ? authHeader.replace(/^Bearer\s+/i, "") : null;
  if (!token) return reply.code(401).send({ error: "missing_token" });

  const userId = verifyToken(token);
  if (!userId) return reply.code(401).send({ error: "invalid_token" });

  (req as any).userId = userId;
});

app.get("/health", async () => ({ status: "ok" }));

app.post("/auth/register", async (req, reply) => {
  const { email, password, displayName } = req.body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string" || password.length < 8) {
    return reply.code(400).send({ error: "invalid_input" });
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return reply.code(409).send({ error: "email_taken" });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(password),
      displayName: typeof displayName === "string" ? displayName : null,
    },
  });

  return reply.send({ token: signToken(user.id), user: { id: user.id, email: user.email, displayName: user.displayName } });
});

app.post("/auth/login", async (req, reply) => {
  const { email, password } = req.body as Record<string, unknown>;
  if (typeof email !== "string" || typeof password !== "string") {
    return reply.code(400).send({ error: "invalid_input" });
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !verifyPassword(password, user.passwordHash)) {
    return reply.code(401).send({ error: "invalid_credentials" });
  }

  return reply.send({ token: signToken(user.id), user: { id: user.id, email: user.email, displayName: user.displayName } });
});

app.post("/consent", async (req, reply) => {
  const userId = (req as any).userId as string;
  const { scope } = req.body as { scope: string };

  const consent = await prisma.consentRecord.create({
    data: { userId, scope, version: CURRENT_CONSENT_VERSION },
  });

  return reply.send(consent);
});

app.post("/jumps", async (req, reply) => {
  const userId = (req as any).userId as string;

  const activeConsent = await prisma.consentRecord.findFirst({
    where: { userId, scope: "anonymized_data_research", revokedAt: null },
  });
  if (!activeConsent) {
    return reply.code(403).send({ error: "consent_required" });
  }

  const {
    type,
    heightCm,
    flightTimeMs,
    contactTimeMs,
    leftKneeValgusRatio,
    rightKneeValgusRatio,
  } = req.body as Record<string, unknown>;

  const jump = await prisma.jumpMeasurement.create({
    data: {
      userId,
      type: type as string,
      heightCm: heightCm as number,
      flightTimeMs: flightTimeMs as number,
      contactTimeMs: contactTimeMs as number | null,
      leftKneeValgusRatio: leftKneeValgusRatio as number | null,
      rightKneeValgusRatio: rightKneeValgusRatio as number | null,
    },
  });

  return reply.send(jump);
});

app.get("/jumps", async (req, reply) => {
  const userId = (req as any).userId as string;

  const jumps = await prisma.jumpMeasurement.findMany({
    where: { userId },
    orderBy: { capturedAt: "desc" },
    take: 50,
  });
  return reply.send(jumps);
});

function startOfDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

app.post("/recovery-checkins", async (req, reply) => {
  const userId = (req as any).userId as string;

  const { sorenessLevel, sleepHours, rpe } = req.body as Record<string, unknown>;
  const today = startOfDay(new Date());

  const existing = await prisma.recoveryCheckin.findFirst({
    where: { userId, checkedAt: { gte: today } },
  });

  const checkin = existing
    ? await prisma.recoveryCheckin.update({
        where: { id: existing.id },
        data: { sorenessLevel: sorenessLevel as number, sleepHours: sleepHours as number, rpe: rpe as number },
      })
    : await prisma.recoveryCheckin.create({
        data: {
          userId,
          sorenessLevel: sorenessLevel as number,
          sleepHours: sleepHours as number,
          rpe: rpe as number,
        },
      });

  return reply.send(checkin);
});

// ACWR (acute:chronic workload ratio): jump count in the last 7 days versus
// the 4-week rolling weekly average, using jump count as a training-load
// proxy. Standard sports-science bands: <0.8 undertraining, 0.8-1.3 optimal
// ("sweet spot"), 1.3-1.5 caution, >1.5 elevated injury risk. This is a
// coarse proxy (a jump session isn't a jump count), good enough to flag
// direction, not precise enough to be the only signal.
app.get("/injury-risk", async (req, reply) => {
  const userId = (req as any).userId as string;

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twentyEightDaysAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const [acuteCount, chronicCount, recentJumps, latestCheckin] = await Promise.all([
    prisma.jumpMeasurement.count({ where: { userId, capturedAt: { gte: sevenDaysAgo } } }),
    prisma.jumpMeasurement.count({ where: { userId, capturedAt: { gte: twentyEightDaysAgo } } }),
    prisma.jumpMeasurement.findMany({
      where: { userId, leftKneeValgusRatio: { not: null }, rightKneeValgusRatio: { not: null } },
      orderBy: { capturedAt: "desc" },
      take: 10,
    }),
    prisma.recoveryCheckin.findFirst({ where: { userId }, orderBy: { checkedAt: "desc" } }),
  ]);

  const chronicWeeklyAvg = chronicCount / 4;
  const acwr = chronicWeeklyAvg > 0 ? acuteCount / chronicWeeklyAvg : null;

  let workloadBand: "insufficient_data" | "undertraining" | "optimal" | "caution" | "high_risk" =
    "insufficient_data";
  if (acwr !== null) {
    if (acwr < 0.8) workloadBand = "undertraining";
    else if (acwr <= 1.3) workloadBand = "optimal";
    else if (acwr <= 1.5) workloadBand = "caution";
    else workloadBand = "high_risk";
  }

  const asymmetryScores = recentJumps.map(
    (j) => Math.abs((j.leftKneeValgusRatio ?? 0) - (j.rightKneeValgusRatio ?? 0)),
  );
  const avgAsymmetry =
    asymmetryScores.length > 0
      ? asymmetryScores.reduce((a, b) => a + b, 0) / asymmetryScores.length
      : null;
  const asymmetryFlag = avgAsymmetry !== null && avgAsymmetry > 0.15;

  return reply.send({
    acwr,
    workloadBand,
    acuteJumpCount7d: acuteCount,
    chronicWeeklyAvg28d: chronicWeeklyAvg,
    kneeAsymmetry: { avgAsymmetry, flag: asymmetryFlag, sampleSize: asymmetryScores.length },
    latestCheckin,
  });
});

const port = Number(process.env.PORT ?? 3001);
app.listen({ port, host: "0.0.0.0" }).catch((err) => {
  app.log.error(err);
  process.exit(1);
});
