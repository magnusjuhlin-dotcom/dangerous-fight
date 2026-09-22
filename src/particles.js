/* DANGEROUS FIGHT - HIGH-PERFORMANCE NEON & REALISTIC PHYSICS PARTICLE CONTROLLER */

class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, type = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.baseColor = color;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life; // Remaining time in ms
        this.decay = decay; // Subtracted from life per ms
        this.type = type; // 'spark', 'dust', 'block', 'ring', 'ember', 'smoke', 'lava_drop', 'metal_shard'
        this.alpha = 1;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
        this.bounces = 0;
        this.maxBounces = 2;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        const progress = Math.max(0, this.life / this.maxLife); // 1.0 (new) to 0.0 (dead)
        this.alpha = progress;
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        if (this.type === 'spark') {
            // Realistic gravity and air drag for sparks
            this.vy += 0.00040 * deltaTime;
            this.vx *= Math.pow(0.982, deltaTime / 16);
            this.vy *= Math.pow(0.982, deltaTime / 16);
            
            // Thermal cooling color transition: White-hot -> Yellow -> Fiery Orange -> Deep Red
            if (progress > 0.75) {
                this.color = '#ffffff';
            } else if (progress > 0.45) {
                this.color = '#ffdd44';
            } else if (progress > 0.2) {
                this.color = '#ff5500';
            } else {
                this.color = '#aa1100';
            }
        } else if (this.type === 'lava_drop') {
            // High gravity & drag for molten viscous lava droplets
            this.vy += 0.00055 * deltaTime;
            this.vx *= Math.pow(0.975, deltaTime / 16);
            this.vy *= Math.pow(0.975, deltaTime / 16);
            
            // Thermal cooling
            if (progress > 0.6) {
                this.color = '#fff3c4';
            } else if (progress > 0.3) {
                this.color = '#ff6600';
            } else {
                this.color = '#660b00';
            }
        } else if (this.type === 'metal_shard') {
            // Heavy physics shard with tumbling
            this.vy += 0.0005 * deltaTime;
            this.vx *= Math.pow(0.96, deltaTime / 16);
            this.vy *= Math.pow(0.96, deltaTime / 16);
            this.angle += this.rotSpeed * deltaTime;
        } else if (this.type === 'block') {
            // High drag for debris blocks
            this.vx *= Math.pow(0.95, deltaTime / 16);
            this.vy *= Math.pow(0.95, deltaTime / 16);
            this.angle += this.rotSpeed * deltaTime;
        } else if (this.type === 'ring') {
            // Expansion
            this.size += 0.18 * deltaTime;
        } else if (this.type === 'smoke') {
            // Rising volumetric smoke expanding over time
            this.vy -= 0.00018 * deltaTime;
            this.vx += (Math.random() - 0.5) * 0.00025 * deltaTime;
            this.size += 0.025 * deltaTime;
        } else if (this.type === 'ember') {
            // Hot thermal buoyancy
            this.vy -= 0.00035 * deltaTime;
            this.vx += Math.sin(this.life * 0.02) * 0.0006 * deltaTime;
        }
        
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark') {
            // Draw glowing realistic streak
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 16, this.y - this.vy * 16);
            ctx.stroke();
            
            // Core hot white center
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, this.size * 0.4);
            ctx.stroke();
            
        } else if (this.type === 'lava_drop') {
            // Molten lava tear/droplet
            ctx.shadowColor = '#ff5500';
            ctx.shadowBlur = 14;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Searing core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.size * 0.4), 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'metal_shard') {
            // Angular jagged metal piece
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.baseColor;
            ctx.shadowColor = this.baseColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(-this.size, -this.size * 0.5);
            ctx.lineTo(this.size, -this.size * 0.2);
            ctx.lineTo(this.size * 0.5, this.size * 0.7);
            ctx.closePath();
            ctx.fill();

        } else if (this.type === 'block') {
            // Draw rotating digital glowing block
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = this.color;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            
        } else if (this.type === 'dust') {
            // Gentle ambient circles
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (this.type === 'ring') {
            // Shockwave ring
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 18;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();

        } else if (this.type === 'smoke') {
            // Volumetric dark smoke cloud
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            grad.addColorStop(0, 'rgba(35, 30, 30, 0.45)');
            grad.addColorStop(0.6, 'rgba(20, 15, 15, 0.25)');
            grad.addColorStop(1, 'rgba(10, 10, 15, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'ember') {
            // Intense glowing ember dot
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Realistic Ground Decal (Scorch marks, oil splatters, tire skid marks)
class Decal {
    constructor(x, y, radius, color = 'rgba(0,0,0,0.6)', type = 'scorch', angle = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.type = type; // 'scorch', 'skid'
        this.angle = angle;
        this.maxLife = 12000; // 12 seconds persistence on arena floor
        this.life = this.maxLife;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        const alpha = Math.min(1.0, (this.life / this.maxLife) * 1.5);
        ctx.globalAlpha = alpha * 0.45;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'scorch') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, 'rgba(15, 15, 20, 0.95)');
            grad.addColorStop(0.5, 'rgba(255, 60, 0, 0.25)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'skid') {
            ctx.fillStyle = 'rgba(10, 10, 15, 0.7)';
            ctx.fillRect(-this.radius, -3, this.radius * 2, 6);
        }

        ctx.restore();
    }
}

// Floating Physical Damage Popup Text (-25, CRIT! -200, PARRY!)
class DamageText {
    constructor(x, y, text, color = '#ff0055', scale = 1.0) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.08;
        this.vy = -(Math.random() * 0.15 + 0.12);
        this.text = text;
        this.color = color;
        this.scale = scale;
        this.maxLife = 750;
        this.life = this.maxLife;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += 0.0003 * deltaTime; // gravity arc
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        const progress = 1 - (this.life / this.maxLife);
        const alpha = Math.max(0, 1 - Math.pow(progress, 3));
        const currentScale = (1 + Math.sin(progress * Math.PI) * 0.4) * this.scale;

        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(currentScale, currentScale);

        ctx.font = '900 18px "Orbitron", sans-serif';
        ctx.textAlign = 'center';

        // Outer Glow + Dark Stroke
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, 0, 0);

        // Core Glowing Text
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);

        // Hot white core
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.text, 0, 0);

        ctx.restore();
    }
}

