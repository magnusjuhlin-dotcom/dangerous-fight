/* DANGEROUS FIGHT - PLAYER CHARACTER CONTROLLER */

export class Player {
    constructor(x, y) {
        // Core Physics
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0; // Direction looking

        // Combat Stats (Dynamic base values, boosted by permanent upgrades)
        this.baseMaxHp = 100;
        this.maxHp = 100;
        this.hp = 100;

        this.baseMaxPosture = 100;
        this.maxPosture = 100;
        this.posture = 0; // 0 is perfect balance, maxPosture is Stunned

        // Permanent Upgrade Levels (0 to 5)
        this.upgHealthLvl = 0;
        this.upgPostureLvl = 0;
        this.upgCreditsLvl = 0;

        // Weapon Profiles
        this.weapons = {
            katana: {
                name: "Cyber Katana",
                color: "#00f0ff", // Neon Cyan
                damage: 22,
                postureDamage: 18,
                dashSpeed: 1.1,     // px per ms
                dashDuration: 160,  // ms
                dashCooldown: 350,  // ms
                parryWindow: 260    // ms
            },
            blades: {
                name: "Plasma Dual-Blades",
                color: "#ff0077", // Neon Pink
                damage: 13,
                postureDamage: 9,
                dashSpeed: 1.45,
                dashDuration: 110,
                dashCooldown: 180,
                parryWindow: 180
            },
            hammer: {
                name: "Neon Hammare",
                color: "#ff9900", // Neon Orange
                damage: 48,
                postureDamage: 45,
                dashSpeed: 0.72,
                dashDuration: 250,
                dashCooldown: 750,
                parryWindow: 200
            }
        };
        this.activeWeaponKey = 'katana';

        // State Machine
        this.state = 'idle'; // 'idle', 'dashing', 'parrying', 'hit', 'stunned'
        this.stateTimer = 0;
        this.dashCooldownTimer = 0;
        this.postureRecoveryTimer = 0;
        
        // Dash trail logging
        this.trailPoints = [];
        this.maxTrailPoints = 8;
        
        // Active in-run roguelite perks
        this.perks = {
            vampirism: false,       // Heal 10% HP on parry
            lightningSlash: false,  // Double dash damage
            shieldCharge: false,    // Automatic energy shield blocking a hit
            hasShield: false,       // State of energy shield
            overdrive: false        // Deal 30% more damage, take 10% more
        };
    }

    // Apply permanent main menu upgrades
    applyPermanentUpgrades(levels) {
        this.upgHealthLvl = levels.health || 0;
        this.upgPostureLvl = levels.posture || 0;
        this.upgCreditsLvl = levels.credits || 0;

        this.maxHp = this.baseMaxHp + (this.upgHealthLvl * 15);
        this.maxPosture = this.baseMaxPosture + (this.upgPostureLvl * 15);
        
        // Fully heal on upgrade application
        this.hp = this.maxHp;
        this.posture = 0;
    }

    resetForRun() {
        this.hp = this.maxHp;
        this.posture = 0;
        this.state = 'idle';
        this.stateTimer = 0;
        this.dashCooldownTimer = 0;
        this.trailPoints = [];
        
        // Reset in-game temporary perks
        this.perks.vampirism = false;
        this.perks.lightningSlash = false;
        this.perks.shieldCharge = false;
        this.perks.hasShield = false;
        this.perks.overdrive = false;
    }

    get activeWeapon() {
        return this.weapons[this.activeWeaponKey];
    }

    // Trigger Swipe (Dash and Slash attack)
    dash(dirX, dirY, audioController, particleSystem) {
        if (this.state !== 'idle' && this.state !== 'parrying') return false;
        if (this.dashCooldownTimer > 0) return false;

        const wpn = this.activeWeapon;
        
        // Start dashing
        this.state = 'dashing';
        this.stateTimer = wpn.dashDuration;
        this.dashCooldownTimer = wpn.dashCooldown;
        
        // Calculate velocity vector
        this.vx = dirX * wpn.dashSpeed;
        this.vy = dirY * wpn.dashSpeed;
        
        // Face the dash direction
        this.angle = Math.atan2(dirY, dirX);
        
        // Play synthesizer audio
        audioController.playSlash(this.activeWeaponKey);
        
        // Visual effects
        particleSystem.spawnShockwave(this.x, this.y, wpn.color, 60);
        this.trailPoints = [{ x: this.x, y: this.y }];

        return true;
    }

    // Trigger Tap (Parry/Block stance)
    parry(audioController, particleSystem) {
        if (this.state !== 'idle') return false;

        const wpn = this.activeWeapon;
        this.state = 'parrying';
        this.stateTimer = wpn.parryWindow;
        this.vx = 0;
        this.vy = 0;

        audioController.playDodge();
        particleSystem.spawnShockwave(this.x, this.y, '#ffffff', 40);

        return true;
    }

