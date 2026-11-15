import type { Game, Round } from "./poker";

export type BlindMode = "none" | "big" | "both";
export type BettingSettings = {
  blindMode: BlindMode;
  smallBlind: number;
  bigBlind: number;
  firstDealer: string;
};
export const STREETS = ["Pre-flop", "Flop", "Turn", "River"] as const;
export type Street = (typeof STREETS)[number];
export type ActionKind = "bet" | "raise" | "call" | "check" | "fold";
export type HandAction = {
  player: string;
  kind: ActionKind | "ante" | "small" | "big";
  street: Street;
  amount: number; // integer cents actually added
  to: number; // total on this street, excluding ante
};
export type Hand = {
  participants: string[]; // table order
  dealer: string;
  small?: string;
  big?: string;
  first: string;
  street: Street;
  contributions: Record<string, number>; // integer cents, including ante
  streetBets: Record<string, number>;
  folded: string[];
  pending: string[];
  currentBet: number;
  minRaise: number;
  openingBet: number;
  actions: HandAction[];
};

export const cents = (amount: number) => Math.round(amount * 100);
export const money = (amount: number) => amount / 100;
export const formatMoney = (amount: number) =>
  new Intl.NumberFormat("ro-RO", { maximumFractionDigits: 2 }).format(amount);

export function parseMoney(raw: string): number | null {
  const value = raw.trim().replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(value)) return null;
  const amount = Number(value);
  return Number.isSafeInteger(cents(amount)) && amount <= 1_000_000 ? amount : null;
}

function after(order: string[], player: string) {
  const index = order.indexOf(player);
  return [...order.slice(index + 1), ...order.slice(0, index + 1)];
}

function copyHand(hand: Hand): Hand {
  return { ...hand, contributions: { ...hand.contributions }, streetBets: { ...hand.streetBets },
    folded: [...hand.folded], pending: [...hand.pending], actions: [...hand.actions] };
}

export function createHand(game: Game, selected: string[]): Hand {
  const players = game.players.map((p) => p.initial);
  const participants = players.filter((p) => selected.includes(p));
  if (participants.length < 2) throw new Error("Selectează cel puțin doi jucători.");
  const settings = game.betting;
  const previousDealer = [...game.rounds].reverse().find((r) => r.hand)?.hand?.dealer;
  const dealer = previousDealer
    ? after(players, previousDealer).find((p) => participants.includes(p))!
    : participants.includes(settings?.firstDealer)
      ? settings.firstDealer
      : [settings?.firstDealer, ...after(players, settings?.firstDealer ?? players[0])]
          .find((p) => participants.includes(p))!;
  const clockwise = after(participants, dealer);
  const hasBig = settings && settings.blindMode !== "none";
  const small = settings?.blindMode === "both"
    ? participants.length === 2 ? dealer : clockwise[0]
    : undefined;
  const big = hasBig ? participants.length === 2 ? clockwise[0]
    : clockwise[settings.blindMode === "both" ? 1 : 0] : undefined;
  const first = big ? after(participants, big)[0] : clockwise[0];
  const openingBet = hasBig ? cents(settings.bigBlind) : 1;
  const hand: Hand = {
    participants, dealer, small, big, first, street: "Pre-flop",
    contributions: Object.fromEntries(participants.map((p) => [p, 0])),
    streetBets: Object.fromEntries(participants.map((p) => [p, 0])),
    folded: [], pending: [first, ...after(participants, first).slice(0, -1)],
    currentBet: 0, minRaise: openingBet, openingBet, actions: [],
  };
  const post = (player: string, kind: "ante" | "small" | "big", amount: number) => {
    if (!amount) return;
    hand.contributions[player] += amount;
    if (kind !== "ante") hand.streetBets[player] += amount;
    hand.actions.push({ player, kind, amount, to: hand.streetBets[player], street: hand.street });
  };
  for (const p of participants) post(p, "ante", cents(game.buyIn));
  if (small) post(small, "small", cents(settings.smallBlind));
  if (big) post(big, "big", cents(settings.bigBlind));
  hand.currentBet = Math.max(...Object.values(hand.streetBets));
  return hand;
}

