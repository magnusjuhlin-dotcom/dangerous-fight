/* DANGEROUS FIGHT - CYBERPUNK 1V1 BOSS AI & REMOTE PLAYER REPLICA */

export class Enemy {
    constructor(x, y, game) {
        this.game = game;
        
        // Physics variables
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.992;
        this.radius = 34;
        this.mass = 1.0;
        this.color = "#ff0077"; // Neon Pink
        
        // Combat stats
        this.maxHp = 100;
        this.hp = 100;
        this.energy = 0; // max 3 shots
        this.chargeTimer = 0; // ms
        this.isBoss = false;
        
        this.state = 'idle'; // 'idle', 'dead'
        this.respawnTimer = 0; // ms
        
        // Visual angle
        this.angle = Math.PI / 2; // pointing down
        
        // Trail history for ghost afterimages
        this.trailHistory = [];
        
        // AI behavior state machine
        this.aiState = 'idle'; // 'idle', 'recharging', 'aiming_ram', 'cooldown'
        this.aiTimer = 1000; // time until next AI action

        // Team layout (2v2): 'top' fights downwards, 'bottom' fights upwards.
        // A 'bottom' samurai is on the player's team, so its shots count as
        // player-owned and it charges in the lower zone.
        this.side = 'top';
        // null = legacy behaviour (AI in single player only). Set explicitly in
        // 2v2, where the host also drives the computer-controlled slots.
        this.aiControlled = null;
        
        // Profiles for multiplayer vehicle matching (Scaled up by ~75%)
        this.profiles = {
            katana: { radius: 34, mass: 1.0, color: "#ff0077" }, // Cyber Car
            blades: { radius: 42, mass: 1.8, color: "#ff0088" }, // Plasma Truck
            hammer: { radius: 28, mass: 0.6, color: "#ff4400" }, // Laser Cycle
            oni: { radius: 38, mass: 1.5, color: "#ff3b1f" }      // Oni Berserker
        };
    }

    resetForRun(isBoss = false) {
        this.isBoss = isBoss;
        this.enraged = false;
        this.slamTimer = 0;
        // An online opponent's weapon must not follow into the next offline match
        this.activeWeaponKey = undefined;
        if (isBoss) {
            this.maxHp = 500;
            this.radius = 42; // Torso radius (was 24)
            this.mass = 2.5;
            this.color = 'crimson';
            
            // Initialize scaled ragdoll nodes
            this.ragdollNodes = [
                { name: 'torso', x: this.x, y: this.y, vx: 0, vy: 0, radius: 42, mass: 2.0, color: 'crimson' },
                { name: 'head', x: this.x, y: this.y - 52, vx: 0, vy: 0, radius: 24, mass: 1.0, color: '#ff0055' },
                { name: 'leftHand', x: this.x - 55, y: this.y - 12, vx: 0, vy: 0, radius: 18, mass: 0.7, color: '#ff0077' },
                { name: 'rightHand', x: this.x + 55, y: this.y - 12, vx: 0, vy: 0, radius: 18, mass: 0.7, color: '#ff0077' },
                { name: 'leftFoot', x: this.x - 30, y: this.y + 52, vx: 0, vy: 0, radius: 18, mass: 0.8, color: '#990033' },
                { name: 'rightFoot', x: this.x + 30, y: this.y + 52, vx: 0, vy: 0, radius: 18, mass: 0.8, color: '#990033' }
            ];

            // Define distance constraints between nodes
            this.ragdollConstraints = [
                [0, 1, 52], // torso to head
                [0, 2, 55], // torso to leftHand
                [0, 3, 55], // torso to rightHand
                [0, 4, 52], // torso to leftFoot
                [0, 5, 52], // torso to rightFoot
                [1, 2, 60], // head to leftHand
                [1, 3, 60], // head to rightHand
                [4, 5, 45]  // leftFoot to rightFoot
            ];
            this.ragdollSync = { x: this.x, y: this.y, vx: 0, vy: 0 };
        } else {
            this.ragdollNodes = null;
            this.ragdollConstraints = null;
            this.maxHp = 100;
            this.radius = 34;
            this.mass = 1.0;
            this.color = "#ff0077";
        }
        this.hp = this.maxHp;
        this.energy = 0;
        this.chargeTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.state = 'idle';
        this.aiState = 'idle';
        this.aiTimer = 1000;
        
        // Trail history for ghost afterimages
        this.trailHistory = [];
    }

