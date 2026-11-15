import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Trash2, Inbox } from "lucide-react";
import { AppShell, PageHeader } from "@/components/poker/AppShell";
import {
  Game,
  computeTotals,
  deleteGame,
  loadHistory,
  serializeGame,
} from "@/lib/poker";

const formatNum = (n: number) =>
  Number.isInteger(n) ? n.toString() : n.toFixed(2);

const formatDate = (ms: number) => {
  const d = new Date(ms);
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const History = () => {
  const [games, setGames] = useState<Game[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    setGames(loadHistory());
  }, []);

  const remove = (id: string) => {
    deleteGame(id);
    setGames(loadHistory());
  };

  return (
    <AppShell>
      <PageHeader
        title="History"
        subtitle={`${games.length} session${games.length === 1 ? "" : "s"}`}
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

      {games.length === 0 ? (
        <div className="mt-16 flex flex-col items-center text-center text-muted-foreground">
          <Inbox className="mb-3 h-12 w-12 opacity-60" />
          <p>No games yet. Finalize a game to see it here.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {games.map((g) => {
            const totals = computeTotals(g);
            const isOpen = openId === g.id;
            return (
              <article
                key={g.id}
                className="rounded-2xl border border-border bg-card p-4 shadow-[var(--shadow-card)]"
              >
                <button
                  onClick={() => setOpenId(isOpen ? null : g.id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                      {formatDate(g.date)}
                    </div>
                    <div className="text-base font-bold">
                      {g.betting ? `Ante ${g.buyIn}` : `Buy-in ${g.buyIn}`} · {g.players.length} players · {g.rounds.length} rounds
                    </div>
                  </div>
                </button>

                <div className="mt-3 flex flex-wrap gap-2">
                  {g.players.map((p) => {
                    const v = totals[p.initial] ?? 0;
                    return (
                      <span
                        key={p.initial}
                        className={`rounded-full px-3 py-1 text-sm font-bold ${
                          v > 0
                            ? "bg-success/20 text-success"
                            : v < 0
                            ? "bg-loss/20 text-loss"
                            : "bg-secondary text-muted-foreground"
                        }`}
                      >
                        {p.initial} {v > 0 ? "+" : ""}
                        {formatNum(v)}
                      </span>
                    );
                  })}
                </div>

                {isOpen && (
                  <pre className="mt-4 max-h-64 overflow-auto rounded-xl bg-secondary p-3 text-xs leading-relaxed text-foreground">
{serializeGame(g)}
                  </pre>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    onClick={() => remove(g.id)}
                    className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-muted-foreground transition hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </AppShell>
  );
};

export default History;