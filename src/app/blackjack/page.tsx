"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";

type RoundState = "idle" | "playing" | "bust" | "finished";

type GameState = {
  roundId: string;
  state: RoundState;
  seed: string;
  nonce: number;
  hand: string[];
  total: number;
  pointsLastRound: number;
  balance: number;
};

function prettyCard(code: string) {
  // Format like "AS" -> "A♠", "10H" -> "10♥"
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  const symbol =
    suit === "S" ? "♠" : suit === "H" ? "♥" : suit === "D" ? "♦" : "♣";
  return `${rank}${symbol}`;
}

export default function BlackjackPage() {
  const [game, setGame] = useState<GameState | null>(null);
  const [busy, setBusy] = useState<false | "start" | "hit" | "stand">(false);
  const [error, setError] = useState<string | null>(null);
  const [requiresAuth, setRequiresAuth] = useState(false);

  const roundState: RoundState = game?.state ?? "idle";
  const isPlaying = roundState === "playing";
  const canStart = !isPlaying && !busy;
  const canHit = isPlaying && !busy;
  const canStand = isPlaying && !busy;

  const statusText = useMemo(() => {
    switch (roundState) {
      case "idle":
        return "No active round";
      case "playing":
        return "Playing";
      case "bust":
        return "Bust (0 points)";
      case "finished":
        return "Finished";
    }
  }, [roundState]);

  const postJson = useCallback(async (url: string, payload?: unknown) => {
    const res = await fetch(url, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: payload ? JSON.stringify(payload) : undefined,
    });
    if (res.status === 401) {
      setRequiresAuth(true);
      throw new Error("Unauthorized");
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      // Some endpoints may return a current state snapshot on 409
      if (res.status === 409 && data?.current) return data.current as GameState;
      if (res.status === 409 && data?.roundId) return data as GameState;
      throw new Error(data?.error || `Request failed: ${res.status}`);
    }
    return data as GameState;
  }, []);

  const onStart = useCallback(async () => {
    setError(null);
    setRequiresAuth(false);
    setBusy("start");
    try {
      const data = await postJson("/api/game/start", { dealOne: true });
      setGame(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start round");
    } finally {
      setBusy(false);
    }
  }, [postJson]);

  const onHit = useCallback(async () => {
    if (!game) return;
    setError(null);
    setRequiresAuth(false);
    setBusy("hit");
    try {
      const data = await postJson("/api/game/hit", {
        roundId: game.roundId,
        expectedNonce: game.nonce,
      });
      setGame(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to hit");
    } finally {
      setBusy(false);
    }
  }, [game, postJson]);

  const onStand = useCallback(async () => {
    if (!game) return;
    setError(null);
    setRequiresAuth(false);
    setBusy("stand");
    try {
      const data = await postJson("/api/game/stand", { roundId: game.roundId });
      setGame(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to stand");
    } finally {
      setBusy(false);
    }
  }, [game, postJson]);

  return (
    <div className="container mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-bold mb-4 text-2xl">Blackjack (21)</h1>

      <section className="mb-4 grid gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 rounded text-white"
          >
            {busy === "start" ? "Starting..." : "Start"}
          </button>
          <button
            type="button"
            onClick={onHit}
            disabled={!canHit}
            className="bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 rounded text-white"
          >
            {busy === "hit" ? "Hitting..." : "Hit"}
          </button>
          <button
            type="button"
            onClick={onStand}
            disabled={!canStand}
            className="bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 px-3 py-1.5 rounded text-white"
          >
            {busy === "stand" ? "Standing..." : "Stand"}
          </button>
          <span className="text-muted-foreground text-sm">
            {statusText}
            {busy ? " • Working..." : ""}
          </span>
        </div>

        {requiresAuth && (
          <div className="rounded border border-red-400 bg-red-50 p-3 text-sm text-red-700">
            You need to be signed in to play.{" "}
            <Link className="underline" href="/login">
              Go to login
            </Link>
            .
          </div>
        )}

        {error && (
          <div className="rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}
      </section>

      <section className="grid gap-3 rounded-lg border p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">Round</div>
          <div className="font-mono text-sm">{game?.roundId ?? "—"}</div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">State</div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-sm">
            {roundState}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">Hand</div>
          <div className="flex flex-wrap gap-2">
            {game?.hand?.length ? (
              game.hand.map((c, idx) => (
                <div
                  key={c}
                  className="border font-mono rounded px-2 py-1 text-sm"
                >
                  {prettyCard(c)}
                </div>
              ))
            ) : (
              <span className="text-sm">—</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">Total</div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-sm">
            {typeof game?.total === "number" ? game.total : "—"}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">
            Points (this round)
          </div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-sm">
            {typeof game?.pointsLastRound === "number"
              ? game.pointsLastRound
              : 0}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="text-muted-foreground text-sm">Balance</div>
          <div className="bg-gray-100 dark:bg-gray-800 rounded px-2 py-0.5 text-sm">
            {typeof game?.balance === "number" ? game.balance : 0}
          </div>
        </div>
      </section>

      <p className="mt-4 text-xs text-muted-foreground">
        Notes:
        <br />• Only wins add to your balance. Never subtract.
        <br />• Aces count as 1 or 11 (best without busting).
        <br />• J, Q, K are 10.
      </p>
    </div>
  );
}
