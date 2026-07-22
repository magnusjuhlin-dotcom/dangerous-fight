/* DANGEROUS FIGHT - CYBERPUNK 1V1 BOSS AI & REMOTE PLAYER REPLICA */

export class Enemy {
    constructor(x, y, game) {
        this.game = game;
        
        // Physics variables
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.985;
        this.radius = 20;
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
        
        // Profiles for multiplayer vehicle matching
        this.profiles = {
            katana: { radius: 20, mass: 1.0, color: "#ff0077" }, // Cyber Car
            blades: { radius: 26, mass: 1.8, color: "#ff0088" }, // Plasma Truck
            hammer: { radius: 16, mass: 0.6, color: "#ff4400" }  // Laser Cycle
        };
    }

    resetForRun(isBoss = false) {
        this.isBoss = isBoss;
        if (isBoss) {
            this.maxHp = 500;
            this.radius = 24; // Torso radius
            this.mass = 2.0;
            this.color = 'crimson';
            
            // Initialize ragdoll nodes
            this.ragdollNodes = [
                { name: 'torso', x: this.x, y: this.y, vx: 0, vy: 0, radius: 24, mass: 1.5, color: 'crimson' },
                { name: 'head', x: this.x, y: this.y - 32, vx: 0, vy: 0, radius: 14, mass: 0.8, color: '#ff0055' },
                { name: 'leftHand', x: this.x - 34, y: this.y - 8, vx: 0, vy: 0, radius: 10, mass: 0.5, color: '#ff0077' },
                { name: 'rightHand', x: this.x + 34, y: this.y - 8, vx: 0, vy: 0, radius: 10, mass: 0.5, color: '#ff0077' },
                { name: 'leftFoot', x: this.x - 18, y: this.y + 32, vx: 0, vy: 0, radius: 11, mass: 0.7, color: '#990033' },
                { name: 'rightFoot', x: this.x + 18, y: this.y + 32, vx: 0, vy: 0, radius: 11, mass: 0.7, color: '#990033' }
            ];

            // Define distance constraints between nodes
            this.ragdollConstraints = [
                [0, 1, 32], // torso to head
                [0, 2, 34], // torso to leftHand
                [0, 3, 34], // torso to rightHand
                [0, 4, 32], // torso to leftFoot
                [0, 5, 32], // torso to rightFoot
                [1, 2, 38], // head to leftHand
                [1, 3, 38], // head to rightHand
                [4, 5, 28]  // leftFoot to rightFoot
            ];
        } else {
            this.ragdollNodes = null;
            this.ragdollConstraints = null;
            this.maxHp = 100;
            this.radius = 20;
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
    }

    setVehicleType(type) {
        const p = this.profiles[type] || this.profiles.katana;
        this.radius = p.radius;
        this.mass = p.mass;
        this.color = p.color;
    }

    takeDamage(amount, attackerX, attackerY, particleSystem, canvasController) {
        if (this.state === 'dead') return;
        
        let dmg = amount;
        
        // Apply player active perks
        const player = this.game.player;
        if (player && player.state !== 'dead') {
            let mult = 1.0;
            
            // Overdrive perk: +30% damage dealt
            if (player.activePerk === 'overdrive') {
                mult += 0.30;
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
        canvasController.flash('rgba(0, 240, 255, 0.2)', 180); // Cyan flash when damaging enemy
        canvasController.shake(6, 150);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            this.respawnTimer = 3000; // 3 seconds respawn
            this.vx = 0;
            this.vy = 0;
            this.aiState = 'idle';
            this.aiTimer = 3000;
            
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
            this.game.audioSynth.playVictory();
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
                this.y = 120;
                this.vx = 0;
                this.vy = 0;
                if (this.isBoss) {
                    this.resetRagdollPositions();
                }
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
            }
            return;
        }

        // Apply friction & ragdoll constraints
        if (this.isBoss && this.ragdollNodes) {
            // Transfer launch velocities to torso node
            const torso = this.ragdollNodes[0];
            if (this.vx !== 0 || this.vy !== 0) {
                torso.vx = this.vx;
                torso.vy = this.vy;
                this.vx = 0;
                this.vy = 0;
            }

            // Move each node
            this.ragdollNodes.forEach(node => {
                node.x += node.vx * deltaTime;
                node.y += node.vy * deltaTime;
                node.vx *= Math.pow(this.friction, deltaTime / 16);
                node.vy *= Math.pow(this.friction, deltaTime / 16);
            });

            // Solve distance constraints
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
                    audioController.playClick();
                }
            });