    // Suffer an attack
    takeDamage(amount, postureDamage, attackerX, attackerY, audioController, particleSystem, canvasController) {
        // 1. Check Energy Shield perk
        if (this.perks.hasShield) {
            this.perks.hasShield = false;
            particleSystem.spawnShockwave(this.x, this.y, '#e0a0ff', 90);
            audioController.playParry();
            return 'blocked';
        }

        // Apply overdrive multiplier
        let actualDamage = amount;
        if (this.perks.overdrive) {
            actualDamage *= 1.1; // Take 10% more damage
        }

        // 2. Reduce health
        this.hp = Math.max(0, this.hp - actualDamage);
        
        // 3. Shift state to hit reaction unless stunned/dead
        if (this.hp <= 0) {
            this.state = 'dead';
            return 'dead';
        }

        const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
        
        // 4. Handle Balance/Posture
        const postureRecoveryModifier = 1 - (this.upgPostureLvl * 0.08); // up to 40% posture damage reduction
        const netPostureDamage = postureDamage * postureRecoveryModifier;
        this.posture = Math.min(this.maxPosture, this.posture + netPostureDamage);

        if (this.posture >= this.maxPosture) {
            // Posture broken! Heavy stun
            this.state = 'stunned';
            this.stateTimer = 1200; // 1.2 seconds stun
            this.vx = Math.cos(pushAngle) * 0.12;
            this.vy = Math.sin(pushAngle) * 0.12;
            
            audioController.playHit();
            canvasController.shake(12, 400);
            particleSystem.spawnShockwave(this.x, this.y, '#ffff00', 80);
            particleSystem.spawnDigitalBleed(this.x, this.y, '#ffff00', Math.cos(pushAngle), Math.sin(pushAngle));
            
            return 'stunned';
        }

        // Normal hit reaction
        this.state = 'hit';
        this.stateTimer = 220; // Short flinch
        
        // Slight knockback
        this.vx = Math.cos(pushAngle) * 0.2;
        this.vy = Math.sin(pushAngle) * 0.2;

        audioController.playHit();
        canvasController.shake(6, 200);
        particleSystem.spawnDigitalBleed(this.x, this.y, '#ffffff', Math.cos(pushAngle), Math.sin(pushAngle));

        return 'hit';
    }

    update(deltaTime, width, height, particleSystem) {
        // Cooldown timer tickdown
        if (this.dashCooldownTimer > 0) {
            this.dashCooldownTimer -= deltaTime;
        }

        // Posture recovery (slowly recover balance over time when not hit)
        if (this.state !== 'hit' && this.state !== 'stunned') {
            const recoverySpeed = (0.015 + (this.upgPostureLvl * 0.005)) * deltaTime; // Speed increases with upgrade level
            this.posture = Math.max(0, this.posture - recoverySpeed);
        }

        // Dynamic shield recharging perk
        if (this.perks.shieldCharge && !this.perks.hasShield) {
            if (!this.shieldRechargeTime) this.shieldRechargeTime = 12000; // 12 seconds cooldown
            this.shieldRechargeTime -= deltaTime;
            if (this.shieldRechargeTime <= 0) {
                this.perks.hasShield = true;
                this.shieldRechargeTime = 12000;
                particleSystem.spawnShockwave(this.x, this.y, '#e0a0ff', 50);
            }
        }

        // State Machine ticks
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime;
            
            if (this.state === 'dashing') {
                // Keep moving player
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                
                // Add points to sword trail
                this.trailPoints.push({ x: this.x, y: this.y });
                if (this.trailPoints.length > this.maxTrailPoints) {
                    this.trailPoints.shift();
                }

                // Append trail in particle system for smooth display
                if (this.trailPoints.length >= 2) {
                    particleSystem.addSwordTrail(this.trailPoints, this.activeWeapon.color, 4);
                }
            } else if (this.state === 'hit' || this.state === 'stunned') {
                // Drag friction on knockback
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                this.vx *= Math.pow(0.92, deltaTime / 16);
                this.vy *= Math.pow(0.92, deltaTime / 16);
            }

            if (this.stateTimer <= 0) {
                // Return to idle state
                this.state = 'idle';
                this.vx = 0;
                this.vy = 0;
                this.trailPoints = [];
            }
        }

