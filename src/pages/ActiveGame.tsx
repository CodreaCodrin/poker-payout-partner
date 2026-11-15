import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { BarChart3, Flag, Home } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/poker/AppShell";
import BettingHand from "@/components/poker/BettingHand";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Game, Round, clearActiveGame, computeTotals, loadActiveGame, saveGame, storeActiveGame } from "@/lib/poker";
import { createHand, formatMoney, Hand } from "@/lib/betting";

const ActiveGame = () => {
  const navigate = useNavigate();
  const [game, setGame] = useState<Game | null>(null);
  const [participants, setParticipants] = useState<string[]>([]);
  const [showScore, setShowScore] = useState(false);
  const [confirm, setConfirm] = useState<"cancel" | "finish" | null>(null);
  const [loadError, setLoadError] = useState(false);
  useEffect(() => {
    try {
      const saved = loadActiveGame();
      if (!saved) { navigate("/new", { replace: true }); return; }
      storeActiveGame(saved); // also migrates the former session-only save
      setGame(saved);
      setParticipants(saved.draft?.hand.participants ?? saved.rounds[saved.rounds.length - 1]?.participants ?? saved.players.map((p) => p.initial));
    } catch { setLoadError(true); }
  }, [navigate]);

  const persist = (next: Game) => {
    try { storeActiveGame(next); setGame(next); return true; }
    catch { toast.error("Modificarea nu a fost salvată. Verifică spațiul disponibil și încearcă din nou."); return false; }
  };
  const changeHand = (hand: Hand) => {
    return persist({ ...game, draft: { hand, undo: [...game.draft.undo, game.draft.hand] } });
  };
  const undo = () => {
    const snapshots = game.draft.undo;
    return snapshots.length > 0 && persist({ ...game, draft: { hand: snapshots[snapshots.length - 1], undo: snapshots.slice(0, -1) } });
  };
  const finish = () => {
    try {
      if (game.rounds.length) saveGame(game);
      clearActiveGame();
      navigate("/", { replace: true });
    } catch { toast.error("Jocul nu a putut fi finalizat. Datele active sunt păstrate."); }
  };

  if (loadError) return <AppShell><PageHeader title="Jocul nu poate fi citit" /><p>Datele au fost păstrate. Reîncearcă după ce verifici accesul aplicației la stocare.</p><Link to="/" className="mt-4 block text-primary">Acasă</Link></AppShell>;
  if (!game) return null;
  const hand = game.draft?.hand;
  const planned = !hand && participants.length >= 2 ? createHand(game, participants) : null;
  const totals = computeTotals(game);
  const playerName = (initial: string) => game.players.find((p) => p.initial === initial)?.name;
  const saveRound = (round: Round) => persist({ ...game, rounds: [...game.rounds, round], draft: undefined });

  return (
    <AppShell>
      <PageHeader title={`Mâna ${game.rounds.length + 1}`} subtitle={hand ? "Înregistrează acțiunile de la masă" : "Alege cine participă la următoarea mână"} right={<div className="flex gap-1"><Link to="/" aria-label="Acasă" className="rounded-xl bg-secondary p-2"><Home className="h-5 w-5" /></Link><button onClick={() => setShowScore(!showScore)} aria-label="Scor curent" aria-expanded={showScore} className="rounded-xl bg-secondary p-2"><BarChart3 className="h-5 w-5" /></button></div>} />
      {showScore && <section className="mb-5 space-y-3 rounded-2xl border border-border bg-card p-4"><h2 className="font-bold">Scor din mâinile salvate ({game.rounds.length})</h2>{game.players.map((p) => <div key={p.initial} className="flex justify-between gap-2"><span>{p.name}</span><b className={totals[p.initial] >= 0 ? "text-success" : "text-loss"}>{totals[p.initial] > 0 ? "+" : ""}{formatMoney(totals[p.initial])}</b></div>)}</section>}

      {hand ? <>
        <BettingHand key={game.rounds.length} hand={hand} players={game.players} onChange={changeHand} onUndo={undo} canUndo={game.draft.undo.length > 0} onSave={saveRound} onCancel={() => setConfirm("cancel")} />
      </> : <div className="pb-48">
        {!game.betting && <p className="mb-4 text-sm text-muted-foreground">Joc reluat din versiunea veche: fără blind-uri, cu intrarea fixă {formatMoney(game.buyIn)}. Mâinile vechi păstrează calculul inițial.</p>}
        <div className="grid grid-cols-2 gap-3">{game.players.map((p) => <button key={p.initial} aria-pressed={participants.includes(p.initial)} onClick={() => setParticipants(participants.includes(p.initial) ? participants.filter((x) => x !== p.initial) : [...participants, p.initial])} className={`min-w-0 rounded-2xl border-2 p-4 text-center ${participants.includes(p.initial) ? "border-primary bg-primary/10" : "border-border bg-card"}`}><span className="text-2xl font-extrabold">{p.initial}</span><span className="mt-2 block break-words text-sm font-semibold">{p.name}</span></button>)}</div>
        {planned && <section className="mt-4 space-y-1 rounded-2xl border border-border bg-card p-4 text-sm"><p>Dealer: <b>{playerName(planned.dealer)}</b></p>{planned.small && <p>Small blind: <b>{playerName(planned.small)} · {formatMoney(game.betting.smallBlind)}</b></p>}{planned.big && <p>Big blind: <b>{playerName(planned.big)} · {formatMoney(game.betting.bigBlind)}</b></p>}<p>Începe pre-flop: <b>{playerName(planned.first)}</b></p><p className="pt-2 text-xs text-muted-foreground">După flop începe primul jucător rămas după dealer. Jucătorii care stau pe margine sunt săriți la rotație.</p></section>}
        <div className="betting-dock" role="region" aria-label="Pregătirea mâinii">
          <p className="mb-3 text-sm text-muted-foreground">{planned ? `Începe: ${playerName(planned.first)} · ${participants.length} jucători` : "Selectează cel puțin doi jucători"}</p>
          <button disabled={!planned} onClick={() => planned && persist({ ...game, draft: { hand: planned, undo: [] } })} className="min-h-14 w-full rounded-xl bg-primary px-3 py-3 text-lg font-bold text-primary-foreground disabled:opacity-40">Începe mâna</button>
          <button onClick={() => setConfirm("finish")} className="mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 py-3 text-sm"><Flag className="h-4 w-4" />Finalizează jocul</button>
        </div>
      </div>}
      <AlertDialog open={confirm !== null} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent className="w-[calc(100%_-_2rem)] max-w-md rounded-2xl">
          <AlertDialogHeader><AlertDialogTitle>{confirm === "cancel" ? "Anulezi această mână?" : "Finalizezi jocul?"}</AlertDialogTitle><AlertDialogDescription>{confirm === "cancel" ? "Se șterg doar acțiunile mâinii în desfășurare. Dealerul și scorul mâinilor salvate rămân aceleași." : game.rounds.length ? "Toate mâinile salvate și acțiunile lor vor apărea în History." : "Jocul nu are mâini salvate și va fi închis."}</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Înapoi</AlertDialogCancel><AlertDialogAction onClick={() => confirm === "cancel" ? persist({ ...game, draft: undefined }) : finish()}>Confirmă</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
};

export default ActiveGame;