// Draw static trails that fade out separately for optimal performance
class SwordTrail {
    constructor(points, color, width, life = 180) {
        this.points = points; // Array of {x, y}
        this.color = color;
        this.width = width;
        this.maxLife = life;
        this.life = life;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }

    draw(ctx) {
        if (this.points.length < 2) return;
        
        ctx.save();
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();
        
        ctx.restore();
    }
}

export class ParticleSystem {
    constructor() {
        this.particles = [];
        this.trails = [];
        this.decals = [];
        this.damageTexts = [];
    }

    update(deltaTime) {
        this.decals = this.decals.filter(d => d.update(deltaTime));
        this.particles = this.particles.filter(p => p.update(deltaTime));
        this.trails = this.trails.filter(t => t.update(deltaTime));
        this.damageTexts = this.damageTexts.filter(dt => dt.update(deltaTime));
    }

    draw(ctx) {
        // 1. Draw decals on ground first
        this.decals.forEach(d => d.draw(ctx));
        // 2. Draw sword trails
        this.trails.forEach(t => t.draw(ctx));
        // 3. Draw particles
        this.particles.forEach(p => p.draw(ctx));
        // 4. Draw damage text popups on top
        this.damageTexts.forEach(dt => dt.draw(ctx));
    }

    clear() {
        this.particles = [];
        this.trails = [];
        this.decals = [];
        this.damageTexts = [];
    }

    // Add ground scorch or skid mark
    addDecal(x, y, radius, color = 'rgba(0,0,0,0.6)', type = 'scorch', angle = 0) {
        if (this.decals.length > 50) this.decals.shift();
        this.decals.push(new Decal(x, y, radius, color, type, angle));
    }

    // Add physical floating 3D popup damage text
    spawnDamageText(x, y, text, color = '#ff0055', scale = 1.0) {
        this.damageTexts.push(new DamageText(x, y, text, color, scale));
    }

