/* DANGEROUS FIGHT - CYBERPUNK 1V1 BOSS AI CONTROLLER */

export class Enemy {
    constructor(x, y, wave) {
        this.x = x;
        this.y = y;
        this.radius = 20;
        this.vx = 0;
        this.vy = 0;
        this.angle = 0;
        this.wave = wave;

        // Initialize unique Boss Profiles depending on Wave
        this.initBossProfile(wave);
        
        // State Machine
        this.state = 'idle'; // 'idle', 'moving', 'charging', 'attacking', 'stunned', 'hit', 'dead'
        this.stateTimer = 0;
        this.aiDecisionTimer = Math.random() * 800 + 400; // Time until next action choice

        // Telegraph indicators
        this.telegraphType = 'line'; // 'line', 'circle', 'cone'
        this.telegraphProgress = 0; // 0 to 1
        this.telegraphTargetX = 0;
        this.telegraphTargetY = 0;
        this.telegraphWidth = 20;
        this.telegraphRange = 150;
        
        // Parry opening window (flashes white at end of telegraph)
        this.parryFlashTimer = 0;
        this.parryFlashDuration = 160; // ms window to parry

        this.trailPoints = [];
    }

    initBossProfile(wave) {
        // Base profile setup based on wave structure
        const bossId = ((wave - 1) % 5) + 1; // Loop profiles 1 to 5

        switch (bossId) {
            case 1:
                this.name = "CYBER KATANA RUNNER";
                this.color = "#ff0055"; // Neon Pink/Red
                this.maxHp = 80 + wave * 20;
                this.maxPosture = 80 + wave * 10;
                this.damage = 15 + wave * 2;
                this.postureDamage = 15 + wave * 2;
                this.speed = 0.08 + wave * 0.005;
                this.behaviorType = 'balanced';
                break;
                
            case 2:
                this.name = "PLASMA SPEARHUNTER";
                this.color = "#ffaa00"; // Orange
                this.maxHp = 100 + wave * 20;
                this.maxPosture = 70 + wave * 10;
                this.damage = 18 + wave * 2;
                this.postureDamage = 12 + wave * 2;
                this.speed = 0.11 + wave * 0.005;
                this.behaviorType = 'agile_lunge';
                break;

            case 3:
                this.name = "IRON GRAVITY SLAMMER";
                this.color = "#a000ff"; // Dark Purple
                this.maxHp = 160 + wave * 25;
                this.maxPosture = 140 + wave * 15;
                this.damage = 30 + wave * 3;
                this.postureDamage = 35 + wave * 4;
                this.speed = 0.05 + wave * 0.003;
                this.behaviorType = 'heavy_unblockable';
                break;

            case 4:
                this.name = "NEO PHANTOM SHADOW";
                this.color = "#00ff66"; // Neon Green
                this.maxHp = 90 + wave * 20;
                this.maxPosture = 90 + wave * 10;
                this.damage = 16 + wave * 2;
                this.postureDamage = 15 + wave * 2;
                this.speed = 0.09 + wave * 0.005;
                this.behaviorType = 'teleporter';
                break;

            case 5:
            default:
                this.name = `APEX MASTER: PROTO-${wave}`;
                this.color = "#ffff00"; // Neon Yellow
                this.maxHp = 180 + wave * 30;
                this.maxPosture = 150 + wave * 15;
                this.damage = 25 + wave * 3;
                this.postureDamage = 25 + wave * 3;
                this.speed = 0.12 + wave * 0.005;
                this.behaviorType = 'apex_boss';
                break;
        }

        this.hp = this.maxHp;
        this.posture = 0;
        this.maxPostureVal = this.maxPosture;
    }

    // Process damage taken from player attacks
    takeDamage(amount, postureDamage, playerX, playerY, audioController, particleSystem, canvasController) {
        if (this.state === 'dead') return 'dead';

        this.hp = Math.max(0, this.hp - amount);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            particleSystem.spawnShockwave(this.x, this.y, this.color, 120);
            particleSystem.spawnDigitalBleed(this.x, this.y, this.color, this.x - playerX, this.y - playerY);
            return 'dead';
        }

