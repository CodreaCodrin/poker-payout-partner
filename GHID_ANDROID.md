# Cum generezi APK-ul PokerPay pe Windows, de la zero

Acesta este ghidul pentru tine, ca să instalezi Android Studio, să construiești aplicația din proiectul existent și să obții un fișier APK pe care îl instalezi pe telefon. Nu trebuie să scrii cod și nu trebuie să creezi un proiect Android nou.

Parcurge pașii în ordine. După fiecare comandă așteaptă să se termine; dacă apare o eroare, rezolv-o înainte de pasul următor. Prima pregătire descarcă dependențe de pe internet.

## 1. Instalează Android Studio

1. Deschide [pagina oficială Android Studio](https://developer.android.com/studio).
2. Descarcă versiunea **stabilă pentru Windows**, instalatorul `.exe`. Proiectul folosește Capacitor 8, care cere Android Studio **2025.2.1 sau mai nou**.
3. Deschide instalatorul. Apasă **Next**, păstrează Android Studio selectat, continuă cu **Next → Install → Finish**. Emulatorul Android este opțional; pentru generarea unui APK și instalarea lui pe telefon nu ai nevoie de el.
4. La prima pornire, dacă te întreabă despre importul setărilor vechi și nu ai unele pe care vrei să le păstrezi, alege **Do not import settings**.
5. Urmează **Setup Wizard**. Alege **Standard**, păstrează locația propusă pentru Android SDK, acceptă licențele și apasă **Finish**.
6. Așteaptă să termine descărcările. Nu crea un proiect nou când ajungi la ecranul de întâmpinare.

Nu ai nevoie de cont Google, de Play Console sau de publicarea aplicației pentru a obține APK-ul.

## 2. Instalează SDK-ul folosit de acest proiect

1. Din ecranul de întâmpinare, intră în **More Actions → SDK Manager**. Dacă ai deja un proiect deschis, folosește **Tools → SDK Manager**.
2. În fila **SDK Platforms**, bifează **Android 16 / API 36**. Numărul **36** contează: acesta este SDK-ul cu care compilează proiectul.
3. În fila **SDK Tools**, bifează:
   - **Android SDK Build-Tools**; cu **Show Package Details** poți selecta seria **36.0.x**;
   - **Android SDK Platform-Tools**;
   - **Android SDK Command-line Tools (latest)**.
4. Apasă **Apply → OK**, acceptă licențele și așteaptă instalarea.
5. Notează locația afișată la **Android SDK Location**. De regulă este în folderul tău de utilizator, sub `AppData\Local\Android\Sdk`.

Telefonul nu trebuie să aibă Android 16: proiectul are minimum Android 7 / API 24. Pe telefoanele vechi trebuie să fie actualizat și Android System WebView.

## 3. Instalează Node.js

Interfața aplicației este făcută cu React. Înainte de build-ul Android trebuie construită această interfață.

1. Intră pe [nodejs.org](https://nodejs.org/en/download).
2. Instalează o versiune **LTS**, minimum **22**, folosind instalatorul Windows `.msi`.
3. Păstrează opțiunile implicite, inclusiv **npm** și adăugarea în **PATH**. Instrumentele suplimentare pentru compilarea modulelor native nu sunt necesare pentru pașii obișnuiți de aici.
4. Închide și redeschide ferestrele PowerShell deja deschise.

Deschide PowerShell și rulează:

```powershell
node --version
npm.cmd --version
```

Prima comandă trebuie să afișeze `v22...` sau o versiune ulterioară; a doua afișează versiunea npm. În ghid folosim `npm.cmd` pentru a evita blocarea scriptului `npm.ps1` de către PowerShell.

## 4. Deschide folderul corect și instalează dependențele

Folderul proiectului tău este:

```text
C:\Alpine Studio\Projects\poker-payout-partner
```

Deschide acest folder în File Explorer, scrie `powershell` în bara de adresă și apasă Enter. Sau deschide PowerShell din Start și rulează:

```powershell
Set-Location 'C:\Alpine Studio\Projects\poker-payout-partner'
Get-Item package.json
npm.cmd ci
```

Dacă ai mutat proiectul, înlocuiește doar calea din `Set-Location`. `Get-Item` trebuie să găsească `package.json`: acesta confirmă că ești în rădăcina proiectului, nu în subfolderul `android`.

`npm ci` instalează versiunile din `package-lock.json`, care a fost actualizat. Așteaptă să reapară promptul PowerShell fără `npm error`. Mesajele `warn` nu înseamnă automat că instalarea a eșuat. Dacă modifici ulterior lista de dependențe din `package.json`, folosește atunci `npm.cmd install` pentru actualizarea lockfile-ului.

## 5. Verifică aplicația și pregătește fișierele pentru Android

Din aceeași fereastră, în rădăcina proiectului:

```powershell
npm.cmd test
npm.cmd run android:sync
```

Prima comandă trebuie să termine testele cu succes. A doua construiește interfața web în `dist` și rulează Capacitor, care o copiază în proiectul Android. La final trebuie să vezi că build-ul și sincronizarea au reușit.

**Repetă `npm.cmd run android:sync` după fiecare modificare de cod înainte de a genera un APK nou.** Android Studio nu reconstruiește singur interfața React.

Opțional, poți vedea interfața în browser cu:

```powershell
npm.cmd run dev
```

Deschide adresa afișată, de obicei `http://localhost:8080`. Oprești serverul cu **Ctrl+C**. Datele introduse în browser nu se transferă automat în APK.

## 6. Deschide proiectul existent în Android Studio

După succesul sincronizării, rulează din rădăcina proiectului:

```powershell
npm.cmd run android:open
```

Dacă Android Studio nu se deschide automat:

1. Pornește Android Studio.
2. Alege **Open**.
3. Selectează exact acest folder:

```text
C:\Alpine Studio\Projects\poker-payout-partner\android
```

4. Confirmă deschiderea; dacă apare întrebarea de încredere pentru propriul proiect, alege **Trust Project**.
5. Așteaptă **Gradle Sync** și descărcările. Prima sincronizare poate dura câteva minute. Dacă apare o solicitare de instalare a unui SDK necesar, accept-o.

Proiectul are deja platforma Android. Nu folosi **New Project**, `cap init` sau `cap add android`.

## 7. Verifică JDK-ul pentru Gradle

Proiectul compilează cod Java 21. Android Studio include un JDK, dar verifică ce folosește Gradle:

1. Intră în **File → Settings → Build, Execution, Deployment → Build Tools → Gradle**.
2. La **Gradle JDK**, selectează un **JDK 21**. Dacă JDK-ul inclus are versiunea 21, îl poți folosi.
3. Dacă nu ai unul, folosește **Download JDK**, selectează **Version 21**, păstrează un furnizor disponibil și descarcă-l.
4. Apasă **Apply → OK** și apoi **File → Sync Project with Gradle Files**.

Proiectul folosește Gradle **8.14.3** și Android Gradle Plugin **8.13.0**. Păstrează versiunile din proiect pentru acest build; nu este necesar să accepți o migrare AGP sugerată de IDE.

## 8. Generează APK-ul

**Pentru versiunea ta de utilizare, mergi direct la secțiunea 11: APK release semnat.** Pașii de mai jos sunt doar alternativa debug pentru testare.

În interfața nouă Android Studio, meniurile pot fi ascunse în butonul **☰ din stânga sus**. Nu există neapărat un buton numit „Create APK”. Cu **Ctrl+Shift+A** cauți direct acțiunile, fără să depinzi de poziția meniurilor.

Pentru primul APK de test pe telefon, folosește varianta **debug**:

1. Deschide **View → Tool Windows → Build Variants**. Pentru modulul `app`, alege **debug**, dacă nu este deja selectat.
2. În meniul **Build**, caută **Generate App Bundles or APKs → Generate APKs**. În alte versiuni de Studio apare **Build Bundle(s) / APK(s) → Build APK(s)**. Dacă nu găsești meniul, apasă **Ctrl+Shift+A** și caută `Generate APKs` sau `Build APK`.
3. Așteaptă mesajul că build-ul s-a încheiat cu succes. Dacă apare o eroare, deschide panoul **Build** și citește primul mesaj de eroare relevant.
4. Apasă **locate** în notificarea de succes. APK-ul standard este aici:

```text
C:\Alpine Studio\Projects\poker-payout-partner\android\app\build\outputs\apk\debug\app-debug.apk
```

Acesta este fișierul pe care îl copiezi pe telefon. Nu ai nevoie să copiezi `dist`, proiectul sau folderul `android` pe telefon.

### Alternativă dacă nu găsești opțiunea din meniu

Poți folosi **Gradle Tool Window**: **View → Tool Windows → Gradle**, apoi **Execute Gradle Task**, și rulează `:app:assembleDebug`.

Poți construi și din terminalul Android Studio:

```powershell
Set-Location 'C:\Alpine Studio\Projects\poker-payout-partner\android'
.\gradlew.bat assembleDebug
```

Trebuie să apară **BUILD SUCCESSFUL**. Fișierul rezultat este același `app-debug.apk`. Terminalul poate folosi alt Java decât setarea **Gradle JDK** a IDE-ului: dacă primești o eroare despre Java, folosește meniul Build / fereastra Gradle sau configurează `JAVA_HOME` către JDK 21 înainte de comanda din terminal.

## 9. Copiază și instalează APK-ul pe telefon

1. Conectează telefonul prin USB și alege pe telefon **File transfer / Transfer de fișiere**.
2. În File Explorer, copiază `app-debug.apk` în folderul **Download** al telefonului.
3. Pe telefon deschide **Files / Fișiere**, apoi **Download**, și atinge APK-ul.
4. Dacă Android cere permisiunea **Install unknown apps / Instalare aplicații necunoscute**, permite instalarea pentru aplicația **Files** cu care ai deschis APK-ul, apoi revino la instalare.
5. Apasă **Install / Instalează**, apoi **Open / Deschide**. Aplicația apare ca **PokerPay**.

Pentru această metodă nu ai nevoie de USB debugging. Dacă vrei ulterior instalare direct din butonul **Run** al IDE-ului, atunci activezi **Developer options → USB debugging**, accepți autorizarea PC-ului pe telefon și selectezi telefonul în Android Studio.

Aplicația poate fi folosită offline. Internetul este necesar pentru descărcarea instrumentelor și a dependențelor la pregătire, nu pentru pariuri în timpul sesiunii.

## 10. Dacă ai deja o versiune instalată

Actualizarea trebuie să păstreze identificatorul **com.example.app** și **aceeași cheie de semnare** ca APK-ul instalat. Versiunea curentă din proiect este `versionCode 3`, `versionName "1.2"`.

- Dacă aplicația veche era debug, noul APK debug trebuie semnat cu același debug keystore. Acesta este de regulă `%USERPROFILE%\.android\debug.keystore`. Reinstalarea Android Studio nu îl șterge de obicei; schimbarea PC-ului sau pierderea cheii poate împiedica actualizarea.
- Dacă aplicația veche era release, folosește cheia și aliasul originale la generarea unui APK release, conform secțiunii următoare.
- Dacă apare **App not installed / Package conflicts**, verifică semnătura și versiunea înainte de a dezinstala aplicația. Dezinstalarea șterge istoricul și jocul activ de pe telefon. O instalare compatibilă peste aplicația existentă păstrează de regulă datele.

## 11. APK release semnat — varianta pentru folosirea ta pe termen lung

APK-ul debug este suficient pentru prima verificare. Pentru o cheie pe care să o păstrezi și să o refolosești la actualizări:

1. Apasă **Ctrl+Shift+A**, scrie **Generate Signed** și selectează **Generate Signed App Bundle or APK…**, apoi Enter. Alternativ: **☰ → Build → Generate Signed App Bundle or APK**.
2. Selectează **APK**, apoi **Next**.
3. Dacă ai deja cheia cu care este semnată aplicația instalată, selecteaz-o cu **Choose existing** și introdu aliasul și parolele ei.
4. Dacă este prima ta versiune release, apasă **Create new**. Alege locația unui fișier `.jks`, o parolă, un alias precum `pokerpay`, parola cheii și completează datele cerute. Folosește o valabilitate de cel puțin 25 de ani.
5. Păstrează fișierul `.jks`, aliasul și parolele într-un loc sigur, cu o copie de rezervă. Nu le adăuga în Git.
6. Alege varianta **release**, finalizează asistentul și așteaptă succesul build-ului.
7. Folosește **locate** pentru calea exactă a APK-ului semnat; asistentul poate folosi un folder diferit de cel pentru debug.

Un APK release semnat cu o cheie nouă nu se instalează peste un APK debug cu altă semnătură. La fiecare versiune viitoare, crește `versionCode` în `android/app/build.gradle`, refolosește aceeași cheie release și repetă sincronizarea înainte de build.

**Doar selectarea `release` în Build Variants nu generează și nu semnează APK-ul.** Asistentul de mai sus trebuie parcurs până la final. Comanda `assembleRelease` din proiectul actual, fără o configurare de semnare, produce un APK nesemnat; nu este un înlocuitor pentru asistentul de semnare.

## 12. Cum introduci ușor pariurile cu o singură mână

La joc nou alegi blind-urile, valorile, jucătorii în ordinea mesei și primul dealer. Ante este o intrare fixă pe mână, separată de blind-uri; lasă 0 dacă nu o folosiți.

- **Call / Check**: un singur tap pe butonul mare din dreapta jos. Call adaugă automat diferența, nu tot pariul din nou.
- **Fold**: un tap în stânga jos. O atingere dublă accidentală nu execută imediat și acțiunea următorului jucător.
- **Bet / Raise**: deschide panoul de sume. Valoarea minimă validă este deja completată. Poți confirma direct, selecta o sumă rapidă sau introduce suma pe tastatura mare din aplicație.
- Prima cifră introdusă înlocuiește suma propusă. Ai virgulă pentru bani, ștergerea ultimei cifre și **Șterge** pentru golirea câmpului. Tastatura telefonului nu acoperă butoanele de joc.
- La **Raise** suma este **totalul tău în etapa curentă**. Mesajul **Mai pui +…** arată exact cât se adaugă. Exemplu: ai pus 5, alegi Raise până la 30; mai plătești 25.
- **Anulează** revine la acțiunea precedentă, inclusiv înaintea schimbării unei etape.
- **Continuă cu Flop / Turn / River**, selectarea câștigătorilor, salvarea și pornirea următoarei mâini sunt în panoul de jos. La split selectezi mai mulți câștigători.
- Dealerul și blind-urile se rotesc automat. Fiecare acțiune acceptată este salvată local; după redeschidere alegi **Continuă jocul**.

Aplicația urmărește pariurile fără cărți virtuale sau stive individuale. **All-in și poturile secundare nu sunt implementate.** Sumele au maximum două zecimale. Salvările APK-ului sunt separate de cele din browser.

## 13. Verifică prima instalare înaintea unei sesiuni reale

Fă o sesiune scurtă de probă pe telefon:

1. Doi jucători, SB 5, BB 10, ante 0. Dealerul trebuie să fie și SB, iar Call-ul lui să fie **+5**.
2. Call, apoi Check din BB; continuă cu Flop. BB trebuie să înceapă după flop.
3. Bet 20, apoi Fold de la celălalt: câștigătorul trebuie identificat automat. Diferența neacoperită a pariului se restituie la calculul rezultatului.
4. Salvează mâna și verifică rotația dealerului la următoarea.
5. Începe alta, introdu o acțiune, închide aplicația și redeschide-o: jocul trebuie să se reia cu aceleași sume și același jucător la rând. Încearcă și **Anulează**.
6. Finalizează sesiunea și verifică **History**. Verifică și o mână cu trei jucători și split.
7. Cu telefonul într-o mână, verifică accesul la Call, Fold, sumele rapide și confirmare, inclusiv cu navigarea Android prin gesturi sau trei butoane. Panoul nu trebuie să intre sub bara sistemului.

Build-ul web, testele și sincronizarea Capacitor au fost executate în mediul de dezvoltare. Verificările în browser includ fluxul de joc și dimensiuni de telefon. După instalarea Android Studio a fost confirmată și sincronizarea Gradle, iar asistentul APK release a fost deschis până la alegerea cheii de semnare. **Generarea APK-ului semnat și folosirea pe un telefon Android fizic rămân de verificat.** Pașii de mai sus verifică partea specifică telefonului tău.

## 14. După o modificare ulterioară: pașii scurți

Din rădăcina proiectului:

```powershell
Set-Location 'C:\Alpine Studio\Projects\poker-payout-partner'
npm.cmd ci
npm.cmd test
npm.cmd run android:sync
npm.cmd run android:open
```

`npm ci` este necesar la prima pregătire sau când se schimbă dependențele. Apoi, în Android Studio, generezi APK-ul prin meniul Build și îl instalezi. Pentru actualizare păstrezi cheia de semnare și crești codul versiunii.

## 15. Probleme frecvente

| Ce apare | Ce faci |
| --- | --- |
| `node` / `npm` nu este recunoscut | Instalează Node LTS cu PATH, apoi redeschide PowerShell. |
| `npm.ps1 cannot be loaded` | Folosește `npm.cmd`, ca în ghid. Nu este nevoie să schimbi politica PowerShell. |
| `npm ci` spune că lockfile-ul nu corespunde | Dacă ai schimbat `package.json`, rulează `npm.cmd install`, apoi păstrează `package-lock.json` actualizat. |
| `ENOTFOUND registry.npmjs.org` | Verifică internetul, DNS-ul și proxy-ul din mediul în care rulezi npm. Este o problemă de descărcare, nu de reguli de poker. |
| `SDK location not found` | Deschide folderul `android` în Studio, configurează SDK Manager și repetă Gradle Sync. `android/local.properties` este specific PC-ului; nu copia calea altcuiva. |
| `invalid source release: 21` / Java incompatibil | Alege JDK 21 la Gradle JDK. Dacă rulezi din terminal, verifică și Java folosit acolo. |
| Lipsește `android-36` | Instalează Android SDK Platform 36 din SDK Manager. |
| Licențe SDK neacceptate | Redeschide SDK Manager, finalizează instalările și acceptă licențele. |
| Lipsește `capacitor-cordova-android-plugins` | Rulează `npm.cmd ci`, apoi `npm.cmd run android:sync` din rădăcina proiectului. |
| Meniul de APK este indisponibil | Așteaptă Gradle Sync, verifică erorile din Build și că ai deschis subfolderul `android`. |
| APK-ul arată interfața veche | Rulează din nou `npm.cmd run android:sync`, reconstruiește APK-ul și verifică că ai copiat fișierul nou. |
| `App not installed` / conflict de pachet | Verifică identificatorul, semnătura și versionCode; vezi secțiunea 10. |
| `INSTALL_FAILED_TEST_ONLY` | Generează APK-ul prin Build APKs sau `assembleDebug`; pentru fișierul de copiat folosește APK-ul generat astfel. |

## Documentația oficială folosită

- [Instalarea Android Studio pe Windows](https://developer.android.com/studio/install)
- [Cerințele Capacitor 8: Node și Android Studio](https://capacitorjs.com/docs/getting-started/environment-setup)
- [Capacitor: build și sincronizare](https://capacitorjs.com/docs/basics/workflow)
- [Capacitor Android: deschiderea proiectului](https://capacitorjs.com/docs/android)
- [Android: build și rulare în Studio](https://developer.android.com/studio/run)
- [Android: generarea unui APK debug cu Gradle](https://developer.android.com/build/building-cmdline)
- [Android: semnarea aplicației](https://developer.android.com/studio/publish/app-signing)
