# Cum funcționează Poker Pot / PokerPay

## Structură

Este o aplicație React 18 + TypeScript, generată inițial cu Lovable. Vite construiește fișierele web; Tailwind și componentele shadcn/Radix realizează interfața. Capacitor 8 împachetează interfața într-un WebView Android. `MainActivity.java` doar extinde `BridgeActivity`: regulile de joc nu sunt scrise în Java.

Nu există un backend, autentificare, bază de date externă sau sincronizare între dispozitive. React Query este montat în aplicație, dar paginile jocului nu fac cereri de date. APK-ul include fișierele din `dist` și poate urmări jocul offline după instalare.

| Fișier | Rol |
| --- | --- |
| `src/main.tsx`, `src/App.tsx` | Pornirea React, provider-ele și rutele `/`, `/new`, `/game`, `/history`. |
| `src/pages/Index.tsx` | Acasă, acces la joc nou/reluare și istoric. |
| `src/pages/NewGame.tsx` | Configurarea mesei, a ante-ului, blind-urilor și primului dealer. |
| `src/pages/ActiveGame.tsx` | Coordonarea sesiunii: participanți, salvare, Undo, scor și finalizare. |
| `src/components/poker/BettingHand.tsx` | Interfața unei mâini: poziții, pot, acțiuni, etape și alegerea câștigătorilor. |
| `src/lib/betting.ts` | Motorul de pariere: ordinea, blind-urile, validarea, închiderea etapelor și restituirea pariului neacoperit. |
| `src/lib/poker.ts` | Modelele de date, calculul rezultatelor și totalurilor, salvările și textul istoricului. |
| `src/pages/History.tsx` | Sesiunile încheiate, scorurile și jurnalul mâinilor. |
| `src/components/poker/AppShell.tsx`, `src/index.css` | Aspectul verde/auriu, lățimea pentru mobil și spațiile pentru marginile ecranului. |
| `src/components/ui/` | Componente generice shadcn, majoritatea fără reguli specifice jocului. |
| `capacitor.config.ts` | Numele Android PokerPay, identificatorul `com.example.app`, directorul web `dist`. |
| `android/` | Proiectul Gradle, manifestul, pictogramele și ambalajul Android. |

## Comportamentul inițial

La început se introduceau un „Buy-in” pozitiv și jucători cu inițiale unice. Pentru fiecare rundă se selectau participanții, se scriau inițialele câștigătorilor și sumele suplimentare pierdute de ceilalți.

Calculul inițial era: fiecare pierzător datorează `buyIn + extras`; suma pierderilor se împarte egal între câștigători. Nu se urmărea contribuția câștigătorilor, deoarece se calcula direct câștigul net din pierderile celorlalți. Modelul nu descria străzile sau acțiunile unei mâini reale.

Istoricul folosea `localStorage` cu cheia `poker-pot.history.v1`. Jocul activ era în `sessionStorage` cu cheia `poker-pot.active`, iar formularele mâinii curente existau doar în memorie. Închiderea procesului putea pierde sesiunea/acțiunile neconfirmate. Textul afișat în History era o serializare, nu un fișier exportat separat.

## Comportamentul nou

O sesiune are opțional `betting`, cu modul de blind, valorile și primul dealer. Ordinea din `players` reprezintă locurile de la masă. Participanții pot fi schimbați între mâini, iar pozițiile sunt calculate din ordinea locurilor, nu din ordinea apăsării butoanelor.

O mână în desfășurare este în `game.draft`: starea curentă și instantaneele pentru Undo. Starea conține contribuțiile totale, pariurile etapei, jucătorii care au dat Fold, coada de acțiune, pariul curent, mărirea minimă și jurnalul. Acțiunile valide produc o stare nouă; nu modifică starea precedentă.

Un Raise redeschide acțiunea pentru ceilalți jucători rămași. Call adaugă doar diferența. Check este disponibil când diferența este zero. O etapă se încheie când nu mai există răspunsuri în așteptare; dacă rămâne un singur jucător, mâna se încheie imediat. După flop începe primul jucător activ după dealer.

La salvarea mâinii se aleg câștigătorii dintre cei care nu au dat Fold. Din contribuții se restituie diferența unui pariu neacoperit. Rezultatul fiecăruia este `partea primită din pot - contribuția proprie`. Calculele noi folosesc bani întregi intern, iar modelul salvat păstrează sumele în unitatea monetară introdusă. Diferențele de un ban la split sunt atribuite în ordinea mesei.