        // Keep player strictly inside the canvas viewport bounds (with bounce)
        const margin = this.radius + 10;
        if (this.x < margin) { this.x = margin; this.vx = 0; }
        if (this.x > width - margin) { this.x = width - margin; this.vx = 0; }
        if (this.y < margin) { this.y = margin; this.vy = 0; }
        if (this.y > height - margin) { this.y = height - margin; this.vy = 0; }
    }

    draw(ctx, canvasController) {
        const wpn = this.activeWeapon;
        
        ctx.save();
        
        // Draw Neon Shadow for player circle
        canvasController.setNeonGlow(wpn.color, 20);
        
        // Draw outer glowing player body
        ctx.strokeStyle = wpn.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#0a0a14';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        
        // Draw cybernetic grid core inside player
        canvasController.resetNeonGlow();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(this.x - this.radius + 6, this.y);
        ctx.lineTo(this.x + this.radius - 6, this.y);
        ctx.moveTo(this.x, this.y - this.radius + 6);
        ctx.lineTo(this.x, this.y + this.radius - 6);
        ctx.stroke();
        
        // Draw face/indicator facing direction
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(this.angle) * (this.radius + 5), this.y + Math.sin(this.angle) * (this.radius + 5));
        ctx.stroke();

        // Draw weapon blades depending on selected weapon
        this.drawWeaponsGraphic(ctx, canvasController);

        // State specific overlays
        if (this.state === 'parrying') {
            // Draw expanding energy deflection barrier
            canvasController.setNeonGlow('#ffffff', 15);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 15, 0, Math.PI * 2);
            ctx.stroke();
        }

        if (this.perks.hasShield) {
            // Draw persistent energy shield ring
            canvasController.setNeonGlow('#e0a0ff', 12);
            ctx.strokeStyle = 'rgba(224, 160, 255, 0.5)';
            ctx.lineWidth = 1.5;
            ctx.setLineDash([4, 6]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        if (this.state === 'stunned') {
            // Draw dizzy rotating stars/symbols above player
            const numStars = 3;
            const time = performance.now() * 0.005;
            canvasController.setNeonGlow('#ffff00', 8);
            ctx.fillStyle = '#ffff00';
            for (let i = 0; i < numStars; i++) {
                const angle = time + (i * Math.PI * 2 / numStars);
                const sx = this.x + Math.cos(angle) * 16;
                const sy = this.y - this.radius - 12 + Math.sin(angle) * 4;
                ctx.fillRect(sx - 2, sy - 2, 4, 4);
            }
        }

        ctx.restore();
    }

    drawWeaponsGraphic(ctx, canvasController) {
        ctx.save();
        const color = this.activeWeapon.color;
        canvasController.setNeonGlow(color, 12);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        
        if (this.activeWeaponKey === 'katana') {
            // Drawn extending behind the direction line
            const katanaAngle = this.angle + Math.PI * 0.85; // drawn angled back
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(katanaAngle) * 5, this.y + Math.sin(katanaAngle) * 5);
            ctx.lineTo(this.x + Math.cos(katanaAngle) * (this.radius + 18), this.y + Math.sin(katanaAngle) * (this.radius + 18));
            ctx.stroke();
            
        } else if (this.activeWeaponKey === 'blades') {
            // Draw two symmetrical blades on the left and right sides
            const bladeLeft = this.angle + Math.PI * 0.55;
            const bladeRight = this.angle - Math.PI * 0.55;
            
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(bladeLeft) * 5, this.y + Math.sin(bladeLeft) * 5);
            ctx.lineTo(this.x + Math.cos(bladeLeft) * (this.radius + 10), this.y + Math.sin(bladeLeft) * (this.radius + 10));
            ctx.moveTo(this.x + Math.cos(bladeRight) * 5, this.y + Math.sin(bladeRight) * 5);
            ctx.lineTo(this.x + Math.cos(bladeRight) * (this.radius + 10), this.y + Math.sin(bladeRight) * (this.radius + 10));
            ctx.stroke();
            
        } else if (this.activeWeaponKey === 'hammer') {
            // Draw a heavy shaft with a large rectangular neon hammer head
            const shaftAngle = this.angle + Math.PI * 0.95;
            const shaftLength = this.radius + 14;
            const headX = this.x + Math.cos(shaftAngle) * shaftLength;
            const headY = this.y + Math.sin(shaftAngle) * shaftLength;
            
            // Draw shaft
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(headX, headY);
            ctx.stroke();
            
            // Draw Hammer head
            ctx.strokeStyle = color;
            ctx.fillStyle = '#140c00';
            ctx.lineWidth = 3;
            
            ctx.translate(headX, headY);
            ctx.rotate(shaftAngle + Math.PI / 2);
            ctx.beginPath();
            ctx.rect(-10, -6, 20, 12);
            ctx.fill();
            ctx.stroke();
        }
        
        ctx.restore();
    }
}
