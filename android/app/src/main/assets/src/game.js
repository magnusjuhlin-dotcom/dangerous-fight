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
        
        // Setup player
        this.player = new Player(this.canvasCtrl.width / 2, this.canvasCtrl.height * 0.7);
        this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
        this.player.activeWeaponKey = this.upgradeMgr.state.equippedWeapon;
        
        // Gameplay session state variables
        this.gameState = 'menu'; // 'menu', 'playing', 'rewards', 'gameover', 'victory'
        this.currentWave = 1;
        this.runCredits = 0;
        this.enemy = null;
        this.hasHitEnemyThisDash = false;
        
        // Timekeeping
        this.runStartTime = 0;
        this.runDuration = 0;
        this.lastTime = 0;
        
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
        // Main Menu
        document.getElementById('btn-play').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.startRun();
        });
        
        document.getElementById('btn-weapons').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
            this.uiCtrl.showScreen('weapons');
        });
        
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderPersistentUpgrades(this.upgradeMgr, (key) => this.handlePersistentUpgrade(key), this.audioSynth);
            this.uiCtrl.showScreen('upgrades');
        });
        
        // Back buttons
        document.getElementById('btn-weapons-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
            this.uiCtrl.showScreen('menu');
        });
        
        document.getElementById('btn-upgrades-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
            this.uiCtrl.showScreen('menu');
        });
        
        // Game Over screen buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.startRun();
        });
        
        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
            this.uiCtrl.showScreen('menu');
        });

        // Victory screen buttons
        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.startRun();
        });

        document.getElementById('btn-victory-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
            this.uiCtrl.showScreen('menu');
        });
    }

    // Bind swipe/tap gameplay inputs
    initInputEvents() {
        this.inputCtrl.onSwipe = (dirX, dirY) => {
            if (this.gameState !== 'playing') return;
            this.player.dash(dirX, dirY, this.audioSynth, this.particles);
            this.hasHitEnemyThisDash = false; // Reset hit flag for the new attack
        };
        
        this.inputCtrl.onTap = () => {
            if (this.gameState !== 'playing') return;
            this.player.parry(this.audioSynth, this.particles);
        };
    }

    // Main Weapon Shop logic
    handleWeaponArsenal(weaponKey) {
        const state = this.upgradeMgr.state;
        const costs = { katana: 0, blades: 100, hammer: 250 };
        const cost = costs[weaponKey];
        
        if (state.unlockedWeapons[weaponKey]) {
            // Already unlocked, equip it
            this.upgradeMgr.equipWeapon(weaponKey);
            this.player.activeWeaponKey = weaponKey;
        } else {
            // Try to unlock it
            if (this.upgradeMgr.buyWeapon(weaponKey, cost)) {
                this.player.activeWeaponKey = weaponKey;
                this.audioSynth.playUpgrade();
            }
        }
        
        this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
    }

    // Main Persistent upgrades purchase logic
    handlePersistentUpgrade(upgradeKey) {
        if (this.upgradeMgr.buyUpgrade(upgradeKey)) {
            // Re-apply permanent upgrades
            this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
            this.audioSynth.playUpgrade();
        }
        this.uiCtrl.renderPersistentUpgrades(this.upgradeMgr, (key) => this.handlePersistentUpgrade(key), this.audioSynth);
    }

    // Triggered when clicking PLAY
    startRun() {
        this.currentWave = 1;
        this.runCredits = 0;
        this.runStartTime = performance.now();
        this.particles.clear();
        
        this.player.resetForRun();
        this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
        this.player.activeWeaponKey = this.upgradeMgr.state.equippedWeapon;
        
        this.startWave();
    }

    // Setup a brand new wave opponent duelist
    startWave() {
        this.particles.clear();
        this.player.x = this.canvasCtrl.width / 2;
        this.player.y = this.canvasCtrl.height * 0.72;
        this.player.vx = 0;
        this.player.vy = 0;
        this.player.state = 'idle';
        this.player.stateTimer = 0;
        
        // Fully restore player balance posture at start of wave
        this.player.posture = 0;

        // Reset energy shield if player unlocked it
        if (this.player.perks.shieldCharge) {
            this.player.perks.hasShield = true;
        }

        // Place enemy at top center of battlefield
        this.enemy = new Enemy(this.canvasCtrl.width / 2, this.canvasCtrl.height * 0.22, this.currentWave);
        
        this.hasHitEnemyThisDash = false;
        this.gameState = 'playing';
        this.uiCtrl.showScreen('hud');
    }

    // Core Animation Frame RAF Loop
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        // Cap deltaTime to avoid logic break during tab swaps (suspended canvas)
        if (dt > 100) dt = 100;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }

    // Main Engine updates (Physics & Collisions)
    update(dt) {
        if (this.gameState !== 'playing') {
            // Maintain subtle dust in background during menus
            this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
            this.particles.update(dt);
            return;
        }

        // 1. Tick systems
        this.canvasCtrl.update(dt);
        this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
        this.particles.update(dt);
        this.player.update(dt, this.canvasCtrl.width, this.canvasCtrl.height, this.particles);
        
        if (this.enemy) {
            this.enemy.update(dt, this.player, this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
            
            // 2. Perform Combat Collisions
            this.checkCollisions(dt);
        }
    }

    checkCollisions(dt) {
        if (!this.enemy || this.enemy.state === 'dead' || this.player.state === 'dead') return;

        const dist = Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
        
        // --- 1. SWORD CLASH DETECTOR ---
        // If BOTH player and enemy are in active striking states, they clash!
        if (this.player.state === 'dashing' && this.enemy.state === 'attacking') {
            if (dist < 42) {
                // Abort both strikes, trigger huge spark explosion
                const clashX = (this.player.x + this.enemy.x) / 2;
                const clashY = (this.player.y + this.enemy.y) / 2;
                
                this.audioSynth.playClash();
                this.canvasCtrl.shake(14, 300);
                this.particles.spawnClashSparks(clashX, clashY, '#ffffff');
                this.particles.spawnShockwave(clashX, clashY, '#ffffff', 50);

                // Pushback both
                const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
                
                this.player.state = 'hit';
                this.player.stateTimer = 250;
                this.player.vx = Math.cos(angle) * 0.18;
                this.player.vy = Math.sin(angle) * 0.18;
                this.player.trailPoints = [];

                this.enemy.state = 'hit';
                this.enemy.stateTimer = 250;
                this.enemy.vx = -Math.cos(angle) * 0.18;
                this.enemy.vy = -Math.sin(angle) * 0.18;
                this.enemy.trailPoints = [];
                
                return;
            }
        }

        // --- 2. PLAYER DASH ATTACK DEAL DAMAGE ---
        if (this.player.state === 'dashing' && !this.hasHitEnemyThisDash) {
            // Check if player's glowing radius + sword extension intersects enemy
            const reach = this.player.radius + this.enemy.radius + 15;
            if (dist <= reach) {
                this.hasHitEnemyThisDash = true;
                
                // Fetch dynamic player weapon attributes
                const wpn = this.player.activeWeapon;
                let finalDamage = wpn.damage;
                let finalPostureDmg = wpn.postureDamage;
                
                // Perks modifiers
                if (this.player.perks.overdrive) {
                    finalDamage *= 1.3; // +30% damage
                }
                if (this.player.perks.lightningSlash) {
                    finalPostureDmg *= 1.3; // +30% posture damage
                    this.particles.spawnClashSparks(this.enemy.x, this.enemy.y, '#00f0ff');
                }
                if (this.player.perks.nanites) {
                    finalDamage *= 1.15;
                }

                const result = this.enemy.takeDamage(
                    finalDamage, 
                    finalPostureDmg, 
                    this.player.x, 
                    this.player.y, 
                    this.audioSynth, 
                    this.particles, 
                    this.canvasCtrl
                );

                if (result === 'dead') {
                    this.handleEnemyDefeated();
                }
            }
        }

        // --- 3. ENEMY ATTACK HIT PLAYER DETECTOR ---
        if (this.enemy.state === 'attacking') {
            // Check if player overlaps the active telegraphed collision shapes
            let hasHitPlayer = false;

            if (this.enemy.telegraphType === 'line') {
                // Calculate distance from player center to line of attack
                const angle = this.enemy.angle;
                const ex = this.enemy.x + Math.cos(angle) * this.enemy.telegraphRange;
                const ey = this.enemy.y + Math.sin(angle) * this.enemy.telegraphRange;
                
                const d = this.distToSegment(this.player, this.enemy, { x: ex, y: ey });
                if (d < this.player.radius + this.enemy.telegraphWidth / 2) {
                    hasHitPlayer = true;
                }
            } else if (this.enemy.telegraphType === 'circle') {
                // Circle slam AoE area check
                if (dist <= this.enemy.telegraphRange + this.player.radius) {
                    hasHitPlayer = true;
                }
            }

            if (hasHitPlayer) {
                // Instantly swap enemy back to idle so player isn't hit repeatedly in one frames sequence
                this.enemy.state = 'idle';
                this.enemy.stateTimer = 0;
                this.enemy.vx = 0;
                this.enemy.vy = 0;

                // CHECK PARRY!
                const isParryWindow = this.enemy.parryFlashTimer > 0;
                
                if (this.player.state === 'parrying') {
                    // 100% PERFECT PARRY DEFLATION!
                    this.enemy.triggerParriedStun(this.audioSynth, this.particles, this.canvasCtrl);
                    
                    // Recover small posture/balance
                    this.player.posture = Math.max(0, this.player.posture - this.player.maxPosture * 0.2);

                    // Cyber Vampirism perk restore HP
                    if (this.player.perks.vampirism) {
                        const heal = Math.floor(this.player.maxHp * 0.08);
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);
                        this.particles.spawnShockwave(this.player.x, this.player.y, '#00ff66', 40);
                    }
                } else {
                    // Player missed timing! Gets struck by full strike
                    const damageResult = this.player.takeDamage(
                        this.enemy.damage,
                        this.enemy.postureDamage,
                        this.enemy.x,
                        this.enemy.y,
                        this.audioSynth,
                        this.particles,
                        this.canvasCtrl
                    );

                    if (damageResult === 'dead') {
                        this.handlePlayerDefeated();
                    }
                }
            }
        }
    }

    // Helper math to calculate distance from a point to a line segment
    distToSegment(p, v, w) {
        const l2 = (v.x - w.x) * (v.x - w.x) + (v.y - w.y) * (v.y - w.y);
        if (l2 === 0) return Math.hypot(p.x - v.x, p.y - v.y);
        let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
        t = Math.max(0, Math.min(1, t));
        return Math.hypot(p.x - (v.x + t * (w.x - v.x)), p.y - (v.y + t * (w.y - v.y)));
    }

    // Triggered when Boss HP hits zero
    handleEnemyDefeated() {
        // Collect and calculate Cyber-Credits (Boosted by hacker level upgrade)
        const creditUpgradeModifier = 1 + (this.player.upgCreditsLvl * 0.2); // up to +100% credits
        const baseAward = 15 + this.currentWave * 5;
        const rewardCredits = Math.floor(baseAward * creditUpgradeModifier);
        
        this.runCredits += rewardCredits;
        this.upgradeMgr.addCredits(rewardCredits);
        this.upgradeMgr.recordHighestWave(this.currentWave);
        
        // Wave-10 Victory Boss End Game!
        if (this.currentWave >= 10) {
            this.runDuration = (performance.now() - this.runStartTime) / 1000;
            this.gameState = 'victory';
            this.uiCtrl.renderVictory(this.runCredits, this.runDuration);
            this.audioSynth.playVictory();
        } else {
            // Open Roguelite Reward choices overlay screen
            const randomCards = this.upgradeMgr.getRandomPerks();
            
            // Short delay for satisfying slow-mo visual feel before opening rewards
            setTimeout(() => {
                this.gameState = 'rewards';
                this.uiCtrl.renderRewardCards(randomCards, (key) => this.selectUpgradeReward(key), this.audioSynth);
            }, 600);
        }
    }

    // Triggered when Player HP hits zero
    handlePlayerDefeated() {
        this.gameState = 'gameover';
        this.uiCtrl.renderGameOver(this.currentWave, this.runCredits);
        this.audioSynth.playDefeat();
    }

    // Applies selected roguelite wave upgrade card
    selectUpgradeReward(perkKey) {
        if (perkKey === 'vampirism') this.player.perks.vampirism = true;
        if (perkKey === 'lightningSlash') this.player.perks.lightningSlash = true;
        if (perkKey === 'shieldCharge') {
            this.player.perks.shieldCharge = true;
            this.player.perks.hasShield = true;
        }
        if (perkKey === 'nanites') this.player.perks.nanites = true;
        if (perkKey === 'overdrive') this.player.perks.overdrive = true;

        // Partially heal player between fights
        const heal = Math.floor(this.player.maxHp * 0.25); // heal 25%
        this.player.hp = Math.min(this.player.maxHp, this.player.hp + heal);

        // Move onto next duelist!
        this.currentWave += 1;
        this.startWave();
    }

    // Main Engine rendering calls
    draw() {
        // Clear screen with custom trails persistence (motion blur)
        const opacityTrail = this.gameState === 'playing' ? 0.38 : 0.8;
        this.canvasCtrl.clear(opacityTrail);
        
        // Apply camera screen shake translations
        this.canvasCtrl.applyTransformations();
        
        // 1. Draw glowing particles
        this.particles.draw(this.canvasCtrl.ctx);
        
        // 2. Draw Entities
        if (this.gameState === 'playing' || this.gameState === 'rewards' || this.gameState === 'gameover' || this.gameState === 'victory') {
            this.player.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            if (this.enemy && this.enemy.state !== 'dead') {
                this.enemy.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            }
        }
        
        // Restore matrix
        this.canvasCtrl.restoreTransformations();
        
        // 3. UI Hud updates
        if (this.gameState === 'playing') {
            this.uiCtrl.updateHUD(this.player, this.enemy, this.currentWave, this.runCredits);
        }
    }
}

// Start game when page resources load
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});