    resetRagdollPositions() {
        if (!this.isBoss || !this.ragdollNodes) return;
        
        const torso = this.ragdollNodes[0];
        const head = this.ragdollNodes[1];
        const leftHand = this.ragdollNodes[2];
        const rightHand = this.ragdollNodes[3];
        const leftFoot = this.ragdollNodes[4];
        const rightFoot = this.ragdollNodes[5];
        
        torso.x = this.x; torso.y = this.y; torso.vx = 0; torso.vy = 0;
        head.x = this.x; head.y = this.y - 32; head.vx = 0; head.vy = 0;
        leftHand.x = this.x - 34; leftHand.y = this.y - 8; leftHand.vx = 0; leftHand.vy = 0;
        rightHand.x = this.x + 34; rightHand.y = this.y - 8; rightHand.vx = 0; rightHand.vy = 0;
        leftFoot.x = this.x - 18; leftFoot.y = this.y + 32; leftFoot.vx = 0; leftFoot.vy = 0;
        rightFoot.x = this.x + 18; rightFoot.y = this.y + 32; rightFoot.vx = 0; rightFoot.vy = 0;
        this.vx = 0; this.vy = 0;
        this.ragdollSync = { x: this.x, y: this.y, vx: 0, vy: 0 };
    }

    setVehicleType(type) {
        const p = this.profiles[type] || this.profiles.katana;
        this.activeWeaponKey = this.profiles[type] ? type : 'katana';
        this.radius = p.radius;
        this.mass = p.mass;
        this.color = p.color;
    }

