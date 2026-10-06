# Dangerous Fight – Slingshot Arena

Ett neon-samurajspel för webb och Android, 1v1 eller i lag upp till 4 mot 4. Dra i din samuraj för att dasha, skjut svärdsvågor och riv motståndarnas torn innan tiden tar slut – mot datorn eller online.

---

## Så spelar du

### Målet
Två torn: ditt längst ner, motståndarens längst upp. **Den som förstör det andra tornet vinner.** Om ingen hinner på 4 minuter vinner den vars torn tagit minst skada (vid lika: den vars samuraj tagit minst skada).

### Styrning
| Handling | Telefon | Dator |
|---|---|---|
| Dash / svärdshugg | Svep var som helst på skärmen åt det håll du vill åka | Samma med musen, eller **WASD / piltangenter** |
| Skjuta svärdsvåg | Knappen **SVÄRDSVÅG ⚡** nere till höger | Samma knapp |
| Samurajraseri | Knappen **RASERI** när mätaren lyser (matcher mot datorn) | Samma knapp |
| Paus | **⏸** uppe till vänster (matcher mot datorn) | Samma knapp |

**Handkontroll (Xbox / valfri standard-kontroll):** vänster spak – tryck åt det håll du vill dasha och släpp (A dashar direkt), **X / RT** skjuter, **Y** läser upp skärmen. I menyer: styrkors/spak flyttar fokusringen, **A** väljer, **B** går tillbaka.

- Ju längre du drar, desto hårdare far du iväg. Krockar du med motståndaren i hög fart gör du **hugg-skada**.
- Rammar du tornet i fart gör du **stor tornskada** (men tar 30 själv).
- **Energi:** stå stilla i din laddzon (nedersta delen av planen) så laddas upp till 3 laddningar. Varje skott kostar en.
- **Parera:** dashar du snabbt in i ett fiendeskott studsar det tillbaka på motståndaren.
- **Kombo:** träffar i snabb följd ger "COMBO x2, x3…" och bonuspoäng.
- **Samurajraseri:** mätaren fylls när du slår ut, rammar, parerar och träffar. Full mätare → tryck **RASERI**: tolv svärdsvågor åt alla håll och dubbel skada i 6 sekunder.
- När ett torn faller spelas matchens sista ögonblick i slowmotion innan resultatet visas.
- Första matchen mot datorn visar korta tips steg för steg.

### Arenan
- **Lavan** i mitten bränner 25 HP/s – ta dig igenom snabbt.
- **Portarna** vid kanterna är enkelriktade: vänster sida släpper bara igenom **uppåt**, höger bara **nedåt**.
- Dör din samuraj respawnar den efter 3 sekunder vid ditt torn.

### Levlar (1–1000)
Var 50:e våg mot datorn byter du level (våg 1–50 = level 1, 51–100 = level 2 … max level 1000). Huvudmenyn visar t.ex. **LEVEL 3 · VÅG 12 AV 50**, och när du når en ny level kommer rutan **NY LEVEL!**. Varje level har ett eget stengolv, och ju högre level desto tuffare:
- **Datorn:** tänker snabbare, dashar hårdare, missar mer sällan och får mer HP (samuraj och torn, upp till ×2,2).
- **Stenpelare (level 2+):** man studsar på dem och svärdsvågor krossas mot dem.
- **Eldhål (level 4+):** glöder först, sen sprutar de eld som bränner den som står där – oftare och hetare för varje level.
- **Rullande stenblock (level 7+):** rullar fram och tillbaka och kör över den som kommer i vägen.

Hindren står spegelvänt på båda halvorna så det är lika svårt för båda. Levlar gäller bara mot datorn – online, lagmatch och 2 spelare körs alltid på en tom arena.

