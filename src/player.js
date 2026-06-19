/* DANGEROUS FIGHT - PLAYER CHARACTER (CAR) CONTROLLER */

export class Player {
    constructor(x, y, game) {
        this.game = game;
        
        // Physics variables
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.985;
        this.isAiming = false;
        this.aimDx = 0;
        this.aimDy = 0;
        
        // Upgrade Levels (synced from state)
        this.upgHealthLvl = 0;
        this.upgPostureLvl = 0;
        this.upgCreditsLvl = 0;

        // Vehicle stats based on key
        this.activeWeaponKey = 'katana'; // default (Cyber Car)
        
        // Combat stats
        this.maxHp = 100;
        this.hp = 100;
        this.energy = 0; // max 3 shots
        this.chargeTimer = 0; // ms
        
        this.state = 'idle'; // 'idle', 'dead'
        this.respawnTimer = 0; // ms
        
        // Visual angle
        this.angle = -Math.PI / 2; // pointing up
        
        // Size & weight definitions
        this.profiles = {
            katana: {
                name: "Cyber Car",
                radius: 20,
                mass: 1.0,
                baseHp: 100,
                ramDamage: 100,
                speedMultiplier: 1.0,
                color: "#00f0ff"
            },
            blades: {
                name: "Plasma Truck",
                radius: 26,
                mass: 1.8,
                baseHp: 150,
                ramDamage: 180,
                speedMultiplier: 0.75,
                color: "#ff0077"
            },
            hammer: {
                name: "Laser Cycle",
                radius: 16,
                mass: 0.6,
                baseHp: 70,
                ramDamage: 70,
                speedMultiplier: 1.35,
                color: "#ff9900"
            }
        };
    }

    get profile() {
        return this.profiles[this.activeWeaponKey] || this.profiles.katana;
    }

    get radius() { return this.profile.radius; }
    get color() { return this.profile.color; }
    get mass() { return this.profile.mass; }

    applyPermanentUpgrades(levels) {
        this.upgHealthLvl = levels.health || 0;
        this.upgPostureLvl = levels.posture || 0;
        this.upgCreditsLvl = levels.credits || 0;

        // health lvl gives +15 to car maxHp, wait, let's keep car max HP stable or scale it slightly
        this.maxHp = this.profile.baseHp + (this.upgHealthLvl * 10);
        this.hp = this.maxHp;
    }

    resetForRun() {
        this.hp = this.maxHp;
        this.energy = 0;
        this.chargeTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.state = 'idle';
        this.isAiming = false;
    }

    // Check if a point is inside the car's body or control zone
    containsPoint(px, py) {
        if (this.state === 'dead') return false;
        const dist = Math.hypot(px - this.x, py - this.y);
        const height = this.game.canvasCtrl.height;
        // Accept touches close to the car OR anywhere in the bottom half of the screen (excluding the very edges)
        return dist <= this.radius * 3.0 || (py > height * 0.5 && py < height - 5);
    }

    // Called when the user starts a drag
    startDrag() {
        if (this.state === 'dead') return false;
        this.isAiming = true;
        this.aimDx = 0;
        this.aimDy = 0;
        this.vx = 0;
        this.vy = 0;
        return true;
    }

    // Called when dragging
    dragMove(dx, dy) {
        if (!this.isAiming) return;
        
        // Cap drag distance to 120 pixels
        const dist = Math.hypot(dx, dy);
        if (dist > 120) {
            this.aimDx = (dx / dist) * 120;
            this.aimDy = (dy / dist) * 120;
        } else {
            this.aimDx = dx;
            this.aimDy = dy;
        }

        // Set visual angle facing the launch direction (opposite of drag)
        if (dist > 5) {
            this.angle = Math.atan2(-this.aimDy, -this.aimDx);
        }
    }

    // Called when user releases drag to launch
    endDrag() {
        if (!this.isAiming) return;
        this.isAiming = false;
        
        const dist = Math.hypot(this.aimDx, this.aimDy);
        if (dist > 15) {
            // Slingshot velocity scale: launch opposite to drag direction
            const launchScale = 0.12 * this.profile.speedMultiplier;
            this.vx = -this.aimDx * launchScale;
            this.vy = -this.aimDy * launchScale;
            
            // Play slingshot sounds
            this.game.audioSynth.playSlash(this.activeWeaponKey);
        }
    }