    // Add glowing ambient background dust particles
    spawnAmbience(width, height, count = 1) {
        if (this.particles.length > 180) return; // Prevent performance drops
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.5 + 0.5;
            const vy = -(Math.random() * 0.01 + 0.005); // Float upwards slowly
            const vx = (Math.random() - 0.5) * 0.005;
            
            const color = Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 0, 119, 0.15)';
            const life = Math.random() * 6000 + 4000;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'dust'));
        }
    }

    // Sword clash spark shower with realistic temperature color
    spawnClashSparks(x, y, color) {
        const count = Math.floor(Math.random() * 15) + 25; // increased spark count
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.55 + 0.18; // wider velocity spread
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 2.2 + 1.2;
            const life = Math.random() * 450 + 220; // longer lifespan
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'spark'));
        }

        // Add a few flying metal shards on heavy clash
        this.spawnMetalShards(x, y, color, 4);
    }

    // Realistic jagged metallic shards from armor/weapon impacts
    spawnMetalShards(x, y, color = '#ffffff', count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.35 + 0.12;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 0.15; // upward kick
            const size = Math.random() * 3.5 + 2.0;
            const life = Math.random() * 500 + 400;
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'metal_shard'));
        }
    }

    // Realistic volcanic magma burst from popping lava bubbles
    spawnLavaBurst(x, y) {
        const count = Math.floor(Math.random() * 6) + 6;
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8; // spray upwards
            const speed = Math.random() * 0.35 + 0.12;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 3.2 + 1.8;
            const life = Math.random() * 550 + 350;
            this.particles.push(new Particle(x, y, vx, vy, '#ff5500', size, life, 1, 'lava_drop'));
        }

        // Add rising smoke and hot embers
        for (let i = 0; i < 3; i++) {
            const vx = (Math.random() - 0.5) * 0.04;
            const vy = -(Math.random() * 0.08 + 0.03);
            this.particles.push(new Particle(x, y, vx, vy, '#ffaa00', Math.random() * 2.5 + 1.5, 450, 1, 'ember'));
            this.particles.push(new Particle(x, y, vx * 0.5, vy * 0.6, 'rgba(30,20,20,0.4)', Math.random() * 10 + 6, 750, 1, 'smoke'));
        }
    }

    // Viscous magma splash when vehicles enter or plow through the lava
    spawnLavaSplash(x, y, dirX = 0, dirY = -1) {
        const count = Math.floor(Math.random() * 12) + 14;
        const baseAngle = Math.atan2(dirY, dirX);

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * 1.6;
            const speed = Math.random() * 0.45 + 0.15;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 0.1;
            const size = Math.random() * 4.0 + 2.0;
            const life = Math.random() * 650 + 400;
            this.particles.push(new Particle(x, y, vx, vy, '#ff6600', size, life, 1, 'lava_drop'));
        }

        // Heavy dark smoke cloud
        for (let i = 0; i < 5; i++) {
            const vx = (Math.random() - 0.5) * 0.06;
            const vy = -(Math.random() * 0.07 + 0.03);
            this.particles.push(new Particle(x, y, vx, vy, 'rgba(25,18,18,0.5)', Math.random() * 16 + 10, 900, 1, 'smoke'));
        }
    }

    // Spawn damage embers and smoke for low-HP damaged vehicles/towers
    spawnDamageEmbers(x, y, color) {
        if (Math.random() < 0.4) {
            const vx = (Math.random() - 0.5) * 0.05;
            const vy = -(Math.random() * 0.08 + 0.02);
            this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 3 + 1.5, 400, 1, 'ember'));
        }
        if (Math.random() < 0.3) {
            const vx = (Math.random() - 0.5) * 0.03;
            const vy = -(Math.random() * 0.04 + 0.01);
            this.particles.push(new Particle(x, y, vx, vy, 'rgba(40,40,50,0.5)', Math.random() * 12 + 6, 800, 1, 'smoke'));
        }
    }

    // Exploding digital glitch blocks upon damage
    spawnDigitalBleed(x, y, color, impactDirX = 0, impactDirY = 0) {
        const count = Math.floor(Math.random() * 8) + 10;
        
        for (let i = 0; i < count; i++) {
            // Blast direction biased towards impact direction
            const angle = Math.atan2(impactDirY, impactDirX) + (Math.random() - 0.5) * 1.5;
            const speed = Math.random() * 0.35 + 0.1;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            const size = Math.random() * 6 + 4; // Fyrkantiga blocks
            const life = Math.random() * 400 + 300;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'block'));
        }
    }

    // Expanding action wave (dash ripple / shield break)
    spawnShockwave(x, y, color, maxRadius = 80) {
        const life = 350; // Milliseconds
        const decay = 1;
        this.particles.push(new Particle(x, y, 0, 0, color, 10, life, decay, 'ring'));
    }

    // Add blade sword trail lines
    addSwordTrail(points, color, width = 6) {
        // Deep copy of points so entity movement doesn't alter past trail points
        const pointsCopy = points.map(p => ({ x: p.x, y: p.y }));
        this.trails.push(new SwordTrail(pointsCopy, color, width));
    }
}
