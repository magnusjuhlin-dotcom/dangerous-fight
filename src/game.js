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
        
        // Multiplayer WebRTC state
        this.isMultiplayer = false;
        this.isClient = false;
        this.peer = null;
        this.conn = null;
        this.roomId = '';
        
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
        
        // Open multiplayer select screen
        document.getElementById('btn-play-online').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Multiplayer back
        document.getElementById('btn-multi-back').addEventListener('click', () => {
            this.audioSynth.playClick();
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
        
        // Game Over screen buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            if (this.isMultiplayer) {
                this.sendNetworkPacket({ type: 'restart_request' });
                document.getElementById('stat-defeat-winner').innerText = 'Väntar på motståndare...';
            } else {
                this.startRun();
            }
        });
        
        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('menu');
        });
        
        // Victory screen buttons
        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            if (this.isMultiplayer) {
                this.sendNetworkPacket({ type: 'restart_request' });
            } else {
                this.startRun();
            }
        });
        
        document.getElementById('btn-victory-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
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
        this.inputCtrl.onDragStart = (x, y) => {
            if (this.gameState !== 'playing') return false;
            if (this.player.containsPoint(x, y)) {
                return this.player.startDrag();
            }
            return false;
        };
        
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

    // Host PeerJS Setup
    setupMultiplayerHost() {
        this.isMultiplayer = true;
        this.isClient = false;
        
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomId = randomCode;
        document.getElementById('lobby-code-val').innerText = randomCode;
        this.uiCtrl.showScreen('lobby');

        this.peer = new Peer(`dangerousfight-${randomCode}`);
        
        this.peer.on('open', (id) => {
            console.log('Room hosted with ID:', randomCode);
        });

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.bindNetworkEvents();
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error, retrying host...', err);
            this.cleanupNetwork();
            this.setupMultiplayerHost(); // try again with a different code
        });
    }

    // Client PeerJS Setup
    setupMultiplayerClient(code) {
        this.isMultiplayer = true;
        this.isClient = true;
        this.roomId = code;
        
        const statusEl = document.getElementById('join-status-text');
        statusEl.innerText = 'Ansluter...';

        this.peer = new Peer(); // Random Client ID
        
        this.peer.on('open', (id) => {
            const hostId = `dangerousfight-${code}`;
            this.conn = this.peer.connect(hostId);
            this.bindNetworkEvents();
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS Join error:', err);
            statusEl.innerText = 'Kunde inte ansluta till rummet.';
            this.cleanupNetwork();
        });
    }

    bindNetworkEvents() {
        this.conn.on('open', () => {
            console.log('Network connection fully open!');
            this.sendNetworkPacket({
                type: 'handshake',
                vehicle: this.player.activeWeaponKey,
                cannon: this.upgradeMgr.state.equippedCannons || [this.upgradeMgr.state.equippedCannon || 'laser'],
                upgrades: this.upgradeMgr.state.upgrades
            });
        });

        this.conn.on('data', (data) => {
            this.handleIncomingPacket(data);
        });

        this.conn.on('close', () => {
            console.log('Network connection closed!');
            this.cleanupNetwork();
            if (this.gameState === 'playing') {
                this.uiCtrl.renderGameOver(0, 'Motståndaren kopplade från');
            }
        });
    }

    cleanupNetwork() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.isMultiplayer = false;
        this.isClient = false;
    }

    sendNetworkPacket(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    handleIncomingPacket(data) {
        if (data.type === 'handshake') {
            // Setup opponent's vehicle type
            this.enemy.setVehicleType(data.vehicle);
            if (data.upgrades) {
                // Symmetrically, opponent's upgrades affect their maxHP
                this.enemy.maxHp = this.enemy.profile.baseHp + ((data.upgrades.health || 0) * 10);
                this.enemy.hp = this.enemy.maxHp;
            }
            
            // Handshake response from client to host
            if (!this.isClient) {
                this.sendNetworkPacket({
                    type: 'handshake_ack',
                    vehicle: this.player.activeWeaponKey,
                    cannon: this.upgradeMgr.state.equippedCannons || [this.upgradeMgr.state.equippedCannon || 'laser'],
                    upgrades: this.upgradeMgr.state.upgrades
                });
                // Host kicks off run!
                this.startRun();
            }
        } else if (data.type === 'handshake_ack') {
            this.enemy.setVehicleType(data.vehicle);
            if (data.upgrades) {
                this.enemy.maxHp = this.enemy.profile.baseHp + ((data.upgrades.health || 0) * 10);
                this.enemy.hp = this.enemy.maxHp;
            }
            // Client kicks off run!
            this.startRun();
        } else if (data.type === 'sync') {
            // Sync positions (Note: Mirrored view mapping!)
            const w = this.canvasCtrl.width;
            const h = this.canvasCtrl.height;

            // Opponent car position/speed/HP
            this.enemy.x = w - data.player.x;
            this.enemy.y = h - data.player.y;
            this.enemy.vx = -data.player.vx;
            this.enemy.vy = -data.player.vy;
            this.enemy.hp = data.player.hp;
            this.enemy.energy = data.player.energy;
            
            // Sync screen shake
            if (data.shake) {
                this.canvasCtrl.shake(data.shake.amt, data.shake.dur);
            }
            
            // Sync spawned remote projectiles (mirrored)
            if (data.spawnedProjectiles) {
                data.spawnedProjectiles.forEach(p => {
                    this.spawnProjectile(
                        w - p.x,
                        h - p.y,
                        -p.vx,
                        -p.vy,
                        p.radius,
                        'enemy'
                    );
                });
            }
            
            // Symmetrically sync tower healths
            if (this.isClient) {
                // Host sends authoritative tower healths
                this.bottomTower.hp = data.towers.top; // Client's bottom tower is Host's top tower
                this.topTower.hp = data.towers.bottom; // Client's top tower is Host's bottom tower
            } else {
                // Host receives client car updates
                // Symmetrically, Host tower values are authoritative. We don't overwrite them here.
            }
        } else if (data.type === 'projectile_fired') {
            // Client spawned a projectile, Host replicates it
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
        } else if (data.type === 'restart_request') {
            this.startRun();
        }
    }

    // Triggered when starting a game
    startRun() {
        this.runCredits = 0;
        this.particles.clear();
        this.projectiles = [];
        
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
        
        this.player.resetForRun();
        this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
        
        // Reset enemy car
        this.enemy.resetForRun(isBoss);
        
        this.gameState = 'playing';
        this.uiCtrl.showScreen('hud');
        
        // Manage HUD boss warning banner overlay
        const warningBanner = document.getElementById('boss-warning');
        if (warningBanner) {
            if (isBoss) {
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
        
        // Play epic bass voice intro and start background music!
        this.audioSynth.playVoiceIntro(isBoss);
        this.audioSynth.startMusic();
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

        // Update systems
        this.canvasCtrl.update(dt);
        this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
        this.particles.update(dt);
        
        this.player.update(dt, this.canvasCtrl.width, this.canvasCtrl.height, this.particles);
        this.enemy.update(dt, this.player, this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
        
        this.updatePhysics(dt);
        this.checkCollisions(dt);
        
        // Network Sync
        if (this.isMultiplayer) {
            const spawnedProjsThisFrame = []; // we can check if player shot
            
            // Build Sync packet
            const syncData = {
                type: 'sync',
                player: {
                    x: this.player.x,
                    y: this.player.y,
                    vx: this.player.vx,
                    vy: this.player.vy,
                    hp: this.player.hp,
                    energy: this.player.energy
                },
                towers: {
                    bottom: this.bottomTower.hp,
                    top: this.topTower.hp
                }
            };
            
            this.sendNetworkPacket(syncData);
        }
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
            
            // Slow down
            this.player.vx *= 0.85;
            this.player.vy *= 0.85;
            
            // Push player back towards bottom
            this.player.vy += 0.015 * dt;
            
            if (Math.random() < 0.15) {
                this.particles.spawnClashSparks(this.player.x, this.player.y, '#ff9900');
            }
            if (this.player.hp <= 0) {
                this.player.takeDamage(1, this.player.x, this.player.y, this.particles, this.canvasCtrl);
            }
        }

        // Check enemy car in lava
        if (this.enemy.x > lavaMinX && this.enemy.x < lavaMaxX && this.enemy.y > lavaMinY && this.enemy.y < lavaMaxY && this.enemy.state !== 'dead') {
            this.enemy.hp = Math.max(0, this.enemy.hp - lavaDamagePerMs * dt);
            
            // Slow down
            this.enemy.vx *= 0.85;
            this.enemy.vy *= 0.85;
            
            // Push enemy back towards top
            this.enemy.vy -= 0.015 * dt;
            
            if (Math.random() < 0.15) {
                this.particles.spawnClashSparks(this.enemy.x, this.enemy.y, '#ff9900');
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
            
            if (hitTopTower) {
                // Damage top tower
                this.topTower.hp = Math.max(0, this.topTower.hp - 50);
                this.particles.spawnShockwave(p.x, p.y, '#ff0077', 45);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            } else if (hitBottomTower) {
                // Damage bottom tower
                this.bottomTower.hp = Math.max(0, this.bottomTower.hp - 50);
                this.particles.spawnShockwave(p.x, p.y, '#00f0ff', 45);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            }
            
            // Check car hits
            if (this.player.state !== 'dead' && Math.hypot(p.x - this.player.x, p.y - this.player.y) < this.player.radius + p.radius) {
                this.player.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (this.enemy.state !== 'dead' && Math.hypot(p.x - this.enemy.x, p.y - this.enemy.y) < this.enemy.radius + p.radius) {
                this.enemy.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                this.projectiles.splice(i, 1);
                continue;
            }
        }
    }

    checkCollisions(dt) {
        if (this.player.state === 'dead' || this.enemy.state === 'dead') return;

        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;

        // --- 1. CAR-TO-CAR ELASTIC COLLISION ---
        const dist = Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
        const touchDist = this.player.radius + this.enemy.radius;
        
        if (dist < touchDist) {
            // Push apart
            const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
            const overlap = touchDist - dist;
            
            this.player.x += Math.cos(angle) * overlap * 0.5;
            this.player.y += Math.sin(angle) * overlap * 0.5;
            this.enemy.x -= Math.cos(angle) * overlap * 0.5;
            this.enemy.y -= Math.sin(angle) * overlap * 0.5;

            // Elastic bounce momentum calculations
            const normalX = Math.cos(angle);
            const normalY = Math.sin(angle);
            
            // Relative velocity
            const rvx = this.player.vx - this.enemy.vx;
            const rvy = this.player.vy - this.enemy.vy;
            
            // Velocity along normal
            const velAlongNormal = rvx * normalX + rvy * normalY;
            
            if (velAlongNormal < 0) {
                const restitution = 0.85;
                let impulseScalar = -(1 + restitution) * velAlongNormal;
                impulseScalar /= (1 / this.player.mass) + (1 / this.enemy.mass);
                
                // Apply impulse
                this.player.vx += (impulseScalar / this.player.mass) * normalX;
                this.player.vy += (impulseScalar / this.player.mass) * normalY;
                this.enemy.vx -= (impulseScalar / this.enemy.mass) * normalX;
                this.enemy.vy -= (impulseScalar / this.enemy.mass) * normalY;
            }
            
            this.audioSynth.playClash();
            this.particles.spawnClashSparks((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#ffffff');
        }

        // --- 2. TOWER RAMMING COLLISION ---
        // Player car hitting top tower (enemy)
        if (this.player.y < 85) {
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
                if (impactForce > 0.05) {
                    // RAM damage scaling by player car mass
                    const ramDmg = this.player.profile.ramDamage;
                    this.topTower.hp = Math.max(0, this.topTower.hp - ramDmg);
                    
                    // Push player back (recoil)
                    this.player.vy = 0.28; // bounce down
                    this.player.y = 88;
                    
                    // Deal recoil damage to player car itself
                    this.player.takeDamage(30, this.player.x, 70, this.particles, this.canvasCtrl);
                    
                    this.particles.spawnShockwave(this.player.x, 85, this.player.color, 80);
                    this.canvasCtrl.shake(14, 300);
                    this.audioSynth.playHit();
                    
                    this.checkWinCondition();
                }
            }
        }

        // Enemy car hitting bottom tower (player)
        if (this.enemy.y > h - 85) {
            const hitBottomTower = (this.enemy.x + this.enemy.radius >= w / 2 - 80 && this.enemy.x - this.enemy.radius <= w / 2 + 80);
            if (hitBottomTower) {
                const impactForce = Math.abs(this.enemy.vy);
                if (impactForce > 0.05) {
                    // RAM damage
                    const ramDmg = this.enemy.profiles[this.enemy.activeWeaponKey]?.ramDamage || 100;
                    this.bottomTower.hp = Math.max(0, this.bottomTower.hp - ramDmg);
                    
                    // Push enemy back (recoil)
                    this.enemy.vy = -0.28; // bounce up
                    this.enemy.y = h - 88;
                    
                    // Recoil damage to enemy car
                    this.enemy.takeDamage(30, this.enemy.x, h - 70, this.particles, this.canvasCtrl);
                    
                    this.particles.spawnShockwave(this.enemy.x, h - 85, this.enemy.color, 80);
                    this.canvasCtrl.shake(14, 300);
                    this.audioSynth.playHit();
                    
                    this.checkWinCondition();
                }
            }
        }
    }

    checkWinCondition() {
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
        
        // Award credits (multiplied by hacker level)
        const creditUpgradeModifier = 1 + (this.upgradeMgr.state.upgrades.credits || 0) * 0.2; // up to +100% credits
        const baseAward = isBoss ? 120 : 60;
        const rewardCredits = Math.floor(baseAward * creditUpgradeModifier);
        
        this.upgradeMgr.addCredits(rewardCredits);
        this.upgradeMgr.recordHighestWave(this.upgradeMgr.state.highestWave + 1);
        
        this.uiCtrl.renderVictory(rewardCredits, isBoss);
        this.audioSynth.playVictory();
    }

    handleDefeat() {
        this.gameState = 'gameover';
        
        // Suffer partial credit loss/award
        const rewardCredits = 10;
        this.upgradeMgr.addCredits(rewardCredits);
        
        this.uiCtrl.renderGameOver(rewardCredits, this.isMultiplayer ? 'Motståndaren' : 'Datorn');
        this.audioSynth.playDefeat();
    }

    // Main Engine rendering calls
    draw() {
        // Clear screen with custom trails persistence (motion blur)
        const opacityTrail = this.gameState === 'playing' ? 0.38 : 0.8;
        this.canvasCtrl.clear(opacityTrail);
        
        // Apply camera screen shake translations
        this.canvasCtrl.applyTransformations();
        
        // Draw one-way gate visual effects
        this.drawOneWayGates();
        
        // Draw center lava barrier
        this.drawLavaBarrier();

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
            this.player.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            this.enemy.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            
            // Draw static glowing Towers
            this.drawTowers();
        }
        
        // Restore matrix
        this.canvasCtrl.restoreTransformations();
        
        // UI Hud updates
        if (this.gameState === 'playing') {
            this.uiCtrl.updateHUD(this.player, this.enemy, this.isMultiplayer, this.isClient);
        }
    }

    drawLavaBarrier() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        
        ctx.save();
        this.canvasCtrl.setNeonGlow(this.gameState === 'playing' ? 'var(--neon-orange)' : 'rgba(255,153,0,0.25)', 25);
        ctx.fillStyle = 'rgba(255, 90, 0, 0.9)';
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 3;
        
        // Lava rectangle centered
        // x: 80 to w - 80, height: 50. Centered on Y-axis
        ctx.beginPath();
        ctx.rect(80, h / 2 - 25, w - 160, 50);
        ctx.fill();
        ctx.stroke();
        
        // Draw hot inner details
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(90, h / 2);
        ctx.lineTo(w - 90, h / 2);
        ctx.stroke();
        
        ctx.restore();
    }

    drawOneWayGates() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        
        ctx.save();
        
        // Visual line of gate
        const centerY = h / 2;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // LEFT Passage: UP-only (Green arrows pointing UP, blocks Down)
        this.canvasCtrl.setNeonGlow('var(--neon-green)', 15);
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
        ctx.beginPath();
        ctx.moveTo(10, centerY);
        ctx.lineTo(70, centerY);
        ctx.stroke();
        
        // Draw directional arrows pointing UP (negative y)
        ctx.fillStyle = 'rgba(57, 255, 20, 0.65)';
        ctx.beginPath();
        ctx.moveTo(40, centerY - 15);
        ctx.lineTo(32, centerY - 6);
        ctx.lineTo(48, centerY - 6);
        ctx.closePath();
        ctx.fill();
        
        // RIGHT Passage: DOWN-only (Red/Pink arrows pointing DOWN, blocks Up)
        this.canvasCtrl.setNeonGlow('var(--neon-pink)', 15);
        ctx.strokeStyle = 'rgba(255, 0, 119, 0.45)';
        ctx.beginPath();
        ctx.moveTo(w - 70, centerY);
        ctx.lineTo(w - 10, centerY);
        ctx.stroke();
        
        // Draw directional arrows pointing DOWN (positive y)
        ctx.fillStyle = 'rgba(255, 0, 119, 0.65)';
        ctx.beginPath();
        ctx.moveTo(w - 40, centerY + 15);
        ctx.lineTo(w - 48, centerY + 6);
        ctx.lineTo(w - 32, centerY + 6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    drawTowers() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;

        ctx.save();
        
        // Draw Top Tower (Red neon)
        const glowColor = this.isHardBossRound ? 'crimson' : 'var(--neon-pink)';
        this.canvasCtrl.setNeonGlow(glowColor, 20);
        ctx.fillStyle = '#0f0508';
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 4;
        
        if (this.isHardBossRound) {
            // Left Top Tower: x from 80 to 160 (width 80)
            ctx.beginPath();
            ctx.rect(80, 0, 80, 80);
            ctx.fill();
            ctx.stroke();

            // Striped background for Left loading pad
            ctx.save();
            ctx.strokeStyle = 'rgba(220, 20, 60, 0.25)'; // Crimson transparent
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 85; x < 155; x += 15) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 10, 80);
            }
            ctx.stroke();
            ctx.restore();

            // Right Top Tower: x from w - 160 to w - 80 (width 80)
            ctx.beginPath();
            ctx.rect(w - 160, 0, 80, 80);
            ctx.fill();
            ctx.stroke();

            // Striped background for Right loading pad
            ctx.save();
            ctx.strokeStyle = 'rgba(220, 20, 60, 0.25)'; // Crimson transparent
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = w - 155; x < w - 85; x += 15) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 10, 80);
            }
            ctx.stroke();
            ctx.restore();
        } else {
            // Top block (h = 80, spanning centered w-160)
            ctx.beginPath();
            ctx.rect(w / 2 - 80, 0, 160, 80);
            ctx.fill();
            ctx.stroke();
            
            // Top loading pad (striped)
            ctx.strokeStyle = 'rgba(255, 0, 119, 0.25)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = w / 2 - 70; x < w / 2 + 70; x += 15) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 10, 80);
            }
            ctx.stroke();
        }

        // Draw Bottom Tower (Cyan neon)
        this.canvasCtrl.setNeonGlow('var(--neon-cyan)', 20);
        ctx.fillStyle = '#050c0f';
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.lineWidth = 4;
        
        // Bottom block
        ctx.beginPath();
        ctx.rect(w / 2 - 80, h - 80, 160, 80);
        ctx.fill();
        ctx.stroke();
        
        // Bottom loading pad (striped "Ladda" zone)
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = w / 2 - 70; x < w / 2 + 70; x += 15) {
            ctx.moveTo(x, h - 80);
            ctx.lineTo(x + 10, h);
        }
        ctx.stroke();

        ctx.restore();
    }

    // Main Engine rendering cycle loop (RAF)
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (dt > 100) dt = 100;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start game when page resources load
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
