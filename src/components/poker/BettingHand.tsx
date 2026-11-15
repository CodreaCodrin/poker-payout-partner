import { useEffect, useRef, useState } from "react";
import { Delete, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { computeRoundScores, Round } from "@/lib/poker";
import {
  act, ActionKind, amountToCall, cents, describeAction, formatMoney, Hand, livePlayers,
  minimumTarget, money, nextStreet, parseMoney, readyToSettle, settleHand, STREETS,
} from "@/lib/betting";
import type { Player } from "@/lib/poker";
import { cn } from "@/lib/utils";

const button = "min-h-12 min-w-0 touch-manipulation rounded-xl bg-secondary px-3 py-3 font-semibold transition active:scale-[0.98] disabled:opacity-40";
const maxTarget = 100_000_000;

export default function BettingHand({ hand, players, onChange, onUndo, canUndo, onSave, onCancel }: {
  hand: Hand; players: Player[]; onChange: (hand: Hand) => boolean;
  onUndo: () => boolean; canUndo: boolean; onSave: (round: Round) => boolean;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState("");
  const [editing, setEditing] = useState(false);
  const [replaceDigits, setReplaceDigits] = useState(true);
  const [winners, setWinners] = useState<string[]>([]);
  const [dockHeight, setDockHeight] = useState(240);
  const dockRef = useRef<HTMLDivElement>(null);
  const amountRef = useRef<HTMLInputElement>(null);
  // A second tap from the same gesture must not act for the next player.
  const lockedUntil = useRef(0);
  useEffect(() => { setTarget(""); setWinners([]); setEditing(false); }, [hand]);
  useEffect(() => {
    const dock = dockRef.current;
    if (!dock) return;
    const measure = () => setDockHeight(dock.getBoundingClientRect().height);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(dock);
    return () => observer.disconnect();
  }, []);

  const name = (initial: string) => players.find((p) => p.initial === initial)?.name ?? initial;
  const live = livePlayers(hand);
  const finished = readyToSettle(hand);
  const actor = hand.pending[0];
  const due = amountToCall(hand);
  const parsed = parseMoney(target);
  const minTarget = minimumTarget(hand);
  const quickStep = Math.max(hand.minRaise, hand.openingBet);
  const quickAmounts = [minTarget, minTarget + quickStep, minTarget + 2 * quickStep].filter((n) => n <= maxTarget);
  const validTarget = parsed !== null && cents(parsed) >= minTarget;
  const chosen = live.length === 1 ? live : winners.filter((p) => live.includes(p));
  const result = finished && chosen.length ? settleHand(hand, chosen) : null;
  const scores = result ? computeRoundScores(result, 0) : null;
  const pot = Object.values(hand.contributions).reduce((sum, n) => sum + n, 0);
  const settledPot = result ? Object.values(result.contributions).reduce((sum, n) => sum + cents(n), 0) : pot;
  const betLabel = hand.currentBet ? "Raise" : "Bet";

  const commit = (change: () => boolean) => {
    if (Date.now() < lockedUntil.current) return;
    try {
      if (change()) lockedUntil.current = Date.now() + 300;
    } catch (error) { toast.error((error as Error).message); }
  };
  const action = (kind: ActionKind) => commit(() =>
    onChange(act(hand, kind, parsed === null ? undefined : cents(parsed))));
  const openBet = () => {
    setTarget(String(money(minTarget)).replace(".", ","));
    setReplaceDigits(true);
    setEditing(true);
  };
  const digit = (key: string) => {
    const current = replaceDigits ? "" : target;
    const next = key === "," ? current.includes(",") ? current : `${current || "0"},`
      : current === "0" ? key : current + key;
    if (/^\d{0,7}(,\d{0,2})?$/.test(next)) {
      setTarget(next);
      setReplaceDigits(false);
    }
  };
  const backspace = () => { setTarget(target.slice(0, -1)); setReplaceDigits(false); };

  return (
    <div style={{ paddingBottom: dockHeight + 16 }}>
      <section className="mb-4 rounded-2xl border border-primary/30 bg-card p-4">
        <div className="flex items-center justify-between gap-2">
          <div><p className="text-xs uppercase tracking-widest text-muted-foreground">Pot</p><p className="text-3xl font-extrabold text-primary" aria-label="Pot curent">{formatMoney(money(pot))}</p></div>
          <div className="min-w-0 text-right text-sm"><p>Dealer: <b>{name(hand.dealer)}</b></p>{hand.small && <p>SB: <b>{name(hand.small)}</b></p>}{hand.big && <p>BB: <b>{name(hand.big)}</b></p>}</div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">Începe pre-flop: {name(hand.first)}</p>
        <div className="mt-4 flex gap-1">{STREETS.map((street) => <span key={street} className={`flex-1 rounded-lg px-1 py-2 text-center text-xs font-semibold ${hand.street === street ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>{street}</span>)}</div>
      </section>

      <div className="mb-4 space-y-2" aria-label="Contribuțiile jucătorilor">
        {hand.participants.map((p) => <div key={p} className={`flex items-center justify-between gap-2 rounded-xl border px-3 py-3 ${p === actor ? "border-primary bg-primary/10" : "border-border bg-card"} ${hand.folded.includes(p) ? "opacity-50" : ""}`}>
          <div className="min-w-0"><p className="break-words font-semibold">{p} · {name(p)} <span className="text-xs text-accent">{p === hand.dealer ? "D " : ""}{p === hand.small ? "SB " : ""}{p === hand.big ? "BB" : ""}</span></p><p className="text-xs text-muted-foreground">{hand.folded.includes(p) ? "Fold" : p === actor ? "La rând" : "În mână"} · Etapa: {formatMoney(money(hand.streetBets[p]))}</p></div>
          <span className="shrink-0 font-bold">{formatMoney(money(hand.contributions[p]))}</span>
        </div>)}
      </div>

      {finished && <section className="mb-4 rounded-2xl border border-accent/40 bg-card p-4">
        <h2 className="font-bold">{live.length === 1 ? `${name(live[0])} câștigă — ceilalți au dat Fold` : "Cine a câștigat la masă?"}</h2>
        {live.length > 1 && <p className="mt-1 text-xs text-muted-foreground">Selectează câștigătorii în panoul de jos, conform cărților de la masă.</p>}
        {scores && <div className="mt-4 space-y-2"><p className="text-sm">Pot de împărțit: <b>{formatMoney(money(settledPot))}</b></p>{pot !== settledPot && <p className="text-xs text-muted-foreground">Pariu neacoperit restituit: {formatMoney(money(pot - settledPot))}.</p>}{hand.participants.map((p) => <div key={p} className="flex justify-between gap-2 text-sm"><span>{name(p)}</span><b className={scores[p] >= 0 ? "text-success" : "text-loss"}>{scores[p] > 0 ? "+" : ""}{formatMoney(scores[p])}</b></div>)}</div>}
      </section>}

      <details className="rounded-2xl border border-border bg-card p-4">
        <summary className="min-h-8 cursor-pointer text-sm font-semibold">Acțiunile mâinii ({hand.actions.length})</summary>
        <ol className="mt-3 space-y-2 text-xs text-muted-foreground">{hand.actions.map((a, i) => <li key={i}>{a.street} · {describeAction(a)}</li>)}</ol>
        <button onClick={onCancel} className={`${button} mt-3 w-full text-sm text-loss`}>Anulează mâna în desfășurare</button>
      </details>

      <div ref={dockRef} className="betting-dock" role="region" aria-label="Comenzi de joc">
        <div className="mb-3 flex min-w-0 items-start justify-between gap-3">
          <div className="min-w-0" aria-live="polite" aria-atomic="true">
            <p className="truncate text-lg font-bold" title={actor ? name(actor) : undefined}>{finished ? "Rezultatul mâinii" : actor ? `La rând: ${actor} · ${name(actor)}` : `${hand.street} încheiat`}</p>
            <p className="text-xs text-muted-foreground">{finished ? live.length > 1 ? "Atinge câștigătorii; mai mulți pentru split" : `Câștigă ${name(live[0])}` : actor ? due ? `Call: mai pui ${formatMoney(money(due))}` : "Check: fără bani în plus" : "Întoarceți cărțile, apoi continuați"}</p>
          </div>
          <span className="shrink-0 text-sm font-semibold text-primary">Pot {formatMoney(money(pot))}</span>
        </div>
        {finished && live.length > 1 && <div className="mb-3 grid max-h-36 grid-cols-2 gap-2 overflow-y-auto" aria-label="Câștigători">{live.map((p) => <button key={p} aria-pressed={chosen.includes(p)} onClick={() => setWinners(winners.includes(p) ? winners.filter((w) => w !== p) : [...winners, p])} className={cn(button, "break-words", chosen.includes(p) && "bg-primary text-primary-foreground")}>{p} · {name(p)}</button>)}</div>}
        <div className="grid grid-cols-2 gap-2">
          <button disabled={!canUndo} onClick={() => commit(onUndo)} className={`${button} flex items-center justify-center gap-2 text-sm`}><RotateCcw className="h-4 w-4" />Anulează</button>
          {actor && !finished && <button disabled={minTarget > maxTarget} onClick={openBet} className={`${button} border border-primary text-primary`}>{betLabel}…</button>}
          {actor && !finished ? <>
            <button onClick={() => action("fold")} className={`${button} min-h-14 text-loss`}>Fold</button>
            <button onClick={() => action(due ? "call" : "check")} className={cn(button, "min-h-14 bg-primary text-primary-foreground")}>{due ? `Call +${formatMoney(money(due))}` : "Check"}</button>
          </> : <button disabled={finished && !result} onClick={() => commit(() => finished ? result ? onSave(result) : false : onChange(nextStreet(hand)))} className={cn(button, "min-h-14 bg-primary text-primary-foreground")}>
            {finished ? "Salvează mâna" : `Continuă cu ${STREETS[STREETS.indexOf(hand.street) + 1]}`}
          </button>}
        </div>
      </div>

      <Dialog open={editing} onOpenChange={setEditing}>
        <DialogContent className="betting-sheet gap-3 p-4" onOpenAutoFocus={(event) => { event.preventDefault(); amountRef.current?.focus(); }}>
          <DialogTitle className="pr-8">{betLabel} · {name(actor)}</DialogTitle>
          <DialogDescription>{hand.currentBet ? "Totalul tău în această etapă. Aplicația adaugă doar diferența." : "Alege suma pe care o pui în această etapă."}</DialogDescription>
          <div className="flex items-center gap-2">
            <label htmlFor="bet-target" className="sr-only">{hand.currentBet ? "Raise până la" : "Suma Bet"}</label>
            <input ref={amountRef} id="bet-target" value={target} readOnly inputMode="none" aria-describedby="bet-hint" onKeyDown={(event) => {
              if (/^\d$/.test(event.key) || event.key === "," || event.key === ".") { event.preventDefault(); digit(event.key === "." ? "," : event.key); }
              else if (event.key === "Backspace") { event.preventDefault(); backspace(); }
              else if (event.key === "Enter" && validTarget) { event.preventDefault(); action(hand.currentBet ? "raise" : "bet"); }
            }} className="min-w-0 flex-1 rounded-xl border border-border bg-secondary px-3 py-2 text-2xl font-bold outline-none focus:border-primary" />
            <button onClick={() => { setTarget(""); setReplaceDigits(false); }} className={`${button} text-sm`}>Șterge</button>
          </div>
          <p id="bet-hint" className={`text-sm ${target && !validTarget ? "text-loss" : "text-muted-foreground"}`}>
            {validTarget ? `Mai pui +${formatMoney(money(cents(parsed) - hand.streetBets[actor]))}` : `Minim ${formatMoney(money(minTarget))}; maxim 1.000.000.`}
          </p>
          <div className="grid grid-cols-3 gap-2" aria-label="Sume rapide">{quickAmounts.map((amount) => <button key={amount} onClick={() => { setTarget(String(money(amount)).replace(".", ",")); setReplaceDigits(true); }} className={`${button} border border-border text-sm`}>{formatMoney(money(amount))}</button>)}</div>
          <div className="betting-keypad grid grid-cols-3 gap-2" role="group" aria-label="Tastatură numerică">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0"].map((key) => <button key={key} aria-label={key === "," ? "Virgulă" : key} onClick={() => digit(key)} className={`${button} text-xl`}>{key}</button>)}
            <button aria-label="Șterge ultima cifră" onClick={backspace} className={`${button} flex items-center justify-center`}><Delete className="h-5 w-5" /></button>
          </div>
          <div className="grid grid-cols-[1fr_2fr] gap-2">
            <DialogClose asChild><button className={button}>Înapoi</button></DialogClose>
            <button disabled={!validTarget} onClick={() => action(hand.currentBet ? "raise" : "bet")} className={cn(button, "min-h-14 bg-primary text-primary-foreground")}>Confirmă {betLabel}{validTarget ? ` ${formatMoney(parsed)}` : ""}</button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
