/* Blackjack game engine utils: deck, scoring, RNG, and types
 *
 * This module is intentionally framework-agnostic (pure TS) so it can be used
 * from API routes and unit tests. It implements:
 * - Card/Deck types and helpers
 * - Deterministic shuffle (seed + nonce) for anti-fraud
 * - Hand total calculation (Ace as 1 or 11)
 * - Points calculation based on simplified arcade rules
 * - Basic state helpers and guards
 */

/* =========================
 * Types
 * ========================= */

export type Suit = "S" | "H" | "D" | "C"; // Spades, Hearts, Diamonds, Clubs
export type Rank =
  | "A"
  | "2"
  | "3"
  | "4"
  | "5"
  | "6"
  | "7"
  | "8"
  | "9"
  | "10"
  | "J"
  | "Q"
  | "K";

export type CardCode = `${Rank}${Suit}`;

/**
 * Game round states for API and UI (lowercase as per spec).
 * If you persist to DB with an UPPERCASE enum, use the mapping helpers below.
 */
export enum RoundState {
  Idle = "idle",
  Playing = "playing",
  Bust = "bust",
  Finished = "finished",
}

export type PrismaRoundState = "IDLE" | "PLAYING" | "BUST" | "FINISHED";

/**
 * Minimal GameState shape for API responses.
 * Extend this in your route handlers as needed.
 */
export interface GameState {
  roundId: string;
  state: RoundState;
  seed: string; // public seed (evidence of randomness), safe to expose
  nonce: number; // incremented each time you draw to produce new randomness
  hand: CardCode[];
  total: number;
  pointsLastRound: number; // 0 if bust, otherwise calculated on stand
  balance: number; // accumulated score (only increases)
}

/**
 * A log entry to keep track of all actions (anti-fraud auditing).
 * Store in DB if desired.
 */
export interface RoundLogEntry {
  roundId: string;
  action: "start" | "hit" | "stand" | "bust";
  card?: CardCode;
  totalAfter?: number;
  nonce?: number;
  timestamp: number; // ms since epoch
}

/* =========================
 * Constants
 * ========================= */

export const SUITS: Suit[] = ["S", "H", "D", "C"];
export const RANKS: Rank[] = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
];

/* =========================
 * Card / Deck helpers
 * ========================= */

/**
 * Builds an ordered 52-card deck (no jokers).
 */
export function buildDeck(): CardCode[] {
  const deck: CardCode[] = [];
  for (const r of RANKS) {
    for (const s of SUITS) {
      deck.push(`${r}${s}` as CardCode);
    }
  }
  return deck;
}

/**
 * Validate if a string is a valid CardCode (e.g., "AS", "10H", "QD").
 */
export function isCardCode(code: string): code is CardCode {
  // Fast checks for performance; exactness is important to avoid bad input.
  const suit = code.slice(-1);
  const rank = code.slice(0, -1);
  return (
    (SUITS as string[]).includes(suit) && (RANKS as string[]).includes(rank)
  );
}

/**
 * Safely assert an array of strings are CardCode[]
 * Throws if any invalid code is found.
 */
export function assertCardCodes(arr: string[]): CardCode[] {
  for (const c of arr) {
    if (!isCardCode(c)) {
      throw new Error(`Invalid card code: ${c}`);
    }
  }
  return arr as CardCode[];
}

/**
 * Convert a card to a pretty string for display (optional).
 */
export function formatCardPretty(card: CardCode): string {
  const suit = card.slice(-1) as Suit;
  const rank = card.slice(0, -1) as Rank;
  const suitSymbol =
    suit === "S" ? "♠" : suit === "H" ? "♥" : suit === "D" ? "♦" : "♣";
  return `${rank}${suitSymbol}`;
}

/* =========================
 * RNG and Shuffle (deterministic with seed + nonce)
 * ========================= */

/**
 * FNV-1a 32-bit hash. Produces a deterministic 32-bit number for a string.
 */
export function fnv1a32(str: string): number {
  let h = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    // 32-bit FNV prime (0x01000193)
    h = (h >>> 0) * 0x01000193;
  }
  return h >>> 0;
}

/**
 * Mulberry32 PRNG. Given a 32-bit seed, returns a function that yields [0, 1).
 */
