/* DANGEROUS FIGHT - LEVELS: every 50 waves a new level, up to level 1000 */
/* Level = which stretch of 50 waves you are on in matches against the
   computer. Each level makes the computer tougher and puts obstacles on the
   arena, more and nastier the higher it goes:
     - stone pillars (level 2+): samurai bounce off them, sword waves break
     - fire vents (level 4+): burst into flame now and then, burning whoever
       stands in them
     - rolling boulders (level 7+): rumble back and forth across a half and
       hurt whoever they run over
   The layout is always mirrored top/bottom so both sides are equally hard. */

export const WAVES_PER_LEVEL = 50;
export const MAX_LEVEL = 1000;

export function levelForWave(wave) {
    return Math.min(MAX_LEVEL, Math.floor((Math.max(1, wave) - 1) / WAVES_PER_LEVEL) + 1);
}

// Seeded random so a level always looks the same
function seeded(seed) {
    let s = (seed * 2654435761) >>> 0;
    return () => {
        s = (Math.imul(s ^ (s >>> 15), 2246822519) + 0x9e3779b9) >>> 0;
        return s / 4294967296;
    };
}

export class LevelArena {
    constructor(level, width, height) {
        this.level = Math.max(1, Math.min(MAX_LEVEL, level));
        this.width = width;
        this.height = height;
        this.pillars = [];
        this.vents = [];
        this.boulders = [];
        this.time = 0;
        this.build();
    }

    // How hard the computer is on this level (on top of Lätt/Normal/Svår)
    static aiBoost(level) {
        const k = Math.log2(Math.max(1, level)); // 1, 2, 4, 8 ... levels: +1 step each
        return {
            think: Math.max(0.45, 1 - 0.06 * k),   // decides faster
            force: Math.min(1.5, 1 + 0.04 * k),    // dashes harder
            hp: Math.min(3, 1 + 0.12 * k)          // tougher samurai and tower
        };
    }

    build() {
        const L = this.level;
        const W = this.width, H = this.height;
        const rnd = seeded(L * 7919 + 17);
        // Room on each half: between the charge zone (150 px) and the lava
        const yMin = 175, yMax = H / 2 - 70;
        if (yMax - yMin < 60) return; // tiny screen: no room for obstacles
        const narrow = W < 600; // a phone held upright: less room on each half
        const gap = narrow ? 28 : 50; // space kept free between obstacles

        // mirrored pairs: one on my half, the same spot mirrored on theirs
        const mirror = (x, y) => [[x, y], [W - x, H - y]];
        const place = (count, radius, list, make) => {
            let tries = 0;
            while (list.length < count * 2 && tries++ < 200) {
                const x = 60 + rnd() * (W - 120);
                const y = yMin + rnd() * (yMax - yMin);
                const pts = mirror(x, y);
                const clear = pts.every(([px, py]) =>
                    [...this.pillars, ...this.vents].every((o) => Math.hypot(o.x - px, o.y - py) > o.r + radius + gap) &&
                    Math.abs(px - W / 2) > 40); // keep the middle lane open
                if (!clear) continue;
                pts.forEach(([px, py]) => list.push(make(px, py)));
            }
        };

        if (L >= 2) {
            const n = Math.min(narrow ? 2 : 3, 1 + Math.floor(Math.log2(L)));
            place(n, 26, this.pillars, (x, y) => ({ x, y, r: 20 + rnd() * 10 }));
        }
        if (L >= 4) {
            const n = Math.min(narrow ? 2 : 3, Math.floor(Math.log2(L)) - 1);
            const dps = Math.min(60, 18 + 4 * Math.log2(L)); // HP per second while burning
            const often = Math.max(0.55, 1 - 0.045 * Math.log2(L)); // higher levels: fire more often
            place(n, 24, this.vents, (x, y) => ({ x, y, r: 24, period: (3200 + rnd() * 1600) * often, phase: rnd() * 4000, dps }));
        }
        if (L >= 7) {
            const n = Math.max(1, Math.min(2, Math.floor(Math.log2(L) / 3)));
            const speed = Math.min(0.32, 0.12 + 0.02 * Math.log2(L));
            for (let i = 0; i < n; i++) {
                const y = yMin + (i + 0.5) * (yMax - yMin) / n;
                const dmg = Math.min(45, 15 + 3 * Math.log2(L));
                this.boulders.push({ x: 60 + rnd() * (W - 120), y, r: 18, vx: speed * (rnd() < 0.5 ? -1 : 1), dmg, spin: 0 });
                this.boulders.push({ x: W - this.boulders[this.boulders.length - 1].x, y: H - y, r: 18, vx: -this.boulders[this.boulders.length - 1].vx, dmg, spin: 0 });
            }
        }
    }