## Persistență și compatibilitate

- Cheia istoricului rămâne aceeași. Mâinile vechi continuă să folosească formula inițială și formatul text original.
- Mâinile noi au `contributions` și `hand`. Aceste câmpuri permit un calcul bazat pe bani efectiv introduși și afișarea acțiunilor în istoric.
- Jocul activ este acum în `localStorage`, inclusiv mâna și Undo. O salvare veche din `sessionStorage` este preluată la reluare.
- Un joc vechi activ continuă fără blind-uri, cu vechiul Buy-in ca intrare fixă. Pentru configurarea blind-urilor se începe o sesiune nouă după finalizarea celei vechi.
- Salvarea în istoric elimină draft-ul și înlocuiește intrarea cu același ID pentru a evita duplicatele la o reîncercare.
- O eroare de scriere este afișată; interfața nu avansează ca și cum salvarea ar fi reușit.
- Datele rămân locale. Nu există backup/export/import automat sau sincronizare între APK și browser.

## Android și build

Modificările de joc sunt în React/TypeScript. Pentru APK trebuie întâi construit web-ul, apoi rulat Capacitor sync, apoi build-ul Gradle. Scriptul `npm run android:sync` combină primele două etape; `npm run android:open` deschide proiectul Android.

Configurația existentă folosește SDK 36, minimum SDK 24, AGP 8.13.0, Gradle 8.14.3 și Java 21. Versiunea aplicației a crescut la 1.1/cod 2, cu același identificator. Pentru actualizarea unei instalări existente contează și păstrarea semnăturii APK.

Fișierul `package-lock.json` a fost actualizat printr-o instalare reușită. Instalarea reproductibilă se face cu `npm ci`. Nu au fost adăugate dependențe de runtime pentru mecanismul de pariere sau tastatura numerică.

## Introducerea pariurilor cu o singură mână

Panoul de acțiuni rămâne fixat jos, independent de numărul jucătorilor sau derularea paginii. Call/Check și Fold au butoane de minimum 56 px; Undo și Bet/Raise au minimum 48 px. Un interval de protecție de 300 ms împiedică atingerea dublă să execute o acțiune pentru următorul jucător. Undo permite corectarea unei acțiuni acceptate.

Bet/Raise deschide un dialog la baza ecranului, cu suma minimă validă deja completată, trei sume rapide și tastatură numerică proprie. Prima cifră înlocuiește sugestia; sunt acceptate două zecimale. Dialogul arată separat suma suplimentară efectiv plătită. O eroare de salvare păstrează dialogul deschis, pentru reîncercare.

Alegerea câștigătorilor, split-ul, trecerea la următoarea etapă, salvarea și începerea următoarei mâini sunt accesibile tot de jos. Înălțimea panoului este măsurată pentru a rezerva spațiu în pagină; sunt luate în calcul și marginile de siguranță ale telefonului. Pe ecrane scurte tastatura poate fi derulată, iar confirmarea rămâne în panou.

## Limite și verificare

Nu există cărți virtuale sau evaluarea mâinilor. Stivele, All-in și poturile secundare nu sunt implementate. Nu se pot edita mâinile deja salvate din interfață, iar ștergerea istoricului unei sesiuni rămâne operația existentă. Nu a fost adăugat un cronometru.

Au trecut 22 de teste Vitest: 14 pentru logica și salvarea jocurilor, 7 pentru interfața de pariere și testul inițial al proiectului. Build-ul Vite, verificarea TypeScript și sincronizarea Capacitor Android au reușit. ESLint nu raportează erori; există avertismente Fast Refresh în componentele UI existente.

În Chrome cu emulare de telefon au fost parcurse configurarea, o mână încheiată prin Fold, o mână până la River cu split, rotația dealerului, Undo, reluarea după reîncărcare și finalizarea în istoric. Layoutul a fost verificat la lățimi de 320, 360, 390 și 412 px și în orientare peisaj. Testele de browser nu înlocuiesc verificarea pe dispozitiv: build-ul Gradle și un APK pe telefon Android fizic nu au fost executate, deoarece Android Studio/SDK nu sunt instalate aici. Pașii compleți pentru generare și verificare pe telefon sunt în [GHID_ANDROID.md](GHID_ANDROID.md).
