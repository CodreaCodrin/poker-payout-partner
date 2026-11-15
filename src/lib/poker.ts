import { cents, describeAction, formatMoney, money } from "./betting";
import type { BettingSettings, Hand } from "./betting";

export type Player = { name: string; initial: string };

export type Round = {
  participants: string[]; // initials
  winners: string[]; // initials
  extras: { initial: string; amount: number }[];
  contributions?: Record<string, number>;
  hand?: Hand;
};

export type Game = {
  id: string;
  date: number; // ms
  buyIn: number;
  players: Player[];
  rounds: Round[];
  betting?: BettingSettings;
  draft?: { hand: Hand; undo: Hand[] };
};

export function parseWinners(raw: string): string[] {
  return raw
    .split("/")
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);
}

export function isValidWinnerFormat(raw: string): boolean {
  if (!raw) return false;
  if (!/^[A-Za-z](\/[A-Za-z])*$/.test(raw.trim())) return false;
  const parts = parseWinners(raw);
  return new Set(parts).size === parts.length;
}

export type RoundScores = Record<string, number>;

export function computeRoundScores(round: Round, buyIn: number): RoundScores {
  const scores: RoundScores = {};
  if (round.contributions) {
    const pot = Object.values(round.contributions).reduce((sum, amount) => sum + cents(amount), 0);
    const share = Math.floor(pot / round.winners.length);
    const remainder = pot % round.winners.length;
    for (const player of round.participants) scores[player] = 0 - cents(round.contributions[player] ?? 0);
    // Allocate odd cents in table order; the ledger always balances exactly.
    round.winners.forEach((player, i) => { scores[player] += share + (i < remainder ? 1 : 0); });
    return Object.fromEntries(Object.entries(scores).map(([p, value]) => [p, money(value)]));
  }
  const winners = round.winners;
  const losers = round.participants.filter((p) => !winners.includes(p));
  const extrasByInitial: Record<string, number> = {};
  for (const e of round.extras) {
    extrasByInitial[e.initial] = (extrasByInitial[e.initial] ?? 0) + (Number.isFinite(e.amount) ? e.amount : 0);
  }
  let pot = 0;
  for (const l of losers) {
    const extra = extrasByInitial[l] ?? 0;
    const loss = buyIn + extra;
    scores[l] = -(loss);
    pot += loss;
  }
  if (winners.length > 0) {
    const share = pot / winners.length;
    for (const w of winners) scores[w] = (scores[w] ?? 0) + share;
  }
  return scores;
}

export function computeTotals(game: Game): RoundScores {
  const totals: RoundScores = {};
  for (const p of game.players) totals[p.initial] = 0;
  for (const round of game.rounds) {
    const rs = computeRoundScores(round, game.buyIn);
    for (const k of Object.keys(rs)) totals[k] = (totals[k] ?? 0) + rs[k];
  }
  return totals;
}

/* ---------- Strict file-format serialization ---------- */

export function serializeGame(game: Game): string {
  const header = game.players.map((p) => `${p.initial} ${p.name}`).join(", ");
  const lines = [header];
  for (const r of game.rounds) {
    if (r.hand) {
      const h = r.hand;
      lines.push(`\nMâna ${game.rounds.indexOf(r) + 1} · Dealer ${h.dealer}${h.small ? ` · SB ${h.small}` : ""}${h.big ? ` · BB ${h.big}` : ""} · Începe ${h.first}`);
      for (const action of h.actions) lines.push(`${action.street}: ${describeAction(action)}`);
      lines.push(`Contribuții: ${Object.entries(r.contributions).map(([p, value]) => `${p} ${formatMoney(value)}`).join(", ")}`);
      lines.push(`Câștigători: ${r.winners.join("/")}`);
      continue;
    }
    const winners = r.winners.join("/");
    const extras = r.extras
      .filter((e) => Number.isFinite(e.amount) && e.amount > 0)
      .map((e) => `${e.initial}${e.amount}`)
      .join(" ");
    lines.push(extras ? `${winners}. ${extras}` : `${winners}.`);
  }
  return lines.join("\n");
}

/* ---------- Storage ---------- */

const KEY = "poker-pot.history.v1";

export function loadHistory(): Game[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Game[];
  } catch {
    return [];
  }
}

export function saveGame(game: Game) {
  const all = loadHistory().filter((g) => g.id !== game.id);
  const { draft, ...completed } = game;
  all.unshift(completed);
  localStorage.setItem(KEY, JSON.stringify(all));
}

const ACTIVE_KEY = "poker-pot.active";

export function loadActiveGame(): Game | null {
  const raw = localStorage.getItem(ACTIVE_KEY) ?? sessionStorage.getItem(ACTIVE_KEY);
  if (!raw) return null;
  const game = JSON.parse(raw) as Game;
  if (!game.id || !Array.isArray(game.players) || !Array.isArray(game.rounds)) {
    throw new Error("Datele jocului nu pot fi citite.");
  }
  return game;
}

export function storeActiveGame(game: Game) {
  localStorage.setItem(ACTIVE_KEY, JSON.stringify(game));
  sessionStorage.removeItem(ACTIVE_KEY);
}

export function clearActiveGame() {
  localStorage.removeItem(ACTIVE_KEY);
  sessionStorage.removeItem(ACTIVE_KEY);
}

export function deleteGame(id: string) {
  const all = loadHistory().filter((g) => g.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}
