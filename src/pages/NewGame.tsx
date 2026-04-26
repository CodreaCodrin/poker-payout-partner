import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Play } from "lucide-react";
import { AppShell, PageHeader } from "@/components/poker/AppShell";
import { Game, Player } from "@/lib/poker";

type Row = { name: string; initial: string };

const NewGame = () => {
  const navigate = useNavigate();
  const [buyIn, setBuyIn] = useState<string>("10");
  const [rows, setRows] = useState<Row[]>([
    { name: "", initial: "" },
    { name: "", initial: "" },
  ]);

  const initials = rows.map((r) => r.initial.trim().toUpperCase());
  const duplicateInitials = useMemo(() => {
    const seen = new Set<string>();
    const dup = new Set<string>();
    for (const i of initials) {
      if (!i) continue;
      if (seen.has(i)) dup.add(i);
      seen.add(i);
    }
    return dup;
  }, [initials]);

  const buyInNum = Number(buyIn);
  const buyInValid = Number.isFinite(buyInNum) && buyInNum > 0;
  const allRowsValid =
    rows.length >= 2 &&
    rows.every((r) => r.name.trim() && /^[A-Za-z]$/.test(r.initial.trim()));
  const canStart = buyInValid && allRowsValid && duplicateInitials.size === 0;

  const update = (i: number, patch: Partial<Row>) => {
    setRows((rs) => rs.map((r, idx) => (idx === i ? { ...r, ...patch } : r)));
  };

  const addRow = () => setRows((rs) => [...rs, { name: "", initial: "" }]);
  const removeRow = (i: number) =>
    setRows((rs) => (rs.length <= 1 ? rs : rs.filter((_, idx) => idx !== i)));

  const start = () => {
    if (!canStart) return;
    const players: Player[] = rows.map((r) => ({
      name: r.name.trim(),
      initial: r.initial.trim().toUpperCase(),
    }));
    const game: Game = {
      id: crypto.randomUUID(),
      date: Date.now(),
      buyIn: buyInNum,
      players,
      rounds: [],
    };
    sessionStorage.setItem("poker-pot.active", JSON.stringify(game));
    navigate("/game");
  };

  return (
    <AppShell>
      <PageHeader
        title="New Game"
        subtitle="Set buy-in & add players"
        right={
          <Link
            to="/"
            className="rounded-lg p-2 text-muted-foreground hover:text-foreground"
            aria-label="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
        }
      />

      <section className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]">
        <label className="block text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Buy-in
        </label>
        <div className="mt-2 flex items-center gap-3">
          <input
            inputMode="decimal"
            value={buyIn}
            onChange={(e) => setBuyIn(e.target.value)}
            className={`w-full rounded-xl border-2 bg-secondary px-4 py-3 text-2xl font-bold text-foreground outline-none transition focus:border-primary ${
              buyIn && !buyInValid ? "border-destructive" : "border-transparent"
            }`}
            placeholder="10"
          />
        </div>
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Players
        </h2>
        <div className="flex flex-col gap-3">
          {rows.map((row, i) => {
            const initialUpper = row.initial.trim().toUpperCase();
            const isDup = initialUpper && duplicateInitials.has(initialUpper);
            const isInvalidInitial =
              row.initial.length > 0 && !/^[A-Za-z]$/.test(row.initial.trim());
            const initialError = isDup || isInvalidInitial;
            return (
              <div
                key={i}
                className="flex items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-[var(--shadow-card)]"
              >
                <input
                  value={row.initial}
                  onChange={(e) =>
                    update(i, { initial: e.target.value.slice(0, 1).toUpperCase() })
                  }
                  maxLength={1}
                  placeholder="A"
                  className={`h-12 w-12 rounded-xl border-2 bg-secondary text-center text-xl font-bold uppercase outline-none transition focus:border-primary ${
                    initialError ? "border-destructive" : "border-transparent"
                  }`}
                  aria-label="Player initial"
                />
                <input
                  value={row.name}
                  onChange={(e) => update(i, { name: e.target.value })}
                  placeholder="Name"
                  className="h-12 flex-1 rounded-xl border-2 border-transparent bg-secondary px-3 text-base outline-none transition focus:border-primary"
                />
                <button
                  onClick={() => removeRow(i)}
                  disabled={rows.length <= 1}
                  className="rounded-xl p-2 text-muted-foreground transition hover:text-destructive disabled:opacity-30"
                  aria-label="Remove player"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            );
          })}
        </div>

        <button
          onClick={addRow}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-border bg-transparent py-3 text-sm font-semibold text-muted-foreground transition hover:border-primary hover:text-primary"
        >
          <Plus className="h-4 w-4" /> Add player
        </button>

        {duplicateInitials.size > 0 && (
          <p className="mt-3 text-sm text-destructive">
            Initials must be unique.
          </p>
        )}
      </section>

      <button
        onClick={start}
        disabled={!canStart}
        className="flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
      >
        <Play className="h-5 w-5" /> Start Game
      </button>
    </AppShell>
  );
};

export default NewGame;