### Spela på Xbox
Spelet körs i **Microsoft Edge på Xbox** (inget att installera):
1. Öppna Edge på konsolen och gå till **https://magnusjuhlin-dotcom.github.io/dangerous-fight/** (publiceras automatiskt av `.github/workflows/pages.yml` vid push till `main`).
2. Tryck på valfri knapp på handkontrollen – en grön fokusring visas och spelet styrs helt med kontrollen (se ovan). Lägg gärna sidan som favorit.
3. Tips: tryck på **View**-knappen i Edge för helskärm. Online-läget fungerar som vanligt, så du kan möta en telefon eller dator.

### Spellägen
- **Spela mot datorn** – välj svårighet (Lätt/Normal/Svår) och en tillfällig **Cyber-Perk** före striden. Varannan match är en **Shogun-boss** (större, hårdare, ger mer credits). Under halva livet blir bossen **rasande**: den glöder rött, blir snabbare och slår i marken med en tryckvåg som skadar och knuffar undan alla i närheten.
- **2 spelare** – två kompisar på samma telefon. Lägg telefonen mellan er: spelare 1 sveper på nedre halvan, spelare 2 på övre halvan, och var och en har sin egen SVÄRDSVÅG-knapp. Ingen poäng eller credits sparas.
- **Spela online** – du matchas automatiskt mot nästa spelare som söker. Vill du möta en kompis: **Spela med kompis (kod)** → skapa rum och dela den 4-siffriga koden, eller anslut med en kod.
- **Lagmatch 2v2 – 4v4** – välj lagstorlek först, sedan hur ni spelar:
  - **Spela online** – du hamnar i det gemensamma rummet för den lagstorleken. Alla som söker samtidigt delas upp i två lag, och tomma platser fylls av datorn efter tio sekunder.
  - **Med kompisar (kod)** – du skapar ett rum och dina kompisar ansluter med koden. De hamnar i **ditt** lag, så ni kan möta datorn tillsammans. Du startar matchen när ni är klara.
  - **Mot datorn** – hela laguppställningen styrs av datorn utom du.

  Ju större lag, desto större spelplan: 3v3 och 4v4 zoomar ut arenan (ca 1,3× respektive 1,6× så stor) så alla får plats. Varje lag delar på ett torn, och den som skapade matchen håller matchklockan och båda tornens liv så att skada bara räknas en gång.

  **Lagfärger:** det ena laget är grönt, det andra rött. När matchen börjar står det **DU ÄR GRÖN** eller **DU ÄR RÖD** på skärmen, och HUD:en visar vilket lag tornen tillhör. Färgen hör till laget och inte till skärmhalvan, så alla i matchen menar samma sak med "de gröna" – även om var och en ser sitt eget lag nederst.

### Menyn
Huvudmenyn är fyra små rutor: **SPELA**, **ARENA**, **BUTIKER** och **MER**. Svep åt sidan (eller tryck på prickarna längst ner) för att bläddra mellan sidorna. **⚙** uppe till vänster öppnar inställningarna: volym för musik och ljudeffekter, röst av/på, vibration av/på, svårighetsgrad (Lätt/Normal/Svår, också valbar före varje match mot datorn) och språk (svenska/engelska). **TRAILER 🎬** spelar en 40 sekunders trailer av spelet.

- **Rang:** varje match ger XP (vinst 100, boss 200, förlust 40, K.O. 20). Rangen och titeln (Lärling → Krigare → Samuraj → Mästare → Shogun) syns under level-raden i huvudmenyn, och varje ny rang ger ⚡.
- **Uppdrag:** tre nya uppdrag varje dag (vinn matcher, besegra bossen, parera, ramma…). Klara uppdrag hämtas för ⚡.
- **Dagens gåva:** första gången spelet öppnas varje dag – större ju fler dagar i rad (25 → 100 ⚡).

