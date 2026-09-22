/* DANGEROUS FIGHT - MAIN CORE GAME LOOP & SYSTEM ORCHESTRATOR */

import { CanvasController } from './canvas.js';
import { AudioSynth } from './audio.js';
import { InputController } from './input.js';
import { UpgradeManager } from './upgrades.js';
import { UIController } from './ui.js';
import { Player } from './player.js';
import { Enemy } from './enemy.js';
import { ParticleSystem } from './particles.js';

class Game {
    constructor() {
        // Initialize core engines
        this.canvasCtrl = new CanvasController('game-canvas');
        this.audioSynth = new AudioSynth();
        this.inputCtrl = new InputController(this.canvasCtrl.canvas);
        this.upgradeMgr = new UpgradeManager();
        this.uiCtrl = new UIController();
        this.particles = new ParticleSystem();
        
        // Symmetrical Towers setup
        this.topTower = { hp: 500, maxHp: 500 };
        this.bottomTower = { hp: 500, maxHp: 500 };

        // Entities
        this.player = new Player(this.canvasCtrl.width / 2, this.canvasCtrl.height - 120, this);
        this.enemy = new Enemy(this.canvasCtrl.width / 2, 120, this);
        this.projectiles = []; // active bouncing bullets
        
        // Gameplay session state variables
        this.gameState = 'menu'; // 'menu', 'multiplayer_select', 'lobby', 'join', 'playing', 'gameover', 'victory'
        this.runCredits = 0;
        this.isHardBossRound = false;
        this.bossWarningTimeout = null;
        this.lastTime = 0;
        this.slowMoTimer = 0;
        this.hitStopTimer = 0; // Hit-stop impact micro freeze
        
        // Multiplayer WebRTC state
        this.isMultiplayer = false;
        this.isClient = false;
        this.peer = null;
        this.conn = null;
        this.roomId = '';
        this.mmWs = null;                   // matchmaking lobby socket
        this.mmId = null;
        this.mmTimers = [];
        this.quickMatch = false;            // true when the room was arranged by matchmaking
        this.remoteProfile = null;          // opponent's vehicle/upgrades from the handshake
        this.restartRequestedLocal = false;
        this.restartRequestedRemote = false;
        this.netSyncAccumulator = 0;
        this.remoteMeleeCooldown = 0;       // debounce replica hits between sync packets
        this.enemyRamCooldown = 0;          // one tower ram per charge (ragdoll nodes would otherwise re-trigger every frame)
        this.playerRamCooldown = 0;

        // Realistic Lava Simulation state
        this.lavaTime = 0;
        this.lastLavaSizzlePlayer = 0;
        this.lastLavaSizzleEnemy = 0;
        this.lavaBubbles = [];
        this.lavaCrustPlates = [];
        const plateCount = 13;
        for (let i = 0; i < plateCount; i++) {
            this.lavaCrustPlates.push({
                // position as a fraction of the river length, so it fits any screen width
                u: (i + Math.random() * 0.6) / plateCount,
                yOffset: (Math.random() - 0.5) * 20,
                // everything drifts with the current (to the right), slow plates lag behind
                vx: Math.random() * 0.02 + 0.014,
                width: Math.random() * 46 + 26,
                height: Math.random() * 16 + 11,
                angle: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.0006,
                points: [
                    { x: -1, y: -0.8 + Math.random() * 0.3 },
                    { x: -0.2 + Math.random() * 0.3, y: -1 },
                    { x: 1, y: -0.6 + Math.random() * 0.3 },
                    { x: 0.8 + Math.random() * 0.3, y: 0.8 },
                    { x: -0.3 + Math.random() * 0.3, y: 1 },
                    { x: -1, y: 0.5 + Math.random() * 0.3 }
                ]
            });
        }
        
        // Roaming white-hot spots inside the lava
        this.lavaHotspots = [];
        for (let i = 0; i < 7; i++) {
            this.lavaHotspots.push({
                u: Math.random(),
                speed: 0.012 + Math.random() * 0.012,
                size: 22 + Math.random() * 20,
                phase: Math.random() * Math.PI * 2
            });
        }

        this.initUIEvents();
        this.initInputEvents();
        
        // Setup initial menu state rendering
        this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
        this.uiCtrl.showScreen('menu');
        
        // Kickoff RAF loop
        requestAnimationFrame((t) => this.loop(t));
    }

