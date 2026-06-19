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
            this.maxHp = 400;
            this.radius = 35;
            this.mass = 3.0;
            this.color = 'crimson';
        } else {
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
    }

    setVehicleType(type) {
        const p = this.profiles[type] || this.profiles.katana;
        this.radius = p.radius;
        this.mass = p.mass;
        this.color = p.color;
    }

    takeDamage(amount, attackerX, attackerY, particleSystem, canvasController) {
        if (this.state === 'dead') return;
        
        this.hp = Math.max(0, this.hp - amount);
        
        // Spark particles
        particleSystem.spawnClashSparks(this.x, this.y, this.color);
        canvasController.shake(6, 150);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            this.respawnTimer = 3000; // 3 seconds respawn
            this.vx = 0;
            this.vy = 0;
            this.aiState = 'idle';
            this.aiTimer = 3000;
            
            // Explosion particles
            particleSystem.spawnShockwave(this.x, this.y, this.color, 70);
            for (let i = 0; i < 20; i++) {
                particleSystem.spawnAmbience(this.game.canvasCtrl.width, this.game.canvasCtrl.height, 2);
            }
            this.game.audioSynth.playVictory(); // AI died, player wins a point / credits!
        } else {
            // Pushback force
            const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
            this.vx = Math.cos(pushAngle) * 0.22;
            this.vy = Math.sin(pushAngle) * 0.22;
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
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
            }
            return;
        }

        // Apply friction
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
        
        // Cap velocities
        const speed = Math.hypot(this.vx, this.vy);
        if (speed > 0.05) {
            this.angle = Math.atan2(this.vy, this.vx);
        }

        // --- SINGLE PLAYER AI CONTROLLER ---
        if (!this.game.isMultiplayer) {
            this.updateAI(deltaTime, player, particleSystem, width, height);
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
            // AI charges at a normal pace
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
            const decisionTimeMultiplier = this.isBoss ? 0.5 : 1.0;
            this.aiTimer = (Math.random() * 1000 + 800) * decisionTimeMultiplier; // reset decision timer

            // Check if we need to recharge
            if (this.energy === 0 && !inChargingZone) {
                // Head back to charge zone
                const targetX = width / 2 + (Math.random() - 0.5) * 60;
                const targetY = 100;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                // Launch towards charging zone
                this.vx = Math.cos(angle) * 0.45;
                this.vy = Math.sin(angle) * 0.45;
                this.game.audioSynth.playSlash('katana');
            } else if (this.energy > 0 && Math.random() < 0.6) {
                // Shoot a projectile!
                this.energy--;
                this.game.audioSynth.playShoot();
                
                if (this.isBoss) {
                    // Fire from BOTH Left Tower (120) and Right Tower (width - 120) simultaneously!
                    const speed = 0.50; // faster lasers for boss
                    
                    // Left laser
                    const dxLeft = player.x - 120;
                    this.game.spawnProjectile(120, 90, dxLeft * 0.0015, speed, 8, 'enemy');
                    
                    // Right laser
                    const dxRight = player.x - (width - 120);
                    this.game.spawnProjectile(width - 120, 90, dxRight * 0.0015, speed, 8, 'enemy');
                } else {
                    const startX = width / 2;
                    const startY = 90;
                    const dx = player.x - startX;
                    const speed = 0.45;
                    this.game.spawnProjectile(startX, startY, dx * 0.0015, speed, 8, 'enemy');
                }
            } else {
                // Ram the player's tower or the player's car
                const targetX = Math.random() < 0.65 ? player.x : (width / 2 + (Math.random() - 0.5) * 100);
                const targetY = height - 90; // Bottom tower area
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                
                // Launch
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

        // Draw neon shadow
        canvasController.setNeonGlow(this.color, 15);
        ctx.fillStyle = '#1b0f14';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.5;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw cockpit details
        canvasController.resetNeonGlow();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // Direction line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(this.angle) * (this.radius + 6), this.y + Math.sin(this.angle) * (this.radius + 6));
        ctx.stroke();

        // Health bar above car
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.x - 20, this.y - this.radius - 12, 40, 4);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 20, this.y - this.radius - 12, (this.hp / this.maxHp) * 40, 4);

        ctx.restore();
    }
}
