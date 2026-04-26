import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BarChart3, Check, Flag, Plus, Trash2, Trophy, X } from "lucide-react";
import { AppShell, PageHeader } from "@/components/poker/AppShell";
import {
  Game,
  Round,
  computeRoundScores,
  computeTotals,
  isValidWinnerFormat,
  parseWinners,
  saveGame,
} from "@/lib/poker";

type ExtraRow = { initial: string; amount: string };
type Phase = "select" | "payments";

const ActiveGame = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [phase, setPhase] = useState<Phase>("select");
  const [participants, setParticipants] = useState<string[]>([]);
  const [winnerInput, setWinnerInput] = useState("");
  const [extras, setExtras] = useState<ExtraRow[]>([]);
  const [showScore, setShowScore] = useState(false);

  useEffect(() => {
    const raw = sessionStorage.getItem("poker-pot.active");
    if (!raw) {
      navigate("/new", { replace: true });
      return;
    }
    setGame(JSON.parse(raw));
  }, [navigate]);

  const persist = (g: Game) => {
    setGame(g);
    sessionStorage.setItem("poker-pot.active", JSON.stringify(g));
  };

  const toggleParticipant = (initial: string) => {
    setParticipants((p) =>
      p.includes(initial) ? p.filter((x) => x !== initial) : [...p, initial],
    );
  };

  const goToPayments = () => {
    if (participants.length < 2) return;
    setWinnerInput("");
    setExtras([]);
    setPhase("payments");
  };

  /* ---------- validation ---------- */

  const winnerParts = parseWinners(winnerInput);
  const winnerFormatOk = winnerInput === "" || isValidWinnerFormat(winnerInput);
  const winnerInitialsOk = winnerParts.every((w) => participants.includes(w));
  const winnerError =
    winnerInput !== "" && (!winnerFormatOk || !winnerInitialsOk);

  const extraErrors = extras.map((e) => {
    const init = e.initial.trim().toUpperCase();
    if (!init) return false;
    if (!participants.includes(init)) return true;
    if (winnerParts.includes(init)) return true;
    return false;
  });

  const amountErrors = extras.map((e) => {
    if (e.amount === "") return false;
    const n = Number(e.amount);
    return !Number.isFinite(n) || n < 0;
  });

  const canSubmitRound =
    !!game &&
    winnerInput !== "" &&
    winnerFormatOk &&
    winnerInitialsOk &&
    winnerParts.length >= 1 &&
    winnerParts.length < participants.length && // need at least one loser
    extras.every((e, i) => !extraErrors[i] && !amountErrors[i]);

  /* ---------- actions ---------- */

  const submitRound = () => {
    if (!game || !canSubmitRound) return;
    const round: Round = {
      participants: [...participants],
      winners: winnerParts,
      extras: extras
        .filter((e) => e.initial && e.amount)
        .map((e) => ({
          initial: e.initial.trim().toUpperCase(),
          amount: Number(e.amount),
        })),
    };
    const next: Game = { ...game, rounds: [...game.rounds, round] };
    persist(next);
    setPhase("select");
    setParticipants([]);
    setWinnerInput("");
    setExtras([]);
  };

  const finalize = () => {
    if (!game) return;
    if (game.rounds.length === 0) {
      sessionStorage.removeItem("poker-pot.active");
      navigate("/", { replace: true });
      return;
    }
    saveGame(game);
    sessionStorage.removeItem("poker-pot.active");
    navigate("/", { replace: true });
  };

  const totals = useMemo(() => (game ? computeTotals(game) : {}), [game]);

  /* live preview of current round result */
  const previewScores = useMemo(() => {
    if (!game || !canSubmitRound) return null;
    return computeRoundScores(
      {
        participants,
        winners: winnerParts,
        extras: extras
          .filter((e) => e.initial && e.amount)
          .map((e) => ({
            initial: e.initial.trim().toUpperCase(),
            amount: Number(e.amount),
          })),
      },
      game.buyIn,
    );
  }, [game, canSubmitRound, participants, winnerParts, extras]);

  if (!game) return null;

  return (
    <AppShell>
      <PageHeader
        title={phase === "select" ? `Round ${game.rounds.length + 1}` : "Round Payments"}
        subtitle={
          phase === "select"
            ? `Buy-in ${game.buyIn} · Tap players in this round`
            : `Buy-in ${game.buyIn} · ${participants.length} in pot`
        }
        right={
          <button
            onClick={() => setShowScore(true)}
            className="rounded-xl bg-secondary p-2 text-foreground transition hover:bg-muted"
            aria-label="Current score"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
        }
      />

      {phase === "select" ? (
        <>
          <div className="grid grid-cols-2 gap-3">
            {game.players.map((p) => {
              const active = participants.includes(p.initial);
              return (
                <button
                  key={p.initial}
                  onClick={() => toggleParticipant(p.initial)}
                  className={`relative flex flex-col items-center justify-center rounded-2xl border-2 p-4 transition active:scale-[0.97] ${
                    active
                      ? "border-primary bg-primary/15 shadow-[var(--shadow-glow)]"
                      : "border-border bg-card"
                  }`}
                >
                  <div
                    className={`flex h-14 w-14 items-center justify-center rounded-full text-2xl font-extrabold ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-foreground"
                    }`}
                  >
                    {p.initial}
                  </div>
                  <div className="mt-2 text-sm font-semibold">{p.name}</div>
                  {active && (
                    <div className="absolute right-2 top-2 rounded-full bg-primary p-1 text-primary-foreground">
                      <Check className="h-3 w-3" strokeWidth={3} />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          <button
            onClick={goToPayments}
            disabled={participants.length < 2}
            className="mt-6 w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Next →
          </button>

          <button
            onClick={finalize}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-card py-3 text-sm font-semibold text-muted-foreground transition hover:text-destructive"
          >
            <Flag className="h-4 w-4" /> Finalize Game
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => setPhase("select")}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Change participants
          </button>

          <section className="mb-5 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
            <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Trophy className="h-4 w-4 text-accent" /> Winner(s)
            </label>
            <input
              value={winnerInput}
              onChange={(e) =>
                setWinnerInput(e.target.value.toUpperCase().replace(/[^A-Z/]/g, ""))
              }
              placeholder="B  or  B/A"
              className={`mt-2 w-full rounded-xl border-2 bg-secondary px-4 py-3 text-2xl font-bold uppercase tracking-wider outline-none transition focus:border-primary ${
                winnerError ? "border-destructive" : "border-transparent"
              }`}
            />
            <p className="mt-2 text-xs text-muted-foreground">
              Use "/" to split the pot between multiple winners.
            </p>
          </section>

          <section className="mb-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Extra payments
            </h2>
            <div className="flex flex-col gap-2">
              {extras.map((row, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 shadow-[var(--shadow-card)]"
                >
                  <input
                    value={row.initial}
                    onChange={(e) => {
                      const v = e.target.value.slice(0, 1).toUpperCase();
                      setExtras((xs) =>
                        xs.map((x, idx) => (idx === i ? { ...x, initial: v } : x)),
                      );
                    }}
                    maxLength={1}
                    placeholder="A"
                    className={`h-11 w-11 rounded-xl border-2 bg-secondary text-center text-lg font-bold uppercase outline-none transition focus:border-primary ${
                      extraErrors[i] ? "border-destructive" : "border-transparent"
                    }`}
                  />
                  <input
                    value={row.amount}
                    onChange={(e) => {
                      const v = e.target.value;
                      setExtras((xs) =>
                        xs.map((x, idx) => (idx === i ? { ...x, amount: v } : x)),
                      );
                    }}
                    inputMode="decimal"
                    placeholder="Amount"
                    className={`h-11 flex-1 rounded-xl border-2 bg-secondary px-3 text-base outline-none transition focus:border-primary ${
                      amountErrors[i] ? "border-destructive" : "border-transparent"
                    }`}
                  />
                  <button
                    onClick={() =>
                      setExtras((xs) => xs.filter((_, idx) => idx !== i))
                    }
                    className="rounded-xl p-2 text-muted-foreground hover:text-destructive"
                    aria-label="Remove"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() =>
                setExtras((xs) => [...xs, { initial: "", amount: "" }])
              }
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border py-2.5 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
            >
              <Plus className="h-4 w-4" /> Add extra payment
            </button>
          </section>

          {previewScores && (
            <section className="mb-5 rounded-2xl border border-primary/30 bg-primary/5 p-4">
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-primary">
                Preview
              </h3>
              <div className="flex flex-wrap gap-2">
                {Object.entries(previewScores).map(([k, v]) => (
                  <span
                    key={k}
                    className={`rounded-full px-3 py-1 text-sm font-bold ${
                      v >= 0
                        ? "bg-success/20 text-success"
                        : "bg-loss/20 text-loss"
                    }`}
                  >
                    {k} {v >= 0 ? "+" : ""}
                    {formatNum(v)}
                  </span>
                ))}
              </div>
            </section>
          )}

          <button
            onClick={submitRound}
            disabled={!canSubmitRound}
            className="w-full rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            Save round
          </button>
        </>
      )}

      {showScore && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center"
          onClick={() => setShowScore(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-card)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Current Score</h3>
              <button
                onClick={() => setShowScore(false)}
                className="rounded-lg p-1 text-muted-foreground hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {game.players.map((p) => {
                const v = totals[p.initial] ?? 0;
                return (
                  <div
                    key={p.initial}
                    className="flex items-center justify-between rounded-xl bg-secondary px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-background text-sm font-bold">
                        {p.initial}
                      </div>
                      <span className="font-semibold">{p.name}</span>
                    </div>
                    <span
                      className={`text-lg font-bold ${
                        v > 0 ? "text-success" : v < 0 ? "text-loss" : "text-muted-foreground"
                      }`}
                    >
                      {v > 0 ? "+" : ""}
                      {formatNum(v)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              {game.rounds.length} round{game.rounds.length === 1 ? "" : "s"} played
            </p>
          </div>
        </div>
      )}
    </AppShell>
  );
};

const formatNum = (n: number) =>
  Number.isInteger(n) ? n.toString() : n.toFixed(2);

export default ActiveGame;