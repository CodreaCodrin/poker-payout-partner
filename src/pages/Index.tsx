import { Link } from "react-router-dom";
import { Spade, History as HistoryIcon, Plus } from "lucide-react";
import { AppShell } from "@/components/poker/AppShell";
import { loadActiveGame } from "@/lib/poker";

const Index = () => {
  let hasActive = false;
  try { hasActive = !!loadActiveGame(); } catch { hasActive = true; }
  return (
    <AppShell>
      <div className="flex min-h-[90vh] flex-col">
        <div className="mt-10 flex flex-col items-center text-center">
          <div
            className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl shadow-[var(--shadow-glow)]"
            style={{ background: "var(--gradient-gold)" }}
          >
            <Spade className="h-10 w-10 text-primary-foreground" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight">Poker Pot</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            App for professional miel.
          </p>
        </div>

        <div className="mt-12 flex flex-col gap-4">
          <Link
            to={hasActive ? "/game" : "/new"}
            className="group flex items-center justify-between rounded-2xl bg-primary px-6 py-6 text-primary-foreground shadow-[var(--shadow-card)] transition active:scale-[0.98]"
          >
            <div className="text-left">
              <div className="text-xs font-semibold uppercase tracking-widest opacity-80">
                Start
              </div>
              <div className="text-2xl font-bold">{hasActive ? "Continuă jocul" : "New Game"}</div>
            </div>
            <Plus className="h-7 w-7" strokeWidth={2.5} />
          </Link>

          <Link
            to="/history"
            className="flex items-center justify-between rounded-2xl border border-border bg-card px-6 py-6 text-card-foreground shadow-[var(--shadow-card)] transition active:scale-[0.98]"
          >
            <div className="text-left">
              <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                Past Sessions
              </div>
              <div className="text-2xl font-bold">History</div>
            </div>
            <HistoryIcon className="h-7 w-7 text-accent" strokeWidth={2.5} />
          </Link>
        </div>

        <div className="mt-auto pt-16 flex flex-col items-center gap-2">
          <img 
            src="/Coffin.png" 
            alt="Miel Icon" 
            className="w-full max-w-[150px] aspect-square object-cover" 
          />
          <p className="text-center text-xs text-muted-foreground">
            Miel Love
          </p>
        </div>
      </div>
    </AppShell>
  );
};

export default Index;