### Butiker (Credits ⚡ tjänas per match)
- **Samurai-dojo** – välj samuraj: Cyber Ronin (balanserad), Armored Shogun (tung, 150 HP, hårda rammar), Shadow Ninja (snabb, 70 HP), Oni Berserker (600 ⚡: 130 HP, brutala hugg och rammar, lite långsammare).
- **Svärdsvåg-butik** – köp tekniker (plasma, dubbel, trio, hagel, sniper, bakåt). **Max 2 aktiva samtidigt**, båda avfyras vid varje skott.
- **Uppgraderingar** – torn-pansar, snabbladdning, credits-bonus. Ingen övre nivå, priset stiger ~35 % per nivå.
- **Extra samuraj** – köp en lagkamrat (Cyber Ronin 400, Shadow Ninja 500, Armored Shogun 700 ⚡). Den valda hoppar in i ditt lag vid halva tiden och en till med 20 sekunder kvar (matcher mot datorn).
- **Samuraj-butik 💰** – Credits för riktiga pengar via Google Play (se nedan).
- **Hjälpmedel 🧰** – hjälpmedel för riktiga pengar via Google Play: 🛡️ Tornsköld (tornet tar ingen skada i 30 s, 3 st 10 kr), ⚡ Full energi (börja med 3 svärdsvågor, 5 st 10 kr), 🔥 Raseri direkt (full RASERI-mätare från start, 3 st 15 kr), ❤️ Snabb återuppståndelse (tillbaka efter 1 s i stället för 3, 5 st 10 kr) och 🧰 Mega-paket (5 av varje, 39 kr). Slå på dem på perk-skärmen före en match mot datorn – varje hjälpmedel räcker en match. Går inte att använda online.
- **Fusk 😈** – fusk för riktiga pengar via Google Play, köps en gång och är ditt för alltid: 👑 Gudsläge (ingen skada), 🏰 Odödligt torn, ♾️ Oändlig energi, 💥 Superskada (3× skada), 🐌 Seg dator, 💨 Superfart (50 % snabbare dash), 🎯 Målsökande svärdsvågor, 🔥 Evigt raseri, 🧊 Fryst dator (står still de första 15 s), 🥾 Lavaskor (gå genom lavan) och 💰 Dubbla credits – 20 kr styck eller 😈 Allt fusk för 99 kr (får även alla fusk som kommer senare). Slå på och av fusket på perk-skärmen före en match mot datorn (valet sparas). Fungerar aldrig online, i lagmatch eller med 2 spelare.

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

