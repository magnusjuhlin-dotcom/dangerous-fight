# Dangerous Fight – Slingshot Arena

Ett 1-mot-1 neon-samurajspel för webb och Android. Dra i din samuraj för att dasha, skjut svärdsvågor och riv motståndarens torn innan tiden tar slut – mot datorn eller online.

---

## Så spelar du

### Målet
Två torn: ditt längst ner, motståndarens längst upp. **Den som förstör det andra tornet vinner.** Om ingen hinner på 4 minuter vinner den vars torn tagit minst skada (vid lika: den vars samuraj tagit minst skada).

### Styrning
| Handling | Telefon | Dator |
|---|---|---|
| Dash / svärdshugg | Dra i samurajen (eller var som helst på nedre halvan) som en slangbella och släpp | Samma med musen, eller **WASD / piltangenter** |
| Skjuta svärdsvåg | Knappen **SVÄRDSVÅG ⚡** uppe till höger | Samma knapp |

**Handkontroll (Xbox / valfri standard-kontroll):** vänster spak – tryck åt det håll du vill dasha och släpp (A dashar direkt), **X / RT** skjuter, **Y** läser upp skärmen. I menyer: styrkors/spak flyttar fokusringen, **A** väljer, **B** går tillbaka.

- Ju längre du drar, desto hårdare far du iväg. Krockar du med motståndaren i hög fart gör du **hugg-skada**.
- Rammar du tornet i fart gör du **stor tornskada** (men tar 30 själv).
- **Energi:** stå stilla i din laddzon (nedersta delen av planen) så laddas upp till 3 laddningar. Varje skott kostar en.
- **Parera:** dashar du snabbt in i ett fiendeskott studsar det tillbaka på motståndaren.

### Arenan
- **Lavan** i mitten bränner 25 HP/s – ta dig igenom snabbt.
- **Portarna** vid kanterna är enkelriktade: vänster sida släpper bara igenom **uppåt**, höger bara **nedåt**.
- Dör din samuraj respawnar den efter 3 sekunder vid ditt torn.

### Spela på Xbox
Spelet körs i **Microsoft Edge på Xbox** (inget att installera):
1. Öppna Edge på konsolen och gå till **https://magnusjuhlin-dotcom.github.io/dangerous-fight/** (publiceras automatiskt av `.github/workflows/pages.yml` vid push till `main`).
2. Tryck på valfri knapp på handkontrollen – en grön fokusring visas och spelet styrs helt med kontrollen (se ovan). Lägg gärna sidan som favorit.
3. Tips: tryck på **View**-knappen i Edge för helskärm. Online-läget fungerar som vanligt, så du kan möta en telefon eller dator.

### Spellägen
- **Spela mot datorn** – välj en tillfällig **Cyber-Perk** före striden. Varannan match är en **Shogun-boss** (större, hårdare, ger mer credits).
- **Spela online** – du matchas automatiskt mot nästa spelare som söker. Vill du möta en kompis: **Spela med kompis (kod)** → skapa rum och dela den 4-siffriga koden, eller anslut med en kod.

### Butiker (Credits ⚡ tjänas per match)
- **Samurai-dojo** – välj samuraj: Cyber Ronin (balanserad), Armored Shogun (tung, 150 HP, hårda rammar), Shadow Ninja (snabb, 70 HP).
- **Svärdsvåg-butik** – köp tekniker (plasma, dubbel, trio, hagel, sniper, bakåt). **Max 2 aktiva samtidigt**, båda avfyras vid varje skott.
- **Uppgraderingar** – torn-pansar, snabbladdning, credits-bonus. Ingen övre nivå, priset stiger ~35 % per nivå.

### Poängtavla
Topp-10 matcher sparas lokalt. Hamnar du på **pallplats (topp 3)** får du skriva ditt namn direkt på resultatskärmen.

---

## Så kör du projektet

Spelet är ren HTML/JS utan ramverk. Källkoden ligger i `src/`, och `node build.js` slår ihop allt till `src/bundle.js` och kopierar till Android-projektet.

