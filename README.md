# Mare aplicatie de joci Poker la nivel inalt

Caini adevarati nu javre

## Folosire și APK Android

- [Ghid pas cu pas: instalarea Android Studio, build și instalarea APK-ului pe telefon](GHID_ANDROID.md)
- [Structura aplicației, calculul plăților și modificările introduse](ANALIZA_PROIECT.md)

Pentru dezvoltare: `npm ci`, apoi `npm run dev`.

Pentru pregătirea APK-ului: `npm run android:sync`, apoi `npm run android:open` și construirea APK-ului în Android Studio. Lockfile-ul este actualizat; instalarea inițială se poate face cu `npm ci`.

Comenzile de joc sunt fixate în partea de jos pentru folosire cu o singură mână. Call/Check și Fold cer un tap; Bet/Raise au sume rapide și tastatură numerică în aplicație. All-in și poturile secundare nu sunt gestionate.

<img width="320" height="180" alt="image" src="https://github.com/user-attachments/assets/3a61bec6-51a1-4809-be77-865b681ae155" />