### Samuraj-butik (köp Credits för riktiga pengar)
Köpen går via Google Play Billing i Android-appen (`src/store.js` + `AndroidBilling` i `MainActivity.kt`). På webben och Xbox visas butiken, men den kan inte sälja något. För att öppna den behöver en vuxen:
1. Skapa ett konto i [Google Play Console](https://play.google.com/console) (engångsavgift) och en betalningsprofil (bankuppgifter).
2. Lägga upp appen (`com.leanic.dangerousfight`) med en signerad AAB, minst på ett internt testspår.
3. Under *Monetisera → Produkter i appen* skapa engångsprodukter (förbrukningsbara) och aktivera dem: `credits_100` (10 kr), `credits_300` (30 kr), `credits_2100` (70 kr), och för Hjälpmedel-butiken `helper_shield_3` (10 kr), `helper_energy_5` (10 kr), `helper_rage_3` (15 kr), `helper_revive_5` (10 kr), `helper_mega` (39 kr), och för Fusk-butiken `cheat_god`, `cheat_tower`, `cheat_energy`, `cheat_damage`, `cheat_slow`, `cheat_speed`, `cheat_homing`, `cheat_rage`, `cheat_freeze`, `cheat_lava`, `cheat_credits` (20 kr styck) och `cheat_all` (99 kr). Fusket förbrukas aldrig – appen bekräftar (acknowledge) köpet så att det finns kvar för alltid, även om appen installeras om.
4. Lägga till sig själv som licenstestare för att prova köp utan att betala på riktigt.

Credits ges bara för köp som Google Play rapporterar som betalda, och aldrig två gånger för samma köp. Köpen kontrolleras inte mot en egen server, och Credits sparas i telefonen.

### Spela in egen röst
Öppna `voice-studio.html` (t.ex. http://localhost:5173/voice-studio.html), spela in varje replik och spara filerna i `assets/voice/`. Kör sedan `node build.js`. En inspelning används alltid före datorrösten: `intro`/`intro-boss` före matchen, `lurvig-kanin` ("Vilken lurvig kanin, va?") efter varje match, och en skärms id (t.ex. `main-menu`) när man trycker 🔊 där. Skärmar utan inspelning läses av datorrösten.

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
GitHub-workflowen `.github/workflows/android-release.yml` bygger en signerad AAB vid varje push till `main` (eller manuellt via *Run workflow*) och laddar upp den till Google Play, spåret **internal** som standard. Inga APK-filer byggs och inget sparas som artefakt. Vid manuell körning kan man välja spår (internal/alpha/beta/production) och status (`draft` behövs så länge appen aldrig har publicerats). Pull requests bygger bara. `versionCode` är workflowens körnummer, så varje uppladdning får ett högre nummer.

Secrets som behövs i repot: `KEYSTORE_BASE64`, `KEYSTORE_PASSWORD`, `KEY_ALIAS`, `KEY_PASSWORD` (uppladdningsnyckeln) och `ANDROID_SERVICE_ACCOUNT_JSON` (JSON-nyckeln för tjänstekontot `play-store-deployer@omega-clarity-504511-b8.iam.gserviceaccount.com`, som måste ha behörighet till appen `com.leanic.dangerousfight` i Play Console under *Användare och behörigheter*). Den allra första AAB:n för en ny app måste laddas upp för hand i Play Console; därefter sköter workflowen resten.

### Butikssidan på Google Play
Texter och bilder till *Standardbutiksuppgifter* ligger i `fastlane/metadata/android/` – `sv-SE/` och `en-US/` med `title.txt` (max 30 tecken), `short_description.txt` (max 80), `full_description.txt` (max 4000) och `images/` (`icon.png` 512×512, `featureGraphic.png` 1024×500 och `phoneScreenshots/` 1080×1920). Skärmbilderna är tagna ur spelet i telefonformat.

### Integritetspolicy
`privacy.html` (svenska och engelska) publiceras med GitHub Pages på https://magnusjuhlin-dotcom.github.io/dangerous-fight/privacy.html – den adressen anges i Play Console under *Appens innehåll → Integritetspolicy*. Uppdatera sidan om spelet börjar samla in eller dela nya uppgifter.

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
src/levels.js               Levlar: hinder (pelare, eldhål, stenblock) och tuffare dator
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

### Lagmatcher (2v2 – 4v4)
Arenan har upp till fyra platser per lag. Din samuraj är alltid `player`; varje extra plats är en `Enemy` med `side` (`bottom` = ditt lag, `top` = motståndarlaget), som antingen styrs av datorn (`aiControlled`) eller är en kopia av en nätverksspelare (`isRemote`). Samma AI-kod spelar åt båda hållen – `side` avgör var laddzonen ligger, vilket torn den rammar och åt vilket håll den skjuter. Större lag zoomar ut kameran (`canvasCtrl.worldScale`), vilket gör världen större i spelkoordinater utan att fönstret ändras.

Online sitter alla i samma rumskanal. Den som skapade matchen är värd och äger laguppställningen, matchklockan, båda tornen och alla datorstyrda samurajer; varje människa äger sin egen samuraj och rapporterar position och HP. Positionerna skickas i ett delat koordinatsystem (lag A nederst), så ett lag B-ombud speglar dem både när det skickar och tar emot – därför ser båda lagen alltid sig själva nederst. Tornskada som någon annan än värden åstadkommer skickas som `towerhit` och räknas bara av värden, så den aldrig dubbelräknas.

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
