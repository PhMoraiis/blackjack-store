import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import prisma from "@/db";
import { auth } from "@/lib/auth";
import {
  createShuffledDeck,
  calculateBestTotal,
  isBust,
  RoundState as UiRoundState,
  toPrismaRoundState,
  fromPrismaRoundState,
  assertCardCodes,
} from "@/lib/game";

type HitBody = {
  roundId: string;
  // Optional optimistic concurrency: expect current nonce before applying hit.
  // If provided and mismatched, request will be rejected to avoid double-hit.
  expectedNonce?: number;
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
 * POST /api/game/hit
 *
 * Requirements:
 * - Authenticated user
 * - Round must be in PLAYING state
 * - Draw exactly one card from a deterministic deck (seeded)
 * - If total > 21 => state = BUST, pointsLastRound = 0
 * - Otherwise => state = PLAYING
 * - Do NOT expose the remaining deck
 * - Persist a log entry for auditability
 * - Optionally guard with expectedNonce to avoid double-hit on retries
 */
export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id as string;

    let body: HitBody;
    try {
      body = (await req.json()) as HitBody;
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

    // Load the active round for this user
    const round = await prisma.gameRound.findFirst({
      where: {
        id: body.roundId,
        userId,
      },
    });

    if (!round) {
      return NextResponse.json({ error: "Round not found" }, { status: 404 });
    }

    if (round.state !== "PLAYING") {
      // Return current state to client so it can sync UI
      const wallet = await prisma.gameWallet.findUnique({
        where: { userId },
      });
      return NextResponse.json(
        toApiState({
          round,
          balance: wallet?.balance ?? 0,
        }),
        { status: 409 },
      );
    }

    // Optional idempotency check: if the client sent expectedNonce, enforce it
    if (
      typeof body.expectedNonce === "number" &&
      body.expectedNonce !== round.nonce
    ) {
      const wallet = await prisma.gameWallet.findUnique({
        where: { userId },
      });
      return NextResponse.json(
        {
          error: "Round changed since client last sync",
          current: toApiState({
            round,
            balance: wallet?.balance ?? 0,
          }),
        },
        { status: 409 },
      );
    }

    // Reconstruct a deterministic, single deck for this seed
    // We always use nonce=0 for the base deck so that the nth draw is deck[n-1].
    const baseDeck = createShuffledDeck(round.seed, 0);

    // Determine next card index based on how many have been drawn
    const drawsSoFar = round.nonce; // by convention, nonce == number of cards drawn
    let nextIndex = drawsSoFar;

    // Safety: ensure we don't duplicate cards if there's any drift
    const already = new Set(round.hand);
    let nextCard: (typeof baseDeck)[number] | undefined = baseDeck[nextIndex];

    // If out of range or the candidate card is already in hand, find the next available
    if (!nextCard || already.has(nextCard)) {
      nextCard = undefined;
      for (let i = nextIndex; i < baseDeck.length; i++) {
        if (!already.has(baseDeck[i])) {
          nextCard = baseDeck[i];
          nextIndex = i;
          break;
        }
      }
      // If still undefined, scan from start (covers rare mismatch cases)
      if (!nextCard) {
        for (let i = 0; i < baseDeck.length; i++) {
          if (!already.has(baseDeck[i])) {
            nextCard = baseDeck[i];
            nextIndex = i;
            break;
          }
        }
      }
    }

    if (!nextCard) {
      return NextResponse.json(
        { error: "Deck exhausted. Start a new round." },
        { status: 410 },
      );
    }

    const newHand: (typeof baseDeck)[number][] = [
      ...(round.hand as (typeof baseDeck)[number][]),
      nextCard,
    ];
    const { total } = calculateBestTotal(newHand);
    const didBust = isBust(total);
    const now = new Date();
    const nextNonce = round.nonce + 1;

    // Update round in DB
    const updated = await prisma.gameRound.update({
      where: { id: round.id },
      data: {
        hand: newHand,
        total,
        nonce: nextNonce,
        state: didBust
          ? toPrismaRoundState(UiRoundState.Bust)
          : toPrismaRoundState(UiRoundState.Playing),
        points: didBust ? 0 : round.points, // still 0 while playing
        finishedAt: didBust ? now : null,
        updatedAt: now,
      },
    });

    // Persist log
    await prisma.roundLog.create({
      data: {
        id: `log_${randomUUID()}`,
        roundId: round.id,
        action: didBust ? "bust" : "hit",
        card: nextCard,
        nonce: nextNonce,
        totalAfter: total,
        createdAt: now,
      },
    });

    // Fetch wallet balance for response
    const wallet = await prisma.gameWallet.findUnique({
      where: { userId },
    });

    const res = toApiState({
      round: updated,
      balance: wallet?.balance ?? 0,
    });

    // On hit, pointsLastRound stays 0. If bust, it is also 0 by spec.
    return new NextResponse(JSON.stringify(res), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("POST /api/game/hit error:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