            // Sync main object variables
            this.x = torso.x;
            this.y = torso.y;
            this.vx = torso.vx;
            this.vy = torso.vy;

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
            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = -this.vx * 0.6;
                bounced = true;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -this.vx * 0.6;
                bounced = true;
            }
            
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = -this.vy * 0.6;
                bounced = true;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -this.vy * 0.6;
                bounced = true;
            }
            
            if (bounced && Math.hypot(this.vx, this.vy) > 0.03 && audioController) {
                audioController.playClick();
            }
            
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.05) {
                this.angle = Math.atan2(this.vy, this.vx);
            }
        }

        // --- SINGLE PLAYER AI CONTROLLER ---
        if (!this.game.isMultiplayer) {
            this.updateAI(deltaTime, player, particleSystem, width, height);
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
    }

    updateAI(deltaTime, player, particleSystem, width, height) {
        // AI charging zone is at the top (y < 150)
        const inChargingZone = this.y < 150;
        const isMovingSlowly = Math.hypot(this.vx, this.vy) < 0.04;

        // 1. Charge energy in zone
        if (inChargingZone && isMovingSlowly && this.energy < 3) {
            const chargeSpeedMultiplier = this.isBoss ? 2.0 : 1.0;
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

        // Melee punch logic for boss
        if (this.isBoss && this.ragdollNodes) {
            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            if (distToPlayer < 200) {
                const leftHand = this.ragdollNodes[2];
                const rightHand = this.ragdollNodes[3];
                const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
                
                // Pull hands towards player to punch!
                leftHand.vx += Math.cos(angleToPlayer) * 0.025 * deltaTime;
                leftHand.vy += Math.sin(angleToPlayer) * 0.025 * deltaTime;
                rightHand.vx += Math.cos(angleToPlayer) * 0.025 * deltaTime;
                rightHand.vy += Math.sin(angleToPlayer) * 0.025 * deltaTime;

                if (Math.random() < 0.04) {
                    particleSystem.spawnClashSparks(leftHand.x, leftHand.y, '#ff0055');
                    particleSystem.spawnClashSparks(rightHand.x, rightHand.y, '#ff0055');
                }
            }
        }

        // AI decision logic
        this.aiTimer -= deltaTime;
        if (this.aiTimer <= 0) {
            const decisionTimeMultiplier = this.isBoss ? 0.5 : 1.0;
            this.aiTimer = (Math.random() * 1000 + 800) * decisionTimeMultiplier; // reset decision timer

            // Check if we need to recharge
            if (this.energy === 0 && !inChargingZone) {
                // Head back to charge zone
                const targetX = width / 2 + (Math.random() - 0.5) * 60;
                const targetY = 100;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                this.vx = Math.cos(angle) * 0.45;
                this.vy = Math.sin(angle) * 0.45;
                this.game.audioSynth.playSlash('katana');
            } else if (this.energy > 0 && Math.random() < 0.6) {
                // Shoot a projectile
                this.energy--;
                this.game.audioSynth.playShoot();
                
                if (this.isBoss && this.ragdollNodes) {
                    // Fire swordwaves from BOTH hands!
                    const leftHand = this.ragdollNodes[2];
                    const rightHand = this.ragdollNodes[3];
                    const speed = 0.50; // faster lasers for boss
                    
                    const dxLeft = player.x - leftHand.x;
                    this.game.spawnProjectile(leftHand.x, leftHand.y, dxLeft * 0.0015, speed, 8, 'enemy');
                    
                    const dxRight = player.x - rightHand.x;
                    this.game.spawnProjectile(rightHand.x, rightHand.y, dxRight * 0.0015, speed, 8, 'enemy');
                } else {
                    const startX = width / 2;
                    const startY = 90;
                    const dx = player.x - startX;
                    const speed = 0.45;
                    this.game.spawnProjectile(startX, startY, dx * 0.0015, speed, 8, 'enemy');
                }
            } else {
                // Ram/dash towards player or player tower
                const targetX = Math.random() < 0.65 ? player.x : (width / 2 + (Math.random() - 0.5) * 100);
                const targetY = height - 90;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                
                const launchForceMultiplier = this.isBoss ? 1.35 : 1.0;
                const launchForce = (0.5 + Math.random() * 0.25) * launchForceMultiplier;
                this.vx = Math.cos(angle) * launchForce;
                this.vy = Math.sin(angle) * launchForce;
                this.game.audioSynth.playSlash('katana');
            }
        }
    }

    draw(ctx, canvasController) {
        if (this.state === 'dead') return;

        ctx.save();

        if (this.isBoss && this.ragdollNodes) {
            const torso = this.ragdollNodes[0];
            const head = this.ragdollNodes[1];
            const leftHand = this.ragdollNodes[2];
            const rightHand = this.ragdollNodes[3];
            const leftFoot = this.ragdollNodes[4];
            const rightFoot = this.ragdollNodes[5];

            // 1. Draw glowing neon bones (limbs)
            canvasController.setNeonGlow(this.color, 15);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 9;
            ctx.lineCap = 'round';
            this.ragdollConstraints.forEach(([idxA, idxB]) => {
                const nodeA = this.ragdollNodes[idxA];
                const nodeB = this.ragdollNodes[idxB];
                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);
                ctx.stroke();
            });

            // 2. Draw Giant Shogun Shoulder Pads
            canvasController.setNeonGlow(this.color, 12);
            ctx.fillStyle = '#1b0f14';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            
            ctx.beginPath();
            ctx.arc(torso.x - 22, torso.y - 12, 12, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(torso.x + 22, torso.y - 12, 12, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 3. Draw each joint node
            this.ragdollNodes.forEach(node => {
                canvasController.setNeonGlow(node.color, 15);
                ctx.fillStyle = '#0f050a';
                ctx.strokeStyle = node.color;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                canvasController.resetNeonGlow();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
                ctx.stroke();
            });

            // 4. Draw giant Kabuto Samurai Horns
            canvasController.setNeonGlow(head.color, 12);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(head.x - 8, head.y - 10, 10, 0, Math.PI * 1.5, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(head.x + 8, head.y - 10, 10, Math.PI, Math.PI * 1.5);
            ctx.stroke();

            // 5. Draw Head Visor (faces player)
            const angleToPlayer = Math.atan2(this.game.player.y - head.y, this.game.player.x - head.x);
            ctx.save();
            ctx.translate(head.x, head.y);
            ctx.rotate(angleToPlayer);
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.fillRect(head.radius * 0.1, -head.radius * 0.3, head.radius * 0.6, head.radius * 0.6);
            ctx.restore();

            // 6. Draw glowing neon katanas in hands
            canvasController.setNeonGlow(this.color, 18);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            
            const leftSwordAngle = Math.atan2(leftHand.y - torso.y, leftHand.x - torso.x) + Math.PI * 0.15;
            ctx.beginPath();
            ctx.moveTo(leftHand.x, leftHand.y);
            ctx.lineTo(leftHand.x + Math.cos(leftSwordAngle) * 45, leftHand.y + Math.sin(leftSwordAngle) * 45);
            ctx.stroke();
            
            const rightSwordAngle = Math.atan2(rightHand.y - torso.y, rightHand.x - torso.x) - Math.PI * 0.15;
            ctx.beginPath();
            ctx.moveTo(rightHand.x, rightHand.y);
            ctx.lineTo(rightHand.x + Math.cos(rightSwordAngle) * 45, rightHand.y + Math.sin(rightSwordAngle) * 45);
            ctx.stroke();

            canvasController.resetNeonGlow();

            // 7. Draw health bar above boss head
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(head.x - 30, head.y - head.radius - 28, 60, 5);
            ctx.fillStyle = this.color;
            ctx.fillRect(head.x - 30, head.y - head.radius - 28, (this.hp / this.maxHp) * 60, 5);
        } else {
            // --- DRAW STANDARD SAMURAI ENEMY ---
             canvasController.drawSamuraiCharacter(
                ctx, 
                this.x, 
                this.y, 
                this.radius, 
                this.color, 
                this.angle, 
                'katana', 
                false, 
                0, 
                0, 
                this.hp / this.maxHp,
                this.trailHistory,
                (this.y < 150)
            );
        }

        ctx.restore();
    }
}