### Krav
- Node.js 20+ (för bygget och dev-servern)
- För Android: Android Studio (SDK + dess inbyggda JDK 17) och en telefon med USB-felsökning

### Kör i webbläsaren
```bash
npx --yes serve -l 5173 .
```
Öppna <http://localhost:5173>. (Samma konfiguration finns i `.claude/launch.json`.)

> Online-läget går via `wss://itty.ws` och kräver internet. Testa två spelare genom att öppna sidan i två fönster/flikar som båda är synliga – bakgrundsflikar pausar spelloopen.

### Bygg efter ändringar i `src/`
```bash
node build.js
```
Skapar `src/bundle.js`, kopierar `index.html`, `style.css`, `src/` och `assets/` till `android/app/src/main/assets/`. Bumpa gärna `?v=NN` på bundle-scriptet i `index.html` så telefonen inte cachar gammal kod.

### Bygg och installera på telefonen (debug-APK)
Gradle behöver JDK 17 – använd Android Studios inbyggda (`JAVA_HOME` på datorn pekar annars på Java 8).

```bash
cd android && JAVA_HOME="/c/Program Files/Android/Android Studio/jbr" ./gradlew assembleDebug
```

```bash
"$LOCALAPPDATA/Android/Sdk/platform-tools/adb.exe" install -r android/app/build/outputs/apk/debug/app-debug.apk
```

Första gången: godkänn "Tillåt USB-felsökning?" på telefonen (`adb devices` ska visa `device`, inte `unauthorized`).

### Release-APK/AAB
GitHub-workflowen `.github/workflows/android-release.yml` bygger signerad release-APK och AAB vid varje push till `main` (eller manuellt via *Run workflow*). Artefakterna laddas ner från workflow-körningen.

### Felsöka på telefonen
WebView-debugging är på i appen. Öppna `chrome://inspect` i Chrome på datorn med telefonen ansluten för konsol och DevTools mot spelet. I konsolen finns spelobjektet som `game` (t.ex. `game.gameState`, `game.player.hp`).

### Filstruktur
```
index.html / style.css      Skärmar och HUD
src/game.js                 Spelloop, fysik, kollisioner, nätverk & matchmaking
src/player.js, enemy.js     Spelaren och motståndaren/AI (även replika online)
src/canvas.js               Rendering, arenagolv, neon-effekter
src/particles.js, audio.js  Partiklar och procedurellt ljud
src/ui.js, upgrades.js      Menyer, butiker, sparfil (localStorage), poängtavla
build.js                    Bundler + kopiering till Android
android/                    Android-appen (WebView-skal)
```

---

## Så fungerar spelet under huven

### Ett spelobjekt, en loop
`src/game.js` skapar `Game`, som äger allt: `player`, `enemy`, tornen, projektiler, partiklar, ljud, UI och nätverk. Loopen är `requestAnimationFrame` → `update(dt)` → `draw()`. `dt` är millisekunder sedan förra bilden (max 100 ms) och all fysik skalas med `dt`, så spelet går lika fort oavsett bildfrekvens. Under en *hit-stop* (25–50 ms frys vid träff) hoppas `update` över helt – det är därför träffar känns tunga.

### Fysik och kollisioner
`updatePhysics` / `checkCollisions` i `game.js`.
- Samurajerna är cirklar med hastighet och friktion: `x += vx·dt`, `v *= friktion^(dt/16)`.
- Krock mellan dem är en elastisk stöt med massa. Dashar någon snabbare än 0,08 px/ms i krocken blir det huggskada (`ramDamage · 0,5`).
- Torn är rektangulära zoner längst upp/ner. Ett skott gör teknikens `damageTower`, en ram gör samurajens `ramDamage` – en ram per anfall (cooldown), annars skulle bossens ragdoll registrera en ny ram varje bild.
- Projektiler studsar mot väggar men träffar aldrig den som sköt dem eller skyttens eget torn. Ett parerat skott byter ägare.
- Lavan är ett band i mitten (±25 px) som drar HP per ms och bromsar. Portarna (x < 80 / x > w−80) blockerar bara fel riktning.

