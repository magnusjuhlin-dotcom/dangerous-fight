/* DANGEROUS FIGHT - MAIN CORE GAME LOOP & SYSTEM ORCHESTRATOR */

import { CanvasController } from './canvas.js';
import { AudioSynth } from './audio.js';
import { InputController } from './input.js';
import { UpgradeManager } from './upgrades.js';
import { CreditStore, CREDIT_PACKS, HELPERS, HELPER_PACKS, CHEATS, CHEAT_PACKS } from './store.js';
import { I18n } from './i18n.js';
import { Trailer } from './trailer.js';
import { Settings } from './settings.js';
import { Missions } from './missions.js';
import { LevelArena, levelForWave, WAVES_PER_LEVEL, MAX_LEVEL } from './levels.js';
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
        this.settings = new Settings();
        this.missions = new Missions(this.upgradeMgr);
        // a 2-player match on one phone records nothing, missions included
        const trackMission = this.missions.track.bind(this.missions);
        this.missions.track = (...args) => (this.local2p ? undefined : trackMission(...args));
        const applySound = () => {
            this.audioSynth.setVolumes(this.settings.get('music'), this.settings.get('effects'));
            this.audioSynth.voiceOn = this.settings.get('voice');
        };
        applySound();
        this.settings.onChange(applySound);
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

        // 2 vs 2: extra samurai. `ally` fights on my team, `enemy2` is the
        // other team's second samurai. Null in a normal 1v1 match.
        this.teamMatch = false;
        // Set before startRun() for a team match:
        //   { size: 2..4, allies: ['ai'|'remote', ...], foes: ['ai'|'remote', ...] }
        // `allies`/`foes` hold the slots BESIDES this.player / this.enemy.
        this.teamLayout = null;
        this.teamNet = null;  // team match over the network (see TEAM NETWORKING)
        this.allies = [];   // my team mates
        this.foes = [];     // the other team's samurai besides this.enemy
        this.teamRamCooldowns = new Map();

        // Realistic Lava Simulation state
        this.lavaTime = 0;
        this.lastLavaSizzlePlayer = 0;
        this.lastLavaSizzleEnemy = 0;
        this.lavaBubbles = [];
        // (the melt and its crust are textures: CanvasController.getLavaTextures)

        this.initUIEvents();
        this.initInputEvents();
        
        // Setup initial menu state rendering
        this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
        this.uiCtrl.showScreen('menu');
        
        // Kickoff RAF loop
        requestAnimationFrame((t) => this.loop(t));
    }

    // Bind DOM overlay menu buttons
    // Swipe sideways between the menu pages: main menu -> scoreboard -> dojo
    // -> ... in the order of the main menu buttons. Each page is opened
    // through its own menu button, so it is rendered exactly as usual.
    static get MENU_PAGES() {
        return [
            { screen: 'main-menu', open: null },
            { screen: 'scoreboard-screen', open: 'btn-scoreboard' },
            { screen: 'weapons-menu', open: 'btn-weapons' },
            { screen: 'cannons-menu', open: 'btn-cannons' },
            { screen: 'upgrades-menu', open: 'btn-upgrades' },
            { screen: 'reinforce-screen', open: 'btn-reinforce' },
            { screen: 'coin-shop-screen', open: 'btn-coin-shop' },
            { screen: 'helper-shop-screen', open: 'btn-helper-shop' },
            { screen: 'cheat-shop-screen', open: 'btn-cheat-shop' },
            { screen: 'missions-screen', open: 'btn-missions' },
            { screen: 'howto-screen', open: 'btn-howto' }
        ];
    }

    currentMenuPage() {
        if (this.gameState === 'playing') return -1;
        const box = document.getElementById('lang-box');
        if (box && !box.classList.contains('hidden')) return -1;
        return Game.MENU_PAGES.findIndex(p => {
            const el = document.getElementById(p.screen);
            return el && !el.classList.contains('hidden');
        });
    }

    goToMenuPage(index, dir) {
        const pages = Game.MENU_PAGES;
        if (index < 0 || index >= pages.length) return;
        const page = pages[index];
        if (page.open) document.getElementById(page.open).click();
        else { this.audioSynth.playClick(); this.uiCtrl.showScreen('menu'); }
        const el = document.getElementById(page.screen);
        if (el) {
            // slide in from the side the finger came from
            el.classList.remove('slide-from-left', 'slide-from-right');
            void el.offsetWidth; // restart the animation
            el.classList.add(dir > 0 ? 'slide-from-right' : 'slide-from-left');
            // only for this visit: otherwise it slides in again whenever the
            // screen is shown later (by a button, TILLBAKA...)
            clearTimeout(el.slideTimer);
            el.slideTimer = setTimeout(() => el.classList.remove('slide-from-left', 'slide-from-right'), 300);
        }
        this.updateMenuDots();
    }

    updateMenuDots() {
        const dots = document.getElementById('menu-dots');
        if (!dots) return;
        const cur = this.currentMenuPage();
        dots.classList.toggle('hidden', cur < 0);
        if (cur < 0) return;
        if (dots.children.length !== Game.MENU_PAGES.length) {
            dots.innerHTML = Game.MENU_PAGES.map(() => '<span></span>').join('');
        }
        [...dots.children].forEach((d, i) => d.classList.toggle('on', i === cur));
    }

    initMenuSwipe() {
        let start = null;
        const begin = (x, y, target) => {
            // a table that scrolls sideways (the scoreboard) keeps its own swipes
            const scroller = target && target.closest && target.closest('.leaderboard-table-wrapper');
            start = this.currentMenuPage() >= 0 && !scroller ? { x, y, t: performance.now() } : null;
        };
        const end = (x, y) => {
            if (!start) return false;
            const dx = x - start.x, dy = y - start.y, dt = performance.now() - start.t;
            start = null;
            // a clear sideways flick, not a scroll or a tap
            if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5 || dt > 900) return false;
            const cur = this.currentMenuPage();
            if (cur < 0) return false;
            const dir = dx < 0 ? 1 : -1; // finger to the left = next page
            this.goToMenuPage(cur + dir, dir);
            return true;
        };
        window.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) begin(e.touches[0].clientX, e.touches[0].clientY, e.target);
        }, { passive: true });
        window.addEventListener('touchend', (e) => {
            const t = e.changedTouches[0];
            if (t) end(t.clientX, t.clientY);
        }, { passive: true });
        window.addEventListener('touchcancel', () => { start = null; }, { passive: true });
        window.addEventListener('mousedown', (e) => begin(e.clientX, e.clientY, e.target));
        window.addEventListener('mouseup', (e) => {
            if (!end(e.clientX, e.clientY)) return;
            // A mouse drag still ends in a click on the button or shop card it
            // started on: swallow it, or the swipe also starts a match / buys
            const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
            window.addEventListener('click', swallow, true);
            setTimeout(() => window.removeEventListener('click', swallow, true), 0);
        });
        // Tapping a dot jumps straight to that page
        document.getElementById('menu-dots').addEventListener('click', (e) => {
            const dots = e.currentTarget;
            const dot = e.target.closest('span');
            if (!dot) return;
            const i = [...dots.children].indexOf(dot);
            const cur = this.currentMenuPage();
            if (cur < 0 || i < 0 || i === cur) return;
            this.goToMenuPage(i, i > cur ? 1 : -1);
        });

        // keep the page dots right whatever opened the screen (buttons, back...)
        const watch = new MutationObserver(() => { this.updateMenuDots(); this.updateMissionsBadge(); });
        document.querySelectorAll('.overlay-screen').forEach(el => watch.observe(el, { attributes: true, attributeFilter: ['class'] }));
        this.updateMenuDots();
    }

    // ---- Settings, missions, pause ----
    initExtraScreens() {
        const s = this.settings;
        const $ = (id) => document.getElementById(id);

        // Settings: opened from the menu gear or from the pause screen
        const openSettings = (from) => {
            this.settingsReturn = from;
            this.audioSynth.playClick();
            this.renderSettings();
            this.uiCtrl.showScreen('settings');
        };
        $('btn-settings').addEventListener('click', () => openSettings('menu'));
        $('btn-pause-settings').addEventListener('click', () => openSettings('pause'));
        $('btn-settings-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen(this.settingsReturn === 'pause' ? 'pause' : 'menu');
        });
        $('set-music').addEventListener('input', (e) => s.set('music', e.target.value / 100));
        $('set-effects').addEventListener('input', (e) => s.set('effects', e.target.value / 100));
        $('set-effects').addEventListener('change', () => this.audioSynth.playClick()); // hear the new level
        $('set-voice').addEventListener('change', (e) => s.set('voice', e.target.checked));
        $('set-vibration').addEventListener('change', (e) => {
            s.set('vibration', e.target.checked);
            s.vibrate(60); // feel it switch on
        });
        // The difficulty can be picked in settings and right before a match
        document.querySelectorAll('.difficulty-picker').forEach((picker) => {
            picker.addEventListener('click', (e) => {
                const btn = e.target.closest('.diff-btn');
                if (!btn) return;
                this.audioSynth.playClick();
                s.set('difficulty', btn.dataset.diff);
                this.renderDifficulty();
            });
        });
        this.renderDifficulty();

        // Missions
        $('btn-missions').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.renderMissions();
            this.uiCtrl.showScreen('missions');
        });
        $('btn-missions-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });
        this.updateMissionsBadge();

        // Pause (matches against the computer only: online the others keep playing)
        $('btn-pause').addEventListener('click', () => this.pauseMatch());
        $('btn-resume').addEventListener('click', () => this.resumeMatch());
        $('btn-quit-match').addEventListener('click', () => this.quitMatch());

        // Back from the perk choice: nothing has started yet
        $('btn-perks-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.perkChoice = null; // a card clicked just before must not start the match
            // startRun counted this match for the every-other-one boss rule: undo it
            const st = this.upgradeMgr.state;
            if (!this.isMultiplayer && !this.teamLayout && st.matchCount > 0) {
                st.matchCount--;
                this.upgradeMgr.save();
            }
            this.leaveToMenu();
        });
    }

    renderSettings() {
        const s = this.settings;
        document.getElementById('set-music').value = Math.round(s.get('music') * 100);
        document.getElementById('set-effects').value = Math.round(s.get('effects') * 100);
        document.getElementById('set-voice').checked = s.get('voice');
        document.getElementById('set-vibration').checked = s.get('vibration');
        this.renderDifficulty();
    }

    renderDifficulty() {
        const d = this.settings.get('difficulty');
        document.querySelectorAll('.diff-btn[data-diff]').forEach((b) => b.classList.toggle('selected', b.dataset.diff === d));
    }

    renderMissions() {
        const list = document.getElementById('missions-list');
        const credits = document.getElementById('credits-missions-val');
        if (credits) credits.innerText = this.upgradeMgr.state.credits;
        list.innerHTML = '';
        this.missions.list().forEach((m) => {
            const row = document.createElement('div');
            row.className = 'mission' + (m.claimed ? ' claimed' : m.done ? ' done' : '');
            row.innerHTML = `<div class="mission-top"><span></span><span class="mission-reward"></span></div>
                <div class="mission-bar"><div></div></div>
                <div class="mission-bottom"><span></span></div>`;
            row.querySelector('.mission-top span').innerText = m.text;
            row.querySelector('.mission-reward').innerText = `⚡ ${m.reward}`;
            row.querySelector('.mission-bar > div').style.width = `${Math.round(100 * m.progress / m.goal)}%`;
            row.querySelector('.mission-bottom span').innerText = `${m.progress} / ${m.goal}`;
            if (m.claimed) {
                const done = document.createElement('span');
                done.innerText = 'HÄMTAD ✓';
                row.querySelector('.mission-bottom').appendChild(done);
            } else if (m.done) {
                const btn = document.createElement('button');
                btn.className = 'btn btn-primary neon-btn-green mission-claim';
                btn.innerText = 'HÄMTA';
                btn.addEventListener('click', () => {
                    if (this.missions.claim(m.id)) {
                        this.audioSynth.playUpgrade();
                        this.settings.vibrate(60);
                    }
                    this.renderMissions();
                    this.updateMissionsBadge();
                });
                row.querySelector('.mission-bottom').appendChild(btn);
            }
            list.appendChild(row);
        });
    }

    updateMissionsBadge() {
        const badge = document.getElementById('missions-badge');
        if (!badge || !this.missions) return;
        const n = this.missions.readyCount();
        badge.innerText = n;
        badge.classList.toggle('hidden', n === 0);
    }

    pauseMatch() {
        if (this.gameState !== 'playing' || this.isMultiplayer || (this.trailer && this.trailer.active)) return;
        // The finisher runs on the wall clock: paused, it would run out and
        // drop the result, leaving a match with a fallen tower
        if (this.finisher) return;
        this.audioSynth.playClick();
        this.gameState = 'paused';
        this.pausedAt = performance.now();
        // Drop an aim in progress: its release is ignored while paused, so a
        // gamepad aim (which holds the samurai still) left it frozen, and a
        // swipe left the aim line hanging, after resuming
        this.player.isAiming = false;
        this.player.aimDx = 0;
        this.player.aimDy = 0;
        this.audioSynth.stopMusic();
        this.uiCtrl.showScreen('pause');
    }

    resumeMatch() {
        if (this.gameState !== 'paused') return;
        this.audioSynth.playClick();
        // the raseri's 6 s are wall clock too: give back the time spent paused
        if (this.rageUntil) this.rageUntil += performance.now() - (this.pausedAt || performance.now());
        this.gameState = 'playing';
        this.uiCtrl.showScreen('hud');
        this.audioSynth.startMusic();
    }

    quitMatch() {
        this.audioSynth.playClick();
        this.leaveToMenu();
    }

    // Out of a match (or the perk choice) straight to the main menu, nothing recorded
    leaveToMenu() {
        this.finisher = null;
        this.gameState = 'menu';
        this.teamLayout = null;
        this.clearTeamMatch();
        this.slowMoTimer = 0;
        this.particles.clear();
        this.projectiles = [];
        this.audioSynth.stopMusic();
        const banner = document.getElementById('boss-warning');
        if (banner) banner.classList.add('hidden');
        this.uiCtrl.showScreen('menu');
        this.flushLevelUp(); // a level reached by a K.O. before quitting
    }

    initUIEvents() {
        this.initMenuSwipe();
        this.initExtraScreens();
        this.initLocal2pControls();
        document.getElementById('btn-play-local').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.startLocal2p();
        });
        this.updateLevelDisplay();
        // after the language has been chosen (the language box comes first)
        // (the box is only un-hidden further down, so ask whether it will be)
        const giftLangBox = document.getElementById('lang-box');
        if (giftLangBox && !window.i18n.chosen) {
            const waitLang = new MutationObserver(() => {
                if (giftLangBox.classList.contains('hidden')) { waitLang.disconnect(); this.checkDailyGift(); }
            });
            waitLang.observe(giftLangBox, { attributes: true, attributeFilter: ['class'] });
        } else {
            setTimeout(() => this.checkDailyGift(), 600);
        }
        // the app left in the background overnight: a new day, a new gift
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && this.gameState === 'menu' && window.i18n.chosen) this.checkDailyGift();
        });

        // The trailer: a cinematic that plays itself
        this.trailer = new Trailer(this);
        document.getElementById('btn-trailer').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.trailer.start();
        });
        // Single Player vs AI
        document.getElementById('btn-play-ai').addEventListener('click', () => {
            this.audioSynth.playClick();
            // The result screen's "Poängtavla" -> back reaches the menu without
            // leaving the last match: drop its room and team layout, or this
            // starts another team match (or keeps taking the old room's packets)
            this.cleanupNetwork();
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
            const wasTeam = !!this.teamNet;
            this.cleanupNetwork();
            this.showTeamStartButton(false);
            this.uiCtrl.showScreen(wasTeam ? 'team' : 'multiplayer');
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
            const wasTeam = this.joinAsTeam || !!this.teamNet;
            this.joinAsTeam = false;
            this.cleanupNetwork();
            this.uiCtrl.showScreen(wasTeam ? 'team' : 'multiplayer');
        });

        // Connect to peer code (1v1, or joining a team room)
        document.getElementById('btn-connect-peer').addEventListener('click', () => {
            this.audioSynth.playClick();
            const code = document.getElementById('input-room-code').value.trim();
            if (code.length !== 4) {
                document.getElementById('join-status-text').innerText = 'Ange en 4-siffrig kod!';
                return;
            }
            if (this.joinAsTeam) {
                this.joinAsTeam = false;
                this.setupTeamRoom(code, false, this.teamSize || 2);
            } else {
                this.setupMultiplayerClient(code);
            }
        });

        // ---- Team matches (2v2 - 4v4) ----
        this.teamSize = 2;
        const teamRow = document.getElementById('team-size-row');
        if (teamRow) {
            teamRow.querySelectorAll('.team-size-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    this.audioSynth.playClick();
                    this.teamSize = parseInt(btn.dataset.size, 10) || 2;
                    teamRow.querySelectorAll('.team-size-btn').forEach(b => b.classList.remove('selected'));
                    btn.classList.add('selected');
                });
            });
        }

        const teamBtn = document.getElementById('btn-play-team');
        if (teamBtn) {
            teamBtn.addEventListener('click', () => {
                this.audioSynth.playClick();
                this.cleanupNetwork();
                this.uiCtrl.showScreen('team');
            });
        }

        const bind = (id, fn) => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('click', () => { this.audioSynth.playClick(); fn(); });
        };

        bind('btn-team-back', () => {
            this.cleanupNetwork();
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Everyone against the computer, no network at all
        bind('btn-team-ai', () => {
            this.isMultiplayer = false;
            const size = this.teamSize || 2;
            this.teamLayout = {
                size,
                allies: Array(size - 1).fill('ai'),
                foes: Array(size - 1).fill('ai'),
                foe0: 'ai'
            };
            this.startRun();
        });

        bind('btn-team-online', () => this.startTeamQuickMatch(this.teamSize || 2));

        // Host a private team room and share the code
        bind('btn-team-room', () => {
            const code = Math.floor(1000 + Math.random() * 9000).toString();
            this.setupTeamRoom(code, true, this.teamSize || 2);
        });

        bind('btn-team-join', () => {
            this.joinAsTeam = true;
            document.getElementById('join-status-text').innerText = `Ansluter till ${this.teamSize || 2} mot ${this.teamSize || 2}.`;
            document.getElementById('input-room-code').value = '';
            this.uiCtrl.showScreen('join');
        });

        bind('btn-team-start', () => this.startTeamMatchNow());

        // Garage (Weapons) menu
        document.getElementById('btn-weapons').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
            this.uiCtrl.showScreen('weapons');
        });

        // Extra samuraj shop
        document.getElementById('btn-reinforce').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.renderReinforcementShop();
            this.uiCtrl.showScreen('reinforce');
        });
        document.getElementById('btn-reinforce-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });
        
        document.getElementById('btn-weapons-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Cannons menu
        // Samuraj-butik: Cyber-Credits for real money via Google Play
        this.creditStore = new CreditStore(this.upgradeMgr, () => {
            if (!this.uiCtrl.screens.coinshop.classList.contains('hidden')) this.renderCreditShop();
            if (!this.uiCtrl.screens.helpershop.classList.contains('hidden')) this.renderHelperShop();
            if (!this.uiCtrl.screens.cheatshop.classList.contains('hidden')) this.renderCheatShop();
        });
        document.getElementById('btn-cheat-shop').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.creditStore.refresh();
            this.renderCheatShop();
            this.uiCtrl.showScreen('cheatshop');
        });
        document.getElementById('btn-cheat-shop-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });
        document.getElementById('btn-helper-shop').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.creditStore.refresh();
            this.renderHelperShop();
            this.uiCtrl.showScreen('helpershop');
        });
        document.getElementById('btn-helper-shop-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });
        document.getElementById('btn-coin-shop').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.creditStore.refresh();
            this.renderCreditShop();
            this.uiCtrl.showScreen('coinshop');
        });
        document.getElementById('btn-coin-shop-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

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

        // Get the recorded voice lines ready before anyone presses 🔊
        this.audioSynth.preloadRecordings(['intro', 'intro-boss', 'lurvig-kanin',
            ...[...document.querySelectorAll('.overlay-screen')].map(el => el.id)]);
        // "AJ Sports - to the game!" as the game starts
        this.audioSynth.tryStartupVoice();

        // Language box: asked on the first start, and from the menu
        const langBox = document.getElementById('lang-box');
        const chooseLang = (lang) => {
            this.audioSynth.playClick();
            window.i18n.setLang(lang);
            langBox.classList.add('hidden');
        };
        document.getElementById('btn-lang-sv').addEventListener('click', () => chooseLang('sv'));
        document.getElementById('btn-lang-en').addEventListener('click', () => chooseLang('en'));
        document.getElementById('btn-language').addEventListener('click', () => {
            this.audioSynth.playClick();
            langBox.classList.remove('hidden');
        });
        if (!window.i18n.chosen) langBox.classList.remove('hidden');

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
                // A screen with a recorded voice (assets/voice/<screen id>.mp3) plays that
                const screen = [...document.querySelectorAll('.overlay-screen')].find(el => !el.classList.contains('hidden'));
                const started = this.audioSynth.readAloud(text, () => {
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                }, screen ? screen.id : null);
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
            this.playerShoot();
        };
        shootBtn.addEventListener('click', triggerShoot);
        shootBtn.addEventListener('touchstart', triggerShoot, { passive: false });

        const rageBtn = document.getElementById('rage-btn');
        const triggerRage = (e) => {
            if (e.cancelable) e.preventDefault();
            this.activateRage();
        };
        rageBtn.addEventListener('click', triggerRage);
        rageBtn.addEventListener('touchstart', triggerRage, { passive: false });
    }

    // Bind dragging slingshot gameplay inputs
    initInputEvents() {
        this.inputCtrl.onDragStart = (x, y, fromGamepad = false) => {
            if (this.gameState !== 'playing' || this.finisher) return false;
            // 2 players: the top half of the screen belongs to the other player
            if (this.local2p && !fromGamepad && y < this.canvasCtrl.height / 2) return false;
            if (fromGamepad || this.player.containsPoint(x, y)) {
                return this.player.startDrag(fromGamepad);
            }
            return false;
        };

        // Gamepad (Xbox) hooks
        this.inputCtrl.isGameplayActive = () => this.gameState === 'playing';
        this.inputCtrl.onGamepadShoot = () => {
            if (this.gameState === 'playing') this.playerShoot();
        };
        this.inputCtrl.onGamepadSpeak = () => {
            const b = document.getElementById('btn-speak');
            if (b) b.click();
        };
        this.inputCtrl.onGamepadMenu = (action) => this.gamepadMenuNav(action);
        this.inputCtrl.onGamepadPause = () => {
            if (this.gameState === 'playing') this.pauseMatch();
            else if (this.gameState === 'paused') this.resumeMatch();
        };
        this.inputCtrl.onGamepadConnected = (pad) => this.onGamepadConnected(pad);
        
        this.inputCtrl.onDragMove = (dx, dy) => {
            if (this.gameState !== 'playing') return;
            this.player.dragMove(dx, dy);
            // tells the gamepad whether the aim is still on (dying cancels it)
            return this.player.isAiming;
        };

        this.inputCtrl.onDragEnd = (dx, dy) => {
            if (this.gameState !== 'playing') return;
            const before = Math.hypot(this.player.vx, this.player.vy);
            this.player.endDrag();
            if (Math.hypot(this.player.vx, this.player.vy) > before + 0.3) {
                this.missions.track('dash');
                this.tutorialEvent('dash');
            }
        };

        // Keyboard Arrow/WASD fallback
        this.inputCtrl.onKeyboardLaunch = (dirX, dirY) => {
            if (this.gameState !== 'playing' || this.player.state === 'dead') return;
            // (SUPERFART fusk here too, like a swipe: see Player.endDrag)
            const cheatSpeed = this.cheats && this.cheats.speed ? 1.5 : 1;
            this.player.vx = dirX * 1.7 * this.player.profile.speedMultiplier * cheatSpeed;
            this.player.vy = dirY * 1.7 * this.player.profile.speedMultiplier * cheatSpeed;
            this.audioSynth.playSlash(this.player.activeWeaponKey);
            this.missions.track('dash');
            this.tutorialEvent('dash');
        };
    }

    // ---- 2 players on one phone ----
    startLocal2p() {
        this.cleanupNetwork();
        this.isMultiplayer = false;
        this.teamLayout = null;
        this.pendingLocal2p = true;
        this.startRun();
        this.enemy.aiControlled = false; // a person plays it
        this.enemy.energy = 0;
        this.enemy.chargeTimer = 0;
        this.topSwipes = new Map();
    }

    // The top player swipes on the top half and fires with the turned button
    initLocal2pControls() {
        const canvas = this.canvasCtrl.canvas;
        const toArena = (t) => {
            const r = canvas.getBoundingClientRect();
            return { x: (t.clientX - r.left) * this.canvasCtrl.width / r.width, y: (t.clientY - r.top) * this.canvasCtrl.height / r.height };
        };
        canvas.addEventListener('touchstart', (e) => {
            if (!this.local2p || this.gameState !== 'playing' || this.finisher) return;
            for (const t of e.changedTouches) {
                const p = toArena(t);
                if (p.y < this.canvasCtrl.height / 2) this.topSwipes.set(t.identifier, p);
            }
        }, { passive: true });
        const end = (e) => {
            if (!this.local2p || !this.topSwipes) return;
            for (const t of e.changedTouches) {
                const start = this.topSwipes.get(t.identifier);
                if (!start) continue;
                this.topSwipes.delete(t.identifier);
                if (e.type === 'touchcancel' || this.gameState !== 'playing' || this.finisher) continue;
                const p = toArena(t);
                const dx = p.x - start.x, dy = p.y - start.y, d = Math.hypot(dx, dy);
                const e2 = this.enemy;
                if (d < 12 || e2.state === 'dead') continue;
                // same feel as the bottom player's swipe
                const power = Math.min(120, 55 + d) * 0.017;
                e2.vx = (dx / d) * power;
                e2.vy = (dy / d) * power;
                this.audioSynth.playSlash(e2.activeWeaponKey || 'katana');
            }
        };
        canvas.addEventListener('touchend', end, { passive: true });
        canvas.addEventListener('touchcancel', end, { passive: true });
        const fire = (e) => {
            if (e.cancelable) e.preventDefault();
            this.topPlayerShoot();
        };
        const btn = document.getElementById('shoot-btn-2');
        btn.addEventListener('click', fire);
        btn.addEventListener('touchstart', fire, { passive: false });
    }

    topPlayerShoot() {
        const e = this.enemy;
        if (!this.local2p || this.gameState !== 'playing' || e.state === 'dead' || e.energy <= 0) return;
        e.energy--;
        this.audioSynth.playShoot();
        this.spawnProjectile(e.x, e.y, 0, 0.45, 8, 'enemy');
        e.vy -= 0.045 / (e.mass || 1); // recoil, like the player's
    }

    // The top samurai charges energy standing still in its own zone, like the player
    updateLocalTopPlayer(dt) {
        const e = this.enemy;
        if (e.state === 'dead') return;
        const inZone = e.y < 150;
        if (inZone && Math.hypot(e.vx, e.vy) < 0.04 && e.energy < 3) {
            e.chargeTimer = (e.chargeTimer || 0) + dt;
            if (e.chargeTimer >= 1500) {
                e.energy++;
                e.chargeTimer = 0;
                this.audioSynth.playUpgrade();
                this.particles.spawnShockwave(e.x, e.y, '#ff0077', 30);
            }
        } else {
            e.chargeTimer = 0;
        }
    }

    // The result of a 2-player match: who won, nothing recorded
    handleLocal2pEnd(bottomWon) {
        this.gameState = bottomWon ? 'victory' : 'gameover';
        const screen = document.getElementById(bottomWon ? 'victory-screen' : 'game-over-screen');
        screen.querySelector('h1').innerText = bottomWon ? 'SPELARE 1 VANN!' : 'SPELARE 2 VANN!';
        screen.querySelector('.subtitle').innerText = bottomWon ? 'Spelare 1 (nere) förstörde tornet.' : 'Spelare 2 (uppe) förstörde tornet.';
        screen.dataset.local2p = '1';
        // (the stats still hold the last real match's score and credits)
        screen.querySelectorAll('.highscore-badge, .podium-form, .run-stats').forEach(el => el.classList.add('hidden'));
        this.uiCtrl.showScreen(bottomWon ? 'victory' : 'gameover');
        this.audioSynth.playVictory();
        this.settings.vibrate([80, 60, 200]);
        this.sayAfterMatch();
    }

    // After every match someone says "Vilken lurvig kanin, va?" (a recording
    // in assets/voice/lurvig-kanin.<ext> if there is one, otherwise the speech
    // engine). Not if the next match has already started by then.
    sayAfterMatch() {
        if (this.trailer && this.trailer.active) return;
        if (this.audioSynth.voiceOn === false) return;
        clearTimeout(this.afterMatchVoiceTimer);
        this.afterMatchVoiceTimer = setTimeout(() => {
            if (this.gameState === 'playing' || this.gameState === 'paused') return;
            const text = window.gameLang === 'en' ? 'What a fluffy bunny, huh?' : 'Vilken lurvig kanin, va?';
            this.audioSynth.readAloud(text, null, 'lurvig-kanin');
        }, 1600);
    }

    // A normal match after a 2-player one: the result screens' own titles back
    restoreResultTitles() {
        // The Swedish texts, not what was on screen: in English that was the
        // translation, which the language layer would then take for Swedish
        const originals = {
            'victory-screen': ['STRID VUNNEN!', 'Du förstörde motståndarens torn.'],
            'game-over-screen': ['STRID FÖRLORAD', 'Ditt torn förstördes.']
        };
        Object.entries(originals).forEach(([id, [title, subtitle]]) => {
            const screen = document.getElementById(id);
            if (!screen || !screen.dataset.local2p) return;
            delete screen.dataset.local2p;
            screen.querySelector('h1').innerText = title;
            screen.querySelector('.subtitle').innerText = subtitle;
            const stats = screen.querySelector('.run-stats');
            if (stats) stats.classList.remove('hidden');
        });
    }

    // ---- Levels: every 50 waves a new level, harder with more obstacles ----
    get currentLevel() { return levelForWave(this.upgradeMgr.state.highestWave || 1); }

    setupLevel() {
        const solo = !this.isMultiplayer && !this.teamLayout && !this.local2p && !(this.trailer && this.trailer.active);
        this.matchLevel = solo ? this.currentLevel : 1;
        // every level has its own floor
        this.canvasCtrl.floorVariant = this.matchLevel > 1 ? this.matchLevel : 0;
        this.levelArena = null;
        if (this.matchLevel <= 1) return;
        const arena = new LevelArena(this.matchLevel, this.canvasCtrl.width, this.canvasCtrl.height);
        if (!arena.empty) this.levelArena = arena;
        // a tougher computer: more health for its samurai and its tower
        const boost = LevelArena.aiBoost(this.matchLevel);
        this.enemy.maxHp = Math.round(this.enemy.maxHp * boost.hp);
        this.enemy.hp = this.enemy.maxHp;
        this.topTower.maxHp = Math.round(this.topTower.maxHp * boost.hp);
        this.topTower.hp = this.topTower.maxHp;
        // (the "LEVEL n" banner is shown when the match really starts, see
        // showBossWarningBanner: shown here it ran out behind the perk
        // screen, and picking a perk hid it at once)
    }

    showLevelBanner() {
        const banner = document.getElementById('boss-warning');
        if (!banner) return;
        banner.innerText = `LEVEL ${this.matchLevel}`;
        banner.style.color = '#ffcc00';
        banner.classList.remove('hidden');
        if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
        this.bossWarningTimeout = setTimeout(() => { banner.classList.add('hidden'); banner.style.color = ''; }, 2200);
    }

    // Popups (new level, new rank, daily gift) come one at a time, never on top of each other
    popupBusy() {
        return ['stage-up', 'level-up', 'daily-gift'].some((id) => {
            const el = document.getElementById(id);
            return el && !el.classList.contains('hidden');
        });
    }

    queuePopup(show) {
        this.popupQueue = this.popupQueue || [];
        if (this.popupBusy()) { this.popupQueue.push(show); return true; }
        return false;
    }

    nextPopup() {
        if (!this.popupQueue || !this.popupQueue.length) return;
        // never over a match: wait until it is over
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            setTimeout(() => this.nextPopup(), 1000);
            return;
        }
        const next = this.popupQueue.shift();
        setTimeout(next, 250);
    }

    showNewLevel(level) {
        const box = document.getElementById('stage-up');
        if (!box) return;
        if (this.queuePopup(() => this.showNewLevel(level))) return;
        document.getElementById('stage-up-title').innerText = `LEVEL ${level}`;
        const news = level >= 7 ? 'Rullande stenblock, eldhål och stenpelare!' : level >= 4 ? 'Eldhål och stenpelare!' : 'Stenpelare på arenan!';
        document.getElementById('stage-up-text').innerText = `Datorn blir tuffare. ${news}`;
        box.classList.remove('hidden');
        this.audioSynth.playGong();
        this.settings.vibrate([100, 60, 100, 60, 300]);
        document.getElementById('btn-stage-ok').onclick = () => {
            this.audioSynth.playClick();
            box.classList.add('hidden');
            this.nextPopup();
        };
    }

    // ---- Level and XP ----
    // Every match gives experience; the level follows from it (level 2 at
    // 100 XP, 3 at 400, 4 at 900...). Each new level gives Cyber-Credits.
    static levelFor(xp) { return Math.floor(Math.sqrt(Math.max(0, xp) / 100)) + 1; }
    static xpForLevel(level) { return 100 * (level - 1) * (level - 1); }
    static levelTitle(level) {
        return level >= 12 ? 'SHOGUN' : level >= 8 ? 'MÄSTARE' : level >= 5 ? 'SAMURAJ' : level >= 3 ? 'KRIGARE' : 'LÄRLING';
    }

    awardXP(amount) {
        if (this.trailer && this.trailer.active) return;
        if (this.local2p) return; // 2 players on one phone: nothing recorded (its K.O.s either)
        const st = this.upgradeMgr.state;
        const before = Game.levelFor(st.xp || 0);
        st.xp = (st.xp || 0) + amount;
        const after = Game.levelFor(st.xp);
        let reward = 0;
        for (let l = before + 1; l <= after; l++) reward += 50 * l;
        if (reward) this.upgradeMgr.addCredits(reward); // (addCredits saves; so does the match result)
        else this.upgradeMgr.save();
        this.updateLevelDisplay();
        if (after > before) {
            // A K.O. mid-match: the popup (over the whole screen) waits for the
            // result screen instead of covering the arena while the fight goes on
            const waiting = this.pendingLevelUp;
            this.pendingLevelUp = { level: after, reward: reward + (waiting ? waiting.reward : 0) };
        }
        this.flushLevelUp();
    }

    flushLevelUp() {
        const p = this.pendingLevelUp;
        if (!p || this.gameState === 'playing' || this.gameState === 'paused') return;
        this.pendingLevelUp = null;
        this.showLevelUp(p.level, p.reward);
    }

    updateLevelDisplay() {
        const stage = document.getElementById('stage-val');
        if (stage) {
            const wave = this.upgradeMgr.state.highestWave || 1;
            const level = levelForWave(wave);
            stage.innerText = level >= MAX_LEVEL ? `LEVEL ${level} · MAX`
                : `LEVEL ${level} · VÅG ${wave - (level - 1) * WAVES_PER_LEVEL} AV ${WAVES_PER_LEVEL}`;
        }
        const xp = this.upgradeMgr.state.xp || 0;
        const level = Game.levelFor(xp);
        const label = document.getElementById('level-val');
        const fill = document.getElementById('xp-fill');
        if (label) label.innerText = `RANG ${level} · ${Game.levelTitle(level)}`;
        if (fill) {
            const from = Game.xpForLevel(level), to = Game.xpForLevel(level + 1);
            fill.style.width = `${Math.round(100 * (xp - from) / (to - from))}%`;
        }
    }

    showLevelUp(level, reward) {
        const box = document.getElementById('level-up');
        if (!box) return;
        if (this.queuePopup(() => this.showLevelUp(level, reward))) return;
        document.getElementById('level-up-title').innerText = `RANG ${level}`;
        document.getElementById('level-up-reward').innerText = `${Game.levelTitle(level)} · +${reward} ⚡`;
        box.classList.remove('hidden');
        this.audioSynth.playUpgrade();
        this.settings.vibrate([60, 40, 60, 40, 120]);
        document.getElementById('btn-level-ok').onclick = () => {
            this.audioSynth.playClick();
            box.classList.add('hidden');
            this.nextPopup();
        };
    }

    // ---- Daily gift ----
    // The first time the game is opened each day: a gift of Cyber-Credits,
    // bigger for every day in a row (25, 35, 50, 70, then 100 a day).
    checkDailyGift() {
        const key = 'dangerous_fight_daily';
        const d = new Date();
        const today = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        // (calendar yesterday, not now minus 24 h: that is wrong the night the clocks change)
        const y = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1);
        const yesterday = `${y.getFullYear()}-${y.getMonth() + 1}-${y.getDate()}`;
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(key)); } catch (e) {}
        if (saved && saved.date === today) return;
        const streak = saved && saved.date === yesterday ? (saved.streak || 1) + 1 : 1;
        const amounts = [25, 35, 50, 70, 100];
        const amount = amounts[Math.min(streak, amounts.length) - 1];
        document.getElementById('daily-gift-amount').innerText = amount;
        document.getElementById('daily-gift-streak').innerText = streak > 1 ? `${streak} dagar i rad!` : 'Kom tillbaka i morgon för en större gåva!';
        const box = document.getElementById('daily-gift');
        if (this.queuePopup(() => this.checkDailyGift())) return;
        box.classList.remove('hidden');
        const claim = document.getElementById('btn-daily-claim');
        claim.onclick = () => {
            claim.onclick = null;
            try { localStorage.setItem(key, JSON.stringify({ date: today, streak })); } catch (e) {}
            this.upgradeMgr.addCredits(amount);
            this.audioSynth.playUpgrade();
            this.settings.vibrate(60);
            box.classList.add('hidden');
            this.nextPopup();
        };
    }

    // ---- Combo: hits landed in quick succession ----
    registerHit() {
        if (this.trailer && this.trailer.active) return;
        const now = performance.now();
        this.combo = now - (this.lastHitAt || 0) < 2500 ? (this.combo || 0) + 1 : 1;
        this.lastHitAt = now;
        if (this.combo >= 2) {
            const bonus = 50 * this.combo;
            this.addScore(bonus, this.player.x, this.player.y - 60);
            this.particles.spawnDamageText(this.player.x, this.player.y - 70, `COMBO x${this.combo}!`, '#ffcc00', 1.2 + Math.min(0.6, this.combo * 0.1));
            this.addRage(4 * this.combo);
        }
    }

    // ---- First-match hints ----
    // Shown the first time someone plays against the computer, one at a
    // time, each gone as soon as the player has done it.
    static get TUTORIAL() {
        return [
            { text: 'Svep åt det håll du vill åka!', until: 'dash' },
            { text: 'Stå still i din zon längst ner för att ladda energi ⚡', until: 'energy' },
            { text: 'Tryck på SVÄRDSVÅG för att skjuta!', until: 'shot' },
            { text: 'Ramma motståndarens torn för stor skada!', until: 'ram', maxMs: 12000 },
            { text: 'Träffa för att fylla RASERI-mätaren – tryck när den lyser!', until: 'rage', maxMs: 7000 }
        ];
    }

    startTutorial() {
        let done = false;
        try { done = localStorage.getItem('dangerous_fight_tutorial') === 'done'; } catch (e) {}
        this.tutorial = !done && !this.isMultiplayer && !this.teamLayout && !this.local2p ? { step: 0, ms: 0 } : null;
        const el = document.getElementById('tutorial-hint');
        if (el) el.classList.add('hidden');
    }

    tutorialEvent(what) {
        const t = this.tutorial;
        if (!t) return;
        const step = Game.TUTORIAL[t.step];
        if (step && step.until === what) this.nextTutorialStep();
    }

    nextTutorialStep() {
        const t = this.tutorial;
        t.step++;
        t.ms = 0;
        if (t.step >= Game.TUTORIAL.length) {
            this.tutorial = null;
            try { localStorage.setItem('dangerous_fight_tutorial', 'done'); } catch (e) {}
            const el = document.getElementById('tutorial-hint');
            if (el) el.classList.add('hidden');
        }
    }

    updateTutorial(dt) {
        const t = this.tutorial;
        const el = document.getElementById('tutorial-hint');
        if (!t || !el || (this.trailer && this.trailer.active)) return;
        const step = Game.TUTORIAL[t.step];
        t.ms += dt;
        if (step.until === 'energy' && this.player.energy > 0) { this.nextTutorialStep(); return; }
        if (step.maxMs && t.ms > step.maxMs) { this.nextTutorialStep(); return; }
        if (el.dataset.step !== String(t.step)) {
            el.dataset.step = String(t.step);
            el.innerText = step.text;
        }
        el.classList.remove('hidden');
    }

    // ---- Samurajraseri ----
    // A meter that fills when my samurai lands blows; full, the RASERI button
    // unleashes a ring of sword waves and 6 s of double damage. Matches against
    // the computer only (online, the other side could not see it happen).
    get rageActive() {
        return this.gameState === 'playing' && performance.now() < (this.rageUntil || 0);
    }

    addRage(amount) {
        if (this.isMultiplayer || this.local2p || this.rageActive) return;
        this.rage = Math.min(100, (this.rage || 0) + amount);
    }

    activateRage() {
        if (this.gameState !== 'playing' || this.isMultiplayer || (this.rage || 0) < 100) return;
        const p = this.player;
        if (p.state === 'dead') return;
        this.rage = 0;
        this.rageUntil = performance.now() + 6000;
        for (let k = 0; k < 12; k++) {
            const a = (k / 12) * Math.PI * 2;
            this.spawnProjectile(p.x, p.y, Math.cos(a) * 0.55, Math.sin(a) * 0.55, 10, 'player', 'plasma');
        }
        this.particles.spawnShockwave(p.x, p.y, '#ff2020', 160);
        this.particles.spawnShockwave(p.x, p.y, '#ffae00', 90);
        this.canvasCtrl.flash('rgba(255, 20, 20, 0.5)', 350);
        this.canvasCtrl.shake(16, 500);
        this.audioSynth.playVoiceSubBassDrop();
        this.audioSynth.playGong();
        this.audioSynth.playSlash(p.activeWeaponKey);
        this.particles.spawnDamageText(p.x, p.y - 40, 'SAMURAJRASERI!', '#ff3030', 1.6);
        this.settings.vibrate([60, 40, 140]);
        this.missions.track('rage');
        this.tutorialEvent('rage');
    }

    drawRageAura() {
        const ctx = this.canvasCtrl.ctx;
        const p = this.player;
        if (p.state === 'dead') return;
        const t = performance.now();
        const left = Math.max(0, (this.rageUntil - t) / 6000);
        const r = (p.radius || 30) * (2 + 0.25 * Math.sin(t / 80));
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const g = ctx.createRadialGradient(p.x, p.y, r * 0.2, p.x, p.y, r);
        g.addColorStop(0, `rgba(255, 60, 20, ${0.45 * (0.4 + 0.6 * left)})`);
        g.addColorStop(0.6, `rgba(255, 20, 20, ${0.25 * (0.4 + 0.6 * left)})`);
        g.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.fillStyle = g;
        ctx.fillRect(p.x - r, p.y - r, r * 2, r * 2);
        ctx.restore();
        if (Math.random() < 0.5) this.particles.spawnDamageEmbers(p.x + (Math.random() - 0.5) * 30, p.y + (Math.random() - 0.5) * 30, '#ff4020');
    }

    // Fire, and count it for the missions when a shot actually went off
    playerShoot() {
        // the on-screen button can still be hit on the pause / result screens
        if (this.gameState !== 'playing') return;
        const energy = this.player.energy;
        this.player.shoot();
        if (this.player.energy < energy) {
            this.missions.track('shot');
            this.tutorialEvent('shot');
        }
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
        // The daily gift sits over the menu: steer it first, or A presses
        // the menu buttons behind it and the gift stays up over the match
        // (the level-up popup likewise, over the result screen)
        const langBox = document.getElementById('lang-box');
        const noLang = !langBox || langBox.classList.contains('hidden');
        const popup = ['stage-up', 'level-up', 'daily-gift'].map(id => document.getElementById(id))
            .find(el => el && !el.classList.contains('hidden') && noLang);
        const screen = popup || [...document.querySelectorAll('.overlay-screen')].find(el => !el.classList.contains('hidden'));
        if (!screen) return;
        const items = this.gamepadFocusables(screen);
        if (!items.length) return;

        if (this.gpFocusScreen !== screen.id) {
            this.gpFocusScreen = screen.id;
            this.gpFocusIdx = 0;
        }
        let idx = items.indexOf(this.gpFocusEl);
        if (idx < 0) idx = Math.min(this.gpFocusIdx || 0, items.length - 1);

        // A volume slider in the settings: sideways moves the slider
        const cur = items[idx];
        if (cur && cur.type === 'range' && (action === 'left' || action === 'right')) {
            if (action === 'right') cur.stepUp(); else cur.stepDown();
            cur.dispatchEvent(new Event('input', { bubbles: true }));
            cur.dispatchEvent(new Event('change', { bubbles: true }));
            this.setGamepadFocus(cur, idx);
            return;
        }

        if (action === 'up' || action === 'left') {
            idx = (idx - 1 + items.length) % items.length;
        } else if (action === 'down' || action === 'right') {
            idx = (idx + 1) % items.length;
        } else if (action === 'confirm') {
            const el = items[idx];
            // Xbox Edge opens its on-screen keyboard for a text box; a
            // checkbox (settings) is toggled like a button
            if (el.tagName === 'INPUT' && el.type !== 'checkbox') el.focus();
            else el.click();
            return;
        } else if (action === 'back') {
            // (on the pause screen B carries on playing)
            // a real back button first, so e.g. "join room menu" is not taken for "back"
            const back = items.find(el => el.classList.contains('back-btn') || /-back$|^btn-resume$/.test(el.id)) ||
                items.find(el => /back|menu|tillbaka|avbryt|huvudmeny|resume/i.test(el.id + ' ' + (el.innerText || '')));
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

    renderHelperShop() {
        this.uiCtrl.renderHelperShop(this.creditStore, HELPER_PACKS, HELPERS, (pack) => {
            this.audioSynth.playClick();
            if (this.creditStore.canBuy(pack)) this.creditStore.buy(pack);
        });
    }

    renderCheatShop() {
        this.uiCtrl.renderCheatShop(this.creditStore, CHEAT_PACKS, CHEATS, (pack, have) => {
            this.audioSynth.playClick();
            if (!have && this.creditStore.canBuy(pack)) this.creditStore.buy(pack);
        });
    }

    // The fusk you own, as on/off switches on the perk screen (remembered)
    renderCheatPicks() {
        const box = document.getElementById('cheat-picks');
        const row = document.getElementById('cheat-picks-row');
        if (!box || !row) return;
        const st = this.upgradeMgr.state;
        const keys = Object.keys(CHEATS).filter((k) => st.cheats && st.cheats[k]);
        box.classList.toggle('hidden', keys.length === 0);
        row.innerHTML = '';
        keys.forEach((k) => {
            const b = document.createElement('button');
            b.className = 'diff-btn cheat-chip' + (st.cheatsOn[k] ? ' selected' : '');
            b.innerText = `${CHEATS[k].icon} ${CHEATS[k].name}`;
            b.addEventListener('click', () => {
                this.audioSynth.playClick();
                st.cheatsOn[k] = !st.cheatsOn[k];
                b.classList.toggle('selected', st.cheatsOn[k]);
                this.upgradeMgr.save();
            });
            row.appendChild(b);
        });
    }

    // The match starts: the fusk that is switched on works for this match
    applyCheats() {
        const st = this.upgradeMgr.state;
        this.cheats = null;
        // only a solo match against the computer (the trailer clicks a perk
        // card itself and must not show the player's fusk)
        if (this.isMultiplayer || this.teamLayout || this.local2p || (this.trailer && this.trailer.active)) return;
        if (!st.cheats || !st.cheatsOn) return;
        this.cheats = {};
        Object.keys(CHEATS).forEach((k) => { if (st.cheats[k] && st.cheatsOn[k]) this.cheats[k] = true; });
        const on = Object.keys(this.cheats);
        if (!on.length) { this.cheats = null; return; }
        if (this.cheats.energy) this.player.energy = 3;
        if (this.cheats.freeze) this.cheatFreezeMs = 15000;
        const p = this.player;
        this.particles.spawnDamageText(p.x, p.y - 110, '😈 ' + on.map((k) => CHEATS[k].icon).join(' '), '#ff00aa', 1.4);
    }

    // The hjälpmedel you own, as switches on the perk screen
    renderHelperPicks() {
        const box = document.getElementById('helper-picks');
        const row = document.getElementById('helper-picks-row');
        if (!box || !row) return;
        const owned = this.upgradeMgr.state.helpers || {};
        this.helperPicks = this.helperPicks || {};
        const keys = Object.keys(HELPERS).filter((k) => owned[k] > 0);
        box.classList.toggle('hidden', keys.length === 0);
        row.innerHTML = '';
        keys.forEach((k) => {
            const b = document.createElement('button');
            b.className = 'diff-btn helper-chip' + (this.helperPicks[k] ? ' selected' : '');
            b.innerText = `${HELPERS[k].icon} ${HELPERS[k].name} (${owned[k]})`;
            b.addEventListener('click', () => {
                this.audioSynth.playClick();
                this.helperPicks[k] = !this.helperPicks[k];
                b.classList.toggle('selected', !!this.helperPicks[k]);
            });
            row.appendChild(b);
        });
    }

    // The match starts: use up the hjälpmedel that are switched on
    applyHelpers() {
        // only a solo match against the computer: the trailer clicks a perk
        // card itself and must not use up the player's hjälpmedel
        if (this.isMultiplayer || this.teamLayout || this.local2p || (this.trailer && this.trailer.active)) return;
        const picks = this.helperPicks || {};
        const p = this.player;
        const used = [];
        Object.keys(HELPERS).forEach((k) => {
            if (!picks[k] || !this.upgradeMgr.useHelper(k)) return;
            used.push(HELPERS[k].icon);
            if (k === 'shield') this.towerShieldMs = 30000;
            if (k === 'energy') p.energy = 3;
            if (k === 'rage') this.rage = 100;
            if (k === 'revive') this.fastRevive = true;
        });
        // switched off again when there are none left
        Object.keys(picks).forEach((k) => { if (!(this.upgradeMgr.state.helpers[k] > 0)) picks[k] = false; });
        if (used.length) {
            this.particles.spawnDamageText(p.x, p.y - 70, used.join(' '), '#39ff14', 1.4);
            this.audioSynth.playUpgrade();
        }
    }

    renderCreditShop() {
        this.uiCtrl.renderCreditShop(this.creditStore, CREDIT_PACKS, (pack) => {
            if (!this.creditStore.canBuy(pack)) { this.audioSynth.playClick(); return; }
            this.audioSynth.playClick();
            this.creditStore.buy(pack);
        });
    }

    // The extra samurai for sale: same warriors as the dojo
    static get REINFORCEMENTS() {
        return [
            { key: 'katana', name: 'CYBER RONIN', kind: 'Medium', cost: 400, glow: 'cyan' },
            { key: 'hammer', name: 'SHADOW NINJA', kind: 'Snabb', cost: 500, glow: 'orange' },
            { key: 'blades', name: 'ARMORED SHOGUN', kind: 'Tung', cost: 700, glow: 'pink' },
            { key: 'oni', name: 'ONI BERSERKER', kind: 'Brutal', cost: 800, glow: 'pink' }
        ];
    }

    renderReinforcementShop() {
        const state = this.upgradeMgr.state;
        const grid = document.getElementById('reinforce-grid');
        if (!grid) return;
        const creditsEl = document.getElementById('credits-reinforce-val');
        if (creditsEl) creditsEl.innerText = state.credits;
        grid.innerHTML = '';
        Game.REINFORCEMENTS.forEach((r) => {
            const owned = !!state.reinforcements[r.key];
            const picked = state.reinforcementPick === r.key;
            const profile = this.player.profiles[r.key] || this.player.profiles.katana;
            const card = document.createElement('div');
            card.className = 'weapon-card' + (picked ? ' selected' : owned ? '' : ' locked');
            card.innerHTML = `<div class="weapon-glow ${r.glow}"></div><h3></h3>
                <div class="weapon-stats"><div class="stat-row">HP: <span></span></div></div>
                <div class="weapon-cost"></div>`;
            card.querySelector('h3').innerText = `${r.name} (${r.kind})`;
            card.querySelector('.stat-row span').innerText = profile.baseHp;
            card.querySelector('.weapon-cost').innerText = picked ? '✅ KOMMER VID HALVTID + 20 S KVAR'
                : owned ? 'KÖPT – klicka för att välja'
                : `Kostar ⚡ ${r.cost}`;
            card.addEventListener('click', () => this.handleReinforcement(r));
            grid.appendChild(card);
        });
    }

    handleReinforcement(r) {
        const state = this.upgradeMgr.state;
        if (state.reinforcements[r.key]) {
            state.reinforcementPick = r.key; // bought: this one comes
            this.upgradeMgr.save();
            this.audioSynth.playClick();
        } else if (this.upgradeMgr.spendCredits(r.cost)) {
            state.reinforcements[r.key] = true;
            state.reinforcementPick = r.key;
            this.upgradeMgr.save();
            this.audioSynth.playUpgrade();
        } else {
            this.audioSynth.playClick();
        }
        this.renderReinforcementShop();
    }

    // In a match against the computer the samurai picked in the Extra samuraj
    // shop jumps in on my side twice: at half time, and again with 20 s left.
    // The 1v1 turns into a team match with those team mates (and no extra
    // foes), so all the team code - AI targeting, collisions, shots, tower
    // rams, the time-out rule - just works.
    spawnReinforcement() {
        this.reinforcementsArrived++;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        // land on the side away from me and from the first reinforcement
        const taken = [this.player.x, ...this.allies.map((a) => a.x)];
        const x = [w * 0.2, w * 0.5, w * 0.8].sort((a, b) =>
            Math.min(...taken.map((t) => Math.abs(t - b))) - Math.min(...taken.map((t) => Math.abs(t - a))))[0];
        const pick = this.upgradeMgr.state.reinforcementPick || 'katana';
        const ally = new Enemy(x, h - 120, this);
        ally.game = this;
        ally.side = 'bottom';
        ally.resetForRun(false);
        ally.setVehicleType(pick);
        ally.maxHp = (this.player.profiles[pick] || this.player.profiles.katana).baseHp;
        ally.hp = ally.maxHp;
        ally.x = x;
        ally.y = h - 120;
        ally.angle = -Math.PI / 2;
        ally.trailHistory = [];
        ally.aiControlled = true;
        ally.isRemote = false;
        ally.color = this.player.color; // same colour as me: clearly on my side

        this.teamMatch = true;
        this.teamRamCooldowns = this.teamRamCooldowns || new Map();
        this.allies = [...this.allies, ally];
        this.foes = [];

        this.particles.spawnShockwave(ally.x, ally.y, ally.color, 60);
        this.canvasCtrl.flash('rgba(255, 255, 255, 0.25)', 250);
        this.audioSynth.playUpgrade();
        const banner = document.getElementById('boss-warning');
        if (banner) {
            banner.innerText = this.reinforcementsArrived === 1
                ? 'FÖRSTÄRKNING! EN SAMURAJ HOPPAR IN I DITT LAG'
                : '20 SEKUNDER KVAR! EN TILL SAMURAJ HOPPAR IN';
            banner.style.color = '';
            banner.classList.remove('hidden');
            if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
            this.bossWarningTimeout = setTimeout(() => banner.classList.add('hidden'), 3000);
        }
    }

    // Vehicle equip/unlock shop logic
    handleWeaponArsenal(weaponKey) {
        const state = this.upgradeMgr.state;
        const costs = { katana: 0, blades: 100, hammer: 250, oni: 600 };
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
            this.restoreResultTitles(); // (not "SPELARE 2 VANN!" from a 2-player match before)
            this.uiCtrl.renderGameOver(0, reason, this.currentScore || 0, this.matchKills || 0, false);
            this.uiCtrl.hidePodiumForms();
            this.flushLevelUp(); // a level reached by a K.O. in this match
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
        this.teamNet = null;
        this.teamLayout = null;
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
        // (a plain startRun would turn the rematch into a match against the computer)
        if (this.local2p) {
            this.startLocal2p();
            return;
        }
        if (!this.isMultiplayer) {
            this.startRun();
            return;
        }
        if (this.teamNet) {
            // With up to eight players there is nobody to wait for: leave the
            // room and go back to the team menu to pick a new match.
            this.cleanupNetwork();
            this.resetRestartButtons();
            this.clearTeamMatch();
            this.gameState = 'menu';
            this.uiCtrl.showScreen('team');
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
                // Tracked so backing out during the hand-off cancels it
                this.mmTimers.push(setTimeout(() => this.setupMultiplayerClient(data.room, true), 150));
            } else if (data.type === 'match_ack' && data.to === this.mmId && this.mmPending && data.id === this.mmPending.peer) {
                this.mmMatched = true;
                if (statusEl) {
                    statusEl.classList.add('mm-found');
                    statusEl.innerText = 'Motståndare hittad!';
                }
                this.audioSynth.playUpgrade();
                const room = this.mmPending.room;
                this.mmTimers.push(setTimeout(() => this.setupMultiplayerHost(room), 150));
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
        if (this.teamNet) {
            this.handleTeamPacket(data);
            return;
        }
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
        if (this.teamNet) {
            // The host keeps both towers; everyone else reports the hit and
            // waits for the host's next sync, so damage is counted once.
            if (!this.teamNet.isHost) {
                this.sendNetworkPacket({
                    type: 'towerhit',
                    team: which === 'bottom' ? this.teamNet.myTeam : this.otherTeam(),
                    amount
                });
                return;
            }
            tower.hp = Math.max(0, tower.hp - amount);
            return;
        }
        if (this.isMultiplayer && which === 'top') return;
        // the TORNSKÖLD hjälpmedel (for a while) and ODÖDLIGT TORN fusk: my tower takes nothing
        if (which === 'bottom' && (this.towerShieldMs > 0 || (this.cheats && this.cheats.tower))) {
            this.particles.spawnClashSparks(this.canvasCtrl.width / 2, this.canvasCtrl.height - 60, '#00f0ff');
            return 'shielded';
        }
        tower.hp = Math.max(0, tower.hp - amount);
    }

    // Triggered when starting a game
    startRun() {
        // "Spela igen" pressed online and then left via Poängtavla -> back
        // would otherwise stay greyed out ("VÄNTAR PÅ MOTSTÅNDARE...") after
        // the next match
        this.resetRestartButtons();
        // 2 players on one phone: only the 2 SPELARE button asks for it
        this.local2p = !!this.pendingLocal2p;
        this.pendingLocal2p = false;
        // hjälpmedel only last one match, and fusk is only switched on
        // for a match against the computer (see applyCheats)
        this.towerShieldMs = 0;
        this.fastRevive = false;
        this.cheats = null;
        this.cheatFreezeMs = 0;
        // a perk card still pending from an earlier solo start (its click acts
        // 200 ms later) must not start this match, e.g. an online one
        this.perkChoice = null;
        this.finisher = null;
        this.combo = 0;
        this.lastHitAt = 0;
        this.startTutorial();
        this.rage = 0;
        this.rageUntil = 0;
        // the hurt buzz compares with the last frame: not the last match's
        // samurai (a heavier one's hp would buzz on the first frame)
        this.lastPlayerHp = undefined;
        this.lastPlayerState = undefined;
        this.runCredits = 0;
        this.currentScore = 0;
        this.matchKills = 0;
        this.particles.clear();
        this.projectiles = [];
        this.slowMoTimer = 0; // reset slow motion
        this.hitStopTimer = 0;
        this.enemyRamCooldown = 0;
        this.playerRamCooldown = 0;
        this.remoteMeleeCooldown = 0;
        this.matchTimer = 240000; // 4 minutes match duration
        // A bought reinforcement joins matches against the computer (a 1v1;
        // team matches already have team mates, online has no one to run it)
        this.reinforcementDue = !this.isMultiplayer && !this.teamLayout && !this.local2p && !!this.upgradeMgr.state.reinforcementPick;
        this.reinforcementsArrived = 0;
        
        let isBoss = false;
        if (!this.isMultiplayer && !this.local2p) {
            // Increment match count
            this.upgradeMgr.state.matchCount = (this.upgradeMgr.state.matchCount || 0) + 1;
            this.upgradeMgr.save();
            
            // Determine if this is a hard boss match
            if (this.upgradeMgr.state.matchCount % 2 === 0) {
                isBoss = true;
            }
        }
        if (this.teamLayout) isBoss = false; // 2v2 always fields two plain samurai per team
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

        // Leaving a team match: restore the 1v1 world size BEFORE placing the
        // cars, or they are placed in the zoomed-out arena and end up off-screen
        if (!this.teamLayout) this.clearTeamMatch();

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
        this.setupLevel();

        if (this.isMultiplayer && !this.teamLayout) {
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
        
        // 2v2 - 4v4: fill the extra slots (computer or networked player)
        if (this.teamLayout) {
            this.setupTeamMatch(this.teamLayout);
            this.showTeamBanner();
        }

        // Offer cybernetic perks in single-player before entering battle
        if (!this.isMultiplayer && !this.teamLayout && !this.local2p) {
            const randomPerks = this.upgradeMgr.getRandomPerks();
            // A card acts 200 ms after its click: TILLBAKA pressed meanwhile
            // (or a second tap on a card) must not start the match anyway
            const perkChoice = this.perkChoice = {};
            this.uiCtrl.showScreen('perks');
            this.renderHelperPicks();
            this.renderCheatPicks();
            this.uiCtrl.renderPerkSelection(randomPerks, (perkKey) => {
                if (this.perkChoice !== perkChoice) return;
                this.perkChoice = null;
                this.player.activePerk = perkKey;
                if (perkKey === 'shieldCharge') {
                    this.player.shieldHp = 1;
                    this.player.shieldCooldown = 0;
                }
                
                // Complete game start after perk choice
                this.applyHelpers();
                this.applyCheats();
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

    // "DU ÄR GRÖN" at the start of a team match, so nobody has to guess
    showTeamBanner() {
        const banner = document.getElementById('boss-warning');
        if (!banner || !this.myTeamColor) return;
        const me = Game.TEAM_NAMES[this.myTeamColor];
        const them = Game.TEAM_NAMES[this.foeTeamColor];
        banner.innerText = `DU ÄR ${this.myTeamColor === 'green' ? 'GRÖN' : 'RÖD'} – DU SPELAR I ${me} LAGET MOT DET ${them}`;
        banner.style.color = Game.TEAM_PALETTES[this.myTeamColor][0];
        banner.classList.remove('hidden');
        if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
        this.bossWarningTimeout = setTimeout(() => {
            banner.classList.add('hidden');
            banner.style.color = '';
        }, 4000);
    }

    showBossWarningBanner(isBoss) {
        const warningBanner = document.getElementById('boss-warning');
        if (warningBanner) {
            if (isBoss) {
                warningBanner.innerText = "VARNING: SHOGUN DETEKTERAD! 💀";
                warningBanner.style.color = ''; // the team banner may have tinted it
                warningBanner.classList.remove('hidden');
                if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
                this.bossWarningTimeout = setTimeout(() => {
                    warningBanner.classList.add('hidden');
                }, 3000);
            } else if ((this.matchLevel || 1) > 1) {
                this.showLevelBanner();
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
        this.missions.track('ko');
        this.addRage(30);
        this.awardXP(isBoss ? 60 : 20);
        this.settings.vibrate(120);
        if (isBoss) {
            this.addScore(2000, this.enemy.x, this.enemy.y, 'BOSS K.O.!');
        } else {
            this.addScore(500, this.enemy.x, this.enemy.y, 'K.O.!');
        }
    }

    // Projectile Spawner
    spawnProjectile(x, y, vx, vy, radius, owner, type = 'laser', replicated = false) {
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
            if (this.isMultiplayer && !this.teamNet && !replicated) {
                this.sendNetworkPacket({
                    type: 'projectile_fired',
                    x, y, vx, vy, radius, cannonType: type
                });
            }
        }
        
        // In a team match I broadcast the shots I own: my own samurai, plus
        // the computer-driven ones when I am the host. Everything tagged with
        // the team that fired it, in shared coordinates.
        if (this.teamNet && this.teamNet.started && !replicated) {
            const mineToSend = owner === 'player' || this.teamNet.isHost;
            if (mineToSend) {
                const m = this.teamMirror({ x, y, vx, vy });
                this.sendNetworkPacket({
                    type: 'tshot',
                    team: owner === 'player' ? this.teamNet.myTeam : this.otherTeam(),
                    x: m.x, y: m.y, vx: m.vx, vy: m.vy,
                    radius, cannonType: type
                });
            }
        }

        this.projectiles.push({
            x, y, vx, vy, radius, owner, type, damageCar, damageTower, color, replicated
        });
    }

    // Main Engine updates (Physics & Collisions)
    update(dt) {
        if (this.trailer && this.trailer.active) this.trailer.update(dt);
        // The finishing moment is over: on to the result screen
        if (this.finisher && performance.now() >= this.finisher.until) {
            const win = this.finisher.win;
            this.finisher = null;
            if (this.gameState === 'playing') {
                if (win) this.handleVictory(); else this.handleDefeat();
            }
        }
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

        // 4-Minute Match Timer Countdown (stopped while the finisher plays:
        // a timeout then would end the match again, maybe the other way)
        if (this.gameState === 'playing' && !this.finisher) {
            this.matchTimer -= dt;
            // The extra samurai bought in the shop: at half time, and one
            // more with 20 seconds left
            if (this.reinforcementDue) {
                if (this.reinforcementsArrived < 1 && this.matchTimer <= 120000) this.spawnReinforcement();
                else if (this.reinforcementsArrived < 2 && this.matchTimer <= 20000) this.spawnReinforcement();
            }
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
        
        if (Math.random() < 0.07 && this.lavaBubbles.length < 14) {
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

        const riverLen = Math.max(1, lavaMaxX - lavaMinX);

        // Ash from the lava drifting down over the whole arena
        if (Math.random() < dt * 0.006) this.particles.spawnAsh(this.canvasCtrl.width, this.canvasCtrl.height);

        // Constant trickle of embers and smoke rising off the magma
        if (Math.random() < 0.6) {
            const ex = lavaMinX + Math.random() * riverLen;
            this.particles.spawnDamageEmbers(ex, lavaCenterY + (Math.random() - 0.5) * 30, Math.random() < 0.5 ? '#ff7a00' : '#ffb830');
        }

        // Eruptions: every few seconds the lava throws up a fountain of
        // molten drops somewhere along the river, with a flash of heat
        this.nextEruption = (this.nextEruption === undefined ? 2500 : this.nextEruption) - dt;
        if (this.nextEruption <= 0) {
            this.nextEruption = 2500 + Math.random() * 4500;
            const ex = lavaMinX + 40 + Math.random() * (riverLen - 80);
            const ey = lavaCenterY + (Math.random() - 0.5) * 16;
            for (let k = 0; k < 3; k++) this.particles.spawnLavaBurst(ex + (Math.random() - 0.5) * 18, ey);
            this.particles.spawnLavaSplash(ex, ey, 0, -1);
            this.eruptionGlow = { x: ex, y: ey, life: 700 };
            this.audioSynth.playLavaBubblePop(0.3);
        }
        if (this.eruptionGlow) {
            this.eruptionGlow.life -= dt;
            if (this.eruptionGlow.life <= 0) this.eruptionGlow = null;
        }

        if (this.remoteMeleeCooldown > 0) this.remoteMeleeCooldown -= dt;
        if (this.enemyRamCooldown > 0) this.enemyRamCooldown -= dt;
        if (this.playerRamCooldown > 0) this.playerRamCooldown -= dt;

        this.player.update(dt, this.canvasCtrl.width, this.canvasCtrl.height, this.particles);
        this.enemy.update(enemyDt, this.teamMatch ? this.nearestFoeFor(this.enemy) : this.player, this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
        if (this.teamMatch) {
            this.extraCars().forEach(car => {
                car.update(enemyDt, this.nearestFoeFor(car), this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
            });
        }
        
        // A sudden burst of speed is a dash: kick up dust behind it
        [this.player, this.enemy, ...(this.teamMatch ? this.extraCars() : [])].forEach(c => {
            if (!c || c.state === 'dead') return;
            const sp = Math.hypot(c.vx || 0, c.vy || 0);
            if (sp - (c.prevSpeed || 0) > 0.45) this.particles.spawnDust(c.x, c.y, -c.vx, -c.vy, 5);
            c.prevSpeed = sp;
        });

        this.updatePhysics(physicsDt);
        if (this.levelArena) {
            const cw = this.canvasCtrl.width, ch = this.canvasCtrl.height;
            if (this.levelArena.width !== cw || this.levelArena.height !== ch) this.levelArena.resize(cw, ch);
            this.levelArena.update(physicsDt, [this.player, this.enemy, ...(this.teamMatch ? this.extraCars() : [])], this);
        }
        this.checkCollisions(physicsDt);

        this.updateTutorial(dt);
        if (this.towerShieldMs > 0) this.towerShieldMs = Math.max(0, this.towerShieldMs - dt);
        if (this.cheats) {
            // GUDSLÄGE also against lava and fire, OÄNDLIG ENERGI keeps the sword waves full
            if (this.cheats.god && this.player.state !== 'dead') this.player.hp = this.player.maxHp;
            if (this.cheats.energy) this.player.energy = 3;
            // EVIGT RASERI: the meter is full again as soon as the rage is over
            if (this.cheats.rage && !this.rageActive) this.rage = 100;
            if (this.cheatFreezeMs > 0) this.cheatFreezeMs = Math.max(0, this.cheatFreezeMs - dt);
        }
        if (this.local2p) this.updateLocalTopPlayer(dt);

        // Feel the hits: a buzz when my samurai loses health, a long one when it falls
        const hp = this.player.hp;
        if (this.lastPlayerHp !== undefined && !(this.trailer && this.trailer.active)) {
            if (this.player.state === 'dead' && this.lastPlayerState !== 'dead') this.settings.vibrate(250);
            else if (hp < this.lastPlayerHp - 4 && performance.now() - (this.lastHurtBuzz || 0) > 150) {
                this.lastHurtBuzz = performance.now();
                this.settings.vibrate(30);
            }
        }
        this.lastPlayerHp = hp;
        this.lastPlayerState = this.player.state;
        
        // Network Sync (~30 Hz; the replica dead-reckons between packets)
        if (this.teamNet) {
            this.netSyncAccumulator = (this.netSyncAccumulator || 0) + dt;
            if (this.netSyncAccumulator >= 33) {
                this.netSyncAccumulator = 0;
                this.sendTeamSync();
            }
        } else if (this.isMultiplayer) {
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
        if (this.teamNet && !this.teamNet.isHost) return;
        if (this.teamNet) {
            const myDamage = this.bottomTower.maxHp - this.bottomTower.hp;
            const theirDamage = this.topTower.maxHp - this.topTower.hp;
            this.particles.spawnDamageText(this.canvasCtrl.width / 2, this.canvasCtrl.height / 2, 'TIDEN UTE!', '#ffcc00', 2.0);
            let myTeamWins = theirDamage > myDamage;
            if (theirDamage === myDamage) {
                // Equal tower damage: the team whose samurai took the least damage wins
                const carDamage = (cars) => cars.reduce((sum, c) => sum + (c ? Math.max(0, c.maxHp - c.hp) : 0), 0);
                myTeamWins = carDamage(this.foeTeamCars()) >= carDamage(this.myTeamCars());
            }
            this.declareTeamEnd(myTeamWins ? this.teamNet.myTeam : this.otherTeam());
            return;
        }
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
            // (a whole team each in an offline team match)
            const carDamage = (cars) => cars.reduce((sum, c) => sum + (c ? Math.max(0, c.maxHp - c.hp) : 0), 0);
            const playerCarDamage = carDamage(this.teamMatch ? this.myTeamCars() : [this.player]);
            const enemyCarDamage = carDamage(this.teamMatch ? this.foeTeamCars() : [this.enemy]);
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
        // (LAVASKOR fusk: my samurai walks straight through)
        if (this.player.x > lavaMinX && this.player.x < lavaMaxX && this.player.y > lavaMinY && this.player.y < lavaMaxY && this.player.state !== 'dead' &&
            !(this.cheats && this.cheats.lava)) {
            this.player.hp = Math.max(0, this.player.hp - lavaDamagePerMs * dt);
            
            // Viscous fluid drag & thermal buoyant kick
            this.player.vx *= Math.pow(0.95, dt / 16);
            this.player.vy *= Math.pow(0.95, dt / 16);
            this.player.vy += 0.004 * dt; // buoyant repulsion back to your own side
            
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
            // A replica computes its own lava damage on its own machine
            if (!this.isMultiplayer || (this.teamMatch && !this.enemy.isRemote)) {
                this.enemy.hp = Math.max(0, this.enemy.hp - lavaDamagePerMs * dt);
            }
            
            // Viscous fluid drag & thermal buoyant kick
            this.enemy.vx *= Math.pow(0.95, dt / 16);
            this.enemy.vy *= Math.pow(0.95, dt / 16);
            this.enemy.vy -= 0.004 * dt; // buoyant repulsion back to its own side
            
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
        // The boss ragdoll: bounce every limb too, or the ones still moving
        // drag the torso through the gate (the torso follows obj.y itself)
        const bounceLimbs = (obj) => {
            if (obj.ragdollNodes) obj.ragdollNodes.forEach(node => { node.vy = obj.vy; });
        };
        const blockCheck = (obj) => {
            if (obj.x < 80) {
                // Left side: going down is blocked
                if (obj.vy > 0 && obj.y - obj.radius < h / 2 + 10 && obj.y + obj.radius > h / 2 - 10) {
                    obj.y = h / 2 - obj.radius - 2;
                    obj.vy = -obj.vy * 0.4; // slight bounce back
                    bounceLimbs(obj);
                }
            } else if (obj.x > w - 80) {
                // Right side: going up is blocked
                if (obj.vy < 0 && obj.y - obj.radius < h / 2 + 10 && obj.y + obj.radius > h / 2 - 10) {
                    obj.y = h / 2 + obj.radius + 2;
                    obj.vy = -obj.vy * 0.4;
                    bounceLimbs(obj);
                }
            }
        };

        if (this.player.state !== 'dead') blockCheck(this.player);
        if (this.enemy.state !== 'dead') blockCheck(this.enemy);
        if (this.teamMatch) {
            this.extraCars().forEach(car => {
                if (car.state === 'dead') return;
                this.applyLavaToCar(car, dt, lavaMinX, lavaMaxX, lavaMinY, lavaMaxY, lavaDamagePerMs);
                blockCheck(car);
            });
        }

        // --- 3. PROJECTILES PHYSICS ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];

            // MÅLSÖKANDE SVÄRDSVÅGOR (fusk): my shots turn towards the computer's samurai
            if (p.owner === 'player' && this.cheats && this.cheats.homing && this.enemy.state !== 'dead') {
                const speed = Math.hypot(p.vx, p.vy);
                const want = Math.atan2(this.enemy.y - p.y, this.enemy.x - p.x);
                const cur = Math.atan2(p.vy, p.vx);
                let turn = want - cur;
                while (turn > Math.PI) turn -= Math.PI * 2;
                while (turn < -Math.PI) turn += Math.PI * 2;
                // Turn harder the closer it gets: with a fixed turn rate the
                // turning circle (0.45 px/ms / 0.005 = 90 px, a sniper shot
                // ~200 px) is wider than the hit radius, and a shot that just
                // missed circled a standing (e.g. frozen) samurai forever
                // (shots only disappear on a hit)
                const dist = Math.hypot(this.enemy.x - p.x, this.enemy.y - p.y);
                const maxTurn = Math.max(0.005 * dt, speed * dt / Math.max(12, dist * 0.4));
                const a = cur + Math.max(-maxTurn, Math.min(maxTurn, turn));
                p.vx = Math.cos(a) * speed;
                p.vy = Math.sin(a) * speed;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;
            if (this.levelArena && this.levelArena.blocksShot(p)) {
                this.particles.spawnStoneChips(p.x, p.y, 3);
                this.particles.spawnClashSparks(p.x, p.y, '#ffffff');
                this.projectiles.splice(i, 1);
                continue;
            }
            
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

            // 2v2: the extra samurai are hit before the main pair is checked
            if (this.teamMatch && this.teamProjectileHit(p)) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
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
            // Team match: every screen sees every shot, but only the machine
            // that fired it may count its tower damage (else it is multiplied)
            const countsTower = !(this.teamNet && p.replicated);

            if (hitTopTower) {
                // Damage top tower (each technique has its own tower damage)
                const towerDmg = p.damageTower || 50;
                if (countsTower) this.damageTower('top', towerDmg);
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
                const shielded = countsTower && this.damageTower('bottom', towerDmg) === 'shielded';
                this.hitStopTimer = 25; // hit-stop micro freeze
                this.particles.spawnDamageText(p.x, p.y, shielded ? 'SKÖLD!' : `-${towerDmg}`, '#00f0ff', 1.25);
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
                    this.missions.track('parry');
                    this.addRage(20);
                    this.settings.vibrate(40);
                    
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
                    p.replicated = false; // it is my shot now
                    if (this.teamNet) {
                        const m = this.teamMirror({ x: p.x, y: p.y, vx: p.vx, vy: p.vy });
                        this.sendNetworkPacket({
                            type: 'tshot',
                            team: this.teamNet.myTeam,
                            x: m.x, y: m.y, vx: m.vx, vy: m.vy,
                            radius: p.radius, cannonType: p.type
                        });
                    } else if (this.isMultiplayer) {
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
                        this.addRage(6);
                        this.registerHit();
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
        // Team clashes first: a samurai they kill must not clash or ram below
        if (this.teamMatch) this.checkTeamCollisions(dt);
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
                            this.enemy.takeDamage(slashDmg, this.player.x, this.player.y, this.particles, this.canvasCtrl); this.registerHit();
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
                        this.enemy.takeDamage(slashDmg, this.player.x, this.player.y, this.particles, this.canvasCtrl); this.registerHit();
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
                    this.rubble(this.player.x, 80, 0, 1);
                    this.missions.track('ram');
                    this.addRage(25);
                    this.registerHit();
                    this.tutorialEvent('ram');
                    this.settings.vibrate(80);
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
                // Team match: a replica's ram is counted by the machine that owns it
                const shielded = !(this.teamNet && this.enemy.isRemote) && this.damageTower('bottom', ramDmg) === 'shielded';

                this.hitStopTimer = 50; // Massive tower ram freeze frame!
                this.particles.spawnDamageText(hittingNode.x, h - 70, shielded ? 'SKÖLD!' : `RAM! -${ramDmg}`, '#00f0ff', 1.4);
                this.rubble(hittingNode.x, h - 80, 0, -1);
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
                
                this.enemy.takeDamage(30, hittingNode.x, h - 70, this.particles, this.canvasCtrl, true);
                
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
        if (this.trailer && this.trailer.active) return; // nobody wins in the trailer
        if (this.teamNet) {
            if (!this.teamNet.isHost) return; // the host owns both towers
            if (this.topTower.hp <= 0) this.declareTeamEnd(this.teamNet.myTeam);
            else if (this.bottomTower.hp <= 0) this.declareTeamEnd(this.otherTeam());
            return;
        }
        if (this.isMultiplayer) {
            // Only my own tower is simulated here; the opponent announces
            // their own tower's fall via 'match_end'.
            if (this.bottomTower.hp <= 0) this.declareMatchEnd(false);
            return;
        }
        if (this.finisher) return; // the finishing moment is already playing
        if (this.topTower.hp <= 0) {
            // Player Wins! (after a moment of slow motion)
            this.startFinisher(true);
        } else if (this.bottomTower.hp <= 0) {
            // Player Loses!
            this.startFinisher(false);
        }
    }

    // The tower falls: 1.5 s of slow motion, a flash, a shock wave and a
    // thunderclap before the result screen, like the final blow in a
    // fighting game. Matches against the computer only.
    startFinisher(win) {
        const w = this.canvasCtrl.width, h = this.canvasCtrl.height;
        this.finisher = { win, until: performance.now() + 1500 };
        this.slowMoTimer = 1500;
        const x = w / 2, y = win ? 70 : h - 70;
        this.particles.spawnShockwave(x, y, win ? '#00f0ff' : '#ff0055', 220);
        this.particles.spawnShockwave(x, y, '#ffffff', 120);
        this.rubble(x, y, 0, win ? 1 : -1);
        this.rubble(x + 40, y, 0, win ? 1 : -1);
        this.canvasCtrl.flash('rgba(255, 255, 255, 0.7)', 400);
        this.canvasCtrl.shake(20, 900);
        this.audioSynth.playVoiceSubBassDrop();
        // 2 players on one phone: "your tower" would only be true for the bottom player
        const text = this.local2p ? (win ? 'SPELARE 1 VANN!' : 'SPELARE 2 VANN!') : (win ? 'TORNET FÖLL!' : 'DITT TORN FÖLL!');
        this.particles.spawnDamageText(w / 2, h / 2, text, win ? '#00f0ff' : '#ff0055', 2.2);
        this.settings.vibrate(win ? [120, 60, 120, 60, 250] : [400]);
    }

    handleVictory() {
        if (this.local2p) { this.handleLocal2pEnd(true); return; }
        this.restoreResultTitles();
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
        // DUBBLA CREDITS (fusk)
        const cheatCredits = this.cheats && this.cheats.credits ? 2 : 1;
        const rewardCredits = Math.floor(baseAward * creditUpgradeModifier) * cheatCredits;
        
        this.upgradeMgr.addCredits(rewardCredits);
        const levelBefore = levelForWave(this.upgradeMgr.state.highestWave || 1);
        this.upgradeMgr.recordHighestWave(currentWave + 1);
        // the main menu's "HÖGSTA VÅG" was only ever set at start-up
        this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
        const levelAfter = levelForWave(this.upgradeMgr.state.highestWave || 1);
        if (levelAfter > levelBefore && !this.isMultiplayer) this.showNewLevel(levelAfter);

        this.awardXP(isBoss ? 200 : 100);
        this.missions.track('matchEnd');
        if (this.isMultiplayer) this.missions.track('onlineMatch');
        else this.missions.track('win');
        if (isBoss) this.missions.track('bossWin');
        if (this.teamLayout) this.missions.track('teamWin');
        this.settings.vibrate([80, 60, 200]);

        this.uiCtrl.renderVictory(rewardCredits, isBoss, finalScore, this.matchKills || 0, resultStats.isNewHighScore);
        this.offerPodiumName('victory', resultStats);
        this.audioSynth.playVictory();
        this.sayAfterMatch();
    }

    handleDefeat() {
        if (this.local2p) { this.handleLocal2pEnd(false); return; }
        this.restoreResultTitles();
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

        // Suffer partial credit loss/award (twice as much with DUBBLA CREDITS)
        const rewardCredits = this.cheats && this.cheats.credits ? 20 : 10;
        this.upgradeMgr.addCredits(rewardCredits);
        
        this.awardXP(40);
        this.missions.track('matchEnd');
        if (this.isMultiplayer) this.missions.track('onlineMatch');
        this.settings.vibrate(300);

        this.uiCtrl.renderGameOver(rewardCredits, this.isMultiplayer ? 'Motståndaren' : 'Datorn', finalScore, this.matchKills || 0, resultStats.isNewHighScore);
        this.offerPodiumName('defeat', resultStats);
        this.audioSynth.playDefeat();
        this.sayAfterMatch();
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
        
        // Draw one-way gate visual effects and lava barrier only in a match (also paused)
        if (this.gameState === 'playing' || this.gameState === 'paused') {
            this.drawOneWayGates();
            this.drawLavaBarrier();
            if (this.levelArena) this.levelArena.draw(this.canvasCtrl.ctx);
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
        if (this.gameState === 'playing' || this.gameState === 'paused' || this.gameState === 'gameover' || this.gameState === 'victory') {
            // Towers first so a car parked at its base is never hidden behind it
            this.drawTowers();
            this.player.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            this.enemy.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            // FRYST DATOR: the computer's samurai sits in a block of ice
            if (this.cheatFreezeMs > 0 && this.enemy.state !== 'dead') {
                const ctx = this.canvasCtrl.ctx, e = this.enemy;
                const r = (e.radius || 34) + 14;
                ctx.save();
                ctx.globalAlpha = Math.min(1, this.cheatFreezeMs / 1000) * 0.85;
                ctx.fillStyle = 'rgba(160, 220, 255, 0.28)';
                ctx.strokeStyle = 'rgba(210, 245, 255, 0.9)';
                ctx.lineWidth = 3;
                ctx.beginPath();
                for (let k = 0; k < 6; k++) {
                    const ang = k * Math.PI / 3 + Math.PI / 6;
                    const px = e.x + Math.cos(ang) * r, py = e.y + Math.sin(ang) * r;
                    if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
                }
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
                ctx.restore();
            }
            if (this.teamMatch) {
                this.extraCars().forEach(car => car.draw(this.canvasCtrl.ctx, this.canvasCtrl));
            }
            if (this.rageActive) this.drawRageAura();

            // Light and shade over the whole arena, then the lava's glow on
            // whoever is standing close to it
            const fighters = [this.player, this.enemy, ...(this.teamMatch ? this.extraCars() : [])]
                .filter(c => c && c.state !== 'dead');
            this.canvasCtrl.drawLighting(fighters.map(c => ({ x: c.x, y: c.y, r: (c.radius || 30) * 3 })));
            this.drawLavaLightOn(fighters);
        }

        // Restore matrix
        this.canvasCtrl.restoreTransformations();

        // 6. Draw cinematic vignette around arena borders
        this.canvasCtrl.drawVignette();

        // Trailer bars, captions and title card over everything
        if (this.trailer && this.trailer.active) {
            this.trailer.draw(this.canvasCtrl.ctx, this.canvasCtrl.width, this.canvasCtrl.height);
            this.trailer.copyFrame();
        }
        
        // The RASERI button with its meter (matches against the computer)
        const rageBtn = this.rageBtn || (this.rageBtn = document.getElementById('rage-btn'));
        if (rageBtn) {
            const show = this.gameState === 'playing' && !this.isMultiplayer && !this.local2p;
            if (rageBtn.classList.contains('hidden') === show) rageBtn.classList.toggle('hidden', !show);
            if (show) {
                const level = this.rageActive ? 100 : Math.round(this.rage || 0);
                if (level !== this.shownRage) {
                    this.shownRage = level;
                    rageBtn.style.setProperty('--rage', level);
                }
                const ready = !this.rageActive && (this.rage || 0) >= 100;
                if (rageBtn.classList.contains('ready') !== ready) rageBtn.classList.toggle('ready', ready);
            }
        }

        // The top player's fire button (2 players on one phone)
        const shoot2 = this.shootBtn2 || (this.shootBtn2 = document.getElementById('shoot-btn-2'));
        if (shoot2) {
            const show2 = this.gameState === 'playing' && this.local2p;
            if (shoot2.classList.contains('hidden') === show2) shoot2.classList.toggle('hidden', !show2);
        }

        // The pause button: only in matches against the computer
        const pauseBtn = this.pauseBtn || (this.pauseBtn = document.getElementById('btn-pause'));
        if (pauseBtn) {
            const canPause = this.gameState === 'playing' && !this.isMultiplayer && !this.finisher && !(this.trailer && this.trailer.active);
            if (pauseBtn.classList.contains('hidden') === canPause) pauseBtn.classList.toggle('hidden', !canPause);
        }

        // UI Hud updates
        if (this.gameState === 'playing') {
            this.uiCtrl.updateHUD(this.player, this.enemy, this.isMultiplayer, this.isClient, this.matchTimer, this.currentScore, this.matchKills, this);
        }
    }

    // Warm, flickering light from the lava falling on fighters near it
    drawLavaLightOn(fighters) {
        const ctx = this.canvasCtrl.ctx;
        const centerY = this.canvasCtrl.height / 2;
        const flicker = 0.85 + 0.15 * Math.sin(this.lavaTime * 9) * Math.sin(this.lavaTime * 5.3);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        fighters.forEach(c => {
            const d = Math.abs(c.y - centerY);
            if (d > 150) return;
            const a = (1 - d / 150) * 0.32 * flicker;
            const r = (c.radius || 30) * 1.7;
            // lit from the lava side
            const lx = c.x, ly = c.y + (c.y < centerY ? r * 0.35 : -r * 0.35);
            const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, r);
            g.addColorStop(0, `rgba(255, 110, 20, ${a})`);
            g.addColorStop(1, 'rgba(255, 60, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(lx - r, ly - r, r * 2, r * 2);
        });
        ctx.restore();
    }

    // Stone chips and dust where something heavy hits the floor
    rubble(x, y, dirX = 0, dirY = 0) {
        this.particles.spawnStoneChips(x, y, 10, dirX, dirY);
        this.particles.spawnDust(x, y, dirX, dirY, 6);
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
        const flow = t * 75; // horizontal drift of the current, in px

        ctx.save();

        // 1. FLOOR GLOW: the heat lights up the stone around the river, fading
        //    out softly in every direction (no hard edges where it ends)
        const heatPulse = 1.0 + Math.sin(t * 3.5) * 0.12;
        ctx.save();
        ctx.translate(lavaMinX + lavaWidth / 2, centerY);
        ctx.scale(lavaWidth / 2 + 50, halfThick + 70);
        const heatGlow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
        heatGlow.addColorStop(0, `rgba(255, 95, 0, ${0.55 * heatPulse})`);
        heatGlow.addColorStop(0.45, `rgba(255, 70, 0, ${0.32 * heatPulse})`);
        heatGlow.addColorStop(1, 'rgba(255, 50, 0, 0)');
        ctx.fillStyle = heatGlow;
        ctx.fillRect(-1, -1, 2, 2);
        ctx.restore();

        // An eruption lights up the floor around it for a moment
        if (this.eruptionGlow) {
            const e = this.eruptionGlow;
            const k = e.life / 700;
            const r = 90 + (1 - k) * 60;
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const eg = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r);
            eg.addColorStop(0, `rgba(255, 170, 40, ${0.55 * k})`);
            eg.addColorStop(0.4, `rgba(255, 90, 0, ${0.3 * k})`);
            eg.addColorStop(1, 'rgba(255, 60, 0, 0)');
            ctx.fillStyle = eg;
            ctx.fillRect(e.x - r, e.y - r, r * 2, r * 2);
            ctx.restore();
        }

        // 2. RIVER OUTLINE - two irregular shores: rocky and uneven along the
        //    length, with only a slight slow swell over time
        const steps = 64;
        const dx = lavaWidth / steps;
        const shore = (x, side) =>
            Math.sin(x * 0.031 + side * 1.7) * 3.2 + Math.sin(x * 0.083 + side * 4.1) * 2.0 +
            Math.sin(x * 0.19 + side * 2.3) * 1.1 + Math.sin(x * 0.02 + t * (0.9 + side * 0.2)) * 1.2;
        // The river narrows to rounded ends instead of being cut off square
        const taper = (x) => {
            const d = Math.min(x - lavaMinX, lavaMaxX - x) / 34;
            return d >= 1 ? 1 : 0.15 + 0.85 * Math.sqrt(Math.max(0, d * (2 - d)));
        };
        const topShore = [];
        const bottomShore = [];
        for (let i = 0; i <= steps; i++) {
            const x = lavaMinX + i * dx;
            const k = taper(x);
            topShore.push([x, centerY + (-halfThick + shore(x, 0)) * k]);
            bottomShore.push([x, centerY + (halfThick + shore(x, 1)) * k]);
        }
        const traceRiver = () => {
            ctx.beginPath();
            topShore.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            for (let i = steps; i >= 0; i--) ctx.lineTo(bottomShore[i][0], bottomShore[i][1]);
            ctx.closePath();
        };

        // 3. EVERYTHING BELOW IS CLIPPED TO THE RIVER
        ctx.save();
        traceRiver();
        ctx.clip();

        // Tile a texture across the river, scrolled by `offset` px
        const tex = this.canvasCtrl.getLavaTextures();
        const drawTiled = (img, offset) => {
            const start = lavaMinX - (((offset % tex.tw) + tex.tw) % tex.tw);
            for (let x = start; x < lavaMaxX; x += tex.tw) {
                ctx.drawImage(img, x, centerY - tex.th / 2, tex.tw, tex.th);
            }
        };

        // 3a. The melt: two layers of the same flow moving at different speeds
        //     so it churns instead of sliding like a conveyor belt
        drawTiled(tex.molten, flow * 0.45);
        ctx.globalAlpha = 0.55;
        ctx.globalCompositeOperation = 'lighter';
        drawTiled(tex.molten, flow * 0.8 + 211);
        ctx.globalCompositeOperation = 'source-over';
        ctx.globalAlpha = 1;

        // 3b. Slow breathing of the heat
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = `rgba(255, 90, 0, ${0.07 + 0.06 * Math.sin(t * 2.3)})`;
        ctx.fillRect(lavaMinX, centerY - tex.th / 2, lavaWidth, tex.th);
        ctx.globalCompositeOperation = 'source-over';

        // 3c. Cooled crust plates riding on top, slower than the melt under them
        drawTiled(tex.crust, flow * 0.3 + 97);

        // 3d. Swelling gas bubbles: a glowing dome that bursts at full size
        this.lavaBubbles.forEach(b => {
            const grow = b.radius / b.maxRadius;
            const bubbleGrad = ctx.createRadialGradient(b.x - b.radius * 0.25, b.y - b.radius * 0.3, b.radius * 0.1, b.x, b.y, b.radius);
            bubbleGrad.addColorStop(0, `rgba(255, 235, 150, ${0.55 + 0.4 * grow})`);
            bubbleGrad.addColorStop(0.55, 'rgba(255, 120, 10, 0.9)');
            bubbleGrad.addColorStop(1, 'rgba(90, 10, 0, 0.9)');
            ctx.fillStyle = bubbleGrad;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        ctx.restore(); // end river clip

        // 4. COOLED SHORELINE: dark crust lip with a searing seam just inside it
        const strokeShore = (pts) => {
            ctx.beginPath();
            pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            ctx.stroke();
        };
        // A charred band of stone that fades into the floor (no hard outline),
        // then a thin searing seam where rock meets melt
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = 'rgba(18, 8, 5, 0.35)';
        ctx.lineWidth = 11;
        strokeShore(topShore);
        strokeShore(bottomShore);
        ctx.strokeStyle = 'rgba(22, 9, 6, 0.6)';
        ctx.lineWidth = 4;
        strokeShore(topShore);
        strokeShore(bottomShore);
        ctx.strokeStyle = `rgba(255, 140, 20, ${0.45 + 0.2 * Math.sin(t * 4)})`;
        ctx.lineWidth = 1.1;
        ctx.shadowColor = '#ff7a00';
        ctx.shadowBlur = 8;
        strokeShore(topShore.map(([x, y]) => [x, y + 2]));
        strokeShore(bottomShore.map(([x, y]) => [x, y - 2]));
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

    // ------------------------------------------------------------------
    // TEAM NETWORKING (2v2, 3v3, 4v4)
    //
    // Everybody sits in one room channel. The host owns the roster, the
    // match clock, both towers and every computer-driven samurai; each
    // human owns their own samurai and reports its position and hp.
    // Positions travel in "team A at the bottom" coordinates, so a team B
    // peer mirrors them on the way out and on the way in - that way both
    // sides always see themselves at the bottom of the screen.
    // ------------------------------------------------------------------

    otherTeam() {
        return this.teamNet && this.teamNet.myTeam === 'a' ? 'b' : 'a';
    }

    // Local <-> shared coordinates (an involution: same maths both ways)
    teamMirror(p) {
        if (!this.teamNet || this.teamNet.myTeam === 'a') return { ...p };
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const out = { ...p };
        if (typeof p.x === 'number') out.x = w - p.x;
        if (typeof p.y === 'number') out.y = h - p.y;
        if (typeof p.vx === 'number') out.vx = -p.vx;
        if (typeof p.vy === 'number') out.vy = -p.vy;
        return out;
    }

    // Open (or join) a room that plays a team match
    setupTeamRoom(code, isHost, size, quick = false, electing = false) {
        this.cleanupNetwork();
        this.isMultiplayer = true;
        this.isClient = !isHost;
        this.gameState = 'lobby';
        this.roomId = code;
        this.quickMatch = quick;

        this.teamNet = {
            code,
            isHost,
            size,
            quick,
            electing,
            seen: new Set(),
            myId: Math.random().toString(36).slice(2, 10),
            myTeam: 'a',
            mySlot: 0,
            peers: [],          // host's roster: [{ id, team, slot }]
            carBySlot: new Map(),
            started: false
        };

        const codeEl = document.getElementById('lobby-code-val');
        if (codeEl) codeEl.innerText = code;
        const codeBlock = document.getElementById('lobby-code-block');
        if (codeBlock) codeBlock.classList.toggle('hidden', quick);
        const titleEl = document.getElementById('lobby-title');
        if (titleEl) titleEl.innerText = `${size} MOT ${size}`;
        this.uiCtrl.showScreen('lobby');
        this.updateTeamLobby('Kopplar upp...');

        this.ws = new WebSocket(`wss://itty.ws/c/dangerousfight-${code}`);

        this.ws.onopen = () => {
            if (electing) {
                // Nobody owns this room yet: everyone says hello and the
                // lowest id takes the host seat once the dust settles.
                this.teamNet.seen.add(this.teamNet.myId);
                const hello = () => this.sendNetworkPacket({ type: 'team_hello', id: this.teamNet.myId, size });
                hello();
                this.mmTimers.push(setInterval(hello, 700));
                this.mmTimers.push(setTimeout(() => this.finishTeamElection(), 2500));
                this.updateTeamLobby('Söker spelare...');
            } else if (isHost) {
                this.teamNet.peers = [{ id: this.teamNet.myId, team: 'a', slot: 0 }];
                this.updateTeamLobby('Väntar på spelare...');
                this.showTeamStartButton(true);
            } else {
                this.sendNetworkPacket({ type: 'team_hello', id: this.teamNet.myId, size });
                this.updateTeamLobby('Ansluten. Väntar på värden...');
            }
        };

        this.ws.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.self) return;
                const data = payload.message || payload;

                if (payload.type === 'leave' && this.teamNet && this.teamNet.isHost && !this.teamNet.started) {
                    this.updateTeamLobby('En spelare lämnade rummet.');
                    return;
                }
                if (data && data.type) this.handleIncomingPacket(data);
            } catch (err) {
                console.error('Team packet error:', err);
            }
        };

        this.ws.onerror = () => this.updateTeamLobby('Nätverksfel.');
        this.ws.onclose = () => {
            if (!this.teamNet) return;
            if (!this.teamNet.started) {
                this.updateTeamLobby('Anslutningen bröts.');
            } else if (this.gameState === 'playing') {
                this.handleOpponentLeft('Anslutningen bröts');
            }
        };
    }

    // Online team match: join the shared room for this team size. The room
    // itself is the lobby - the lowest id becomes host, seats everyone who
    // said hello and fills the rest of the seats with computer samurai.
    startTeamQuickMatch(size, roomIndex = 1) {
        this.setupTeamRoom(`team${size}-${roomIndex}`, false, size, true, true);
        this.teamNet.roomIndex = roomIndex;
    }

    finishTeamElection() {
        const t = this.teamNet;
        if (!t || !t.electing || t.started) return;
        t.electing = false;
        const ids = [...t.seen].sort();
        if (ids[0] !== t.myId) {
            // Someone else hosts: keep saying hello until their roster arrives
            this.updateTeamLobby('Väntar på värden...');
            return;
        }
        t.isHost = true;
        this.isClient = false;
        t.peers = [{ id: t.myId, team: 'a', slot: 0 }];
        ids.filter(id => id !== t.myId).forEach(id => this.seatTeamPeer(id));
        this.updateTeamLobby('Du är värd. Väntar på fler spelare...');
        this.showTeamStartButton(true);
        // Start on a full room, or after a short wait with computer stand-ins
        this.mmTimers.push(setTimeout(() => {
            if (this.teamNet === t && !t.started) {
                this.updateTeamLobby('Startar med datorspelare på tomma platser...');
                this.startTeamMatchNow();
            }
        }, 10000));
    }

    updateTeamLobby(message) {
        const status = document.querySelector('.lobby-status');
        if (!status || !this.teamNet) return;
        const humans = this.teamNet.isHost ? this.teamNet.peers.length : (this.teamNet.lobbyCount || 1);
        const seats = this.teamNet.size * 2;
        status.innerText = `${message} (${humans}/${seats} spelare, tomma platser fylls av datorn)`;
    }

    showTeamStartButton(show) {
        const btn = document.getElementById('btn-team-start');
        if (btn) btn.classList.toggle('hidden', !show);
    }

    // Host: hand out teams and kick the match off
    startTeamMatchNow() {
        if (!this.teamNet || !this.teamNet.isHost || this.teamNet.started) return;
        const roster = { type: 'team_roster', size: this.teamNet.size, peers: this.teamNet.peers };
        this.sendNetworkPacket(roster);
        this.applyTeamRoster(roster);
    }

    // Seat a joining player. In a private room your friends join YOUR team
    // first, so you can take on the computer together; in an online match the
    // seats alternate (a0, b0, a1, b1) so both teams get real players.
    seatTeamPeer(id) {
        const t = this.teamNet;
        if (!t || !t.isHost || t.started) return;
        if (t.peers.some(p => p.id === id)) return;
        const taken = new Set(t.peers.map(p => p.team + p.slot));
        const seats = [];
        if (t.quick) {
            for (let slot = 0; slot < t.size; slot++) for (const team of ['a', 'b']) seats.push([team, slot]);
        } else {
            for (const team of ['a', 'b']) for (let slot = 0; slot < t.size; slot++) seats.push([team, slot]);
        }
        for (const [team, slot] of seats) {
            {
                const key = team + slot;
                if (taken.has(key)) continue;
                t.peers.push({ id, team, slot });
                // Only a headcount while we wait - the roster is what starts
                // the match, so it must not go out until the teams are final.
                this.sendNetworkPacket({ type: 'team_lobby', count: t.peers.length, size: t.size });
                this.updateTeamLobby('Spelare anslöt!');
                if (t.peers.length >= t.size * 2) this.startTeamMatchNow();
                return;
            }
        }
    }

    // Everyone: build the arena the roster describes
    applyTeamRoster(roster) {
        const t = this.teamNet;
        if (!t) return;
        t.started = true;
        this.cleanupMatchmaking(); // stop saying hello, the room is settled
        t.size = roster.size;
        t.peers = roster.peers;
        this.showTeamStartButton(false);

        const me = roster.peers.find(p => p.id === t.myId);
        t.myTeam = me ? me.team : 'a';
        t.mySlot = me ? me.slot : 0;
        const foeTeam = this.otherTeam();

        const humanAt = (team, slot) => roster.peers.some(p => p.team === team && p.slot === slot);
        const others = [];
        for (let i = 0; i < roster.size; i++) if (i !== t.mySlot) others.push(i);
        const myOrder = [t.mySlot, ...others];
        const foeOrder = [];
        for (let i = 0; i < roster.size; i++) foeOrder.push(i);

        this.teamLayout = {
            size: roster.size,
            allies: myOrder.slice(1).map(slot => (humanAt(t.myTeam, slot) ? 'remote' : 'ai')),
            foes: foeOrder.slice(1).map(slot => (humanAt(foeTeam, slot) ? 'remote' : 'ai')),
            foe0: humanAt(foeTeam, foeOrder[0]) ? 'remote' : 'ai'
        };

        // Only the host drives the computer slots; everyone else replicates them
        if (!t.isHost) {
            this.teamLayout.allies = this.teamLayout.allies.map(() => 'remote');
            this.teamLayout.foes = this.teamLayout.foes.map(() => 'remote');
            this.teamLayout.foe0 = 'remote';
        }

        this.startRun();

        // Map every seat to the samurai that represents it on this screen
        t.carBySlot = new Map();
        const mine = this.myTeamCars();
        const foes = this.foeTeamCars();
        myOrder.forEach((slot, i) => { if (mine[i]) t.carBySlot.set(t.myTeam + slot, mine[i]); });
        foeOrder.forEach((slot, i) => { if (foes[i]) t.carBySlot.set(foeTeam + slot, foes[i]); });
        t.aiSeats = [];
        ['a', 'b'].forEach(team => {
            for (let slot = 0; slot < roster.size; slot++) {
                if (!humanAt(team, slot)) t.aiSeats.push(team + slot);
            }
        });
    }

    sendTeamSync() {
        const t = this.teamNet;
        if (!t || !t.started || this.gameState !== 'playing') return;

        const packCar = (car) => {
            const m = this.teamMirror({ x: car.x, y: car.y, vx: car.vx, vy: car.vy });
            return {
                x: m.x, y: m.y, vx: m.vx, vy: m.vy,
                hp: car.hp, maxHp: car.maxHp,
                energy: car.energy || 0,
                dead: car.state === 'dead'
            };
        };

        this.sendNetworkPacket({ type: 'tsync', id: t.myId, car: packCar(this.player) });

        if (t.isHost) {
            const ai = (t.aiSeats || []).map(seat => {
                const car = t.carBySlot.get(seat);
                return car ? { seat, ...packCar(car) } : null;
            }).filter(Boolean);
            this.sendNetworkPacket({
                type: 'hsync',
                timer: this.matchTimer,
                towers: { [t.myTeam]: this.bottomTower.hp, [this.otherTeam()]: this.topTower.hp },
                maxTower: this.bottomTower.maxHp,
                ai
            });
        }
    }

    applyTeamCarState(car, data) {
        if (!car) return;
        const m = this.teamMirror({ x: data.x, y: data.y, vx: data.vx, vy: data.vy });
        car.x = m.x;
        car.y = m.y;
        car.vx = m.vx;
        car.vy = m.vy;
        if (typeof data.maxHp === 'number') car.maxHp = data.maxHp;
        if (typeof data.energy === 'number') car.energy = data.energy;
        if (data.dead && car.state !== 'dead') {
            car.state = 'dead';
            car.hp = 0;
            car.respawnTimer = Number.MAX_SAFE_INTEGER; // the owner revives it
            car.vx = 0;
            car.vy = 0;
            this.particles.spawnShockwave(car.x, car.y, car.color, 70);
        } else if (!data.dead && car.state === 'dead') {
            car.state = 'idle';
            car.respawnTimer = 0;
            this.particles.spawnShockwave(car.x, car.y, car.color, 40);
        }
        if (!data.dead) car.hp = data.hp;
    }

    handleTeamPacket(data) {
        const t = this.teamNet;
        if (!t) return;

        if (data.type === 'team_hello') {
            if (t.started) {
                // Only the host answers for the room. A player we already
                // seated is just repeating their hello because our roster did
                // not reach them, so send it again instead of turning them away.
                if (!t.isHost) return;
                if (t.peers.some(p => p.id === data.id)) {
                    this.sendNetworkPacket({ type: 'team_roster', size: t.size, peers: t.peers });
                } else {
                    this.sendNetworkPacket({ type: 'team_busy', to: data.id, room: t.roomIndex || 1 });
                }
                return;
            }
            if (t.electing) t.seen.add(data.id);
            else if (t.isHost) this.seatTeamPeer(data.id);
            return;
        }
        if (data.type === 'team_busy') {
            if (t.started || !t.quick || data.to !== t.myId) return;
            const next = (t.roomIndex || 1) + 1;
            if (next > 5) return;
            this.startTeamQuickMatch(t.size, next);
            return;
        }
        if (data.type === 'team_lobby') {
            if (!t.started) {
                // Only a host sends this: the room already has one, so a late
                // arrival must not elect itself as a second host.
                t.electing = false;
                t.lobbyCount = data.count;
                this.updateTeamLobby('Väntar på fler spelare...');
            }
            return;
        }
        if (data.type === 'team_roster') {
            // A roster without me (my hello came too late) is not my match:
            // wait for the host's 'team_busy' instead of joining as a ghost
            if (!t.isHost && !t.started && (data.peers || []).some(p => p.id === t.myId)) this.applyTeamRoster(data);
            return;
        }
        if (data.type === 'tsync') {
            if (data.id === t.myId || this.gameState !== 'playing') return;
            const seat = t.peers.find(p => p.id === data.id);
            if (!seat) return;
            this.applyTeamCarState(t.carBySlot.get(seat.team + seat.slot), data.car);
            return;
        }
        if (data.type === 'hsync') {
            if (t.isHost || this.gameState !== 'playing') return;
            if (typeof data.timer === 'number') this.matchTimer = data.timer;
            // Both towers are sized by the host's upgrades, not by mine
            if (typeof data.maxTower === 'number') {
                this.bottomTower.maxHp = data.maxTower;
                this.topTower.maxHp = data.maxTower;
            }
            if (data.towers) {
                if (typeof data.towers[t.myTeam] === 'number') this.bottomTower.hp = data.towers[t.myTeam];
                if (typeof data.towers[this.otherTeam()] === 'number') this.topTower.hp = data.towers[this.otherTeam()];
            }
            (data.ai || []).forEach(entry => this.applyTeamCarState(t.carBySlot.get(entry.seat), entry));
            return;
        }
        if (data.type === 'towerhit') {
            if (!t.isHost || this.gameState !== 'playing') return;
            const tower = data.team === t.myTeam ? this.bottomTower : this.topTower;
            tower.hp = Math.max(0, tower.hp - data.amount);
            this.checkWinCondition();
            return;
        }
        if (data.type === 'tshot') {
            if (this.gameState !== 'playing') return;
            const m = this.teamMirror({ x: data.x, y: data.y, vx: data.vx, vy: data.vy });
            const owner = data.team === t.myTeam ? 'player' : 'enemy';
            this.spawnProjectile(m.x, m.y, m.vx, m.vy, data.radius, owner, data.cannonType || 'laser', true);
            return;
        }
        if (data.type === 'team_end') {
            if (this.gameState !== 'playing') return;
            if (data.winner === t.myTeam) this.handleVictory();
            else this.handleDefeat();
            return;
        }
        if (data.type === 'restart_request') {
            this.restartRequestedRemote = true;
            this.tryMutualRestart();
        }
    }

    declareTeamEnd(winnerTeam) {
        this.sendNetworkPacket({ type: 'team_end', winner: winnerTeam });
        if (winnerTeam === this.teamNet.myTeam) this.handleVictory();
        else this.handleDefeat();
    }

    // ------------------------------------------------------------------
    // 2 VS 2
    //
    // The arena holds up to four samurai: my team at the bottom (me plus
    // `ally`), the other team at the top (`enemy` plus `enemy2`). Every
    // extra slot is an Enemy instance that is either computer-driven
    // (`aiControlled`) or a replica of a networked player (`isRemote`).
    // Teams are decided by `side`, so the same AI code fights either way.
    // ------------------------------------------------------------------

    // How much room the arena needs for this line-up. Bigger teams zoom the
    // camera out instead of cramming eight samurai into a 1v1 sized floor.
    static get TEAM_WORLD_SCALE() {
        return { 1: 1, 2: 1, 3: 0.78, 4: 0.62 };
    }

    // Two teams, two colours. The colour belongs to the TEAM, not to the
    // half of the screen you are on - so if you are told you are green,
    // everyone in the match agrees that the green samurai are your side.
    static get TEAM_PALETTES() {
        return {
            green: ['#39ff14', '#00ffa3', '#b6ff00', '#00c853'],
            red: ['#ff0033', '#ff4d00', '#ff2d78', '#c62828']
        };
    }

    static get TEAM_NAMES() {
        return { green: 'GRÖNA', red: 'RÖDA' };
    }

    // layout: { size: 2..4, allies: [...], foes: [...] } with 'ai' | 'remote'
    setupTeamMatch(layout) {
        this.teamMatch = true;
        this.teamRamCooldowns = new Map();

        // Team A is green, team B is red. Offline you are always green.
        this.myTeamColor = this.teamNet && this.teamNet.myTeam === 'b' ? 'red' : 'green';
        this.foeTeamColor = this.myTeamColor === 'green' ? 'red' : 'green';
        const myPalette = Game.TEAM_PALETTES[this.myTeamColor];
        const foePalette = Game.TEAM_PALETTES[this.foeTeamColor];

        const size = Math.max(1, Math.min(4, layout.size || 2));
        this.canvasCtrl.setWorldScale(Game.TEAM_WORLD_SCALE[size] || 1);
        this.inputCtrl.worldScale = this.canvasCtrl.worldScale;

        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        // Evenly spaced starting slots along each team's base line
        const slotX = (i) => (w * (i + 1)) / (size + 1);

        this.player.x = slotX(0);
        this.player.y = h - 120;
        this.enemy.x = slotX(0);
        this.enemy.y = 120;
        this.enemy.side = 'top';
        this.player.teamColor = myPalette[0];
        this.enemy.color = foePalette[0];
        if (layout.foe0) {
            this.enemy.aiControlled = layout.foe0 === 'ai';
            this.enemy.isRemote = layout.foe0 === 'remote';
        } else {
            this.enemy.aiControlled = !this.isMultiplayer;
            this.enemy.isRemote = this.isMultiplayer ? true : undefined;
        }

        const build = (existing, side, i, control) => {
            const x = slotX(i);
            const y = side === 'top' ? 120 : h - 120;
            const car = existing || new Enemy(x, y, this);
            car.game = this;
            car.side = side;
            car.resetForRun(false);
            car.x = x;
            car.y = y;
            car.angle = side === 'top' ? Math.PI / 2 : -Math.PI / 2;
            car.trailHistory = [];
            car.aiControlled = control === 'ai';
            car.isRemote = control === 'remote';
            const palette = side === 'bottom' ? myPalette : foePalette;
            car.color = palette[i % palette.length];
            return car;
        };

        const allyControls = layout.allies || [];
        const foeControls = layout.foes || [];
        const nextAllies = [];
        const nextFoes = [];
        for (let i = 1; i < size; i++) {
            nextAllies.push(build(this.allies[i - 1], 'bottom', i, allyControls[i - 1] || 'ai'));
            nextFoes.push(build(this.foes[i - 1], 'top', i, foeControls[i - 1] || 'ai'));
        }
        this.allies = nextAllies;
        this.foes = nextFoes;
    }

    clearTeamMatch() {
        this.teamMatch = false;
        this.player.teamColor = null;
        this.myTeamColor = null;
        this.foeTeamColor = null;
        this.allies = [];
        this.foes = [];
        this.teamRamCooldowns = new Map();
        // Back to the 1v1 rule (AI offline, replica online). A team match may
        // have left the main opponent flagged as remote (frozen, unkillable
        // AI next match) or as AI (a replica that also runs its own AI online).
        this.enemy.aiControlled = null;
        this.enemy.isRemote = undefined;
        this.enemy.side = 'top';
        if (this.canvasCtrl.worldScale !== 1) {
            this.canvasCtrl.setWorldScale(1);
            this.inputCtrl.worldScale = 1;
        }
    }

    // Every samurai except the two the 1v1 code already owns
    extraCars() {
        return [...this.allies, ...this.foes];
    }

    myTeamCars() {
        return [this.player, ...this.allies];
    }

    foeTeamCars() {
        return [this.enemy, ...this.foes];
    }

    // Closest living samurai on the other team (the AI needs someone to chase)
    nearestFoeFor(car) {
        const foes = (car.side === 'bottom' ? this.foeTeamCars() : this.myTeamCars())
            .filter(c => c && c.state !== 'dead');
        if (!foes.length) return car.side === 'bottom' ? this.enemy : this.player;
        let best = foes[0];
        let bestDist = Infinity;
        foes.forEach(c => {
            const d = Math.hypot(c.x - car.x, c.y - car.y);
            if (d < bestDist) { bestDist = d; best = c; }
        });
        return best;
    }

    // Same lava rules as the main pair, for the extra samurai
    applyLavaToCar(car, dt, lavaMinX, lavaMaxX, lavaMinY, lavaMaxY, lavaDamagePerMs) {
        if (car.x <= lavaMinX || car.x >= lavaMaxX || car.y <= lavaMinY || car.y >= lavaMaxY) return;
        const h = this.canvasCtrl.height;
        if (!car.isRemote) car.hp = Math.max(0, car.hp - lavaDamagePerMs * dt);
        car.vx *= Math.pow(0.95, dt / 16);
        car.vy *= Math.pow(0.95, dt / 16);
        car.vy += (car.side === 'bottom' ? 0.004 : -0.004) * dt; // pushed back to its own half
        const now = Date.now();
        if (now - (car.lastLavaSizzle || 0) > 160) {
            car.lastLavaSizzle = now;
            this.audioSynth.playLavaSizzle();
            this.particles.spawnLavaSplash(car.x, car.y, car.vx, car.vy);
            this.particles.addDecal(car.x, car.y > h / 2 ? lavaMaxY : lavaMinY, 16, 'rgba(0,0,0,0.8)', 'scorch');
        }
        if (car.hp <= 0) car.takeDamage(1, car.x, car.y, this.particles, this.canvasCtrl);
    }

    // Returns true when the projectile was consumed by one of the extra samurai
    teamProjectileHit(p) {
        const targets = p.owner === 'player' ? this.foeTeamCars() : this.myTeamCars();
        for (const car of targets) {
            // the main pair is handled by the original 1v1 code below
            if (car === this.player || car === this.enemy) continue;
            if (!car || car.state === 'dead') continue;
            if (Math.hypot(p.x - car.x, p.y - car.y) >= car.radius + p.radius) continue;
            this.hitStopTimer = 15;
            car.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
            if (p.owner === 'player' && car.side === 'top') {
                this.addScore(Math.round(p.damageCar || 25), p.x, p.y);
            }
            return true;
        }
        return false;
    }

    // Elastic clash between two samurai, with slash damage to both sides
    resolveTeamClash(a, b) {
        if (!a || !b || a.state === 'dead' || b.state === 'dead') return;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const touchDist = a.radius + b.radius;
        if (dist >= touchDist || dist === 0) return;

        const angle = Math.atan2(a.y - b.y, a.x - b.x);
        const overlap = touchDist - dist;
        a.x += Math.cos(angle) * overlap * 0.5;
        a.y += Math.sin(angle) * overlap * 0.5;
        b.x -= Math.cos(angle) * overlap * 0.5;
        b.y -= Math.sin(angle) * overlap * 0.5;

        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const velAlongNormal = (a.vx - b.vx) * normalX + (a.vy - b.vy) * normalY;
        if (velAlongNormal < 0) {
            const preA = Math.hypot(a.vx, a.vy);
            const preB = Math.hypot(b.vx, b.vy);
            let impulse = -(1 + 0.85) * velAlongNormal;
            impulse /= (1 / a.mass) + (1 / b.mass);
            a.vx += (impulse / a.mass) * normalX;
            a.vy += (impulse / a.mass) * normalY;
            b.vx -= (impulse / b.mass) * normalX;
            b.vy -= (impulse / b.mass) * normalY;

            // Whoever came in fast lands the slash
            const slashOf = (car) => {
                const profile = car.profile || this.player.profiles[car.activeWeaponKey] || this.player.profiles.katana;
                return Math.floor((profile.ramDamage || 100) * 0.5);
            };
            if (preA > 0.08) {
                const dmg = slashOf(a);
                b.takeDamage(dmg, a.x, a.y, this.particles, this.canvasCtrl);
                if (a === this.player) this.addScore(dmg * 2, (a.x + b.x) / 2, (a.y + b.y) / 2, 'SLASH!');
            }
            if (preB > 0.08) {
                const dmg = slashOf(b);
                a.takeDamage(dmg, b.x, b.y, this.particles, this.canvasCtrl);
                if (b === this.player) this.addScore(dmg * 2, (a.x + b.x) / 2, (a.y + b.y) / 2, 'SLASH!');
            }
        }

        this.hitStopTimer = 30;
        this.audioSynth.playClash();
        this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
        this.canvasCtrl.addFloorPulse((a.x + b.x) / 2, (a.y + b.y) / 2, '#00f0ff', 160);
        this.particles.spawnClashSparks((a.x + b.x) / 2, (a.y + b.y) / 2, '#ffffff');
    }

    // An extra samurai ramming the other team's tower
    checkTeamTowerRam(car) {
        if (!car || car.state === 'dead') return;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const targetIsTop = car.side === 'bottom';
        const atTower = targetIsTop ? car.y < 85 : car.y > h - 85;
        if (!atTower) return;
        if (targetIsTop && this.isHardBossRound) {
            // The boss's twin towers sit in the corners, nothing in the middle
            // (a reinforcement joining a boss match rams these)
            const left = car.x + car.radius >= 80 && car.x - car.radius <= 160;
            const right = car.x + car.radius >= w - 160 && car.x - car.radius <= w - 80;
            if (!left && !right) return;
        } else if (car.x + car.radius < w / 2 - 80 || car.x - car.radius > w / 2 + 80) return;
        if (Math.abs(car.vy) <= 0.05) return;

        const cooldown = this.teamRamCooldowns.get(car) || 0;
        if (cooldown > Date.now()) return;
        this.teamRamCooldowns.set(car, Date.now() + 800);

        const profile = car.profile || this.player.profiles[car.activeWeaponKey] || this.player.profiles.katana;
        const ramDmg = profile.ramDamage || 100;
        // A replica's ram is counted by the machine that owns that samurai
        if (!(this.teamNet && car.isRemote)) this.damageTower(targetIsTop ? 'top' : 'bottom', ramDmg);
        const color = targetIsTop ? '#ff0077' : '#00f0ff';
        this.particles.spawnDamageText(car.x, targetIsTop ? 70 : h - 70, `RAM! -${ramDmg}`, color, 1.3);
        this.rubble(car.x, targetIsTop ? 80 : h - 80, 0, targetIsTop ? 1 : -1);
        this.particles.spawnShockwave(car.x, car.y, color, 60);
        this.canvasCtrl.shake(9, 220);
        this.audioSynth.playHit();
        car.vy = -car.vy * 0.8;
        car.takeDamage(30, car.x, car.y, this.particles, this.canvasCtrl, true);
        this.checkWinCondition();
    }

    checkTeamCollisions(dt) {
        const mine = this.myTeamCars();
        const foes = this.foeTeamCars();
        // Every cross-team pair except player-vs-enemy, which the 1v1 code owns
        mine.forEach(a => foes.forEach(b => {
            if (a === this.player && b === this.enemy) return;
            this.resolveTeamClash(a, b);
        }));
        // Team mates bump into each other without drawing blades
        [mine, foes].forEach(team => {
            for (let i = 0; i < team.length; i++) {
                for (let j = i + 1; j < team.length; j++) {
                    this.resolveTeamBump(team[i], team[j]);
                }
            }
        });
        this.extraCars().forEach(car => this.checkTeamTowerRam(car));
    }

    // Friendly collision: push apart, no blades
    resolveTeamBump(a, b) {
        if (!a || !b || a.state === 'dead' || b.state === 'dead') return;
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const touchDist = a.radius + b.radius;
        if (dist >= touchDist || dist === 0) return;
        const angle = Math.atan2(a.y - b.y, a.x - b.x);
        const overlap = touchDist - dist;
        a.x += Math.cos(angle) * overlap * 0.5;
        a.y += Math.sin(angle) * overlap * 0.5;
        b.x -= Math.cos(angle) * overlap * 0.5;
        b.y -= Math.sin(angle) * overlap * 0.5;
        const normalX = Math.cos(angle);
        const normalY = Math.sin(angle);
        const velAlongNormal = (a.vx - b.vx) * normalX + (a.vy - b.vy) * normalY;
        if (velAlongNormal >= 0) return;
        let impulse = -(1 + 0.6) * velAlongNormal;
        impulse /= (1 / a.mass) + (1 / b.mass);
        a.vx += (impulse / a.mass) * normalX;
        a.vy += (impulse / a.mass) * normalY;
        b.vx -= (impulse / b.mass) * normalX;
        b.vy -= (impulse / b.mass) * normalY;
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
        // TORNSKÖLD: a shimmering dome over my tower while it lasts
        if (this.towerShieldMs > 0) {
            const t = performance.now();
            const fade = Math.min(1, this.towerShieldMs / 3000); // fades out in the last 3 seconds
            const blink = this.towerShieldMs < 3000 ? 0.6 + 0.4 * Math.sin(t / 60) : 1;
            ctx.save();
            ctx.globalAlpha = fade * blink;
            const g = ctx.createRadialGradient(w / 2, h, 60, w / 2, h, 150);
            g.addColorStop(0, 'rgba(0, 240, 255, 0)');
            g.addColorStop(0.8, 'rgba(0, 240, 255, 0.12)');
            g.addColorStop(1, 'rgba(0, 240, 255, 0.35)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(w / 2, h, 150, Math.PI, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = `rgba(120, 250, 255, ${0.6 + 0.3 * Math.sin(t / 200)})`;
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(w / 2, h, 150, Math.PI, Math.PI * 2); ctx.stroke();
            ctx.restore();
        }

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
        // The trailer recording drives the frames itself (see Trailer.driveFrames)
        if (this.externalClock) {
            this.lastTime = timestamp;
            requestAnimationFrame((t) => this.loop(t));
            return;
        }
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
    // Before the game: the canvas text hook must be in place for the first frame
    window.i18n = new I18n();
    window.game = new Game(); // exposed for debugging in the console
});
