import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import prisma from "@/db";
import { auth } from "@/lib/auth";
import {
  calculateBestTotal,
  calculatePoints,
  fromPrismaRoundState,
  RoundState as UiRoundState,
  toPrismaRoundState,
  assertCardCodes,
} from "@/lib/game";

type StandBody = {
  roundId: string;
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

/**
 * POST /api/game/stand
 *
 * - Auth required
 * - Round must be in PLAYING state
 * - Calculate points: floor((t/21)*100) with special cases
 * - Update wallet balance only if points > 0 (no subtraction ever)
 * - Set state to FINISHED, persist log
 * - Idempotent: repeat call after finish returns existing result without double-adding points
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id as string;

    let body: StandBody;
    try {
      body = (await req.json()) as StandBody;
    } catch {
      return NextResponse.json(
        { error: "Invalid JSON body", details: "Expected roundId" },
        { status: 400 },
      );
    }

    if (!body?.roundId || typeof body.roundId !== "string") {
      return NextResponse.json(
        { error: "roundId is required" },
        { status: 400 },
      );
    }

    // Load round
    const round = await prisma.gameRound.findFirst({
      where: {
        id: body.roundId,
        userId,
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    // Ensure user wallet exists (should exist from start, but be safe)
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

    // If round is not in PLAYING, return current state without changing anything
    if (round.state !== "PLAYING") {
      return NextResponse.json(
        toApiState({
          round,
          balance: wallet.balance,
        }),
        { status: 409 },
      );
    }

    // Compute points for this hand
    const { total } = calculateBestTotal(assertCardCodes(round.hand));
    const points = calculatePoints(total);
    const now = new Date();

    // Finalize round and (conditionally) update wallet atomically
    const result = await prisma.$transaction(async (tx: any) => {
      // Guard against race: only update if still PLAYING
      const upd = await tx.gameRound.updateMany({
        where: { id: round.id, userId, state: "PLAYING" },
        data: {
          state: toPrismaRoundState(UiRoundState.Finished),
          total,
          points,
          finishedAt: now,
          updatedAt: now,
        },
      });

      if (upd.count === 0) {
        // Someone else finalized in parallel; return current snapshot
        const currentRound = await tx.gameRound.findUnique({
          where: { id: round.id },
        });
        const currentWallet = await tx.gameWallet.findUnique({
          where: { userId },
        });
        return {
          finalized: false,
          round: currentRound!,
          wallet: currentWallet ?? wallet!,
        };
      }

      // Log the stand action
      await tx.roundLog.create({
        data: {
          id: `log_${randomUUID()}`,
          roundId: round.id,
          action: "stand",
          card: null,
          nonce: round.nonce,
          totalAfter: total,
          createdAt: now,
        },
      });

      // Update wallet only if points > 0
      let updatedWallet = wallet!;
      if (points > 0) {
        updatedWallet = await tx.gameWallet.update({
          where: { id: wallet!.id },
          data: { balance: { increment: points }, updatedAt: now },
        });
      }

      // Read back finalized round
      const finalizedRound = await tx.gameRound.findUnique({
        where: { id: round.id },
      });

      return {
        finalized: true,
        round: finalizedRound!,
        wallet: updatedWallet,
      };
    });

    const responsePayload = toApiState({
      round: result.round,
      balance: result.wallet.balance,
    });

    // If we lost the race to finalize, communicate a conflict
    const status = result.finalized ? 200 : 409;

    return new NextResponse(JSON.stringify(responsePayload), {
      status,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/game/stand error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