    // Laser firing – fires all equipped cannons simultaneously from the car's position
    shoot() {
        if (this.state === 'dead' || this.energy <= 0) return;
        
        this.energy--;
        const equippedCannons = this.game.upgradeMgr.state.equippedCannons
            || [this.game.upgradeMgr.state.equippedCannon || 'laser'];
        
        // Fire from the car's own position, aimed straight up
        const startX = this.x;
        const startY = this.y;
        const speed = 0.45;

        this.game.audioSynth.playShoot();

        equippedCannons.forEach(cannon => {
            if (cannon === 'plasma') {
                // Heavy Plasma: slow moving, huge size, massive damage
                this.game.spawnProjectile(startX, startY, 0, -speed * 0.65, 16, 'player', 'plasma');
            } else if (cannon === 'rapid') {
                // Dubbel-Laser: two parallel neon-green lasers
                this.game.spawnProjectile(startX - 10, startY, 0, -speed, 6, 'player', 'rapid');
                this.game.spawnProjectile(startX + 10, startY, 0, -speed, 6, 'player', 'rapid');
            } else if (cannon === 'trio') {
                // Trio-Laser: three spread shots
                this.game.spawnProjectile(startX, startY, 0, -speed, 7, 'player', 'trio');
                this.game.spawnProjectile(startX, startY, -0.12, -speed, 7, 'player', 'trio');
                this.game.spawnProjectile(startX, startY, 0.12, -speed, 7, 'player', 'trio');
            } else if (cannon === 'hagel') {
                // Hagel-Laser: 5 shots in a wide spread
                const spreads = [-0.28, -0.14, 0, 0.14, 0.28];
                spreads.forEach(s => this.game.spawnProjectile(startX, startY, s, -speed, 5, 'player', 'hagel'));
            } else if (cannon === 'sniper') {
                // Sniper-Laser: single ultra-fast pinpoint beam
                this.game.spawnProjectile(startX, startY, 0, -speed * 2.2, 4, 'player', 'sniper');
            } else if (cannon === 'bakåt') {
                // Bakåt-Laser: fires both up and down simultaneously
                this.game.spawnProjectile(startX, startY, 0, -speed, 8, 'player', 'bakåt');
                this.game.spawnProjectile(startX, startY, 0, speed, 8, 'player', 'bakåt');
            } else {
                // Standard Puls-Laser
                this.game.spawnProjectile(startX, startY, 0, -speed, 8, 'player', 'laser');
            }
        });
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
            this.isAiming = false;
            
            // Explosion particles
            particleSystem.spawnShockwave(this.x, this.y, this.color, 70);
            for (let i = 0; i < 20; i++) {
                particleSystem.spawnAmbience(this.game.canvasCtrl.width, this.game.canvasCtrl.height, 2);
            }
            this.game.audioSynth.playDefeat();
        } else {
            // Pushback force
            const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
            this.vx = Math.cos(pushAngle) * 0.22;
            this.vy = Math.sin(pushAngle) * 0.22;
        }
    }

    update(deltaTime, width, height, particleSystem) {
        if (this.state === 'dead') {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                // Respawn
                this.state = 'idle';
                this.hp = this.maxHp;
                this.x = width / 2;
                this.y = height - 120;
                this.vx = 0;
                this.vy = 0;
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
            }
            return;
        }

        // Apply friction
        if (!this.isAiming) {
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
            
            if (bounced && Math.hypot(this.vx, this.vy) > 0.03) {
                this.game.audioSynth.playClick();
            }
            
            // Cap velocities
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.05) {
                this.angle = Math.atan2(this.vy, this.vx);
            }
        }

        // --- ENERGY CHARGING LOGIC ---
        // Player charging zone is at the bottom (y > height - 150)
        const inChargingZone = this.y > height - 150;
        const isMovingSlowly = Math.hypot(this.vx, this.vy) < 0.04;
        
        if (inChargingZone && isMovingSlowly && this.energy < 3 && !this.isAiming) {
            const chargeNeeded = 1500 / (1 + this.upgPostureLvl * 0.15); // ms
            this.chargeTimer += deltaTime;
            
            // Spawn charging sparkles
            if (Math.random() < 0.1) {
                particleSystem.spawnClashSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#ffffff');
            }

            if (this.chargeTimer >= chargeNeeded) {
                this.energy++;
                this.chargeTimer = 0;
                this.game.audioSynth.playUpgrade();
                particleSystem.spawnShockwave(this.x, this.y, '#ffffff', 30);
            }
        } else {
            this.chargeTimer = 0;
        }
    }

    draw(ctx, canvasController) {
        if (this.state === 'dead') return;

        ctx.save();
        
        // Aiming line
        if (this.isAiming) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            // Draw in opposite direction of drag
            ctx.lineTo(this.x - this.aimDx * 2, this.y - this.aimDy * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw neon shadow
        canvasController.setNeonGlow(this.color, 15);
        ctx.fillStyle = '#0f0f1b';
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.5;
        
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Draw car wheels/bars for variety
        canvasController.resetNeonGlow();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        // Symmetrical lines representing a cockpit or tires
        ctx.arc(this.x, this.y, this.radius * 0.6, 0, Math.PI * 2);
        ctx.stroke();

        // Direction line
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(this.angle) * (this.radius + 6), this.y + Math.sin(this.angle) * (this.radius + 6));
        ctx.stroke();

        // Draw simple health bar above car
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(this.x - 20, this.y - this.radius - 12, 40, 4);
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x - 20, this.y - this.radius - 12, (this.hp / this.maxHp) * 40, 4);

        ctx.restore();
    }
}
