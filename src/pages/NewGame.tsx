import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Trash2, Play, ArrowUp, ArrowDown } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/poker/AppShell";
import { Game, loadActiveGame, storeActiveGame } from "@/lib/poker";
import { BlindMode, parseMoney } from "@/lib/betting";

const inputClass = "min-w-0 w-full rounded-xl border border-border bg-secondary px-3 py-3 outline-none focus:border-primary";

const NewGame = () => {
  const navigate = useNavigate();
  const [ante, setAnte] = useState("0");
  const [blindMode, setBlindMode] = useState<BlindMode>("both");
  const [small, setSmall] = useState("5");
  const [big, setBig] = useState("10");
  const [dealerIndex, setDealerIndex] = useState(0);
  const [rows, setRows] = useState([{ name: "", initial: "" }, { name: "", initial: "" }]);
  const initials = rows.map((r) => r.initial.trim().toUpperCase());
  const duplicates = initials.filter((p, i) => p && initials.indexOf(p) !== i);
  const anteValue = parseMoney(ante);
  const smallValue = parseMoney(small);
  const bigValue = parseMoney(big);
  const valid = rows.length >= 2 && rows.every((r) => r.name.trim() && /^[A-Z]$/.test(r.initial)) && !duplicates.length &&
    anteValue !== null && (blindMode === "none" || bigValue !== null && bigValue > 0) &&
    (blindMode !== "both" || smallValue !== null && smallValue > 0 && smallValue < bigValue);

  const update = (index: number, patch: Partial<(typeof rows)[number]>) =>
    setRows(rows.map((row, i) => i === index ? { ...row, ...patch } : row));
  const move = (index: number, direction: number) => {
    const next = [...rows];
    [next[index], next[index + direction]] = [next[index + direction], next[index]];
    setRows(next);
    if (dealerIndex === index) setDealerIndex(index + direction);
    else if (dealerIndex === index + direction) setDealerIndex(index);
  };
  const remove = (index: number) => {
    setRows(rows.filter((_, i) => i !== index));
    setDealerIndex(dealerIndex === index ? 0 : dealerIndex > index ? dealerIndex - 1 : dealerIndex);
  };

  const start = () => {
    if (!valid) return;
    try {
      if (loadActiveGame()) {
        toast.error("Există deja un joc activ. Finalizează-l înainte de a începe altul.");
        navigate("/game");
        return;
      }
      const game: Game = {
        id: crypto.randomUUID(), date: Date.now(), buyIn: anteValue,
        players: rows.map((r) => ({ name: r.name.trim(), initial: r.initial })), rounds: [],
        betting: { blindMode, smallBlind: blindMode === "both" ? smallValue : 0,
          bigBlind: blindMode === "none" ? 0 : bigValue, firstDealer: initials[dealerIndex] },
      };
      storeActiveGame(game);
      navigate("/game");
    } catch {
      toast.error("Jocul nu a putut fi salvat. Verifică spațiul disponibil și accesul la stocare.");
    }
  };

  return (
    <AppShell>
      <PageHeader title="Joc nou" subtitle="Așază jucătorii în ordinea de la masă" right={<Link to="/" aria-label="Înapoi" className="p-2"><ArrowLeft /></Link>} />
      <p className="mb-4 text-sm text-muted-foreground">Urmărește pariurile și plățile, cu cărțile la masa reală. All-in și poturile secundare nu sunt gestionate.</p>
      <section className="mb-6 space-y-4 rounded-2xl border border-border bg-card p-4">
        <label className="block text-sm font-semibold">Cum jucați blind-urile?
          <select aria-label="Blind-uri" value={blindMode} onChange={(e) => setBlindMode(e.target.value as BlindMode)} className={`${inputClass} mt-2`}>
            <option value="both">Small blind + Big blind</option>
            <option value="big">Doar Big blind</option>
            <option value="none">Fără blind-uri</option>
          </select>
        </label>
        <div className="grid grid-cols-2 gap-3">
          {blindMode === "both" && <label className="text-sm">Small blind
            <input aria-label="Small blind" inputMode="decimal" value={small} onChange={(e) => setSmall(e.target.value)} className={`${inputClass} mt-1`} />
          </label>}
          {blindMode !== "none" && <label className="text-sm">Big blind
            <input aria-label="Big blind" inputMode="decimal" value={big} onChange={(e) => setBig(e.target.value)} className={`${inputClass} mt-1`} />
          </label>}
        </div>
        {blindMode === "both" && !(smallValue > 0 && bigValue > smallValue) && <p className="text-sm text-loss">Small blind trebuie să fie pozitiv și mai mic decât Big blind.</p>}
        <label className="block text-sm">Ante / intrare fixă pe mână (opțional)
          <input aria-label="Ante" inputMode="decimal" value={ante} onChange={(e) => setAnte(e.target.value)} className={`${inputClass} mt-1`} />
        </label>
        <p className="text-xs text-muted-foreground">Ante se adaugă pentru fiecare jucător, separat de blind-uri. Lasă 0 dacă plătiți doar blind-urile. Sumele acceptă cel mult două zecimale.</p>
      </section>
      <div className="mb-3 text-sm text-muted-foreground">Ordinea este în sensul acelor de ceasornic. Folosește săgețile pentru a schimba locurile.</div>
      <div className="space-y-3">
        {rows.map((row, i) => (
          <section key={i} className="rounded-2xl border border-border bg-card p-3">
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{i + 1}</span>
              <input aria-label={`Inițiala jucătorului ${i + 1}`} value={row.initial} onChange={(e) => update(i, { initial: e.target.value.slice(0, 1).toUpperCase() })} maxLength={1} placeholder="A" className="h-12 w-12 shrink-0 rounded-xl border border-border bg-secondary text-center text-xl font-bold" />
              <input aria-label={`Numele jucătorului ${i + 1}`} value={row.name} onChange={(e) => update(i, { name: e.target.value })} placeholder="Nume" className={inputClass} />
              <button aria-label={`Elimină jucătorul ${i + 1}`} disabled={rows.length <= 2} onClick={() => remove(i)} className="shrink-0 p-2 text-muted-foreground disabled:opacity-30"><Trash2 className="h-4 w-4" /></button>
            </div>
            <div className="mt-2 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-sm"><input type="radio" name="dealer" checked={dealerIndex === i} onChange={() => setDealerIndex(i)} />Primul dealer</label>
              <div className="flex gap-2">
                <button aria-label={`Mută jucătorul ${i + 1} în sus`} disabled={i === 0} onClick={() => move(i, -1)} className="rounded-lg bg-secondary p-2 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                <button aria-label={`Mută jucătorul ${i + 1} în jos`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className="rounded-lg bg-secondary p-2 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
              </div>
            </div>
          </section>
        ))}
      </div>
      {duplicates.length > 0 && <p className="mt-2 text-sm text-loss">Inițialele trebuie să fie unice (A–Z).</p>}
      <button onClick={() => setRows([...rows, { name: "", initial: "" }])} disabled={rows.length >= 26} className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border py-3 disabled:opacity-30"><Plus className="h-4 w-4" />Adaugă jucător</button>
      <button onClick={start} disabled={!valid} className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-lg font-bold text-primary-foreground disabled:opacity-40"><Play className="h-5 w-5" />Începe jocul</button>
    </AppShell>
  );
};

export default NewGame;
