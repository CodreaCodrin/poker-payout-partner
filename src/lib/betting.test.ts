import { beforeEach, describe, expect, it } from "vitest";
import { act, amountToCall, createHand, livePlayers, nextStreet, parseMoney, readyToSettle, settleHand } from "./betting";
import { clearActiveGame, computeRoundScores, computeTotals, Game, loadActiveGame, loadHistory, saveGame, serializeGame, storeActiveGame } from "./poker";

const game = (count = 4): Game => ({
  id: "test", date: 1, buyIn: 0,
  players: "ABCD".slice(0, count).split("").map((initial) => ({ initial, name: initial })),
  rounds: [], betting: { blindMode: "both", smallBlind: 5, bigBlind: 10, firstDealer: "A" },
});
const start = (g = game()) => createHand(g, g.players.map((p) => p.initial));

describe("table positions and betting", () => {
  it("uses seat order, posts blinds and gives BB its option after all calls", () => {
    const g = game();
    let h = createHand(g, ["D", "C", "B", "A"]);
    expect([h.dealer, h.small, h.big, h.first]).toEqual(["A", "B", "C", "D"]);
    expect(h.contributions).toEqual({ A: 0, B: 500, C: 1000, D: 0 });
    h = act(act(act(h, "call"), "call"), "call");
    expect(h.pending).toEqual(["C"]);
    expect(amountToCall(h)).toBe(0);
    h = act(h, "check");
    expect(nextStreet(h).pending).toEqual(["B", "C", "D", "A"]);
  });
  it("rotates the dealer and skips sitting-out seats", () => {
    const g = game();
    const h = act(act(act(start(g), "fold"), "fold"), "fold");
    g.rounds.push(settleHand(h, ["C"]));
    const next = createHand(g, ["A", "C", "D"]);
    expect([next.dealer, next.small, next.big, next.first]).toEqual(["C", "D", "A", "C"]);
    expect(createHand({ ...game(), betting: { ...g.betting, firstDealer: "B" } }, ["A", "C", "D"]).dealer).toBe("C");
  });
  it("handles heads-up dealer/SB and reverses action order after the flop", () => {
    let h = start(game(2));
    expect([h.dealer, h.small, h.big, h.first]).toEqual(["A", "A", "B", "A"]);
    expect(amountToCall(h)).toBe(500);
    h = act(act(h, "call"), "check");
    expect(nextStreet(h).pending).toEqual(["B", "A"]);
  });
  it("supports only BB, no blinds, and separate antes", () => {
    const g = game();
    g.betting.blindMode = "big";
    let h = start(g);
    expect([h.small, h.big, h.first]).toEqual([undefined, "B", "C"]);
    g.betting.blindMode = "none";
    g.buyIn = 2;
    h = start(g);
    expect(h.first).toBe("B");
    expect(Object.values(h.contributions)).toEqual([200, 200, 200, 200]);
    expect(h.currentBet).toBe(0);
    expect(() => act(h, "call")).toThrow();
    g.betting.blindMode = "both";
    h = start(g);
    expect(amountToCall(h)).toBe(1000);
    expect(h.contributions.B).toBe(700);
  });
  it("blocks check facing a bet and premature street changes", () => {
    const h = start();
    expect(() => act(h, "check")).toThrow();
    expect(() => nextStreet(h)).toThrow();
    expect(() => settleHand(h, ["A"])).toThrow();
  });
  it("raises to a street total and reopens action for previous callers", () => {
    let h = act(start(), "call"); // D calls 10
    h = act(h, "raise", 3000); // A raises to 30, minimum next raise 50
    expect(h.pending).toEqual(["B", "C", "D"]);
    expect(h.minRaise).toBe(2000);
    expect(() => act(h, "raise", 4000)).toThrow();
    h = act(h, "call");
    expect(h.contributions.B).toBe(3000); // 5 + 25, not 5 + 30
    h = act(h, "fold");
    expect(amountToCall(h)).toBe(2000); // D already paid 10
    h = act(h, "call");
    expect(h.pending).toEqual([]);
    expect(nextStreet(h).pending).toEqual(["B", "D", "A"]);
    expect(h.contributions.C).toBe(1000); // folded money remains
  });
  it("resets bets after each street and permits a four-way split at showdown", () => {
    let h = start();
    while (!readyToSettle(h)) {
      if (h.pending.length) h = act(h, amountToCall(h) ? "call" : "check");
      else h = nextStreet(h);
    }
    expect(h.street).toBe("River");
    expect(livePlayers(h)).toEqual(["A", "B", "C", "D"]);
    expect(computeRoundScores(settleHand(h, livePlayers(h)), 0)).toEqual({ A: 0, B: 0, C: 0, D: 0 });
    expect(() => nextStreet(h)).toThrow();
  });
});