### Spelaren (`src/player.js`)
Tre profiler (Ronin / Shogun / Ninja) med radie, massa, bas-HP, ramskada och fartfaktor. Släppt drag ger hastigheten `−drag · 0,12 · fartfaktor`. Energi laddas när man står stilla i nedre zonen (1,5 s per laddning, snabbare med Snabbladdning). `shoot()` avfyrar alla aktiva tekniker (max 2) från samurajens position. Död → 3 s respawn vid tornet.

### Datorn (`src/enemy.js`)
Samma fysik, styrd av en tillståndsmaskin som fattar beslut var 0,8–1,8 s: ladda i zonen om energin är slut, annars 60 % chans att skjuta mot spelarens x, annars dash mot spelaren eller tornet. Var annan match (`matchCount % 2 === 0`) blir den en **Shogun-boss**: en ragdoll av sex noder (torso, huvud, händer, fötter) med avståndsvillkor, 500 HP, dubbla skott, 1,35× kraft och torn i hörnen. Online används samma klass som *replika* av motståndaren – då körs ingen AI och `takeDamage` visar bara effekter.

### Online (`setupMultiplayerHost/Client`, `handleIncomingPacket`)
Ingen serverlogik – två webbläsare pratar via en reläkanal på `wss://itty.ws/c/dangerousfight-<kod>`.
- **Symmetrisk auktoritet:** var och en äger sin egen samuraj och sitt eget torn. Du räknar din egen skada från de speglade skott/rammar du ser och skickar ~30 ggr/s (`sync`): position, fart, HP/maxHP, död/levande och ditt torns HP.
- Motståndaren på din skärm är en ren replika av det paketet, spegelvänd (`w − x`, `h − y`) eftersom båda ser sig själva längst ner. Egna skott skickas som `projectile_fired` och spawnas speglade hos motståndaren.
- Den vars torn faller skickar `match_end`; värden äger klockan och dömer vid timeout. Omstart kräver `restart_request` från båda.
- **Matchmaking** (`startQuickMatch`): alla som söker sitter i kanalen `dangerousfight-lobby` och skickar `seek` varje sekund. Lägst id blir värd, skapar en rumskod och skickar `match`; motparten svarar `match_ack`, båda lämnar lobbyn och möts i rummet – samma flöde som med kod.

### Rendering (`src/canvas.js`)
Stengolvet genereras en gång per skärmstorlek till en cachad off-screen-canvas (`initStoneArena`: plattor, mossa, sprickor, gravyrer, väggar) och blittas varje bild. Ovanpå ritas lavan (`drawLavaBarrier`: strömmande band med rullande dash-offset, additiva hetfläckar, drivande obsidianplattor, strandkant, värmedaller), portar, partiklar, samurajer (procedurella vektorfigurer med efterbild) och torn. Skärmskak, blixtar och golvpulser sköts av `CanvasController`.

### Ljud, sparfil och UI
- `src/audio.js`: helt procedurellt ljud med Web Audio-oscillatorer – inga ljudfiler.
- `src/upgrades.js`: sparfilen i `localStorage` (`dangerous_fight_save_v1`): credits, upplåsta/utrustade samurajer och tekniker, uppgraderingsnivåer (utan tak, pris × 1,35 per nivå), topplista och pallplats-namn. `normalizeCannons()` städar gamla sparfiler så max 2 tekniker är aktiva.
- `src/ui.js`: visar en skärm i taget (`showScreen`), uppdaterar HUD:en varje bild och renderar butiker, perkval, poängtavla och pallplats-formuläret.
- `build.js` slår ihop `src/*.js` (import/export strippas) till `src/bundle.js` och kopierar in allt i Android-appen, som bara är ett WebView-skal (`MainActivity.kt`) runt samma HTML.
