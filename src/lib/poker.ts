export type Player = { name: string; initial: string };

export type Round = {
  participants: string[]; // initials
  winners: string[]; // initials
  extras: { initial: string; amount: number }[];
};

export type Game = {
  id: string;
  date: number; // ms
  buyIn: number;
  players: Player[];
  rounds: Round[];
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
  const all = loadHistory();
  all.unshift(game);
  localStorage.setItem(KEY, JSON.stringify(all));
}

export function deleteGame(id: string) {
  const all = loadHistory().filter((g) => g.id !== id);
  localStorage.setItem(KEY, JSON.stringify(all));
}