        const pushAngle = Math.atan2(this.y - playerY, this.x - playerX);

        // Balance reduction
        this.posture = Math.min(this.maxPostureVal, this.posture + postureDamage);

        if (this.posture >= this.maxPostureVal) {
            // Balance broken! Dizzy stun opening
            this.state = 'stunned';
            this.stateTimer = 1600; // 1.6 seconds stun opening
            this.vx = Math.cos(pushAngle) * 0.1;
            this.vy = Math.sin(pushAngle) * 0.1;

            audioController.playHit();
            canvasController.shake(10, 300);
            particleSystem.spawnShockwave(this.x, this.y, '#ffff00', 80);
            particleSystem.spawnDigitalBleed(this.x, this.y, '#ffff00', Math.cos(pushAngle), Math.sin(pushAngle));
            
            return 'stunned';
        }

        // Flinch from hit
        if (this.state !== 'stunned' && this.state !== 'attacking') {
            this.state = 'hit';
            this.stateTimer = 180;
            this.vx = Math.cos(pushAngle) * 0.15;
            this.vy = Math.sin(pushAngle) * 0.15;
            
            audioController.playHit();
            particleSystem.spawnDigitalBleed(this.x, this.y, this.color, Math.cos(pushAngle), Math.sin(pushAngle));
        }