    // The screen changed size (phone turned, window resized): lay the level
    // out again for the new size. Just scaling the old spots would push them
    // into the charge zones, the towers and the respawn spots (the charge
    // zone and the towers are fixed pixel sizes), e.g. when a phone is turned
    // from portrait to landscape. Same seed, so the same level look.
    resize(width, height) {
        this.width = width;
        this.height = height;
        this.pillars = [];
        this.vents = [];
        this.boulders = [];
        this.build();
    }

    get empty() { return !this.pillars.length && !this.vents.length && !this.boulders.length; }

    ventBurning(v) {
        const t = (this.time + v.phase) % v.period;
        return t < 1100; // the flame lasts a little over a second
    }

    update(dt, cars, game) {
        this.time += dt;
        const W = this.width;
        this.boulders.forEach((b) => {
            b.x += b.vx * dt;
            b.spin += b.vx * dt / b.r;
            if (b.x < 40 + b.r || b.x > W - 40 - b.r) {
                b.vx = -b.vx;
                b.x = Math.max(40 + b.r, Math.min(W - 40 - b.r, b.x));
            }
        });
        cars.forEach((c) => {
            if (!c || c.state === 'dead') return;
            const cr = c.radius || 30;
            // pillars: push out and bounce off
            this.pillars.forEach((p) => {
                const dx = c.x - p.x, dy = c.y - p.y, d = Math.hypot(dx, dy) || 1;
                const min = p.r + cr * 0.8;
                if (d < min) {
                    const nx = dx / d, ny = dy / d;
                    c.x = p.x + nx * min;
                    c.y = p.y + ny * min;
                    const vn = c.vx * nx + c.vy * ny;
                    if (vn < 0) {
                        c.vx -= 1.6 * vn * nx;
                        c.vy -= 1.6 * vn * ny;
                        if (Math.abs(vn) > 0.25 && game) {
                            game.particles.spawnStoneChips(p.x + nx * p.r, p.y + ny * p.r, 4, nx, ny);
                            game.audioSynth.playHit();
                        }
                    }
                }
            });
            // fire vents: burn while the flame is up
            this.vents.forEach((v) => {
                if (!this.ventBurning(v)) return;
                if (Math.hypot(c.x - v.x, c.y - v.y) < v.r + cr * 0.5) {
                    c.hp = Math.max(0, c.hp - v.dps * dt / 1000);
                    c.burnFx = (c.burnFx || 0) + dt;
                    if (c.burnFx > 180 && game) {
                        c.burnFx = 0;
                        game.particles.spawnDamageEmbers(c.x, c.y, '#ff7a00');
                    }
                    // (selfInflicted: the arena did it, not the player's perks / raseri)
                    if (c.hp <= 0 && game) c.takeDamage(1, c.x, c.y, game.particles, game.canvasCtrl, true);
                }
            });
            // boulders: run you over
            this.boulders.forEach((b) => {
                const dx = c.x - b.x, dy = c.y - b.y, d = Math.hypot(dx, dy) || 1;
                if (d < b.r + cr * 0.8) {
                    const hitCooldown = c.boulderHitAt && this.time - c.boulderHitAt < 800;
                    c.vx += (dx / d) * 0.6 + b.vx * 1.5;
                    c.vy += (dy / d) * 0.6;
                    if (!hitCooldown && game) {
                        c.boulderHitAt = this.time;
                        // a boulder is the arena, not the player: no perk / raseri
                        // multipliers on the computer's samurai
                        c.takeDamage(b.dmg, b.x, b.y, game.particles, game.canvasCtrl, true);
                        game.canvasCtrl.shake(6, 200);
                    }
                }
            });
        });
    }

    // A sword wave that hits a pillar or boulder breaks on it
    blocksShot(p) {
        return this.pillars.some((o) => Math.hypot(p.x - o.x, p.y - o.y) < o.r + (p.radius || 6)) ||
            this.boulders.some((o) => Math.hypot(p.x - o.x, p.y - o.y) < o.r + (p.radius || 6));
    }