export function mulberry32(seed: number) {
  let t = seed >>> 0;
  return function rng() {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic RNG using a human-readable seed and a nonce.
 * Increment nonce with each draw for evidence of independent randomness.
 */
export function createSeededRng(seed: string, nonce: number) {
  const base = fnv1a32(seed);
  const mixed = (base ^ (nonce >>> 0)) >>> 0;
  return mulberry32(mixed);
}

/**
 * In-place Fisher–Yates shuffle using provided RNG (deterministic).
 */
export function shuffleInPlace<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Returns a shuffled copy of a deck using seed + nonce.
 */
export function createShuffledDeck(seed: string, nonce: number): CardCode[] {
  const rng = createSeededRng(seed, nonce);
  const copy = buildDeck().slice();
  return shuffleInPlace(copy, rng);
}

/**
 * Draw the top card from a deck. Returns the card and the remaining deck.
 * This function does not mutate the original deck.
 */
export function drawCard(deck: CardCode[]): {
  card: CardCode;
  deck: CardCode[];
} {
  if (deck.length === 0) {
    throw new Error("Cannot draw from an empty deck");
  }
  const [card, ...rest] = deck;
  return { card, deck: rest };
}

/* =========================
 * Scoring and Hand totals
 * ========================= */

/**
 * Base value of a rank (Ace treated as 1 here; elevating to 11 is handled later).
 */
export function rankBaseValue(rank: Rank): number {
  if (rank === "A") return 1;
  if (rank === "J" || rank === "Q" || rank === "K") return 10;
  return Number(rank); // "2".."10"
}

/**
 * Calculates the best hand total by treating some Aces as 11 if it doesn't bust.
 * Returns the total and whether it's a "soft" hand (an Ace counted as 11).
 */
export function calculateBestTotal(cards: CardCode[]): {
  total: number;
  soft: boolean;
} {
  let sum = 0;
  let aces = 0;

  for (const code of cards) {
    const rank = code.slice(0, -1) as Rank;
    if (rank === "A") {
      aces++;
      sum += 1; // initially count Aces as 1
    } else {
      sum += rankBaseValue(rank);
    }
  }

  // Upgrade some Aces from 1 to 11 (i.e., +10) while it doesn't bust
  let soft = false;
  while (aces > 0 && sum + 10 <= 21) {
    sum += 10;
    aces--;
    soft = true;
  }

  return { total: sum, soft };
}

/**
 * Arcade scoring rules:
 * - total > 21 -> 0
 * - total = 21 -> 100
 * - 0 < total < 21 -> floor((total/21) * 100)
 */
export function calculatePoints(total: number): number {
  if (total > 21) return 0;
  if (total === 21) return 100;
  if (total > 0) return Math.floor((total / 21) * 100);
  return 0;
}

/**
 * Whether the hand is bust.
 */
export function isBust(total: number): boolean {
  return total > 21;
}

/**
 * Updates the wallet balance based on points earned this round.
 * "Apenas vitórias adicionam saldo" => only add if points > 0
 */
export function updateBalance(balance: number, points: number): number {
  if (points > 0) return balance + points;
  return balance;
}

/* =========================
 * State helpers
 * ========================= */

/**
 * Computes next state after a hit based on current hand.
 */
export function nextStateAfterHit(hand: CardCode[]): {
  state: RoundState;
  total: number;
} {
  const { total } = calculateBestTotal(hand);
  return {
    state: isBust(total) ? RoundState.Bust : RoundState.Playing,
    total,
  };
}

/**
 * Computes next state and points after stand.
 */
export function nextStateAfterStand(hand: CardCode[]): {
  state: RoundState.Finished;
  total: number;
  points: number;
} {
  const { total } = calculateBestTotal(hand);
  const points = calculatePoints(total);
  return {
    state: RoundState.Finished,
    total,
    points,
  };
}

/**
 * Validate server-side that a particular action is allowed based on state.
 * Helps avoid replay/refresh abuse.
 */
export function canPerformAction(
  state: RoundState,
  action: "start" | "hit" | "stand",
): boolean {
  switch (action) {
    case "start":
      // allow start from idle or finished/bust to begin a new round
      return (
        state === RoundState.Idle ||
        state === RoundState.Finished ||
        state === RoundState.Bust
      );
    case "hit":
      return state === RoundState.Playing;
    case "stand":
      return state === RoundState.Playing;
    default:
      return false;
  }
}

/* =========================
 * ID / Seed helpers
 * ========================= */

/**
 * Generate a reasonably unique round id without external deps.
 * You can replace this with crypto.randomUUID() if desired.
 */
export function generateRoundId(): string {
  const ts = Date.now().toString(36);
  const rnd = Math.floor(Math.random() * 1e9)
    .toString(36)
    .padStart(6, "0");
  return `rnd_${ts}_${rnd}`;
}

/**
 * Derive a seed string if you want to include extra context (userId, isoDate, etc.).
 * This is purely a helper; you can pass any string as a seed.
 */
export function deriveSeed(...parts: Array<string | number>): string {
  return parts.map(String).join("|");
}

/* =========================
 * Mapping helpers (optional)
 * ========================= */

/**
 * If your DB enum is UPPERCASE, use these helpers to map UI/API state.
 */
export function toPrismaRoundState(state: RoundState): PrismaRoundState {
  switch (state) {
    case RoundState.Idle:
      return "IDLE";
    case RoundState.Playing:
      return "PLAYING";
    case RoundState.Bust:
      return "BUST";
    case RoundState.Finished:
      return "FINISHED";
  }
}

export function fromPrismaRoundState(state: PrismaRoundState): RoundState {
  switch (state) {
    case "IDLE":
      return RoundState.Idle;
    case "PLAYING":
      return RoundState.Playing;
    case "BUST":
      return RoundState.Bust;
    case "FINISHED":
      return RoundState.Finished;
  }
}

/* =========================
 * High-level helpers
 * ========================= */

/**
 * Initialize a new round with a shuffled deck and optionally deal one card.
 * Returns the initial hand, total, state, and deck left (server-side only).
 *
 * Important: do NOT expose the remaining deck to the frontend.
 */
export function initRound(params: {
  seed: string;
  nonce?: number;
  dealOne?: boolean;
}): {
  roundId: string;
  state: RoundState.Playing;
  seed: string;
  nonce: number;
  hand: CardCode[];
  total: number;
  deckLeft: CardCode[]; // server-side only; do not send to client
  logs: RoundLogEntry[];
} {
  const roundId = generateRoundId();
  const nonce = params.nonce ?? 0;
  let deck = createShuffledDeck(params.seed, nonce);
  const logs: RoundLogEntry[] = [
    {
      roundId,
      action: "start",
      timestamp: Date.now(),
      nonce,
    },
  ];

  const hand: CardCode[] = [];
  if (params.dealOne) {
    const draw = drawCard(deck);
    deck = draw.deck;
    hand.push(draw.card);
    logs.push({
      roundId,
      action: "hit",
      card: draw.card,
      timestamp: Date.now(),
      nonce: nonce + 1,
      totalAfter: calculateBestTotal(hand).total,
    });
  }

  const { total } = calculateBestTotal(hand);
  return {
    roundId,
    state: RoundState.Playing,
    seed: params.seed,
    nonce: params.dealOne ? nonce + 1 : nonce, // incremented when we draw
    hand,
    total,
    deckLeft: deck,
    logs,
  };
}

/**
 * Perform a hit: draw one card and update state accordingly.
 * You must increment nonce for each draw to ensure fresh randomness.
 */
export function performHit(params: {
  roundId: string;
  seed: string;
  nonce: number; // current nonce before drawing
  hand: CardCode[];
  deckLeft: CardCode[];
}): {
  hand: CardCode[];
  total: number;
  state: RoundState;
  card: CardCode;
  deckLeft: CardCode[];
  nonce: number; // incremented
  log: RoundLogEntry;
} {
  let deck = params.deckLeft;
  // If deck is empty (extremely unlikely in this simplified game), reshuffle with next nonce
  if (deck.length === 0) {
    deck = createShuffledDeck(params.seed, params.nonce + 1);
  }

  const { card, deck: rest } = drawCard(deck);
  const hand = params.hand.concat(card);
  const { total } = calculateBestTotal(hand);
  const state = isBust(total) ? RoundState.Bust : RoundState.Playing;

  return {
    hand,
    total,
    state,
    card,
    deckLeft: rest,
    nonce: params.nonce + 1,
    log: {
      roundId: params.roundId,
      action: isBust(total) ? "bust" : "hit",
      card,
      totalAfter: total,
      nonce: params.nonce + 1,
      timestamp: Date.now(),
    },
  };
}

/**
 * Perform a stand: finalize the round, compute points, and return results.
 */
export function performStand(params: { roundId: string; hand: CardCode[] }): {
  state: RoundState.Finished;
  total: number;
  points: number;
  log: RoundLogEntry;
} {
  const { total } = calculateBestTotal(params.hand);
  const points = calculatePoints(total);
  return {
    state: RoundState.Finished,
    total,
    points,
    log: {
      roundId: params.roundId,
      action: "stand",
      totalAfter: total,
      timestamp: Date.now(),
    },
  };
}