        return 'hit';
    }

    // Trigger stun manually due to a perfect player parry
    triggerParriedStun(audioController, particleSystem, canvasController) {
        this.state = 'stunned';
        this.stateTimer = 2000; // 2 seconds stun opening!
        this.posture = this.maxPostureVal; // Fill posture bar
        this.vx = 0;
        this.vy = 0;

        audioController.playParry();
        canvasController.shake(8, 250);
        particleSystem.spawnShockwave(this.x, this.y, '#ffffff', 80);
    }

    update(deltaTime, player, audioController, particleSystem, canvasController, canvasWidth, canvasHeight) {
        // Posture decay over time
        if (this.state !== 'hit' && this.state !== 'stunned') {
            this.posture = Math.max(0, this.posture - 0.015 * deltaTime);
        }

        // Handle states
        if (this.stateTimer > 0) {
            this.stateTimer -= deltaTime;
            
            if (this.state === 'charging') {
                // Focus on player location during charge
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                
                // Track telegraph progress
                const chargeDuration = this.getChargeDuration();
                this.telegraphProgress = Math.min(1, 1 - (this.stateTimer / chargeDuration));
                
                // Track parry window right before attack lands
                if (this.stateTimer <= this.parryFlashDuration) {
                    this.parryFlashTimer = this.stateTimer;
                }
            } else if (this.state === 'attacking') {
                // Execute charge movement
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                
                this.trailPoints.push({ x: this.x, y: this.y });
                if (this.trailPoints.length > 5) this.trailPoints.shift();
                
                if (this.trailPoints.length >= 2) {
                    particleSystem.addSwordTrail(this.trailPoints, this.color, 4);
                }
            } else if (this.state === 'hit' || this.state === 'stunned') {
                // Slow down from knockback
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
                this.vx *= Math.pow(0.92, deltaTime / 16);
                this.vy *= Math.pow(0.92, deltaTime / 16);
            }

            if (this.stateTimer <= 0) {
                if (this.state === 'charging') {
                    // Start actual attack phase!
                    this.state = 'attacking';
                    this.stateTimer = this.getAttackDuration();
                    
                    const attackAngle = Math.atan2(this.telegraphTargetY - this.y, this.telegraphTargetX - this.x);
                    const speed = this.getAttackSpeed();
                    this.vx = Math.cos(attackAngle) * speed;
                    this.vy = Math.sin(attackAngle) * speed;
                    this.angle = attackAngle;
                    
                    audioController.playSlash('katana');
                    this.trailPoints = [{ x: this.x, y: this.y }];
                    
                    // Reset flash trigger
                    this.parryFlashTimer = 0;
                } else {
                    // Attack or Stun done, back to idle
                    this.state = 'idle';
                    this.vx = 0;
                    this.vy = 0;
                    this.trailPoints = [];
                }
            }
        }

        // AI Decision Tree
        if (this.state === 'idle' || this.state === 'moving') {
            this.aiDecisionTimer -= deltaTime;
            
            // Re-aim at player
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            this.angle = Math.atan2(dy, dx);

            if (this.aiDecisionTimer <= 0) {
                this.chooseNextAction(dist, player, particleSystem, audioController);
            }

            // Perform movement
            if (this.state === 'moving') {
                this.x += this.vx * deltaTime;
                this.y += this.vy * deltaTime;
            }
        }

        // Keep inside bounds
        const margin = this.radius + 10;
        if (this.x < margin) { this.x = margin; this.vx = 0; }
        if (this.x > canvasWidth - margin) { this.x = canvasWidth - margin; this.vx = 0; }
        if (this.y < margin) { this.y = margin; this.vy = 0; }
        if (this.y > canvasHeight - margin) { this.y = canvasHeight - margin; this.vy = 0; }
    }

    getChargeDuration() {
        switch (this.behaviorType) {
            case 'heavy_unblockable': return 1200; // Heavy, long telegraph
            case 'agile_lunge': return 650;      // Fast telegraph
            case 'apex_boss': return 500;        // Extremely rapid reflex
            case 'teleporter': return 700;
            case 'balanced':
            default:
                return 800;
        }
    }

    getAttackDuration() {
        switch (this.behaviorType) {
            case 'heavy_unblockable': return 250;
            case 'agile_lunge': return 140;
            case 'balanced':
            default:
                return 180;
        }
    }

    getAttackSpeed() {
        switch (this.behaviorType) {
            case 'heavy_unblockable': return 0.55;
            case 'agile_lunge': return 1.35; // Lunges extremely fast
            case 'apex_boss': return 1.25;
            case 'balanced':
            default:
                return 0.85;
        }
    }

    chooseNextAction(dist, player, particleSystem, audioController) {
        this.aiDecisionTimer = Math.random() * 800 + 400; // Reset decision clock

        // 1. If too far, run closer
        if (dist > 300) {
            this.state = 'moving';
            const dx = player.x - this.x;
            const dy = player.y - this.y;
            this.vx = (dx / dist) * this.speed;
            this.vy = (dy / dist) * this.speed;
            return;
        }

        // 2. If at good striking distance, pick attack
        if (dist <= 250) {
            const roll = Math.random();

            if (roll < 0.55) {
                // Trigger Attack!
                this.state = 'charging';
                this.stateTimer = this.getChargeDuration();
                this.telegraphProgress = 0;
                
                // Define telegraph bounds
                this.telegraphTargetX = player.x;
                this.telegraphTargetY = player.y;

                if (this.behaviorType === 'heavy_unblockable') {
                    this.telegraphType = 'circle';
                    this.telegraphRange = 90; // Large slam radius
                } else if (this.behaviorType === 'agile_lunge') {
                    this.telegraphType = 'line';
                    this.telegraphWidth = 24;
                    this.telegraphRange = 320; // Long spear line
                } else {
                    this.telegraphType = 'line';
                    this.telegraphWidth = 35;
                    this.telegraphRange = 160;
                }
                
                this.vx = 0;
                this.vy = 0;
                
            } else if (roll < 0.75 && this.behaviorType === 'teleporter') {
                // Teleport behind player!
                const angle = Math.random() * Math.PI * 2;
                const tx = player.x + Math.cos(angle) * 120;
                const ty = player.y + Math.sin(angle) * 120;
                
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
                this.x = tx;
                this.y = ty;
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
                audioController.playDodge();
                
                // Face player instantly
                this.angle = Math.atan2(player.y - this.y, player.x - this.x);
                this.state = 'idle';
                
            } else {
                // Reposition (strafe sideways)
                this.state = 'moving';
                const angleOffset = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2;
                const strafeAngle = this.angle + angleOffset;
                
                this.vx = Math.cos(strafeAngle) * this.speed * 0.8;
                this.vy = Math.sin(strafeAngle) * this.speed * 0.8;
            }
        }
    }

    draw(ctx, canvasController) {
        ctx.save();

        // 1. Draw glowing telegraph ranges if charging
        if (this.state === 'charging') {
            this.drawTelegraph(ctx, canvasController);
        }

        // 2. Draw Enemy Body with Glow
        canvasController.setNeonGlow(this.color, 20);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3;
        ctx.fillStyle = '#140a0a';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // 3. Draw direction pointer
        canvasController.resetNeonGlow();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(this.x, this.y);
        ctx.lineTo(this.x + Math.cos(this.angle) * (this.radius + 5), this.y + Math.sin(this.angle) * (this.radius + 5));
        ctx.stroke();

        // 4. Draw weapon graphic depending on style
        this.drawWeaponGraphic(ctx, canvasController);

        // 5. Draw dizzy stars if stunned
        if (this.state === 'stunned') {
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

    drawTelegraph(ctx, canvasController) {
        ctx.save();
        
        // Define flashing color: Red changing to solid White during perfect parry window
        const isParryWindow = this.parryFlashTimer > 0;
        const color = isParryWindow ? '#ffffff' : this.color;
        
        ctx.globalAlpha = 0.2 + this.telegraphProgress * 0.35;
        if (isParryWindow) {
            ctx.globalAlpha = 0.8;
            canvasController.setNeonGlow('#ffffff', 20);
        } else {
            canvasController.setNeonGlow(this.color, 8);
        }

        if (this.telegraphType === 'line') {
            const angle = Math.atan2(this.telegraphTargetY - this.y, this.telegraphTargetX - this.x);
            const ex = this.x + Math.cos(angle) * this.telegraphRange;
            const ey = this.y + Math.sin(angle) * this.telegraphRange;
            
            // Draw line boundary
            ctx.strokeStyle = color;
            ctx.lineWidth = this.telegraphWidth;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(ex, ey);
            ctx.stroke();
            
            // Draw an overlay inner narrow solid line for emphasis
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(ex, ey);
            ctx.stroke();

        } else if (this.telegraphType === 'circle') {
            // Area Slam (unblockable warning)
            ctx.fillStyle = isParryWindow ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 153, 0, 0.2)';
            ctx.strokeStyle = isParryWindow ? '#ffffff' : '#ff9900';
            ctx.lineWidth = 2;
            
            // Draw expanding indicator circle
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.telegraphRange * this.telegraphProgress, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();
            
            // Draw maximum limit outer bounds
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.telegraphRange, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.restore();
    }

    drawWeaponGraphic(ctx, canvasController) {
        ctx.save();
        canvasController.setNeonGlow(this.color, 12);
        ctx.strokeStyle = this.color;
        ctx.lineWidth = 3.5;
        
        if (this.behaviorType === 'agile_lunge') {
            // Draw a heavy futuristic energy pole-arm/spear
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x + Math.cos(this.angle) * (this.radius + 24), this.y + Math.sin(this.angle) * (this.radius + 24));
            ctx.stroke();
            
            // Draw spear point
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            const px = this.x + Math.cos(this.angle) * (this.radius + 24);
            const py = this.y + Math.sin(this.angle) * (this.radius + 24);
            ctx.arc(px, py, 4, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.behaviorType === 'heavy_unblockable') {
            // Draw giant purple battle mace
            const shaftAngle = this.angle + Math.PI * 0.95;
            const shaftLength = this.radius + 18;
            const headX = this.x + Math.cos(shaftAngle) * shaftLength;
            const headY = this.y + Math.sin(shaftAngle) * shaftLength;
            
            // Shaft
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(headX, headY);
            ctx.stroke();
            
            // Spiked mace head
            ctx.strokeStyle = this.color;
            ctx.fillStyle = '#140024';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(headX, headY, 10, 0, Math.PI * 2);
            ctx.fill();
            ctx.stroke();

        } else {
            // Standard red cyber katana
            const katanaAngle = this.angle + Math.PI * 0.85;
            ctx.beginPath();
            ctx.moveTo(this.x + Math.cos(katanaAngle) * 5, this.y + Math.sin(katanaAngle) * 5);
            ctx.lineTo(this.x + Math.cos(katanaAngle) * (this.radius + 18), this.y + Math.sin(katanaAngle) * (this.radius + 18));
            ctx.stroke();
        }

        ctx.restore();
    }
}