    takeDamage(amount, attackerX, attackerY, particleSystem, canvasController, selfInflicted = false) {
        if (this.state === 'dead') return;

        // A replica belongs to another machine, which owns its hp/death and
        // reports it via 'sync'. Only show the hit here. `isRemote` is set per
        // samurai in 2v2 (a computer slot driven by the host is NOT a replica);
        // undefined keeps the 1v1 rule that any opponent online is a replica.
        const isReplica = this.isRemote === undefined ? (this.game && this.game.isMultiplayer) : this.isRemote;
        if (this.game && isReplica) {
            particleSystem.spawnDamageText(this.x, this.y, `-${Math.round(amount)}`, '#00f0ff', 1.1);
            particleSystem.spawnClashSparks(this.x, this.y, this.color);
            particleSystem.spawnDigitalBleed(this.x, this.y, this.color);
            canvasController.flash('rgba(0, 240, 255, 0.2)', 180);
            canvasController.shake(6, 150);
            return;
        }
        
        let dmg = amount;
        
        // Apply player active perks (not to the fixed cost of ramming a tower,
        // and not to a team mate on my side: my perks must not hurt my ally)
        const player = this.game.player;
        if (player && player.state !== 'dead' && !selfInflicted && this.side !== 'bottom') {
            let mult = 1.0;

            // Samurajraseri: double damage while it burns
            if (this.game.rageActive) mult += 1.0;

            // SUPERSKADA (fusk): three times the damage
            if (this.game.cheats && this.game.cheats.damage) mult += 2.0;

            // Overdrive perk: +30% damage dealt
            if (player.activePerk === 'overdrive') {
                mult += 0.30;
            }

            // Nanite Injection perk: +15% damage dealt
            if (player.activePerk === 'nanites') {
                mult += 0.15;
            }
            
            // Lightning Slash: +30% damage if player is dashing (speed > 0.15)
            if (player.activePerk === 'lightningSlash' && Math.hypot(player.vx, player.vy) > 0.15) {
                mult += 0.30;
            }
            
            dmg *= mult;
            
            // Crit Slash perk: 20% chance of double damage
            if (player.activePerk === 'critSlash' && Math.random() < 0.20) {
                dmg *= 2.0;
                // Red glowing crit flash visual
                particleSystem.spawnShockwave(attackerX, attackerY, '#ff3300', 45);
            }
        }

        this.hp = Math.max(0, this.hp - dmg);
        
        // Physical Damage Text & Ground Scorch Decal
        particleSystem.spawnDamageText(this.x, this.y, `-${Math.round(dmg)}`, '#00f0ff', 1.1);
        particleSystem.addDecal(this.x, this.y, 22, 'rgba(0,0,0,0.65)', 'scorch');
        
        // Spark particles at closest hit node
        let sparkX = this.x;
        let sparkY = this.y;
        if (this.isBoss && this.ragdollNodes) {
            let minDist = Infinity;
            this.ragdollNodes.forEach(node => {
                const dist = Math.hypot(node.x - attackerX, node.y - attackerY);
                if (dist < minDist) {
                    minDist = dist;
                    sparkX = node.x;
                    sparkY = node.y;
                }
            });
        }
        particleSystem.spawnClashSparks(sparkX, sparkY, this.color);
        particleSystem.spawnDigitalBleed(sparkX, sparkY, this.color);
        canvasController.flash('rgba(0, 240, 255, 0.2)', 180); // Cyan flash when damaging enemy
        canvasController.shake(6, 150);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            this.respawnTimer = 3000; // 3 seconds respawn
            this.vx = 0;
            this.vy = 0;
            this.aiState = 'idle';
            this.aiTimer = 3000;
            
            // Only a samurai on the opposing team is a K.O. for the player; an
            // allied computer samurai (side 'bottom' in team matches) is not.
            const isFoe = this.side !== 'bottom';
            if (isFoe && this.game && typeof this.game.onEnemyDefeated === 'function') {
                this.game.onEnemyDefeated(this.isBoss);
            }
            
            // Explosion particles on all joints if boss
            if (this.isBoss && this.ragdollNodes) {
                this.ragdollNodes.forEach(node => {
                    particleSystem.spawnShockwave(node.x, node.y, node.color, 45);
                });
            } else {
                particleSystem.spawnShockwave(this.x, this.y, this.color, 70);
            }
            
            for (let i = 0; i < 20; i++) {
                particleSystem.spawnAmbience(this.game.canvasCtrl.width, this.game.canvasCtrl.height, 2);
            }
            if (isFoe) this.game.audioSynth.playVictory();
        } else {
            // Pushback force
            const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
            if (this.isBoss && this.ragdollNodes) {
                this.ragdollNodes.forEach(node => {
                    node.vx += Math.cos(pushAngle) * 0.18;
                    node.vy += Math.sin(pushAngle) * 0.18;
                });
            } else {
                this.vx = Math.cos(pushAngle) * 0.22;
                this.vy = Math.sin(pushAngle) * 0.22;
            }
        }
    }

    update(deltaTime, player, audioController, particleSystem, canvasController, width, height) {
        if (this.state === 'dead') {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                // Respawn
                this.state = 'idle';
                this.hp = this.maxHp;
                this.x = width / 2;
                this.y = this.side === 'top' ? 120 : height - 120;
                this.vx = 0;
                this.vy = 0;
                if (this.isBoss) {
                    this.resetRagdollPositions();
                }
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
            }
            return;
        }

        // FRYST DATOR (fusk): the computer stands frozen at the start of the match
        const frozen = !!(this.game && this.game.cheatFreezeMs > 0 && this === this.game.enemy);
        if (frozen) {
            this.vx = 0;
            this.vy = 0;
            if (!(this.isBoss && this.ragdollNodes)) return;
            // The boss ragdoll: clashes and shots push its limbs directly
            // (game.js). Keep the body together and in sync with this.x/y,
            // but let no speed build up, or the limbs fly off when it thaws.
            this.ragdollNodes.forEach(node => { node.vx = 0; node.vy = 0; });
        }

        // Apply friction & ragdoll constraints
        if (this.isBoss && this.ragdollNodes) {
            // Carry over what changed this.x/y/vx/vy since the last sync below
            // (AI launches, lava drag, one-way gate blocking). Unchanged values
            // must not overwrite the torso: game.js also pushes the nodes
            // directly (clashes, ram knockback).
            const torso = this.ragdollNodes[0];
            const sync = this.ragdollSync || { x: this.x, y: this.y, vx: torso.vx, vy: torso.vy };
            const shiftX = this.x - sync.x;
            const shiftY = this.y - sync.y;
            if (shiftX !== 0 || shiftY !== 0) {
                // Moved from outside: move the whole body, not just the torso
                this.ragdollNodes.forEach(node => {
                    node.x += shiftX;
                    node.y += shiftY;
                });
            }
            if (this.vx !== sync.vx || this.vy !== sync.vy) {
                // Transfer launch velocities to torso node
                torso.vx = this.vx;
                torso.vy = this.vy;
            }

            // Move each node
            this.ragdollNodes.forEach(node => {
                node.x += node.vx * deltaTime;
                node.y += node.vy * deltaTime;
                node.vx *= Math.pow(this.friction, deltaTime / 16);
                node.vy *= Math.pow(this.friction, deltaTime / 16);
            });

            // Solve distance constraints
            for (let iter = 0; iter < 4; iter++) {
                this.ragdollConstraints.forEach(([idxA, idxB, restLength]) => {
                    const nodeA = this.ragdollNodes[idxA];
                    const nodeB = this.ragdollNodes[idxB];
                    
                    const dx = nodeB.x - nodeA.x;
                    const dy = nodeB.y - nodeA.y;
                    const dist = Math.hypot(dx, dy) || 0.001;
                    const diff = restLength - dist;
                    const percent = (diff / dist) * 0.5;
                    
                    const totalMass = nodeA.mass + nodeB.mass;
                    const pullA = (nodeB.mass / totalMass) * percent;
                    const pullB = (nodeA.mass / totalMass) * percent;
                    
                    nodeA.x -= dx * pullA;
                    nodeA.y -= dy * pullA;
                    nodeB.x += dx * pullB;
                    nodeB.y += dy * pullB;

                    const impulseX = dx * percent * 0.05;
                    const impulseY = dy * percent * 0.05;
                    nodeA.vx -= impulseX * (nodeB.mass / totalMass);
                    nodeA.vy -= impulseY * (nodeB.mass / totalMass);
                    nodeB.vx += impulseX * (nodeA.mass / totalMass);
                    nodeB.vy += impulseY * (nodeA.mass / totalMass);
                });
            }

            // Boundary checks
            this.ragdollNodes.forEach(node => {
                let bounced = false;
                if (node.x < node.radius) {
                    node.x = node.radius;
                    node.vx = -node.vx * 0.5;
                    bounced = true;
                } else if (node.x > width - node.radius) {
                    node.x = width - node.radius;
                    node.vx = -node.vx * 0.5;
                    bounced = true;
                }
                if (node.y < node.radius) {
                    node.y = node.radius;
                    node.vy = -node.vy * 0.5;
                    bounced = true;
                } else if (node.y > height - node.radius) {
                    node.y = height - node.radius;
                    node.vy = -node.vy * 0.5;
                    bounced = true;
                }
                if (bounced && Math.hypot(node.vx, node.vy) > 0.05 && audioController) {
                    audioController.playWallThud(Math.hypot(node.vx, node.vy) * 2.0);
                }
            });

            // Sync main object variables
            this.x = torso.x;
            this.y = torso.y;
            this.vx = torso.vx;
            this.vy = torso.vy;
            this.ragdollSync = { x: this.x, y: this.y, vx: this.vx, vy: this.vy };

            // Spawn foot-jet thrust flame sparks
            const leftFoot = this.ragdollNodes[4];
            const rightFoot = this.ragdollNodes[5];
            const speed = Math.hypot(torso.vx, torso.vy);
            if (speed > 0.08) {
                if (Math.random() < 0.25) {
                    particleSystem.spawnClashSparks(leftFoot.x, leftFoot.y, '#ff4400');
                    particleSystem.spawnClashSparks(rightFoot.x, rightFoot.y, '#ff4400');
                }
            }
        } else {
            // Standard enemy physics
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.vx *= Math.pow(this.friction, deltaTime / 16);
            this.vy *= Math.pow(this.friction, deltaTime / 16);
            
            let bounced = false;
            let impactSpeed = Math.hypot(this.vx, this.vy);
            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = -this.vx * 0.72;
                bounced = true;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -this.vx * 0.72;
                bounced = true;
            }
            
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = -this.vy * 0.72;
                bounced = true;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -this.vy * 0.72;
                bounced = true;
            }
            
            if (bounced && impactSpeed > 0.03 && audioController) {
                audioController.playWallThud(impactSpeed * 3.0);
            }
            
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.04) {
                const targetAngle = Math.atan2(this.vy, this.vx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * Math.min(1.0, 0.18 * (deltaTime / 16));
            }
        }

        // Maintain trail history for standard enemy
        if (!this.isBoss) {
            if (this.state !== 'dead') {
                const speed = Math.hypot(this.vx, this.vy);
                if (speed > 0.04) {
                    this.trailHistory.push({ x: this.x, y: this.y, angle: this.angle });
                    if (this.trailHistory.length > 4) {
                        this.trailHistory.shift();
                    }
                } else {
                    if (this.trailHistory.length > 0) {
                        this.trailHistory.shift();
                    }
                }
            } else {
                this.trailHistory = [];
            }
        }

        // --- AI CONTROLLER ---
        const runAI = this.aiControlled === null ? !this.game.isMultiplayer : this.aiControlled;
        if (runAI && !frozen) {
            this.updateAI(deltaTime, player, particleSystem, width, height);
        }
    }

    updateAI(deltaTime, player, particleSystem, width, height) {
        if (this.isBoss) this.updateBossPhase(deltaTime, player, particleSystem);

        // The charging zone is on this samurai's own half of the arena
        const towardsFoe = this.side === 'top' ? 1 : -1;      // +1 = downwards
        const myOwner = this.side === 'top' ? 'enemy' : 'player';
        const inChargingZone = this.side === 'top' ? this.y < 150 : this.y > height - 150;
        const isMovingSlowly = Math.hypot(this.vx, this.vy) < 0.04;

        // 1. Charge energy in zone
        if (inChargingZone && isMovingSlowly && this.energy < 3) {
            const chargeSpeedMultiplier = this.isBoss ? 2.5 : 1.0;
            this.chargeTimer += deltaTime * chargeSpeedMultiplier;
            if (Math.random() < 0.1) {
                particleSystem.spawnClashSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#ffffff');
            }
            if (this.chargeTimer >= 1500) {
                this.energy++;
                this.chargeTimer = 0;
                this.game.audioSynth.playUpgrade();
                particleSystem.spawnShockwave(this.x, this.y, '#ffffff', 30);
            }
        } else {
            this.chargeTimer = 0;
        }

        // AI decision logic
        this.aiTimer -= deltaTime;
        if (this.aiTimer <= 0) {
            const level = this.difficulty;
            // (the boss is fast: decides about three times as often, more when enraged)
            const decisionTimeMultiplier = (this.isBoss ? (this.enraged ? 0.25 : 0.35) : 1.0) * level.think;
            this.aiTimer = (Math.random() * 1000 + 800) * decisionTimeMultiplier; // reset decision timer

            // Check if we need to recharge
            if (this.energy === 0 && !inChargingZone) {
                // Head back to charge zone
                const targetX = width / 2 + (Math.random() - 0.5) * 60;
                const targetY = this.side === 'top' ? 100 : height - 100;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                const backSpeed = this.isBoss ? 1.2 : 0.8;
                this.vx = Math.cos(angle) * backSpeed;
                this.vy = Math.sin(angle) * backSpeed;
                this.game.audioSynth.playSlash('katana');
            } else if (this.energy === 0) {
                // Empty and in the zone: stay put until a charge is ready
                // (dashing off here reset the 1.5 s charge every time)
                this.aiTimer = 300;
            } else if (this.energy > 0 && Math.random() < 0.6) {
                // Shoot a projectile
                this.energy--;
                this.game.audioSynth.playShoot();
                
                if (this.isBoss && this.ragdollNodes) {
                    // Fire swordwaves from BOTH hands!
                    const leftHand = this.ragdollNodes[2];
                    const rightHand = this.ragdollNodes[3];
                    const speed = 0.62; // faster lasers for boss
                    
                    const dxLeft = player.x - leftHand.x;
                    this.game.spawnProjectile(leftHand.x, leftHand.y, dxLeft * 0.0015, speed * towardsFoe, 8, myOwner);

                    const dxRight = player.x - rightHand.x;
                    this.game.spawnProjectile(rightHand.x, rightHand.y, dxRight * 0.0015, speed * towardsFoe, 8, myOwner);
                } else {
                    // Fire from where the samurai actually is, aimed at the player
                    const startX = this.x;
                    const startY = this.y;
                    // (on Lätt the aim wanders, so shots can be dodged by standing still)
                    const dx = player.x - startX + (Math.random() - 0.5) * 160 * level.miss;
                    const speed = 0.45;
                    this.game.spawnProjectile(startX, startY, dx * 0.0015, speed * towardsFoe, 8, myOwner);
                    this.vy -= (0.045 * towardsFoe) / this.mass; // recoil, like the player
                }
            } else {
                // Ram/dash towards player or player tower
                const targetX = Math.random() < 0.65 ? player.x : (width / 2 + (Math.random() - 0.5) * 100);
                const targetY = this.side === 'top' ? height - 90 : 90;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                
                const launchForceMultiplier = (this.isBoss ? (this.enraged ? 2.0 : 1.7) : 1.0) * level.force;
                const launchForce = (0.95 + Math.random() * 0.45) * launchForceMultiplier;
                this.vx = Math.cos(angle) * launchForce;
                this.vy = Math.sin(angle) * launchForce;
                this.game.audioSynth.playSlash('katana');
            }
        }
    }

    // Boss, second phase: under half health the Shogun goes berserk - it
    // glows red, acts and dashes faster, and every few seconds slams the
    // ground with a shock wave that hurts and throws back anyone close by.
    updateBossPhase(deltaTime, player, particleSystem) {
        const g = this.game;
        if (!g || this.state === 'dead') return;
        if (!this.enraged && this.hp < this.maxHp * 0.5) {
            this.enraged = true;
            this.slamTimer = 1500;
            g.canvasCtrl.flash('rgba(255, 0, 0, 0.45)', 400);
            g.canvasCtrl.shake(14, 600);
            g.audioSynth.playVoiceSubBassDrop();
            g.audioSynth.playGong();
            particleSystem.spawnShockwave(this.x, this.y, '#ff0000', 150);
            particleSystem.spawnDamageText(this.x, this.y - 60, 'SHOGUN RASAR!', '#ff2020', 1.8);
            if (g.settings) g.settings.vibrate([100, 50, 100]);
        }
        if (!this.enraged) return;
        this.slamTimer -= deltaTime;
        if (this.slamTimer > 0) return;
        this.slamTimer = 4500 + Math.random() * 2000;
        // Ground slam
        const reach = 150;
        particleSystem.spawnShockwave(this.x, this.y, '#ff3300', reach);
        particleSystem.spawnShockwave(this.x, this.y, '#ffffff', reach * 0.5);
        if (g.rubble) g.rubble(this.x, this.y);
        g.canvasCtrl.shake(10, 350);
        g.audioSynth.playHit();
        const targets = g.teamMatch && g.myTeamCars ? g.myTeamCars() : [player];
        targets.forEach((c) => {
            if (!c || c.state === 'dead') return;
            const dx = c.x - this.x, dy = c.y - this.y, d = Math.hypot(dx, dy);
            if (d > reach || d < 1) return;
            const push = 0.9 * (1 - d / reach) + 0.3;
            c.vx += (dx / d) * push;
            c.vy += (dy / d) * push;
            c.takeDamage(15, this.x, this.y, particleSystem, g.canvasCtrl);
        });
    }

    // Lätt / Normal / Svår from the settings, for the computer's samurai on the
    // other team in offline matches: how often it acts, how hard it dashes and
    // how well it aims. Team mates and online opponents are never changed.
    get difficulty() {
        const g = this.game;
        if (!g || g.isMultiplayer || this.side === 'bottom' || !g.settings) return { think: 1, force: 1, miss: 0 };
        const d = g.settings.get('difficulty');
        const base = d === 'easy' ? { think: 1.6, force: 0.8, miss: 1 }
            : d === 'hard' ? { think: 0.7, force: 1.15, miss: 0 }
            : { think: 1, force: 1, miss: 0.25 };
        // higher levels: faster decisions, harder dashes, better aim
        const lv = g.matchLevel || 1;
        if (lv > 1) {
            const k = Math.log2(lv);
            base.think *= Math.max(0.45, 1 - 0.06 * k);
            base.force *= Math.min(1.5, 1 + 0.04 * k);
            base.miss *= Math.max(0, 1 - 0.1 * k);
        }
        // SEG DATOR (fusk): slow to decide, weak dashes, misses a lot
        if (g.cheats && g.cheats.slow) {
            base.think *= 2.2;
            base.force *= 0.65;
            base.miss = Math.max(base.miss, 1);
        }
        return base;
    }

    draw(ctx, canvasController) {
        if (this.state === 'dead') return;

        ctx.save();

        // Standard or Boss Mecha Shogun Enemy rendering
        const renderRadius = this.isBoss ? this.radius * 1.25 : this.radius;
        const enemyColor = this.color || '#ff0077';
        const currentSpeed = Math.hypot(this.vx, this.vy);

        if (this.isBoss && this.enraged) {
            const t = performance.now();
            const r = renderRadius * (2.2 + 0.2 * Math.sin(t / 90));
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            const glow = ctx.createRadialGradient(this.x, this.y, renderRadius * 0.4, this.x, this.y, r);
            glow.addColorStop(0, 'rgba(255, 30, 0, 0.35)');
            glow.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = glow;
            ctx.fillRect(this.x - r, this.y - r, r * 2, r * 2);
            ctx.restore();
        }

        canvasController.drawSamuraiCharacter(
            ctx, 
            this.x, 
            this.y, 
            renderRadius, 
            enemyColor, 
            this.angle, 
            'blades', 
            false, 
            0, 
            0, 
            this.hp / this.maxHp,
            this.trailHistory,
            this.side === 'bottom' ? (this.y > canvasController.height - 150) : (this.y < 150),
            currentSpeed
        );

        ctx.restore();
    }
}