export const livePlayers = (hand: Hand) => hand.participants.filter((p) => !hand.folded.includes(p));
export const readyToSettle = (hand: Hand) =>
  livePlayers(hand).length === 1 || (hand.street === "River" && hand.pending.length === 0);
export const amountToCall = (hand: Hand) =>
  hand.pending.length ? hand.currentBet - hand.streetBets[hand.pending[0]] : 0;
export const minimumTarget = (hand: Hand) => hand.currentBet + hand.minRaise;

// A wager's target is the player's TOTAL on this street, never the additional amount.
export function act(hand: Hand, kind: ActionKind, target?: number): Hand {
  if (!hand.pending.length || readyToSettle(hand)) throw new Error("Nu mai sunt acțiuni în această etapă.");
  const player = hand.pending[0];
  const due = amountToCall(hand);
  const next = copyHand(hand);
  let amount = 0;
  if (kind === "check" && due > 0) throw new Error("Este necesar Call sau Fold.");
  if (kind === "call") {
    if (due <= 0) throw new Error("Poți da Check.");
    amount = due;
  }
  if (kind === "bet" || kind === "raise") {
    if ((kind === "bet") !== (hand.currentBet === 0)) throw new Error("Acțiune de pariere invalidă.");
    if (!Number.isSafeInteger(target) || target < minimumTarget(hand) || target > 100_000_000) {
      throw new Error(`Totalul minim este ${formatMoney(money(minimumTarget(hand)))}.`);
    }
    amount = target - hand.streetBets[player];
    next.minRaise = target - hand.currentBet;
    next.currentBet = target;
    next.pending = after(hand.participants, player).filter((p) => p !== player && !hand.folded.includes(p));
  } else {
    next.pending.shift();
  }
  if (kind === "fold") next.folded.push(player);
  next.contributions[player] += amount;
  next.streetBets[player] += amount;
  next.actions.push({ player, kind, amount, to: next.streetBets[player], street: hand.street });
  if (livePlayers(next).length === 1) next.pending = [];
  return next;
}

export function nextStreet(hand: Hand): Hand {
  if (hand.pending.length || readyToSettle(hand)) throw new Error("Etapa nu poate fi schimbată încă.");
  const next = copyHand(hand);
  next.street = STREETS[STREETS.indexOf(hand.street) + 1];
  next.streetBets = Object.fromEntries(hand.participants.map((p) => [p, 0]));
  next.currentBet = 0;
  next.minRaise = hand.openingBet;
  next.pending = after(hand.participants, hand.dealer).filter((p) => !hand.folded.includes(p));
  return next;
}

// No stacks/all-ins: every remaining player must match the bet before advancing.
// Return an unmatched wager (including an uncalled blind) before dividing the pot.
export function settleHand(hand: Hand, winners: string[]): Round {
  const live = livePlayers(hand);
  if (!readyToSettle(hand) || !winners.length || new Set(winners).size !== winners.length || winners.some((p) => !live.includes(p))) {
    throw new Error("Selectează câștigătorii dintre jucătorii rămași în mână.");
  }
  const contributions = { ...hand.contributions };
  const ranked = [...hand.participants].sort((a, b) => contributions[b] - contributions[a]);
  const refund = contributions[ranked[0]] - contributions[ranked[1]];
  if (refund > 0) contributions[ranked[0]] -= refund;
  return {
    participants: hand.participants, winners: hand.participants.filter((p) => winners.includes(p)), extras: [],
    contributions: Object.fromEntries(Object.entries(contributions).map(([p, amount]) => [p, money(amount)])),
    hand,
  };
}

export function describeAction(action: HandAction): string {
  const labels = { ante: "Ante", small: "Small blind", big: "Big blind", bet: "Bet", raise: "Raise", call: "Call", check: "Check", fold: "Fold" };
  return `${action.player} · ${labels[action.kind]}${action.amount ? ` +${formatMoney(money(action.amount))}` : ""}${action.kind === "raise" ? ` (total ${formatMoney(money(action.to))})` : ""}`;
}
