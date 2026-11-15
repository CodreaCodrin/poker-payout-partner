import { useState } from "react";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BettingHand from "./BettingHand";
import { act, amountToCall, createHand, Hand, nextStreet, readyToSettle } from "@/lib/betting";
import { computeRoundScores, Game, Round } from "@/lib/poker";

const game: Game = {
  id: "ui", date: 1, buyIn: 0, rounds: [],
  players: "ABCD".split("").map((initial) => ({ initial, name: `Player ${initial}` })),
  betting: { blindMode: "both", smallBlind: 5, bigBlind: 10, firstDealer: "A" },
};
const initial = () => createHand(game, ["A", "B", "C", "D"]);
let now = 1000;
let saved: Round | undefined;
function Table({ start = initial(), failSave = false }: { start?: Hand; failSave?: boolean }) {
  const [hand, setHand] = useState(start);
  const [undo, setUndo] = useState<Hand[]>([]);
  return <BettingHand hand={hand} players={game.players} canUndo={undo.length > 0} onCancel={() => {}}
    onChange={(next) => {
      if (failSave) return false;
      setUndo([...undo, hand]); setHand(next); return true;
    }} onUndo={() => { setHand(undo[undo.length - 1]); setUndo(undo.slice(0, -1)); return true; }}
    onSave={(round) => { saved = round; return true; }} />;
}
const tap = (name: string | RegExp) => {
  now += 400;
  fireEvent.click(screen.getByRole("button", { name }));
};

beforeEach(() => {
  now = 1000; saved = undefined;
  vi.spyOn(Date, "now").mockImplementation(() => now);
  vi.stubGlobal("ResizeObserver", class { observe() {} disconnect() {} });
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });

describe("one-handed betting controls", () => {
  it("calls in one tap and ignores an accidental double tap for the next player", () => {
    render(<Table />);
    const call = screen.getByRole("button", { name: "Call +10" });
    fireEvent.click(call);
    fireEvent.click(screen.getByRole("button", { name: "Call +10" }));
    expect(screen.getByLabelText("Pot curent")).toHaveTextContent("25");
    expect(within(screen.getByRole("region", { name: "Comenzi de joc" })).getByText("La rând: A · Player A")).toBeInTheDocument();
    tap("Anulează");
    expect(screen.getByLabelText("Pot curent")).toHaveTextContent("15");
  });
  it("prefills a valid raise and shows exactly how much will be added", () => {
    const hand = act(act(initial(), "call"), "call"); // B has already posted SB 5
    render(<Table start={hand} />);
    tap("Raise…");
    expect(screen.getByRole("textbox")).toHaveValue("20");
    expect(screen.getByRole("textbox")).toHaveAttribute("inputmode", "none");
    expect(screen.getByText("Mai pui +15")).toBeInTheDocument();
    tap("30");
    tap("Confirmă Raise 30");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByLabelText("Pot curent")).toHaveTextContent("60");
    expect(screen.getByRole("button", { name: "Call +20" })).toBeInTheDocument();
  });
  it("enters decimal amounts with the keypad, limits cents, and supports correction", () => {
    render(<Table />);
    tap("Raise…");
    for (const key of ["2", "5", "Virgulă", "5", "0", "9"]) tap(key);
    expect(screen.getByRole("textbox")).toHaveValue("25,50");
    expect(screen.getByRole("button", { name: "Confirmă Raise 25,5" })).toBeEnabled();
    tap("Șterge ultima cifră");
    expect(screen.getByRole("textbox")).toHaveValue("25,5");
    tap("Șterge");
    expect(screen.getByRole("button", { name: "Confirmă Raise" })).toBeDisabled();
    tap("1");
    expect(screen.getByRole("button", { name: "Confirmă Raise" })).toBeDisabled();
    tap("Înapoi");
    expect(screen.getByLabelText("Pot curent")).toHaveTextContent("15");
  });
  it("keeps the amount editor open when persistence fails so the bet can be retried", () => {
    render(<Table failSave />);
    tap("Raise…"); tap("Confirmă Raise 20");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("textbox")).toHaveValue("20");
  });
  it("advances the street and can undo back to the previous street", () => {
    let hand = initial();
    while (hand.pending.length) hand = act(hand, amountToCall(hand) ? "call" : "check");
    render(<Table start={hand} />);
    tap("Continuă cu Flop");
    expect(screen.getByRole("button", { name: "Check" })).toBeInTheDocument();
    tap("Anulează");
    expect(screen.getByRole("button", { name: "Continuă cu Flop" })).toBeInTheDocument();
  });
  it("chooses split winners in the bottom controls and saves a balanced result", () => {
    let hand = initial();
    while (!readyToSettle(hand)) hand = hand.pending.length ? act(hand, amountToCall(hand) ? "call" : "check") : nextStreet(hand);
    render(<Table start={hand} />);
    expect(screen.getByRole("button", { name: "Salvează mâna" })).toBeDisabled();
    const dock = within(screen.getByRole("region", { name: "Comenzi de joc" }));
    fireEvent.click(dock.getByRole("button", { name: "A · Player A" }));
    fireEvent.click(dock.getByRole("button", { name: "C · Player C" }));
    tap("Salvează mâna");
    expect(saved?.winners).toEqual(["A", "C"]);
    expect(computeRoundScores(saved!, 0)).toEqual({ A: 10, B: -10, C: 10, D: -10 });
  });
  it("automatically selects the last player standing after folds", () => {
    const hand = act(act(initial(), "fold"), "fold");
    render(<Table start={hand} />);
    tap("Fold");
    expect(screen.getByRole("button", { name: "Salvează mâna" })).toBeEnabled();
    tap("Salvează mâna");
    expect(saved?.winners).toEqual(["C"]);
  });
});
