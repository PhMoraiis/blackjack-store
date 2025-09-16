import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import prisma from "@/db";
import { auth } from "@/lib/auth";
import {
  initRound,
  deriveSeed,
  fromPrismaRoundState,
  RoundState as UiRoundState,
  toPrismaRoundState,
  assertCardCodes,
} from "@/lib/game";

type StartBody = {
  dealOne?: boolean;
};

function toApiState({
  round,
  balance,
}: {
  round: {
    id: string;
    state: "IDLE" | "PLAYING" | "BUST" | "FINISHED";
    seed: string;
    nonce: number;
    hand: string[];
    total: number;
    points: number;
  };
  balance: number;
}) {
  const uiState = fromPrismaRoundState(round.state);
  return {
    roundId: round.id,
    state: uiState,
    seed: round.seed,
    nonce: round.nonce,
    hand: assertCardCodes(round.hand),
    total: round.total,
    pointsLastRound:
      uiState === UiRoundState.Finished || uiState === UiRoundState.Bust
        ? round.points
        : 0,
    balance,
  };
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id as string;

    let body: StartBody | undefined;
    try {
      body = (await req.json()) as StartBody;
    } catch {
      body = {};
    }
    const dealOne = body?.dealOne ?? true;

    // Ensure user wallet exists
    let wallet = await prisma.gameWallet.findUnique({
      where: { userId },
    });
    if (!wallet) {
      const now = new Date();
      wallet = await prisma.gameWallet.create({
        data: {
          id: `wal_${randomUUID()}`,
          userId,
          balance: 0,
          createdAt: now,
          updatedAt: now,
        },
      });
    }

    // Idempotency: if there's already a playing round, return it
    const existingPlaying = await prisma.gameRound.findFirst({
      where: { userId, state: "PLAYING" },
    });
    if (existingPlaying) {
      const res = toApiState({
        round: existingPlaying,
        balance: wallet.balance,
      });
      return new NextResponse(JSON.stringify(res), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        },
      });
    }

    // Start a new round
    const seed = deriveSeed(userId, new Date().toISOString(), randomUUID());
    const started = initRound({ seed, dealOne });

    const now = new Date();
    const createdRound = await prisma.gameRound.create({
      data: {
        id: started.roundId,
        userId,
        state: toPrismaRoundState(UiRoundState.Playing),
        seed: started.seed,
        nonce: started.nonce,
        hand: started.hand,
        total: started.total,
        points: 0,
        finishedAt: null,
        createdAt: now,
        updatedAt: now,
        gameWalletId: wallet.id,
      },
    });

    // Persist logs for auditability
    if (started.logs.length > 0) {
      await prisma.roundLog.createMany({
        data: started.logs.map((l) => ({
          id: `log_${randomUUID()}`,
          roundId: started.roundId,
          action: l.action,
          card: l.card ?? null,
          nonce: typeof l.nonce === "number" ? l.nonce : null,
          totalAfter: typeof l.totalAfter === "number" ? l.totalAfter : null,
          createdAt: new Date(l.timestamp),
        })),
      });
    }

    const res = toApiState({
      round: createdRound,
      balance: wallet.balance,
    });

    return new NextResponse(JSON.stringify(res), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/game/start error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
