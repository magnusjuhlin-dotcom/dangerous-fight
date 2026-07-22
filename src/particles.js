/* DANGEROUS FIGHT - HIGH-PERFORMANCE NEON PARTICLE CONTROLLER */

class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, type = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life; // Remaining time in ms
        this.decay = decay; // Subtracted from life per ms
        this.type = type; // 'spark', 'dust', 'block', 'ring'
        this.alpha = 1;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.01;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.alpha = Math.max(0, this.life / this.maxLife);
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        if (this.type === 'spark') {
            // Slight gravity for sparks
            this.vy += 0.0003 * deltaTime;
            this.vx *= Math.pow(0.99, deltaTime / 16);
        } else if (this.type === 'block') {
            // High drag for debris blocks
            this.vx *= Math.pow(0.95, deltaTime / 16);
            this.vy *= Math.pow(0.95, deltaTime / 16);
            this.angle += this.rotSpeed * deltaTime;
        } else if (this.type === 'ring') {
            // Expansion
            this.size += 0.15 * deltaTime;
        }
        
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark') {
            // Draw glowing laser line
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 15, this.y - this.vy * 15);
            ctx.stroke();
            
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
            ctx.shadowBlur = 15;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
        }
        
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
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => p.update(deltaTime));
        this.trails = this.trails.filter(t => t.update(deltaTime));
    }

    draw(ctx) {
        // Draw trails first so they render under particles
        this.trails.forEach(t => t.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
        this.trails = [];
    }

    // Add glowing ambient background dust particles
    spawnAmbience(width, height, count = 1) {
        if (this.particles.length > 150) return; // Prevent performance drops
        
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

    // Sword clash spark shower
    spawnClashSparks(x, y, color) {
        const count = Math.floor(Math.random() * 20) + 25; // increased spark count
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.55 + 0.20; // wider velocity spread
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 2.5 + 1.5;
            const life = Math.random() * 400 + 250; // longer lifespan
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'spark'));
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