    // Bind DOM overlay menu buttons
    initUIEvents() {
        // Single Player vs AI
        document.getElementById('btn-play-ai').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.isMultiplayer = false;
            this.startRun();
        });
        
        // "Spela online" = automatic matchmaking against the next player searching
        document.getElementById('btn-play-online').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.startQuickMatch();
        });

        document.getElementById('btn-mm-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork(); // also drops a half-established room connection
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Play with a friend via room code instead
        document.getElementById('btn-mm-code').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Private-room menu back
        document.getElementById('btn-multi-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Host a room
        document.getElementById('btn-create-room').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.setupMultiplayerHost();
        });

        // Cancel Host lobby
        document.getElementById('btn-lobby-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Join room menu
        document.getElementById('btn-join-room-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            document.getElementById('join-status-text').innerText = '';
            document.getElementById('input-room-code').value = '';
            this.uiCtrl.showScreen('join');
        });

        // Join room back
        document.getElementById('btn-join-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Connect to peer code
        document.getElementById('btn-connect-peer').addEventListener('click', () => {
            this.audioSynth.playClick();
            const code = document.getElementById('input-room-code').value.trim();
            if (code.length === 4) {
                this.setupMultiplayerClient(code);
            } else {
                document.getElementById('join-status-text').innerText = 'Ange en 4-siffrig kod!';
            }
        });

        // Garage (Weapons) menu
        document.getElementById('btn-weapons').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
            this.uiCtrl.showScreen('weapons');
        });
        
        document.getElementById('btn-weapons-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Cannons menu
        document.getElementById('btn-cannons').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderCannonShop(this.upgradeMgr, (key) => this.handleCannonArsenal(key), this.audioSynth);
            this.uiCtrl.showScreen('cannons');
        });
        
        document.getElementById('btn-cannons-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Upgrades menu
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderPersistentUpgrades(this.upgradeMgr, (key) => this.handlePersistentUpgrade(key), this.audioSynth);
            this.uiCtrl.showScreen('upgrades');
        });
        
        document.getElementById('btn-upgrades-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Read-aloud speaker: reads every visible text on the current screen
        const speakBtn = document.getElementById('btn-speak');
        if (speakBtn) {
            if (!this.audioSynth.canReadAloud()) speakBtn.classList.add('unavailable');
            speakBtn.addEventListener('click', () => {
                if (speakBtn.classList.contains('speaking')) {
                    this.audioSynth.stopReadAloud();
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                    return;
                }
                const text = this.collectScreenText();
                speakBtn.classList.add('speaking');
                speakBtn.innerText = '⏹';
                const started = this.audioSynth.readAloud(text, () => {
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                });
                if (!started) {
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                }
            });
        }

        // How to play
        document.getElementById('btn-howto').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('howto');
        });
        document.getElementById('btn-howto-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Scoreboard (Poängtavla) menu buttons
        document.getElementById('btn-scoreboard').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderScoreboard(this.upgradeMgr);
            this.uiCtrl.showScreen('scoreboard');
        });

        document.getElementById('btn-scoreboard-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        document.getElementById('btn-reset-scoreboard').addEventListener('click', () => {
            this.audioSynth.playClick();
            if (window.confirm("Är du säker på att du vill nollställa poängtavlan och matchstatistiken?")) {
                this.upgradeMgr.resetScoreboard();
                this.uiCtrl.renderScoreboard(this.upgradeMgr);
            }
        });

        const btnGameOverScoreboard = document.getElementById('btn-gameover-scoreboard');
        if (btnGameOverScoreboard) {
            btnGameOverScoreboard.addEventListener('click', () => {
                this.audioSynth.playClick();
                this.uiCtrl.renderScoreboard(this.upgradeMgr);
                this.uiCtrl.showScreen('scoreboard');
            });
        }

        const btnVictoryScoreboard = document.getElementById('btn-victory-scoreboard');
        if (btnVictoryScoreboard) {
            btnVictoryScoreboard.addEventListener('click', () => {
                this.audioSynth.playClick();
                this.uiCtrl.renderScoreboard(this.upgradeMgr);
                this.uiCtrl.showScreen('scoreboard');
            });
        }
        
        // Game Over screen buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.requestRestart();
        });

        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.resetRestartButtons();
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Victory screen buttons
        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.requestRestart();
        });

        document.getElementById('btn-victory-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.resetRestartButtons();
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Floating shoot button with responsive touchstart and click handling
        const shootBtn = document.getElementById('shoot-btn');
        const triggerShoot = (e) => {
            if (e.cancelable) e.preventDefault();
            this.player.shoot();
        };
        shootBtn.addEventListener('click', triggerShoot);
        shootBtn.addEventListener('touchstart', triggerShoot, { passive: false });
    }

    // Bind dragging slingshot gameplay inputs
    initInputEvents() {
        this.inputCtrl.onDragStart = (x, y, fromGamepad = false) => {
            if (this.gameState !== 'playing') return false;
            if (fromGamepad || this.player.containsPoint(x, y)) {
                return this.player.startDrag();
            }
            return false;
        };

        // Gamepad (Xbox) hooks
        this.inputCtrl.isGameplayActive = () => this.gameState === 'playing';
        this.inputCtrl.onGamepadShoot = () => {
            if (this.gameState === 'playing') this.player.shoot();
        };
        this.inputCtrl.onGamepadSpeak = () => {
            const b = document.getElementById('btn-speak');
            if (b) b.click();
        };
        this.inputCtrl.onGamepadMenu = (action) => this.gamepadMenuNav(action);
        this.inputCtrl.onGamepadConnected = (pad) => this.onGamepadConnected(pad);
        
        this.inputCtrl.onDragMove = (dx, dy) => {
            if (this.gameState !== 'playing') return;
            this.player.dragMove(dx, dy);
        };

        this.inputCtrl.onDragEnd = (dx, dy) => {
            if (this.gameState !== 'playing') return;
            this.player.endDrag();
        };

        // Keyboard Arrow/WASD fallback
        this.inputCtrl.onKeyboardLaunch = (dirX, dirY) => {
            if (this.gameState !== 'playing' || this.player.state === 'dead') return;
            this.player.vx = dirX * 0.45 * this.player.profile.speedMultiplier;
            this.player.vy = dirY * 0.45 * this.player.profile.speedMultiplier;
            this.audioSynth.playSlash(this.player.activeWeaponKey);
        };
    }

    // ------------------------------------------------------------------
    // GAMEPAD MENU NAVIGATION (Xbox controller in Edge, or any standard pad)
    // ------------------------------------------------------------------
    onGamepadConnected(pad) {
        if (this.gamepadAnnounced) return;
        this.gamepadAnnounced = true;
        document.body.classList.add('has-gamepad');
        const hint = document.querySelector('.touch-hint');
        if (hint) hint.innerText = 'Vänster spak: sikta och släpp för att dasha | X / RT: svärdsvåg | Y: läs upp';
        this.showToast('🎮 Handkontroll ansluten – A: välj, B: tillbaka, Y: läs upp');
        this.gamepadMenuNav('focus');
    }

    showToast(text, ms = 4000) {
        let el = document.getElementById('gp-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gp-toast';
            el.className = 'gp-toast';
            document.body.appendChild(el);
        }
        el.innerText = text;
        el.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
    }

    gamepadFocusables(screen) {
        return [...screen.querySelectorAll('button, .weapon-card, input')]
            .filter(el => !el.disabled && !el.closest('.hidden') && el.offsetParent !== null);
    }

    gamepadMenuNav(action) {
        const screen = [...document.querySelectorAll('.overlay-screen')].find(el => !el.classList.contains('hidden'));
        if (!screen) return;
        const items = this.gamepadFocusables(screen);
        if (!items.length) return;

        if (this.gpFocusScreen !== screen.id) {
            this.gpFocusScreen = screen.id;
            this.gpFocusIdx = 0;
        }
        let idx = items.indexOf(this.gpFocusEl);
        if (idx < 0) idx = Math.min(this.gpFocusIdx || 0, items.length - 1);

        if (action === 'up' || action === 'left') {
            idx = (idx - 1 + items.length) % items.length;
        } else if (action === 'down' || action === 'right') {
            idx = (idx + 1) % items.length;
        } else if (action === 'confirm') {
            const el = items[idx];
            if (el.tagName === 'INPUT') el.focus(); // Xbox Edge opens its on-screen keyboard
            else el.click();
            return;
        } else if (action === 'back') {
            const back = items.find(el => /back|menu|tillbaka|avbryt|huvudmeny/i.test(el.id + ' ' + (el.innerText || '')));
            if (back) back.click();
            return;
        }
        this.setGamepadFocus(items[idx], idx);
    }

    setGamepadFocus(el, idx) {
        document.querySelectorAll('.gp-focus').forEach(e => e.classList.remove('gp-focus'));
        el.classList.add('gp-focus');
        this.gpFocusEl = el;
        this.gpFocusIdx = idx;
        try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }

    // Gather all readable text on whatever screen is showing (menus, shops,
    // help, result screens, or the HUD during a match), in reading order.
    collectScreenText() {
        const visible = [...document.querySelectorAll('.overlay-screen')].filter(el => !el.classList.contains('hidden'));
        const hud = document.getElementById('hud');
        const roots = visible.length ? visible : (hud && !hud.classList.contains('hidden') ? [hud] : []);
        const parts = [];
        roots.forEach(root => {
            root.querySelectorAll('h1, h2, h3, p, label, button, li, td, th, .glitch-title, .subtitle, .stat-item, .label, .mini-label, .lobby-status, .status-msg, .high-score-display, .hud-score-item, .match-timer-box, .touch-hint, .upgrade-level, .weapon-cost, .stat-row, .room-code-display, .mm-timer, .podium-title').forEach(el => {
                // skip hidden nodes and things nested inside an element we already took
                if (el.closest('.hidden') || el.offsetParent === null && getComputedStyle(el).position !== 'fixed' && !el.closest('#hud')) return;
                if (el.parentElement && el.parentElement.closest('h1, h2, h3, p, label, button, li, td, th, .stat-item')) return;
                let t = (el.innerText || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                // digits in the room code are read one by one
                if (el.classList.contains('room-code-display') && /^\d{4}$/.test(t)) t = t.split('').join(' ');
                parts.push(t);
            });
        });
        // drop duplicates and make sure each part ends like a sentence
        const seen = new Set();
        const sentences = parts.filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
            .map(t => /[.!?:]$/.test(t) ? t : t + '.');
        // strip emoji/symbols the voice would spell out
        return sentences.join(' ')
            .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ')
            .replace(/[⚡✅◻⏹🔊❔]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // Vehicle equip/unlock shop logic
    handleWeaponArsenal(weaponKey) {
        const state = this.upgradeMgr.state;
        const costs = { katana: 0, blades: 100, hammer: 250 };
        const cost = costs[weaponKey];
        
        if (state.unlockedWeapons[weaponKey]) {
            this.upgradeMgr.equipWeapon(weaponKey);
            this.player.activeWeaponKey = weaponKey;
        } else {
            if (this.upgradeMgr.buyWeapon(weaponKey, cost)) {
                this.player.activeWeaponKey = weaponKey;
                this.audioSynth.playUpgrade();
            }
        }
        this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
    }

    // Cannon equip/unlock shop logic
    handleCannonArsenal(cannonKey) {
        const state = this.upgradeMgr.state;
        const costs = { laser: 0, plasma: 150, rapid: 200, trio: 300, hagel: 350, sniper: 450, bak\u00e5t: 500 };
        const cost = costs[cannonKey] || 0;
        
        if (state.unlockedCannons[cannonKey]) {
            // Toggle active state
            this.upgradeMgr.toggleCannon(cannonKey);
        } else {
            if (this.upgradeMgr.buyCannon(cannonKey, cost)) {
                this.audioSynth.playUpgrade();
            }
        }
        this.uiCtrl.renderCannonShop(this.upgradeMgr, (key) => this.handleCannonArsenal(key), this.audioSynth);
    }

    // Persistent upgrades purchase logic
    handlePersistentUpgrade(upgradeKey) {
        if (this.upgradeMgr.buyUpgrade(upgradeKey)) {
            this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
            this.audioSynth.playUpgrade();
        }
        this.uiCtrl.renderPersistentUpgrades(this.upgradeMgr, (key) => this.handlePersistentUpgrade(key), this.audioSynth);
    }

    // ------------------------------------------------------------------
    // MULTIPLAYER (relayed over itty.ws WebSocket channels)
    //
    // Authority model (symmetric, no host-side simulation of the opponent):
    //  - Each side owns its OWN car (hp, death, energy) and its OWN tower
    //    (bottomTower). Damage to *me* is computed on *my* machine from the
    //    mirrored projectiles / rams I see, and then broadcast in 'sync'.
    //  - The opponent's car and the top tower are pure replicas of what the
    //    other side reports. Local hits on them only show effects.
    //  - The host owns the match clock and the time-out verdict. A side whose
    //    tower falls declares its own defeat via 'match_end'.
    // ------------------------------------------------------------------

    buildProfilePacket(type) {
        return {
            type,
            vehicle: this.player.activeWeaponKey,
            cannon: this.upgradeMgr.state.equippedCannons || [this.upgradeMgr.state.equippedCannon || 'laser'],
            upgrades: this.upgradeMgr.state.upgrades
        };
    }

    // Host Multiplayer Setup (High-Speed WebSocket Channel).
    // `presetCode` is set by matchmaking; otherwise a private room code is generated.
    setupMultiplayerHost(presetCode = null) {
        this.cleanupNetwork();
        this.isMultiplayer = true;
        this.isClient = false;
        this.gameState = 'lobby';
        this.quickMatch = !!presetCode;

        const randomCode = presetCode || Math.floor(1000 + Math.random() * 9000).toString();
        this.roomId = randomCode;

        const codeEl = document.getElementById('lobby-code-val');
        if (codeEl) codeEl.innerText = '...';
        const codeBlock = document.getElementById('lobby-code-block');
        if (codeBlock) codeBlock.classList.toggle('hidden', this.quickMatch);
        const titleEl = document.getElementById('lobby-title');
        if (titleEl) titleEl.innerText = this.quickMatch ? 'MOTSTÅNDARE HITTAD' : 'RUM SKAPAT';
        const lobbyStatus = document.querySelector('.lobby-status');
        if (lobbyStatus) lobbyStatus.innerText = this.quickMatch ? 'Kopplar ihop er...' : 'Kopplar upp mot spelservern...';
        this.uiCtrl.showScreen('lobby');

        const socketUrl = `wss://itty.ws/c/dangerousfight-${randomCode}`;
        this.ws = new WebSocket(socketUrl);

        this.ws.onopen = () => {
            console.log('Host room open with code:', randomCode);
            if (codeEl) codeEl.innerText = randomCode;
            if (lobbyStatus) lobbyStatus.innerText = this.quickMatch ? 'Väntar på motståndaren...' : 'Rummet är öppet! Väntar på att Spelare 2 ansluter...';
        };

        this.ws.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.self) return; // Ignore own echoes

                const data = payload.message || payload;

                if (payload.type === 'join' && payload.total >= 2) {
                    console.log('Player 2 connected to room!');
                    if (lobbyStatus) lobbyStatus.innerText = 'Spelare 2 anslöt! Startar matchen...';
                    this.sendNetworkPacket(this.buildProfilePacket('host_ready'));
                    return;
                }

                if (payload.type === 'leave') {
                    console.log('Opponent left the room');
                    if (this.gameState === 'lobby' || (this.gameState !== 'playing' && this.gameState !== 'gameover' && this.gameState !== 'victory')) {
                        if (this.quickMatch) {
                            // Matched opponent bailed before the match: search again
                            this.startQuickMatch();
                            return;
                        }
                        // Private room: keep it open for a new opponent
                        if (lobbyStatus) lobbyStatus.innerText = 'Spelare 2 lämnade. Väntar på ny motståndare...';
                        return;
                    }
                    this.handleOpponentLeft('Motståndaren lämnade matchen');
                    return;
                }

                if (data && data.type) {
                    this.handleIncomingPacket(data);
                }
            } catch (err) {
                console.error('Error parsing packet:', err);
            }
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket Host error:', err);
            if (lobbyStatus) lobbyStatus.innerText = 'Nätverksfel vid anslutning.';
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            if (lobbyStatus && this.gameState !== 'playing') lobbyStatus.innerText = 'Anslutningen till spelservern bröts.';
            this.handleOpponentLeft('Anslutningen bröts');
        };
    }

    // Client Multiplayer Setup. `viaMatchmaking` keeps the status on the matchmaking screen.
    setupMultiplayerClient(code, viaMatchmaking = false) {
        this.cleanupNetwork();
        this.isMultiplayer = true;
        this.isClient = true;
        this.gameState = 'join';
        this.quickMatch = viaMatchmaking;
        const cleanCode = (code || '').trim();
        this.roomId = cleanCode;

        const statusEl = viaMatchmaking
            ? document.getElementById('mm-status')
            : document.getElementById('join-status-text');
        statusEl.innerText = viaMatchmaking ? 'Motståndare hittad! Kopplar ihop er...' : 'Ansluter till rum ' + cleanCode + '...';
        if (viaMatchmaking) this.uiCtrl.showScreen('matchmaking');

        const socketUrl = `wss://itty.ws/c/dangerousfight-${cleanCode}`;
        this.ws = new WebSocket(socketUrl);

        const sendHandshake = () => this.sendNetworkPacket(this.buildProfilePacket('handshake'));

        this.ws.onopen = () => {
            console.log('Client connected to room:', cleanCode);
            statusEl.innerText = viaMatchmaking ? 'Ihopkopplade! Förbereder match...' : 'Ansluten! Förbereder match...';
            sendHandshake();

            if (this.handshakeInterval) clearInterval(this.handshakeInterval);
            this.handshakeInterval = setInterval(() => {
                if (this.gameState === 'playing') {
                    clearInterval(this.handshakeInterval);
                    this.handshakeInterval = null;
                } else {
                    sendHandshake();
                }
            }, 500);
        };

        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.connectionTimeout = setTimeout(() => {
            if (this.isClient && this.gameState !== 'playing') {
                console.warn('Connection timed out to host:', cleanCode);
                if (viaMatchmaking) {
                    // Opponent vanished during the hand-off: go back to searching
                    this.startQuickMatch();
                    return;
                }
                statusEl.innerText = 'Inget svar från rummet. Kontrollera att värden har rum ' + cleanCode + ' öppet.';
                this.cleanupNetwork();
            }
        }, 12000);

        this.ws.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.self) {
                    if (payload.total === 1 && !viaMatchmaking) {
                        statusEl.innerText = 'Väntar på att värden skapar rum ' + cleanCode + '...';
                    }
                    return;
                }

                const data = payload.message || payload;

                if (payload.type === 'leave') {
                    console.log('Host left the room');
                    if (this.gameState !== 'playing' && this.gameState !== 'gameover' && this.gameState !== 'victory') {
                        if (viaMatchmaking) {
                            this.startQuickMatch();
                            return;
                        }
                        statusEl.innerText = 'Värden stängde rummet.';
                        this.cleanupNetwork();
                        return;
                    }
                    this.handleOpponentLeft('Värden lämnade matchen');
                    return;
                }

                if (data && data.type) {
                    this.handleIncomingPacket(data);
                }
            } catch (err) {
                console.error('Error parsing packet:', err);
            }
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket Client error:', err);
            statusEl.innerText = 'Kunde inte ansluta till rummet.';
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            if (this.gameState !== 'playing') statusEl.innerText = 'Anslutningen till spelservern bröts.';
            this.handleOpponentLeft('Anslutningen bröts');
        };
    }

    // Opponent gone (left / connection lost). Ends a running match and
    // turns the post-match buttons back into single-player controls.
    handleOpponentLeft(reason) {
        const wasMultiplayer = this.isMultiplayer;
        if (this.gameState === 'playing') {
            this.gameState = 'gameover';
            this.audioSynth.stopMusic();
            this.uiCtrl.renderGameOver(0, reason, this.currentScore || 0, this.matchKills || 0, false);
            this.uiCtrl.hidePodiumForms();
        } else if (wasMultiplayer && (this.gameState === 'gameover' || this.gameState === 'victory')) {
            const winnerEl = document.getElementById('stat-defeat-winner');
            if (winnerEl && this.gameState === 'gameover') winnerEl.innerText = reason;
        }
        this.resetRestartButtons();
        this.cleanupNetwork();
    }

    cleanupNetwork() {
        this.cleanupMatchmaking();
        if (this.handshakeInterval) {
            clearInterval(this.handshakeInterval);
            this.handshakeInterval = null;
        }
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        this.isMultiplayer = false;
        this.isClient = false;
        this.remoteProfile = null;
        this.restartRequestedLocal = false;
        this.restartRequestedRemote = false;
        this.netSyncAccumulator = 0;
    }

    sendNetworkPacket(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // Remember what the opponent is driving; applied in startRun() after the
    // enemy reset (which would otherwise wipe the vehicle profile).
    applyRemoteProfile(data) {
        this.remoteProfile = {
            vehicle: data.vehicle || 'katana',
            upgrades: data.upgrades || {}
        };
        this.enemy.setVehicleType(this.remoteProfile.vehicle);
    }

    // Both players must press "Spela igen" before a rematch starts
    requestRestart() {
        if (!this.isMultiplayer) {
            this.startRun();
            return;
        }
        this.restartRequestedLocal = true;
        this.sendNetworkPacket({ type: 'restart_request' });
        const winnerEl = document.getElementById('stat-defeat-winner');
        if (winnerEl && this.gameState === 'gameover') winnerEl.innerText = 'Väntar på motståndare...';
        ['btn-restart', 'btn-victory-restart'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (!btn.dataset.label) btn.dataset.label = btn.innerText;
            btn.innerText = 'VÄNTAR PÅ MOTSTÅNDARE...';
            btn.disabled = true;
        });
        this.tryMutualRestart();
    }

    resetRestartButtons() {
        ['btn-restart', 'btn-victory-restart'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (btn.dataset.label) btn.innerText = btn.dataset.label;
            btn.disabled = false;
        });
    }

    tryMutualRestart() {
        if (this.restartRequestedLocal && this.restartRequestedRemote) {
            this.restartRequestedLocal = false;
            this.restartRequestedRemote = false;
            this.resetRestartButtons();
            this.startRun();
        }
    }

    // ------------------------------------------------------------------
    // QUICK MATCH (automatic matchmaking)
    //
    // Everyone searching sits in one shared lobby channel and announces
    // themselves with 'seek'. When two seekers see each other, the one with
    // the lexically smaller id becomes host: it picks a room code and sends
    // 'match' to the other, who confirms with 'match_ack'. Both then leave
    // the lobby and meet in the private room like a code-based game.
    // ------------------------------------------------------------------
    startQuickMatch() {
        this.cleanupNetwork();
        this.gameState = 'matchmaking';
        this.quickMatch = true;

        const statusEl = document.getElementById('mm-status');
        const timerEl = document.getElementById('mm-timer');
        if (statusEl) {
            statusEl.classList.remove('mm-found');
            statusEl.innerText = 'Kopplar upp mot spelservern...';
        }
        this.uiCtrl.showScreen('matchmaking');

        this.mmId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        this.mmPending = null;   // { peer, room, sentAt } while waiting for an ack
        this.mmMatched = false;
        const startedAt = Date.now();

        const ws = new WebSocket('wss://itty.ws/c/dangerousfight-lobby');
        this.mmWs = ws;

        const send = (obj) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
        };
        const seek = () => send({ type: 'seek', id: this.mmId });

        ws.onopen = () => {
            if (statusEl) statusEl.innerText = 'Söker motståndare...';
            seek();
            this.mmTimers.push(setInterval(seek, 1000));
            this.mmTimers.push(setInterval(() => {
                if (!timerEl) return;
                const secs = Math.floor((Date.now() - startedAt) / 1000);
                timerEl.innerText = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
                // A proposal nobody answered: forget it and keep searching
                if (this.mmPending && Date.now() - this.mmPending.sentAt > 4000) {
                    this.mmPending = null;
                    if (statusEl) statusEl.innerText = 'Söker motståndare...';
                }
            }, 500));
        };

        ws.onmessage = (e) => {
            if (this.mmWs !== ws || this.mmMatched) return;
            let payload;
            try { payload = JSON.parse(e.data); } catch (err) { return; }
            if (payload.self) return;
            const data = payload.message || payload;
            if (!data || !data.id || data.id === this.mmId) return;

            if (data.type === 'seek') {
                if (this.mmPending) return; // already proposing to someone
                if (this.mmId < data.id) {
                    // I host: propose a room to this seeker
                    const room = Math.floor(1000 + Math.random() * 9000).toString();
                    this.mmPending = { peer: data.id, room, sentAt: Date.now() };
                    if (statusEl) statusEl.innerText = 'Spelare hittad, förhandlar...';
                    send({ type: 'match', id: this.mmId, to: data.id, room });
                } else {
                    // Make sure the would-be host sees me right away
                    seek();
                }
            } else if (data.type === 'match' && data.to === this.mmId && data.room) {
                // Accept the proposal and join as client - unless I am mid-proposal
                // to someone else (then the proposer times out and retries)
                if (this.mmPending) return;
                this.mmMatched = true;
                send({ type: 'match_ack', id: this.mmId, to: data.id, room: data.room });
                if (statusEl) {
                    statusEl.classList.add('mm-found');
                    statusEl.innerText = 'Motståndare hittad!';
                }
                this.audioSynth.playUpgrade();
                setTimeout(() => this.setupMultiplayerClient(data.room, true), 150);
            } else if (data.type === 'match_ack' && data.to === this.mmId && this.mmPending && data.id === this.mmPending.peer) {
                this.mmMatched = true;
                if (statusEl) {
                    statusEl.classList.add('mm-found');
                    statusEl.innerText = 'Motståndare hittad!';
                }
                this.audioSynth.playUpgrade();
                const room = this.mmPending.room;
                setTimeout(() => this.setupMultiplayerHost(room), 150);
            }
        };

        ws.onerror = () => {
            if (statusEl) statusEl.innerText = 'Nätverksfel – kunde inte nå spelservern.';
        };
        ws.onclose = () => {
            if (this.mmWs !== ws || this.mmMatched) return;
            if (statusEl) statusEl.innerText = 'Anslutningen bröts. Försöker igen...';
            this.mmTimers.push(setTimeout(() => {
                if (this.mmWs === ws && this.gameState === 'matchmaking') this.startQuickMatch();
            }, 2000));
        };
    }

    cleanupMatchmaking() {
        this.mmTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
        this.mmTimers = [];
        if (this.mmWs) {
            const ws = this.mmWs;
            this.mmWs = null;
            ws.onopen = null; ws.onmessage = null; ws.onerror = null; ws.onclose = null;
            try { ws.close(); } catch (e) {}
        }
        this.mmPending = null;
    }

    handleIncomingPacket(data) {
        if (data.type === 'host_ready') {
            this.applyRemoteProfile(data);
            this.sendNetworkPacket(this.buildProfilePacket('handshake'));
        } else if (data.type === 'handshake') {
            this.applyRemoteProfile(data);
            if (this.handshakeInterval) {
                clearInterval(this.handshakeInterval);
                this.handshakeInterval = null;
            }

            // Handshake response from client to host
            if (!this.isClient) {
                this.sendNetworkPacket(this.buildProfilePacket('handshake_ack'));
                if (this.gameState !== 'playing') {
                    this.startRun();
                }
            }
        } else if (data.type === 'handshake_ack') {
            this.applyRemoteProfile(data);
            if (this.handshakeInterval) {
                clearInterval(this.handshakeInterval);
                this.handshakeInterval = null;
            }
            if (this.gameState !== 'playing') {
                this.startRun();
            }
        } else if (data.type === 'sync') {
            if (this.gameState !== 'playing') return;
            // Sync positions (Note: Mirrored view mapping!)
            const w = this.canvasCtrl.width;
            const h = this.canvasCtrl.height;
            const rp = data.player;

            // Opponent car replica
            this.enemy.x = w - rp.x;
            this.enemy.y = h - rp.y;
            this.enemy.vx = -rp.vx;
            this.enemy.vy = -rp.vy;
            if (typeof rp.maxHp === 'number') this.enemy.maxHp = rp.maxHp;
            this.enemy.energy = rp.energy;

            // Death / respawn is owned by the opponent's machine
            if (rp.dead && this.enemy.state !== 'dead') {
                this.enemy.state = 'dead';
                this.enemy.hp = 0;
                this.enemy.respawnTimer = Number.MAX_SAFE_INTEGER; // revived by sync, not by timer
                this.enemy.vx = 0;
                this.enemy.vy = 0;
                this.particles.spawnShockwave(this.enemy.x, this.enemy.y, this.enemy.color, 70);
                this.audioSynth.playVictory();
                this.onEnemyDefeated(false);
            } else if (!rp.dead && this.enemy.state === 'dead') {
                this.enemy.state = 'idle';
                this.enemy.respawnTimer = 0;
                this.particles.spawnShockwave(this.enemy.x, this.enemy.y, this.enemy.color, 40);
            }
            if (!rp.dead) this.enemy.hp = rp.hp;

            // Sync screen shake
            if (data.shake) {
                this.canvasCtrl.shake(data.shake.amt, data.shake.dur);
            }

            // Opponent's own tower is our top tower
            if (data.tower) {
                if (typeof data.tower.maxHp === 'number') this.topTower.maxHp = data.tower.maxHp;
                this.topTower.hp = data.tower.hp;
            }

            // Host owns the match clock
            if (this.isClient && typeof data.matchTimer === 'number') {
                this.matchTimer = data.matchTimer;
            }
        } else if (data.type === 'projectile_fired') {
            if (this.gameState !== 'playing') return;
            // Opponent spawned a projectile, replicate it mirrored
            const w = this.canvasCtrl.width;
            const h = this.canvasCtrl.height;
            this.spawnProjectile(
                w - data.x,
                h - data.y,
                -data.vx,
                -data.vy,
                data.radius,
                'enemy',
                data.cannonType || 'laser'
            );
        } else if (data.type === 'match_end') {
            if (this.gameState !== 'playing') return;
            if (data.result === 'you_win') {
                this.handleVictory();
            } else {
                this.handleDefeat();
            }
        } else if (data.type === 'restart_request') {
            this.restartRequestedRemote = true;
            this.tryMutualRestart();
        }
    }

    // Locally-owned match outcome (my tower fell / host timed out the match)
    declareMatchEnd(iWin) {
        if (this.isMultiplayer) {
            this.sendNetworkPacket({ type: 'match_end', result: iWin ? 'you_lose' : 'you_win' });
        }
        if (iWin) this.handleVictory();
        else this.handleDefeat();
    }

    // Apply damage to a tower respecting network authority. In multiplayer
    // only my own (bottom) tower is simulated locally; the top tower is a
    // replica that only the opponent may change.
    damageTower(which, amount) {
        const tower = which === 'top' ? this.topTower : this.bottomTower;
        if (this.isMultiplayer && which === 'top') return;
        tower.hp = Math.max(0, tower.hp - amount);
    }

    // Triggered when starting a game
    startRun() {
        this.runCredits = 0;
        this.currentScore = 0;
        this.matchKills = 0;
        this.particles.clear();
        this.projectiles = [];
        this.slowMoTimer = 0; // reset slow motion
        this.matchTimer = 240000; // 4 minutes match duration
        
        let isBoss = false;
        if (!this.isMultiplayer) {
            // Increment match count
            this.upgradeMgr.state.matchCount = (this.upgradeMgr.state.matchCount || 0) + 1;
            this.upgradeMgr.save();
            
            // Determine if this is a hard boss match
            if (this.upgradeMgr.state.matchCount % 2 === 0) {
                isBoss = true;
            }
        }
        this.isHardBossRound = isBoss;
        
        // Reset towers (incorporate upgrades)
        const towerUpgLvl = this.upgradeMgr.state.upgrades.health || 0;
        const towerMaxHp = 500 + towerUpgLvl * 50;
        const bossTowerMaxHp = isBoss ? Math.floor(towerMaxHp * 1.5) : towerMaxHp;
        this.topTower = { hp: bossTowerMaxHp, maxHp: bossTowerMaxHp };
        this.bottomTower = { hp: towerMaxHp, maxHp: towerMaxHp };
        
        // Settle active weapon on player BEFORE hp is derived from its profile
        this.player.activeWeaponKey = this.upgradeMgr.state.equippedWeapon || 'katana';
        this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
        this.player.resetForRun();

        // Both cars start the match at their own base, whatever happened last round
        const arenaW = this.canvasCtrl.width;
        const arenaH = this.canvasCtrl.height;
        this.player.x = arenaW / 2;
        this.player.y = arenaH - 120;
        this.player.angle = -Math.PI / 2;
        this.player.trailHistory = [];
        this.enemy.x = arenaW / 2;
        this.enemy.y = 120;
        this.enemy.angle = Math.PI / 2;
        this.enemy.trailHistory = [];

        // Reset enemy car
        this.enemy.resetForRun(isBoss);
        if (isBoss) this.enemy.resetRagdollPositions();

        if (this.isMultiplayer) {
            // The enemy is a replica of the opponent: restore their vehicle
            // profile (resetForRun wiped it) and size their tower by their
            // own health upgrade. Live hp/maxHp values arrive via 'sync'.
            const remote = this.remoteProfile || { vehicle: 'katana', upgrades: {} };
            this.enemy.setVehicleType(remote.vehicle);
            this.enemy.maxHp = (this.player.profiles[remote.vehicle]?.baseHp || 100) + ((remote.upgrades.health || 0) * 10);
            this.enemy.hp = this.enemy.maxHp;
            const remoteTowerMax = 500 + (remote.upgrades.health || 0) * 50;
            this.topTower = { hp: remoteTowerMax, maxHp: remoteTowerMax };
            this.restartRequestedLocal = false;
            this.restartRequestedRemote = false;
            this.netSyncAccumulator = 0;
        }
        
        // Offer cybernetic perks in single-player before entering battle
        if (!this.isMultiplayer) {
            const randomPerks = this.upgradeMgr.getRandomPerks();
            this.uiCtrl.showScreen('perks');
            this.uiCtrl.renderPerkSelection(randomPerks, (perkKey) => {
                this.player.activePerk = perkKey;
                if (perkKey === 'shieldCharge') {
                    this.player.shieldHp = 1;
                    this.player.shieldCooldown = 0;
                }
                
                // Complete game start after perk choice
                this.gameState = 'playing';
                this.uiCtrl.showScreen('hud');
                
                // Manage HUD boss warning banner overlay
                this.showBossWarningBanner(isBoss);
                
                // Play epic bass voice intro and start background music!
                this.audioSynth.playVoiceIntro(isBoss);
                this.audioSynth.startMusic();
            }, this.audioSynth);
        } else {
            // Multiplayer starts instantly (symmetrical gameplay without active perks)
            this.gameState = 'playing';
            this.uiCtrl.showScreen('hud');
            this.audioSynth.playVoiceIntro(false);
            this.audioSynth.startMusic();
        }
    }

    showBossWarningBanner(isBoss) {
        const warningBanner = document.getElementById('boss-warning');
        if (warningBanner) {
            if (isBoss) {
                warningBanner.innerText = "VARNING: SHOGUN DETEKTERAD! 💀";
                warningBanner.classList.remove('hidden');
                if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
                this.bossWarningTimeout = setTimeout(() => {
                    warningBanner.classList.add('hidden');
                }, 3000);
            } else {
                warningBanner.classList.add('hidden');
                if (this.bossWarningTimeout) {
                    clearTimeout(this.bossWarningTimeout);
                    this.bossWarningTimeout = null;
                }
            }
        }
    }

    // Add points to current match score with optional floating indicator
    addScore(points, x = null, y = null, label = null) {
        if (this.gameState !== 'playing') return;
        const pts = Math.round(points);
        this.currentScore = (this.currentScore || 0) + pts;
        
        if (x !== null && y !== null) {
            const text = label ? `${label} +${pts}` : `+${pts}`;
            const color = pts >= 500 ? '#ffcc00' : (pts >= 100 ? '#00f0ff' : '#39ff14');
            this.particles.spawnDamageText(x, y, text, color, pts >= 500 ? 1.4 : 1.1);
        }
    }

    // Handler when enemy samurai is destroyed
    onEnemyDefeated(isBoss) {
        this.matchKills = (this.matchKills || 0) + 1;
        if (isBoss) {
            this.addScore(2000, this.enemy.x, this.enemy.y, 'BOSS K.O.!');
        } else {
            this.addScore(500, this.enemy.x, this.enemy.y, 'K.O.!');
        }
    }

    // Projectile Spawner
    spawnProjectile(x, y, vx, vy, radius, owner, type = 'laser') {
        let damageCar = 25;
        let damageTower = 50;
        let color = '#00f0ff'; // cyan for player
        if (owner === 'enemy') {
            color = '#ff0077'; // pink/red for enemy
            damageCar = 25;
            damageTower = 50;
            if (type === 'plasma') {
                damageCar = 50;
                damageTower = 110;
                color = '#ff00ff';
            } else if (type === 'rapid') {
                damageCar = 15;
                damageTower = 30;
                color = '#39ff14'; // neon green
            } else if (type === 'trio') {
                damageCar = 15;
                damageTower = 30;
                color = '#ffff00';
            } else if (type === 'hagel') {
                damageCar = 10;
                damageTower = 20;
                color = '#aaffff'; // light cyan
            } else if (type === 'sniper') {
                damageCar = 80;
                damageTower = 160;
                color = '#ffffff'; // white hot
            } else if (type === 'bakåt') {
                damageCar = 20;
                damageTower = 40;
                color = '#00ffaa'; // teal
            }
        } else {
            // Player projectile stats based on type
            if (type === 'plasma') {
                damageCar = 50;
                damageTower = 110;
                color = '#ff00ff'; // purple/magenta
            } else if (type === 'rapid') {
                damageCar = 15;
                damageTower = 30;
                color = '#39ff14'; // neon green Dubbel-Laser
            } else if (type === 'trio') {
                damageCar = 15;
                damageTower = 30;
                color = '#ffff00'; // yellow
            } else if (type === 'hagel') {
                damageCar = 10;
                damageTower = 20;
                color = '#aaffff'; // light cyan shotgun pellets
            } else if (type === 'sniper') {
                damageCar = 80;
                damageTower = 160;
                color = '#ffffff'; // white hot precision beam
            } else if (type === 'bakåt') {
                damageCar = 20;
                damageTower = 40;
                color = '#00ffaa'; // teal bidirectional
            }
            
            // Sync with remote player in multiplayer
            if (this.isMultiplayer) {
                this.sendNetworkPacket({
                    type: 'projectile_fired',
                    x, y, vx, vy, radius, cannonType: type
                });
            }
        }
        
        this.projectiles.push({
            x, y, vx, vy, radius, owner, type, damageCar, damageTower, color
        });
    }

    // Main Engine updates (Physics & Collisions)
    update(dt) {
        if (this.gameState !== 'playing') {
            this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
            this.particles.update(dt);
            return;
        }

        // Micro hit-stop impact freeze frame
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
            return;
        }

        // Handle slow-motion time dilation
        let enemyDt = dt;
        let physicsDt = dt;
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            enemyDt = dt * 0.40;
            physicsDt = dt * 0.40;
            // Ambient slow-mo neon pulse
            if (Math.random() < 0.08) {
                this.canvasCtrl.flash('rgba(0, 240, 255, 0.05)', 80);
            }
        }

        // 4-Minute Match Timer Countdown
        if (this.gameState === 'playing') {
            this.matchTimer -= dt;
            if (this.matchTimer <= 0) {
                this.matchTimer = 0;
                this.handleMatchTimeout();
                return;
            }
        }

        // Update systems
        this.canvasCtrl.update(dt, this.player);
        this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
        this.particles.update(dt);
        
        // Update lava simulation state
        this.lavaTime += dt * 0.0012;
        
        // Spawn magma bubbles in lava region
        const lavaMinX = 80;
        const lavaMaxX = this.canvasCtrl.width - 80;
        const lavaCenterY = this.canvasCtrl.height / 2;
        
        if (Math.random() < 0.035 && this.lavaBubbles.length < 9) {
            this.lavaBubbles.push({
                x: lavaMinX + 25 + Math.random() * (lavaMaxX - lavaMinX - 50),
                y: lavaCenterY + (Math.random() - 0.5) * 32,
                radius: 0.5,
                maxRadius: Math.random() * 8 + 4,
                growth: Math.random() * 0.014 + 0.008
            });
        }

        for (let i = this.lavaBubbles.length - 1; i >= 0; i--) {
            const b = this.lavaBubbles[i];
            b.radius += b.growth * dt;
            if (b.radius >= b.maxRadius) {
                this.audioSynth.playLavaBubblePop(0.14);
                this.particles.spawnLavaBurst(b.x, b.y);
                this.lavaBubbles.splice(i, 1);
            }
        }

        // Drifting basalt / obsidian crust plates ride the current
        const riverLen = Math.max(1, lavaMaxX - lavaMinX);
        this.lavaCrustPlates.forEach(plate => {
            plate.u += (plate.vx * dt) / riverLen;
            plate.angle += plate.rotSpeed * dt;
            if (plate.u > 1.04) plate.u -= 1.08;
        });

        // Constant trickle of embers and smoke rising off the magma
        if (Math.random() < 0.35) {
            const ex = lavaMinX + Math.random() * riverLen;
            this.particles.spawnDamageEmbers(ex, lavaCenterY + (Math.random() - 0.5) * 30, Math.random() < 0.5 ? '#ff7a00' : '#ffb830');
        }

        if (this.remoteMeleeCooldown > 0) this.remoteMeleeCooldown -= dt;
        if (this.enemyRamCooldown > 0) this.enemyRamCooldown -= dt;
        if (this.playerRamCooldown > 0) this.playerRamCooldown -= dt;

        this.player.update(dt, this.canvasCtrl.width, this.canvasCtrl.height, this.particles);
        this.enemy.update(enemyDt, this.player, this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
        
        this.updatePhysics(physicsDt);
        this.checkCollisions(physicsDt);
        
        // Network Sync (~30 Hz; the replica dead-reckons between packets)
        if (this.isMultiplayer) {
            this.netSyncAccumulator = (this.netSyncAccumulator || 0) + dt;
            if (this.netSyncAccumulator >= 33) {
                this.netSyncAccumulator = 0;
                this.sendNetworkPacket({
                    type: 'sync',
                    matchTimer: this.matchTimer,
                    player: {
                        x: this.player.x,
                        y: this.player.y,
                        vx: this.player.vx,
                        vy: this.player.vy,
                        hp: this.player.hp,
                        maxHp: this.player.maxHp,
                        energy: this.player.energy,
                        dead: this.player.state === 'dead'
                    },
                    tower: {
                        hp: this.bottomTower.hp,
                        maxHp: this.bottomTower.maxHp
                    }
                });
            }
        }
    }

    handleMatchTimeout() {
        // In multiplayer the host owns the clock and the verdict; the client
        // just waits for 'match_end'.
        if (this.isMultiplayer && this.isClient) return;

        // 4 minutes expired! Calculate damage taken on both sides
        const topTowerDamage = this.topTower.maxHp - this.topTower.hp;
        const bottomTowerDamage = this.bottomTower.maxHp - this.bottomTower.hp;

        this.particles.spawnDamageText(this.canvasCtrl.width / 2, this.canvasCtrl.height / 2, 'TIDEN UTE!', '#ffcc00', 2.0);

        let iWin;
        if (topTowerDamage > bottomTowerDamage) {
            // Enemy tower took MORE damage -> Player Wins!
            iWin = true;
        } else if (bottomTowerDamage > topTowerDamage) {
            // Player tower took MORE damage -> Enemy Wins!
            iWin = false;
        } else {
            // Equal tower damage, compare samurai car damage taken
            const playerCarDamage = this.player.maxHp - this.player.hp;
            const enemyCarDamage = this.enemy.maxHp - this.enemy.hp;
            iWin = enemyCarDamage >= playerCarDamage;
        }
        this.declareMatchEnd(iWin);
    }

    updatePhysics(dt) {
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;

        // --- 1. LAVA COLLISION DETECTION ---
        // Lava center Y: h/2. Width: w - 160. X-range: 80 to w - 80. Height/Thick: 50.
        const lavaMinX = 80;
        const lavaMaxX = w - 80;
        const lavaMinY = h / 2 - 25;
        const lavaMaxY = h / 2 + 25;
        const lavaDamagePerMs = 0.025; // 25 HP per second

        // Check player car in lava
        if (this.player.x > lavaMinX && this.player.x < lavaMaxX && this.player.y > lavaMinY && this.player.y < lavaMaxY && this.player.state !== 'dead') {
            this.player.hp = Math.max(0, this.player.hp - lavaDamagePerMs * dt);
            
            // Viscous fluid drag & thermal buoyant kick
            this.player.vx *= Math.pow(0.86, dt / 16);
            this.player.vy *= Math.pow(0.86, dt / 16);
            this.player.vy += 0.016 * dt; // buoyant downward repulsion
            
            const now = Date.now();
            if (now - this.lastLavaSizzlePlayer > 160) {
                this.lastLavaSizzlePlayer = now;
                this.audioSynth.playLavaSizzle();
                this.particles.spawnLavaSplash(this.player.x, this.player.y, this.player.vx, this.player.vy);
                this.particles.addDecal(this.player.x, this.player.y > h / 2 ? lavaMaxY : lavaMinY, 16, 'rgba(0,0,0,0.8)', 'scorch');
            }
            if (this.player.hp <= 0) {
                this.player.takeDamage(1, this.player.x, this.player.y, this.particles, this.canvasCtrl);
            }
        }

        // Check enemy car in lava
        if (this.enemy.x > lavaMinX && this.enemy.x < lavaMaxX && this.enemy.y > lavaMinY && this.enemy.y < lavaMaxY && this.enemy.state !== 'dead') {
            // In multiplayer the opponent computes their own lava damage
            if (!this.isMultiplayer) this.enemy.hp = Math.max(0, this.enemy.hp - lavaDamagePerMs * dt);
            
            // Viscous fluid drag & thermal buoyant kick
            this.enemy.vx *= Math.pow(0.86, dt / 16);
            this.enemy.vy *= Math.pow(0.86, dt / 16);
            this.enemy.vy -= 0.016 * dt; // buoyant upward repulsion
            
            const now = Date.now();
            if (now - this.lastLavaSizzleEnemy > 160) {
                this.lastLavaSizzleEnemy = now;
                this.audioSynth.playLavaSizzle();
                this.particles.spawnLavaSplash(this.enemy.x, this.enemy.y, this.enemy.vx, this.enemy.vy);
                this.particles.addDecal(this.enemy.x, this.enemy.y > h / 2 ? lavaMaxY : lavaMinY, 16, 'rgba(0,0,0,0.8)', 'scorch');
            }
            if (this.enemy.hp <= 0) {
                this.enemy.takeDamage(1, this.enemy.x, this.enemy.y, this.particles, this.canvasCtrl);
            }
        }

        // --- 2. ONE-WAY PASSAGE GATES ---
        // Left Passage (x < 80): ONLY UPWARDS movement allowed.
        // Symmetrically, if moving downwards (vy > 0), block at y = h/2.
        const blockCheck = (obj) => {
            if (obj.x < 80) {
                // Left side: going down is blocked
                if (obj.vy > 0 && obj.y - obj.radius < h / 2 + 10 && obj.y + obj.radius > h / 2 - 10) {
                    obj.y = h / 2 - obj.radius - 2;
                    obj.vy = -obj.vy * 0.4; // slight bounce back
                }
            } else if (obj.x > w - 80) {
                // Right side: going up is blocked
                if (obj.vy < 0 && obj.y - obj.radius < h / 2 + 10 && obj.y + obj.radius > h / 2 - 10) {
                    obj.y = h / 2 + obj.radius + 2;
                    obj.vy = -obj.vy * 0.4;
                }
            }
        };

        if (this.player.state !== 'dead') blockCheck(this.player);
        if (this.enemy.state !== 'dead') blockCheck(this.enemy);

        // --- 3. PROJECTILES PHYSICS ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Wall bounce (left/right walls)
            if (p.x < p.radius) {
                p.x = p.radius;
                p.vx = -p.vx * 0.95;
                this.audioSynth.playClick();
            } else if (p.x > w - p.radius) {
                p.x = w - p.radius;
                p.vx = -p.vx * 0.95;
                this.audioSynth.playClick();
            }
            
            // Top/bottom bounce (in case they pass towers through gaps)
            if (p.y < p.radius) {
                p.y = p.radius;
                p.vy = -p.vy * 0.95;
                this.audioSynth.playClick();
            } else if (p.y > h - p.radius) {
                p.y = h - p.radius;
                p.vy = -p.vy * 0.95;
                this.audioSynth.playClick();
            }
            
            // One-way gate check for projectile
            blockCheck(p);
            
            // Check Tower Hits
            let hitTopTower = false;
            let hitBottomTower = false;
            
            if (p.y < 85) {
                if (this.isHardBossRound) {
                    if (p.x >= 80 && p.x <= 160) hitTopTower = true;
                    else if (p.x >= w - 160 && p.x <= w - 80) hitTopTower = true;
                } else {
                    if (p.x >= w / 2 - 80 && p.x <= w / 2 + 80) hitTopTower = true;
                }
            } else if (p.y > h - 85) {
                if (p.x >= w / 2 - 80 && p.x <= w / 2 + 80) hitBottomTower = true;
            }
            // A shot never damages the shooter's own tower (it just bounces on)
            if (p.owner === 'enemy') hitTopTower = false;
            if (p.owner === 'player') hitBottomTower = false;
            
            if (hitTopTower) {
                // Damage top tower (each technique has its own tower damage)
                const towerDmg = p.damageTower || 50;
                this.damageTower('top', towerDmg);
                if (p.owner === 'player') {
                    this.addScore(Math.round(towerDmg), p.x, p.y);
                }
                this.hitStopTimer = 25; // hit-stop micro freeze
                this.particles.spawnDamageText(p.x, p.y, `-${towerDmg}`, '#ff0077', 1.25);
                this.particles.addDecal(p.x, p.y, 28, 'rgba(0,0,0,0.7)', 'scorch');
                this.particles.spawnShockwave(p.x, p.y, '#ff0077', 45);
                this.canvasCtrl.addFloorPulse(p.x, p.y, '#ff0077', 180);
                this.canvasCtrl.flash('rgba(255, 0, 119, 0.25)', 200);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            } else if (hitBottomTower) {
                // Damage bottom tower
                const towerDmg = p.damageTower || 50;
                this.damageTower('bottom', towerDmg);
                this.hitStopTimer = 25; // hit-stop micro freeze
                this.particles.spawnDamageText(p.x, p.y, `-${towerDmg}`, '#00f0ff', 1.25);
                this.particles.addDecal(p.x, p.y, 28, 'rgba(0,0,0,0.7)', 'scorch');
                this.particles.spawnShockwave(p.x, p.y, '#00f0ff', 45);
                this.canvasCtrl.addFloorPulse(p.x, p.y, '#00f0ff', 180);
                this.canvasCtrl.flash('rgba(0, 240, 255, 0.25)', 200);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            }
            
            // Check samurai/enemy hits (a shot never hits the car that fired it)
            if (p.owner !== 'player' && this.player.state !== 'dead' && Math.hypot(p.x - this.player.x, p.y - this.player.y) < this.player.radius + p.radius) {
                // Perfect Parry: if projectile belongs to enemy and player is launching/dashing fast
                if (p.owner === 'enemy' && Math.hypot(this.player.vx, this.player.vy) > 0.15) {
                    this.hitStopTimer = 40; // Satisfying parry freeze frame!
                    this.particles.spawnDamageText(p.x, p.y, 'PARRY!', '#ffffff', 1.4);
                    this.addScore(150, p.x, p.y, 'PARRY!');
                    this.particles.spawnShockwave(p.x, p.y, '#ffffff', 40);
                    this.canvasCtrl.addFloorPulse(p.x, p.y, '#ffffff', 200);
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.4)', 150);
                    this.canvasCtrl.shake(7, 120);
                    this.audioSynth.playParry();
                    
                    // Vampirism Perk Heal
                    if (this.player.activePerk === 'vampirism') {
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.floor(this.player.maxHp * 0.08));
                    }
                    
                    // Time Dilation slow motion perk
                    if (this.player.activePerk === 'timeDilation') {
                        this.slowMoTimer = 2500;
                    }
                    
                    // Deflect the projectile (reverse direction and transfer ownership to player!)
                    p.owner = 'player';
                    p.vx = -p.vx * 1.25;
                    p.vy = -p.vy * 1.25;
                    p.color = '#00f0ff'; // change laser color to player cyan!

                    // Opponent must see (and be hit by) the reflected shot
                    if (this.isMultiplayer) {
                        this.sendNetworkPacket({
                            type: 'projectile_fired',
                            x: p.x, y: p.y, vx: p.vx, vy: p.vy, radius: p.radius, cannonType: p.type
                        });
                    }

                    continue;
                }
                
                this.hitStopTimer = 15;
                this.player.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (p.owner !== 'enemy' && this.enemy.state !== 'dead') {
                let hitEnemy = false;
                if (this.enemy.isBoss && this.enemy.ragdollNodes) {
                    for (let n = 0; n < this.enemy.ragdollNodes.length; n++) {
                        const node = this.enemy.ragdollNodes[n];
                        if (Math.hypot(p.x - node.x, p.y - node.y) < node.radius + p.radius) {
                            hitEnemy = true;
                            // Push the node slightly when hit by projectile
                            const angle = Math.atan2(node.y - p.y, node.x - p.x);
                            node.vx += Math.cos(angle) * 0.05;
                            node.vy += Math.sin(angle) * 0.05;
                            break;
                        }
                    }
                } else {
                    if (Math.hypot(p.x - this.enemy.x, p.y - this.enemy.y) < this.enemy.radius + p.radius) {
                        hitEnemy = true;
                    }
                }

                if (hitEnemy) {
                    this.hitStopTimer = 15;
                    this.enemy.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                    if (p.owner === 'player') {
                        this.addScore(Math.round(p.damageCar || 25), p.x, p.y);
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
        }
    }

    checkCollisions(dt) {
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const playerAlive = this.player.state !== 'dead';
        const enemyAlive = this.enemy.state !== 'dead';

        // --- 1. SAMURAI-TO-SAMURAI ELASTIC COLLISION ---
        if (!playerAlive || !enemyAlive) {
            // No clash possible, but tower ramming below must still work
        } else if (this.enemy.isBoss && this.enemy.ragdollNodes) {
            this.enemy.ragdollNodes.forEach(node => {
                const dist = Math.hypot(this.player.x - node.x, this.player.y - node.y);
                const touchDist = this.player.radius + node.radius;
                
                if (dist < touchDist) {
                    const angle = Math.atan2(this.player.y - node.y, this.player.x - node.x);
                    const overlap = touchDist - dist;
                    
                    this.player.x += Math.cos(angle) * overlap * 0.5;
                    this.player.y += Math.sin(angle) * overlap * 0.5;
                    node.x -= Math.cos(angle) * overlap * 0.5;
                    node.y -= Math.sin(angle) * overlap * 0.5;

                    const normalX = Math.cos(angle);
                    const normalY = Math.sin(angle);
                    
                    const rvx = this.player.vx - node.vx;
                    const rvy = this.player.vy - node.vy;
                    const velAlongNormal = rvx * normalX + rvy * normalY;
                    
                    if (velAlongNormal < 0) {
                        const restitution = 0.85;
                        let impulseScalar = -(1 + restitution) * velAlongNormal;
                        impulseScalar /= (1 / this.player.mass) + (1 / node.mass);
                        
                        this.player.vx += (impulseScalar / this.player.mass) * normalX;
                        this.player.vy += (impulseScalar / this.player.mass) * normalY;
                        node.vx -= (impulseScalar / node.mass) * normalX;
                        node.vy -= (impulseScalar / node.mass) * normalY;

                        // Deal slash damage if dashing fast
                        const playerDashSpeed = Math.hypot(this.player.vx, this.player.vy);
                        if (playerDashSpeed > 0.08) {
                            const slashDmg = Math.floor((this.player.profile?.ramDamage || 100) * 0.5);
                            this.enemy.takeDamage(slashDmg, this.player.x, this.player.y, this.particles, this.canvasCtrl);
                            this.addScore(slashDmg * 2, (this.player.x + node.x) / 2, (this.player.y + node.y) / 2, 'SLASH!');
                        }
                    }
                    
                    this.hitStopTimer = 30; // Heavy clash freeze
                    this.audioSynth.playClash();
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
                    this.canvasCtrl.addFloorPulse((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, '#00f0ff', 160);
                    this.particles.spawnClashSparks((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, '#ffffff');
                    this.particles.addDecal((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, 20, 'rgba(0,0,0,0.6)', 'scorch');
                }
            });
        } else {
            const dist = Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
            const touchDist = this.player.radius + this.enemy.radius;
            
            if (dist < touchDist) {
                const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
                const overlap = touchDist - dist;
                
                this.player.x += Math.cos(angle) * overlap * 0.5;
                this.player.y += Math.sin(angle) * overlap * 0.5;
                this.enemy.x -= Math.cos(angle) * overlap * 0.5;
                this.enemy.y -= Math.sin(angle) * overlap * 0.5;

                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                
                const rvx = this.player.vx - this.enemy.vx;
                const rvy = this.player.vy - this.enemy.vy;
                const velAlongNormal = rvx * normalX + rvy * normalY;

                if (velAlongNormal < 0) {
                    // Pre-impact speeds: in multiplayer both machines must agree
                    // on who was dashing, independent of the impulse result.
                    const prePlayerSpeed = Math.hypot(this.player.vx, this.player.vy);
                    const preEnemySpeed = Math.hypot(this.enemy.vx, this.enemy.vy);

                    const restitution = 0.85;
                    let impulseScalar = -(1 + restitution) * velAlongNormal;
                    impulseScalar /= (1 / this.player.mass) + (1 / this.enemy.mass);

                    this.player.vx += (impulseScalar / this.player.mass) * normalX;
                    this.player.vy += (impulseScalar / this.player.mass) * normalY;
                    this.enemy.vx -= (impulseScalar / this.enemy.mass) * normalX;
                    this.enemy.vy -= (impulseScalar / this.enemy.mass) * normalY;

                    // Deal slash damage if dashing fast
                    const playerDashSpeed = this.isMultiplayer ? prePlayerSpeed : Math.hypot(this.player.vx, this.player.vy);
                    if (playerDashSpeed > 0.08) {
                        const slashDmg = Math.floor((this.player.profile?.ramDamage || 100) * 0.5);
                        this.enemy.takeDamage(slashDmg, this.player.x, this.player.y, this.particles, this.canvasCtrl);
                        this.addScore(slashDmg * 2, (this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, 'SLASH!');
                    }

                    // Multiplayer: the opponent slashing into me damages me (I own my hp)
                    if (this.isMultiplayer && preEnemySpeed > 0.08 && this.remoteMeleeCooldown <= 0) {
                        this.remoteMeleeCooldown = 400;
                        const enemyProfile = this.player.profiles[this.enemy.activeWeaponKey] || this.player.profiles.katana;
                        const slashDmg = Math.floor((enemyProfile.ramDamage || 100) * 0.5);
                        this.player.takeDamage(slashDmg, this.enemy.x, this.enemy.y, this.particles, this.canvasCtrl);
                    }
                }
                
                this.hitStopTimer = 30; // Heavy clash freeze
                this.audioSynth.playClash();
                this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
                this.canvasCtrl.addFloorPulse((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#00f0ff', 160);
                this.particles.spawnClashSparks((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#ffffff');
                this.particles.addDecal((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, 20, 'rgba(0,0,0,0.6)', 'scorch');
            }
        }

        // --- 2. TOWER RAMMING COLLISION ---
        // Player samurai hitting top tower (enemy)
        if (playerAlive && this.player.y < 85) {
            let hitTopTower = false;
            if (this.isHardBossRound) {
                const leftIntersect = (this.player.x + this.player.radius >= 80 && this.player.x - this.player.radius <= 160);
                const rightIntersect = (this.player.x + this.player.radius >= w - 160 && this.player.x - this.player.radius <= w - 80);
                if (leftIntersect || rightIntersect) {
                    hitTopTower = true;
                }
            } else {
                if (this.player.x + this.player.radius >= w / 2 - 80 && this.player.x - this.player.radius <= w / 2 + 80) {
                    hitTopTower = true;
                }
            }

            if (hitTopTower) {
                const impactForce = Math.abs(this.player.vy);
                if (impactForce > 0.05 && this.playerRamCooldown <= 0) {
                    this.playerRamCooldown = 500;
                    const ramDmg = this.player.profile.ramDamage;
                    this.damageTower('top', ramDmg);
                    this.addScore(250, this.player.x, 70, 'RAM!');
                    
                    this.hitStopTimer = 50; // Massive tower ram freeze frame!
                    this.particles.spawnDamageText(this.player.x, 70, `RAM! -${ramDmg}`, '#ff0077', 1.4);
                    this.particles.addDecal(this.player.x, 80, 45, 'rgba(0,0,0,0.8)', 'scorch');

                    this.player.vy = 0.28;
                    this.player.y = 88;
                    
                    this.player.takeDamage(30, this.player.x, 70, this.particles, this.canvasCtrl);
                    
                    this.particles.spawnShockwave(this.player.x, 85, this.player.color, 80);
                    this.canvasCtrl.addFloorPulse(this.player.x, 85, '#ff0077', 220);
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.45)', 220); // white slam flash
                    this.canvasCtrl.shake(14, 300);
                    this.audioSynth.playHit();
                    
                    this.checkWinCondition();
                }
            }
        }

        // Enemy samurai hitting bottom tower (player)
        let hitBottomTower = false;
        let hittingNode = this.enemy;

        if (!enemyAlive) {
            // dead enemy cannot ram
        } else if (this.enemy.isBoss && this.enemy.ragdollNodes) {
            for (let n = 0; n < this.enemy.ragdollNodes.length; n++) {
                const node = this.enemy.ragdollNodes[n];
                if (node.y + node.radius > h - 85) {
                    if (node.x + node.radius >= w / 2 - 80 && node.x - node.radius <= w / 2 + 80) {
                        hitBottomTower = true;
                        hittingNode = node;
                        break;
                    }
                }
            }
        } else {
            if (this.enemy.y + this.enemy.radius > h - 85) {
                if (this.enemy.x + this.enemy.radius >= w / 2 - 80 && this.enemy.x - this.enemy.radius <= w / 2 + 80) {
                    hitBottomTower = true;
                }
            }
        }

        if (hitBottomTower) {
            const impactForce = Math.abs(hittingNode.vy);
            // One ram per charge: the boss ragdoll (and, online, the re-synced
            // replica) would otherwise register a new ram every frame
            if (impactForce > 0.05 && this.enemyRamCooldown <= 0) {
                this.enemyRamCooldown = this.enemy.isBoss ? 1500 : 800;
                const ramDmg = this.enemy.isBoss ? 150 : (this.player.profiles[this.enemy.activeWeaponKey]?.ramDamage || 100);
                this.damageTower('bottom', ramDmg);
                
                this.hitStopTimer = 50; // Massive tower ram freeze frame!
                this.particles.spawnDamageText(hittingNode.x, h - 70, `RAM! -${ramDmg}`, '#00f0ff', 1.4);
                this.particles.addDecal(hittingNode.x, h - 80, 45, 'rgba(0,0,0,0.8)', 'scorch');

                if (this.enemy.isBoss && this.enemy.ragdollNodes) {
                    this.enemy.ragdollNodes.forEach(node => {
                        node.vy = -0.28;
                        node.y -= 10;
                    });
                } else {
                    this.enemy.vy = -0.28;
                    this.enemy.y = h - 88;
                }
                
                this.enemy.takeDamage(30, hittingNode.x, h - 70, this.particles, this.canvasCtrl);
                
                this.particles.spawnShockwave(hittingNode.x, h - 85, this.enemy.color, 80);
                this.canvasCtrl.addFloorPulse(hittingNode.x, h - 85, '#00f0ff', 220);
                this.canvasCtrl.flash('rgba(255, 0, 51, 0.45)', 250); // red warn flash
                this.canvasCtrl.shake(14, 300);
                this.audioSynth.playHit();
                
                this.checkWinCondition();
            }
        }
    }

    checkWinCondition() {
        if (this.gameState !== 'playing') return;
        if (this.isMultiplayer) {
            // Only my own tower is simulated here; the opponent announces
            // their own tower's fall via 'match_end'.
            if (this.bottomTower.hp <= 0) this.declareMatchEnd(false);
            return;
        }
        if (this.topTower.hp <= 0) {
            // Player Wins!
            this.handleVictory();
        } else if (this.bottomTower.hp <= 0) {
            // Player Loses!
            this.handleDefeat();
        }
    }

    handleVictory() {
        this.gameState = 'victory';
        
        const isBoss = !this.isMultiplayer && this.isHardBossRound;
        
        // Victory score bonuses
        const victoryBaseBonus = isBoss ? 2500 : 1000;
        // Remaining time bonus (10 points per second left)
        const timeBonus = Math.max(0, Math.floor((this.matchTimer / 1000) * 10));
        // Remaining tower health bonus
        const towerHpBonus = Math.max(0, Math.floor(this.bottomTower.hp));
        
        const finalScore = (this.currentScore || 0) + victoryBaseBonus + timeBonus + towerHpBonus;
        this.currentScore = finalScore;

        // Record match in scoreboard
        const samuraiName = this.player.profile?.name || 'Cyber Ronin';
        const currentWave = this.upgradeMgr.state.highestWave || 1;
        const resultStats = this.upgradeMgr.recordMatchResult({
            score: finalScore,
            wave: currentWave,
            samurai: samuraiName,
            result: 'Vinst',
            kills: this.matchKills || 0
        });

        // Award credits (multiplied by hacker level)
        const creditUpgradeModifier = 1 + (this.upgradeMgr.state.upgrades.credits || 0) * 0.2; // up to +100% credits
        const baseAward = isBoss ? 120 : 60;
        const rewardCredits = Math.floor(baseAward * creditUpgradeModifier);
        
        this.upgradeMgr.addCredits(rewardCredits);
        this.upgradeMgr.recordHighestWave(currentWave + 1);
        
        this.uiCtrl.renderVictory(rewardCredits, isBoss, finalScore, this.matchKills || 0, resultStats.isNewHighScore);
        this.offerPodiumName('victory', resultStats);
        this.audioSynth.playVictory();
    }

    handleDefeat() {
        this.gameState = 'gameover';
        
        const finalScore = this.currentScore || 0;
        const samuraiName = this.player.profile?.name || 'Cyber Ronin';
        const currentWave = this.upgradeMgr.state.highestWave || 1;
        const resultStats = this.upgradeMgr.recordMatchResult({
            score: finalScore,
            wave: currentWave,
            samurai: samuraiName,
            result: 'Förlust',
            kills: this.matchKills || 0
        });

        // Suffer partial credit loss/award
        const rewardCredits = 10;
        this.upgradeMgr.addCredits(rewardCredits);
        
        this.uiCtrl.renderGameOver(rewardCredits, this.isMultiplayer ? 'Motståndaren' : 'Datorn', finalScore, this.matchKills || 0, resultStats.isNewHighScore);
        this.offerPodiumName('defeat', resultStats);
        this.audioSynth.playDefeat();
    }

    // A top-3 placement on the leaderboard lets the player sign the entry
    offerPodiumName(kind, resultStats) {
        this.uiCtrl.hidePodiumForms();
        if (!resultStats || !resultStats.rank || resultStats.rank > 3) return;
        this.uiCtrl.showPodiumForm(kind, resultStats.rank, this.upgradeMgr.state.playerName || '', (name) => {
            const ok = this.upgradeMgr.setLeaderboardName(resultStats.entryId, name);
            if (ok) this.audioSynth.playUpgrade();
            return ok;
        });
    }

    // Main Engine rendering calls
    draw() {
        // Clear screen with custom trails persistence (motion blur during play, full 1.0 clear in menus)
        const opacityTrail = this.gameState === 'playing' ? 0.38 : 1.0;
        this.canvasCtrl.clear(opacityTrail);
        
        // Apply camera screen shake translations
        this.canvasCtrl.applyTransformations();
        
        // Draw one-way gate visual effects and lava barrier only when in active playing state!
        if (this.gameState === 'playing') {
            this.drawOneWayGates();
            this.drawLavaBarrier();
        }

        // Draw glowing particles
        this.particles.draw(this.canvasCtrl.ctx);
        
        // Draw Projectiles
        if (this.gameState === 'playing') {
            this.projectiles.forEach(p => {
                this.canvasCtrl.ctx.save();
                this.canvasCtrl.setNeonGlow('#ffffff', 10);
                this.canvasCtrl.ctx.fillStyle = '#ffffff';
                this.canvasCtrl.ctx.beginPath();
                this.canvasCtrl.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.canvasCtrl.ctx.fill();
                this.canvasCtrl.ctx.restore();
            });
        }

        // Draw Entities
        if (this.gameState === 'playing' || this.gameState === 'gameover' || this.gameState === 'victory') {
            // Towers first so a car parked at its base is never hidden behind it
            this.drawTowers();
            this.player.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            this.enemy.draw(this.canvasCtrl.ctx, this.canvasCtrl);
        }
        
        // Restore matrix
        this.canvasCtrl.restoreTransformations();

        // 6. Draw cinematic vignette around arena borders
        this.canvasCtrl.drawVignette();
        
        // UI Hud updates
        if (this.gameState === 'playing') {
            this.uiCtrl.updateHUD(this.player, this.enemy, this.isMultiplayer, this.isClient, this.matchTimer, this.currentScore, this.matchKills);
        }
    }

    drawLavaBarrier() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const centerY = h / 2;
        const lavaMinX = 80;
        const lavaMaxX = w - 80;
        const lavaWidth = lavaMaxX - lavaMinX;
        const halfThick = 25;
        const t = this.lavaTime;
        const flow = t * 55; // horizontal drift of the current, in px

        ctx.save();

        // 1. FLOOR GLOW: pulsing heat bands plus roaming hot spots cast on the stone
        const heatPulse = 1.0 + Math.sin(t * 3.5) * 0.12;
        const heatGradTop = ctx.createLinearGradient(0, centerY - halfThick - 60, 0, centerY - halfThick);
        heatGradTop.addColorStop(0, 'rgba(255, 60, 0, 0)');
        heatGradTop.addColorStop(1, `rgba(255, 80, 0, ${0.38 * heatPulse})`);
        ctx.fillStyle = heatGradTop;
        ctx.fillRect(lavaMinX - 14, centerY - halfThick - 60, lavaWidth + 28, 60);

        const heatGradBottom = ctx.createLinearGradient(0, centerY + halfThick, 0, centerY + halfThick + 60);
        heatGradBottom.addColorStop(0, `rgba(255, 80, 0, ${0.38 * heatPulse})`);
        heatGradBottom.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = heatGradBottom;
        ctx.fillRect(lavaMinX - 14, centerY + halfThick, lavaWidth + 28, 60);

        // 2. RIVER OUTLINE - two undulating shores (kept for the shoreline pass below)
        const steps = 48;
        const dx = lavaWidth / steps;
        const topShore = [];
        const bottomShore = [];
        for (let i = 0; i <= steps; i++) {
            const x = lavaMinX + i * dx;
            topShore.push([x, centerY - halfThick + Math.sin(x * 0.04 + t * 2.2) * 4.5 + Math.cos(x * 0.09 - t * 1.5) * 2.2]);
            bottomShore.push([x, centerY + halfThick + Math.sin(x * 0.045 - t * 2.0) * 4.5 + Math.cos(x * 0.07 + t * 1.7) * 2.2]);
        }
        const traceRiver = () => {
            ctx.beginPath();
            topShore.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            for (let i = steps; i >= 0; i--) ctx.lineTo(bottomShore[i][0], bottomShore[i][1]);
            ctx.closePath();
        };

        traceRiver();
        const riverGrad = ctx.createLinearGradient(0, centerY - halfThick, 0, centerY + halfThick);
        riverGrad.addColorStop(0, '#2a0300');
        riverGrad.addColorStop(0.15, '#8d0f00');
        riverGrad.addColorStop(0.5, '#ff5200');
        riverGrad.addColorStop(0.85, '#8d0f00');
        riverGrad.addColorStop(1, '#2a0300');
        ctx.fillStyle = riverGrad;
        this.canvasCtrl.setNeonGlow('#ff4000', 32);
        ctx.fill();
        this.canvasCtrl.resetNeonGlow();

        // 3. EVERYTHING BELOW IS CLIPPED TO THE RIVER
        ctx.save();
        traceRiver();
        ctx.clip();

        // 3a. Flowing current bands: dashed strokes whose dash offset scrolls with the flow
        const bandColors = ['rgba(255, 40, 0, 0.55)', 'rgba(255, 120, 0, 0.5)', 'rgba(255, 190, 40, 0.45)', 'rgba(255, 120, 0, 0.5)', 'rgba(255, 40, 0, 0.55)'];
        for (let k = 0; k < 5; k++) {
            const layerY = centerY + (k - 2) * 9.5;
            const speedMul = 0.7 + Math.abs(k - 2) * -0.15 + 0.3; // centre flows fastest
            ctx.strokeStyle = bandColors[k];
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.setLineDash([22 + k * 6, 14 + k * 4]);
            ctx.lineDashOffset = -flow * speedMul - k * 17;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = lavaMinX + i * dx;
                const wave = Math.sin(x * 0.035 - t * 3.0 + k) * 4.0 + Math.sin(x * 0.09 + t * 1.3 - k) * 2.0;
                if (i === 0) ctx.moveTo(x, layerY + wave);
                else ctx.lineTo(x, layerY + wave);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // 3b. Roaming incandescent hot spots (additive so they really burn)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.lavaHotspots.forEach(hs => {
            const u = ((hs.u + t * hs.speed) % 1 + 1) % 1;
            const x = lavaMinX + u * lavaWidth;
            const y = centerY + Math.sin(t * 2.0 + hs.phase) * 9;
            const r = hs.size * (1 + 0.2 * Math.sin(t * 5 + hs.phase));
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255, 255, 210, 0.75)');
            g.addColorStop(0.35, 'rgba(255, 200, 60, 0.45)');
            g.addColorStop(1, 'rgba(255, 90, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        });
        ctx.restore();

        // 3c. White-hot core veins
        ctx.strokeStyle = 'rgba(255, 250, 225, 0.9)';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.setLineDash([60, 40]);
        for (let v = 0; v < 2; v++) {
            ctx.lineDashOffset = -flow * (1.2 + v * 0.3) - v * 50;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = lavaMinX + i * dx;
                const wave = Math.sin(x * 0.06 + t * 4.0 + v * 2) * 3.5 + Math.cos(x * 0.12 - t * 3.2) * 2.0;
                const y = centerY + (v === 0 ? -4 : 5) + wave;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // 3d. Drifting obsidian crust plates with a molten rim and glowing fractures
        this.lavaCrustPlates.forEach(plate => {
            const px = lavaMinX + plate.u * lavaWidth;
            ctx.save();
            ctx.translate(px, centerY + plate.yOffset);
            ctx.rotate(plate.angle);

            const body = () => {
                ctx.beginPath();
                plate.points.forEach((pt, idx) => {
                    const ppx = pt.x * (plate.width / 2);
                    const ppy = pt.y * (plate.height / 2);
                    if (idx === 0) ctx.moveTo(ppx, ppy);
                    else ctx.lineTo(ppx, ppy);
                });
                ctx.closePath();
            };

            // Molten rim glow around the cold rock
            ctx.shadowColor = '#ff6a00';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#120a0a';
            body();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Rock body shading
            const rockGrad = ctx.createLinearGradient(-plate.width / 2, -plate.height / 2, plate.width / 2, plate.height / 2);
            rockGrad.addColorStop(0, '#2a1a18');
            rockGrad.addColorStop(1, '#0d0707');
            ctx.fillStyle = rockGrad;
            body();
            ctx.fill();
            ctx.strokeStyle = '#5a2412';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing fractures, pulsing
            const crackGlow = 0.6 + 0.4 * Math.sin(t * 6 + plate.u * 20);
            ctx.strokeStyle = `rgba(255, ${Math.round(110 + 60 * crackGlow)}, 0, ${0.7 + 0.3 * crackGlow})`;
            ctx.lineWidth = 1.3;
            ctx.shadowColor = '#ff5500';
            ctx.shadowBlur = 6 + 6 * crackGlow;
            ctx.beginPath();
            ctx.moveTo(-plate.width * 0.38, plate.height * 0.05);
            ctx.lineTo(-plate.width * 0.05, -plate.height * 0.2);
            ctx.lineTo(plate.width * 0.12, plate.height * 0.28);
            ctx.lineTo(plate.width * 0.36, -plate.height * 0.08);
            ctx.moveTo(-plate.width * 0.05, -plate.height * 0.2);
            ctx.lineTo(plate.width * 0.02, -plate.height * 0.45);
            ctx.stroke();

            ctx.restore();
        });

        // 3e. Swelling magma bubbles
        this.lavaBubbles.forEach(b => {
            ctx.save();
            const bubbleGrad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1, b.x, b.y, b.radius);
            bubbleGrad.addColorStop(0, '#ffffff');
            bubbleGrad.addColorStop(0.3, '#ffcc00');
            bubbleGrad.addColorStop(0.7, '#ff3300');
            bubbleGrad.addColorStop(1, '#660a00');
            ctx.fillStyle = bubbleGrad;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(b.x - b.radius * 0.2, b.y - b.radius * 0.2, b.radius * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore(); // end river clip

        // 4. COOLED SHORELINE: dark crust lip with a searing seam just inside it
        const strokeShore = (pts) => {
            ctx.beginPath();
            pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            ctx.stroke();
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a0806';
        ctx.lineWidth = 4;
        strokeShore(topShore);
        strokeShore(bottomShore);
        ctx.strokeStyle = `rgba(255, 150, 20, ${0.75 + 0.25 * Math.sin(t * 4)})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#ff8a00';
        ctx.shadowBlur = 10;
        strokeShore(topShore.map(([x, y]) => [x, y + 3]));
        strokeShore(bottomShore.map(([x, y]) => [x, y - 3]));
        ctx.shadowBlur = 0;

        // 5. HEAT SHIMMER: faint rising streaks above and below the river
        for (let i = 0; i < 14; i++) {
            const u = ((i / 14) + t * 0.03 + Math.sin(i * 7.3) * 0.02) % 1;
            const x = lavaMinX + u * lavaWidth;
            const rise = ((t * 40 + i * 13) % 70);
            const alpha = 0.035 + 0.03 * Math.sin(t * 6 + i);
            const sw = 10 + (i % 3) * 6;
            const gTop = ctx.createLinearGradient(0, centerY - halfThick - rise, 0, centerY - halfThick - rise - 55);
            gTop.addColorStop(0, `rgba(255, 140, 20, ${alpha})`);
            gTop.addColorStop(1, 'rgba(255, 140, 20, 0)');
            ctx.fillStyle = gTop;
            ctx.fillRect(x - sw / 2, centerY - halfThick - rise - 55, sw, 55);
            const gBot = ctx.createLinearGradient(0, centerY + halfThick + rise, 0, centerY + halfThick + rise + 55);
            gBot.addColorStop(0, `rgba(255, 140, 20, ${alpha})`);
            gBot.addColorStop(1, 'rgba(255, 140, 20, 0)');
            ctx.fillStyle = gBot;
            ctx.fillRect(x + sw / 2, centerY + halfThick + rise, sw, 55);
        }

        ctx.restore();
    }

    drawOneWayGates() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const centerY = h / 2;
        
        ctx.save();
        
        // 1. LEFT PASSAGE (UPWARDS ONLY): Carved Stone Archway & Glowing Green Runes
        ctx.fillStyle = '#1c2026';
        ctx.strokeStyle = '#383f4c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(14, centerY - 6, 52, 12, 4);
        } else {
            ctx.rect(14, centerY - 6, 52, 12);
        }
        ctx.fill();
        ctx.stroke();

        // Carved directional stone glyph pointing UP
        this.canvasCtrl.setNeonGlow('var(--neon-green)', 16);
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.moveTo(40, centerY - 16);
        ctx.lineTo(32, centerY - 5);
        ctx.lineTo(48, centerY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 2. RIGHT PASSAGE (DOWNWARDS ONLY): Carved Stone Archway & Glowing Crimson/Pink Runes
        ctx.fillStyle = '#1c2026';
        ctx.strokeStyle = '#383f4c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(w - 66, centerY - 6, 52, 12, 4);
        } else {
            ctx.rect(w - 66, centerY - 6, 52, 12);
        }
        ctx.fill();
        ctx.stroke();

        // Carved directional stone glyph pointing DOWN
        this.canvasCtrl.setNeonGlow('var(--neon-pink)', 16);
        ctx.fillStyle = '#ff0077';
        ctx.beginPath();
        ctx.moveTo(w - 40, centerY + 16);
        ctx.lineTo(w - 48, centerY + 5);
        ctx.lineTo(w - 32, centerY + 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
    }

    drawTowers() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const t = this.lavaTime;

        ctx.save();

        // Helper to render a majestic fortress citadel tower
        const renderGrandCitadel = (centerX, centerY, isTop, hp, maxHp, primaryColor, coreColor, isLeftOrRightSplit = false) => {
            ctx.save();
            const dir = isTop ? 1 : -1;
            const healthRatio = Math.max(0, hp / maxHp);
            const baseWidth = isLeftOrRightSplit ? 90 : 190;
            const halfW = baseWidth / 2;
            const citadelH = 80;

            // 1. AMBIENT RADIANT POWER GLOW (Backdrop lighting from reactor)
            const corePulse = 1.0 + Math.sin(t * 3.5 + (isTop ? 0 : 2.0)) * 0.15;
            const auraGrad = ctx.createRadialGradient(centerX, centerY + dir * 35, 10, centerX, centerY + dir * 35, 90);
            auraGrad.addColorStop(0, primaryColor.replace('rgb', 'rgba').replace(')', `, ${0.35 * corePulse})`));
            auraGrad.addColorStop(0.6, primaryColor.replace('rgb', 'rgba').replace(')', `, ${0.12 * corePulse})`));
            auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(centerX - 110, isTop ? 0 : h - 110, 220, 110);

            // 2. MONUMENTAL BASALT FORTRESS CITADEL BODY
            // Main Outer Fortress Base
            ctx.fillStyle = '#14171d';
            ctx.strokeStyle = '#2d3542';
            ctx.lineWidth = 3;
            ctx.beginPath();
            if (isTop) {
                ctx.moveTo(centerX - halfW - 12, 0);
                ctx.lineTo(centerX + halfW + 12, 0);
                ctx.lineTo(centerX + halfW + 6, citadelH - 16);
                ctx.lineTo(centerX + halfW - 14, citadelH);
                ctx.lineTo(centerX - halfW + 14, citadelH);
                ctx.lineTo(centerX - halfW - 6, citadelH - 16);
            } else {
                ctx.moveTo(centerX - halfW - 12, h);
                ctx.lineTo(centerX + halfW + 12, h);
                ctx.lineTo(centerX + halfW + 6, h - citadelH + 16);
                ctx.lineTo(centerX + halfW - 14, h - citadelH);
                ctx.lineTo(centerX - halfW + 14, h - citadelH);
                ctx.lineTo(centerX - halfW - 6, h - citadelH + 16);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Chiseled Stone Bastion Blocks & Quoins
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1.5;
            for (let step = 1; step <= 3; step++) {
                const yOff = isTop ? step * 20 : h - step * 20;
                ctx.beginPath();
                ctx.moveTo(centerX - halfW + 8, yOff);
                ctx.lineTo(centerX + halfW - 8, yOff);
                ctx.stroke();
            }

            // Flanking Watchtower Bastion Spires (Left & Right Conductor Pylons)
            const pylonW = 18;
            [-1, 1].forEach(side => {
                const px = centerX + side * (halfW - 8);
                ctx.fillStyle = '#1b1f28';
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 2;
                this.canvasCtrl.setNeonGlow(primaryColor, 10);
                
                ctx.beginPath();
                if (isTop) {
                    ctx.rect(px - pylonW / 2, 0, pylonW, citadelH + 6);
                } else {
                    ctx.rect(px - pylonW / 2, h - citadelH - 6, pylonW, citadelH + 6);
                }
                ctx.fill();
                ctx.stroke();

                // Conductor Gem on Pylon Tip
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                const tipY = isTop ? citadelH + 6 : h - citadelH - 6;
                ctx.arc(px, tipY, 4.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // 3. CEREMONIAL RUNIC CHARGING MATRIX (LADDA ZONE)
            const chargeCenterY = isTop ? 42 : h - 42;
            ctx.save();
            this.canvasCtrl.setNeonGlow(primaryColor, 18);
            
            // Outer Glowing Runic Circle
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(centerX, chargeCenterY, 32, 0, Math.PI * 2);
            ctx.stroke();

            // Concentric Hexagonal Energy Flux Web
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const ang = (i * Math.PI) / 3 + t * 0.8 * dir;
                const hx = centerX + Math.cos(ang) * 22;
                const hy = chargeCenterY + Math.sin(ang) * 22;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();

            // Radial Power Conduits
            for (let i = 0; i < 4; i++) {
                const ang = (i * Math.PI) / 2 + t * 1.2 * dir;
                ctx.beginPath();
                ctx.moveTo(centerX + Math.cos(ang) * 8, chargeCenterY + Math.sin(ang) * 8);
                ctx.lineTo(centerX + Math.cos(ang) * 30, chargeCenterY + Math.sin(ang) * 30);
                ctx.stroke();
            }
            ctx.restore();

            // 4. FLOATING PLASMA / ARCANE REACTOR CORE
            ctx.save();
            const coreY = isTop ? 42 : h - 42;
            const coreSize = 14 * corePulse;
            
            // Dynamic Rotating Plasma Core Halo
            const coreGrad = ctx.createRadialGradient(centerX, coreY, 2, centerX, coreY, coreSize * 1.5);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.4, coreColor);
            coreGrad.addColorStop(0.8, primaryColor);
            coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = coreGrad;
            this.canvasCtrl.setNeonGlow(coreColor, 25);
            ctx.beginPath();
            ctx.arc(centerX, coreY, coreSize * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Searing Diamond Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(centerX, coreY - coreSize * 0.7);
            ctx.lineTo(centerX + coreSize * 0.7, coreY);
            ctx.lineTo(centerX, coreY + coreSize * 0.7);
            ctx.lineTo(centerX - coreSize * 0.7, coreY);
            ctx.closePath();
            ctx.fill();

            // Electric Arcs crackling from the core
            if (Math.random() < 0.35) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                const arcAng = Math.random() * Math.PI * 2;
                const arcDist = 18 + Math.random() * 18;
                ctx.beginPath();
                ctx.moveTo(centerX, coreY);
                ctx.lineTo(centerX + Math.cos(arcAng) * (arcDist * 0.5) + (Math.random() - 0.5) * 8, coreY + Math.sin(arcAng) * (arcDist * 0.5) + (Math.random() - 0.5) * 8);
                ctx.lineTo(centerX + Math.cos(arcAng) * arcDist, coreY + Math.sin(arcAng) * arcDist);
                ctx.stroke();
            }
            ctx.restore();

            // 5. GRAND FORTRESS EMBEDDED HEALTH ARCH & CREST
            const barW = Math.min(130, baseWidth - 30);
            const barH = 7;
            const barX = centerX - barW / 2;
            const barY = isTop ? 72 : h - 79;

            // Bar Stone Housing
            ctx.fillStyle = '#0a0d12';
            ctx.strokeStyle = '#323a48';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(barX - 2, barY - 2, barW + 4, barH + 4);
            ctx.fill();
            ctx.stroke();

            // Glowing Power Fill
            const fillW = Math.max(0, barW * healthRatio);
            if (fillW > 0) {
                const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
                barGrad.addColorStop(0, primaryColor);
                barGrad.addColorStop(0.7, coreColor);
                barGrad.addColorStop(1, '#ffffff');
                ctx.fillStyle = barGrad;
                this.canvasCtrl.setNeonGlow(coreColor, 12);
                ctx.fillRect(barX, barY, fillW, barH);
            }

            ctx.restore();
        };

        // --- RENDER TOP CITADEL (Crimson Magma Fortress) ---
        const topPrimary = this.isHardBossRound ? 'rgb(220, 20, 60)' : 'rgb(255, 0, 119)';
        const topCore = this.isHardBossRound ? '#ff2200' : '#ff44aa';

        if (this.isHardBossRound) {
            renderGrandCitadel(120, 0, true, this.topTower.hp, this.topTower.maxHp, topPrimary, topCore, true);
            renderGrandCitadel(w - 120, 0, true, this.topTower.hp, this.topTower.maxHp, topPrimary, topCore, true);
        } else {
            renderGrandCitadel(w / 2, 0, true, this.topTower.hp, this.topTower.maxHp, topPrimary, topCore, false);
        }

        // --- RENDER BOTTOM CITADEL (Arcane Plasma Fortress) ---
        const botPrimary = 'rgb(0, 240, 255)';
        const botCore = '#aaffff';
        renderGrandCitadel(w / 2, h, false, this.bottomTower.hp, this.bottomTower.maxHp, botPrimary, botCore, false);

        // Damage ember emissions for damaged towers
        if (this.topTower.hp < this.topTower.maxHp * 0.75) {
            // Boss rounds have twin citadels at the corners instead of one in the middle
            const emberX = this.isHardBossRound ? (Math.random() < 0.5 ? 120 : w - 120) : w / 2;
            this.particles.spawnDamageEmbers(emberX + (Math.random() - 0.5) * (this.isHardBossRound ? 70 : 140), 50, '#ff0055');
        }
        if (this.bottomTower.hp < this.bottomTower.maxHp * 0.75) {
            this.particles.spawnDamageEmbers(w / 2 + (Math.random() - 0.5) * 140, h - 50, '#00f0ff');
        }

        ctx.restore();
    }

    // Main Engine rendering cycle loop (RAF)
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (dt > 100) dt = 100;

        // Gamepad input (no-op when none is connected)
        this.inputCtrl.pollGamepad(dt);
        if (this.inputCtrl.gamepadIndex !== null && this.gameState !== 'playing') {
            const vis = document.querySelector('.overlay-screen:not(.hidden)');
            const id = vis ? vis.id : null;
            if (id !== this.gpLastScreen) {
                this.gpLastScreen = id;
                this.gamepadMenuNav('focus');
            }
        }

        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start game when page resources load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game(); // exposed for debugging in the console
});