describe("settlement and compatibility", () => {
  it("ends on folds, refunds an uncalled wager, and balances the ledger", () => {
    let h = act(start(), "raise", 3000); // D bets to 30
    h = act(act(act(h, "fold"), "fold"), "fold");
    expect(readyToSettle(h)).toBe(true);
    const r = settleHand(h, ["D"]);
    expect(r.contributions).toEqual({ A: 0, B: 5, C: 10, D: 10 });
    expect(computeRoundScores(r, 0)).toEqual({ A: 0, B: -5, C: -10, D: 15 });
    expect(() => settleHand(h, ["C"])).toThrow();
    expect(() => act(h, "check")).toThrow();
  });
  it("refunds the uncalled part of the big blind in a walk", () => {
    const h = act(act(act(start(), "fold"), "fold"), "fold");
    expect(settleHand(h, ["C"]).contributions).toEqual({ A: 0, B: 5, C: 5, D: 0 });
  });
  it("allocates odd cents without creating or losing money", () => {
    const g = game(3);
    g.betting.blindMode = "none";
    g.buyIn = 0.01;
    let h = act(start(g), "fold");
    while (!readyToSettle(h)) h = h.pending.length ? act(h, "check") : nextStreet(h);
    const r = settleHand(h, ["C", "A"]);
    expect(r.winners).toEqual(["A", "C"]);
    expect(computeRoundScores(r, 0)).toEqual({ A: 0.01, B: -0.01, C: 0 });
    expect(() => settleHand(h, ["A", "A"])).toThrow();
  });
  it("preserves old scores and text while new history contains actions", () => {
    const g = game(3);
    const legacy = { participants: ["A", "B", "C"], winners: ["A"], extras: [{ initial: "B", amount: 5 }] };
    expect(computeRoundScores(legacy, 10)).toEqual({ B: -15, C: -10, A: 25 });
    expect(serializeGame({ ...g, rounds: [legacy] })).toBe("A A, B B, C C\nA. B5");
    const legacySplit = { participants: ["A", "B", "C", "D"], winners: ["A", "B", "C"], extras: [] };
    expect(computeTotals({ ...game(), buyIn: 10, rounds: [legacySplit] }).A).toBe(10 / 3);
    const h = act(act(start(g), "fold"), "fold");
    const r = settleHand(h, ["C"]);
    g.rounds = [r];
    expect(serializeGame(g)).toContain("Small blind");
    expect(serializeGame(g)).toContain("Fold");
    expect(Object.values(computeTotals(g)).reduce((a, b) => a + b, 0)).toBe(0);
  });
  it("accepts Romanian decimals and rejects invalid/unsafe amounts", () => {
    expect(parseMoney("12,50")).toBe(12.5);
    for (const invalid of ["", "-1", "1e3", "1.234", "Infinity", "1000001", "abc"]) expect(parseMoney(invalid)).toBeNull();
    expect(() => act(start(), "raise", 1999)).toThrow();
  });
});

describe("saved games", () => {
  beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });
  it("recovers the current hand and undo after restarting, and avoids duplicate history", () => {
    const g = game();
    const initial = start(g);
    g.draft = { hand: act(initial, "call"), undo: [initial] };
    storeActiveGame(g);
    expect(loadActiveGame()).toEqual(g);
    saveGame(g);
    saveGame(g);
    expect(loadHistory()).toHaveLength(1);
    expect(loadHistory()[0].draft).toBe(undefined);
    clearActiveGame();
    expect(loadActiveGame()).toBeNull();
  });
  it("migrates the former session save without changing old rounds", () => {
    const g = game();
    delete g.betting;
    sessionStorage.setItem("poker-pot.active", JSON.stringify(g));
    storeActiveGame(loadActiveGame());
    expect(sessionStorage.getItem("poker-pot.active")).toBeNull();
    expect(loadActiveGame()).toEqual(g);
  });
});