    draw(ctx) {
        const t = this.time;
        // Fire vents: a scorched grate that glows, then bursts into flame
        this.vents.forEach((v) => {
            ctx.save();
            ctx.fillStyle = '#16100d';
            ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2); ctx.fill();
            // a glowing ember rim so you always see where the vent is
            ctx.strokeStyle = 'rgba(255, 110, 20, 0.75)';
            ctx.lineWidth = 3;
            ctx.beginPath(); ctx.arc(v.x, v.y, v.r, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(255, 90, 0, 0.25)';
            ctx.lineWidth = 7;
            ctx.beginPath(); ctx.arc(v.x, v.y, v.r + 3, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.lineWidth = 3;
            for (let k = -1; k <= 1; k++) {
                ctx.beginPath(); ctx.moveTo(v.x - v.r * 0.7, v.y + k * v.r * 0.45); ctx.lineTo(v.x + v.r * 0.7, v.y + k * v.r * 0.45); ctx.stroke();
            }
            const phase = ((t + v.phase) % v.period) / v.period;
            const burning = this.ventBurning(v);
            const warn = !burning && phase > 0.8; // glows before it fires
            if (burning || warn) {
                ctx.globalCompositeOperation = 'lighter';
                const flick = 0.8 + 0.2 * Math.sin(t / 40 + v.phase);
                const r = burning ? v.r * (1.8 + 0.3 * Math.sin(t / 60)) : v.r * 1.1;
                const g = ctx.createRadialGradient(v.x, v.y, 0, v.x, v.y, r);
                g.addColorStop(0, burning ? `rgba(255, 230, 120, ${0.9 * flick})` : 'rgba(255, 90, 0, 0.35)');
                g.addColorStop(0.5, burning ? `rgba(255, 110, 0, ${0.7 * flick})` : 'rgba(255, 60, 0, 0.15)');
                g.addColorStop(1, 'rgba(255, 40, 0, 0)');
                ctx.fillStyle = g;
                ctx.fillRect(v.x - r, v.y - r, r * 2, r * 2);
            }
            ctx.restore();
        });
        // Stone pillars: seen from above, a round block with a lit top
        this.pillars.forEach((p) => {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath(); ctx.ellipse(p.x + 5, p.y + 7, p.r * 1.05, p.r * 0.95, 0, 0, Math.PI * 2); ctx.fill();
            const g = ctx.createRadialGradient(p.x - p.r * 0.35, p.y - p.r * 0.4, p.r * 0.1, p.x, p.y, p.r);
            g.addColorStop(0, '#b3aa9e');
            g.addColorStop(0.65, '#6b635a');
            g.addColorStop(1, '#3a342f');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
            // lava light from below on the rim, and a clear edge
            ctx.strokeStyle = 'rgba(255, 150, 60, 0.55)';
            ctx.lineWidth = 2.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r - 1, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(p.x, p.y, p.r + 1, 0, Math.PI * 2); ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.moveTo(p.x - p.r * 0.95, p.y + p.r * 0.1);
            ctx.lineTo(p.x - p.r * 0.55, p.y + p.r * 0.05);
            ctx.lineTo(p.x - p.r * 0.35, p.y + p.r * 0.3);
            ctx.lineTo(p.x - p.r * 0.05, p.y + p.r * 0.22);
            ctx.lineTo(p.x + p.r * 0.2, p.y + p.r * 0.45);
            ctx.stroke();
            ctx.restore();
        });
        // Boulders: a rolling rock with a dust shadow
        this.boulders.forEach((b) => {
            ctx.save();
            ctx.fillStyle = 'rgba(0, 0, 0, 0.45)';
            ctx.beginPath(); ctx.ellipse(b.x + 4, b.y + 6, b.r, b.r * 0.8, 0, 0, Math.PI * 2); ctx.fill();
            ctx.translate(b.x, b.y);
            ctx.rotate(b.spin);
            const g = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, 2, 0, 0, b.r);
            g.addColorStop(0, '#c2a98a');
            g.addColorStop(1, '#4a3e33');
            ctx.fillStyle = g;
            ctx.beginPath();
            for (let k = 0; k < 9; k++) {
                const a = (k / 9) * Math.PI * 2, rr = b.r * (0.85 + 0.15 * Math.sin(k * 2.3));
                if (k === 0) ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); else ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
            }
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = 'rgba(255, 170, 80, 0.6)';
            ctx.lineWidth = 2;
            ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.beginPath(); ctx.moveTo(-b.r * 0.5, 0); ctx.lineTo(b.r * 0.3, b.r * 0.2); ctx.stroke();
            ctx.restore();
        });
    }
}
