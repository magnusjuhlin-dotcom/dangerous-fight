/* DANGEROUS FIGHT - HIGH-PERFORMANCE 2D NEON CANVAS CONTROLLER */

// ---- Procedural noise for the stone surface and the lava ----
// Value noise on an integer lattice. The lattice wraps every `period` cells
// in x, so a texture built from it tiles seamlessly from left to right.
function latticeHash(ix, iy, seed) {
    let h = (Math.imul(ix, 374761393) + Math.imul(iy, 668265263) + Math.imul(seed, 1442695041)) | 0;
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}

function valueNoise(x, y, period, seed) {
    const x0 = Math.floor(x), y0 = Math.floor(y);
    const fx = x - x0, fy = y - y0;
    const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
    const px0 = ((x0 % period) + period) % period;
    const px1 = (px0 + 1) % period;
    const a = latticeHash(px0, y0, seed), b = latticeHash(px1, y0, seed);
    const c = latticeHash(px0, y0 + 1, seed), d = latticeHash(px1, y0 + 1, seed);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
}

// Fractal noise: octaves of value noise, each twice as fine and half as strong
function fbm(x, y, period, seed, octaves) {
    let sum = 0, amp = 0.5, f = 1, norm = 0;
    for (let o = 0; o < octaves; o++) {
        sum += amp * valueNoise(x * f, y * f, period * f, seed + o * 17);
        norm += amp;
        amp *= 0.5;
        f *= 2;
    }
    return sum / norm;
}

const smoothstep = (a, b, x) => {
    const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
    return t * t * (3 - 2 * t);
};

export class CanvasController {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Logical bounds for positioning elements independently of display resolution
        this.width = 800;
        this.height = 600;
        // Zooming out makes the arena bigger in world units without changing
        // the window: 1 = normal, 0.75 = a third more room (3v3, 4v4).
        this.worldScale = 1;
        
        // Screen Shake variables
        this.shakeTime = 0;
        this.shakeDuration = 0;
        this.shakeIntensity = 0;
        this.shakeX = 0;
        this.shakeY = 0;
        
        // Grid Parallax & Screen Flash variables
        this.gridOffsetX = 0;
        this.gridOffsetY = 0;
        this.flashTime = 0;
        this.flashMaxTime = 0;
        this.flashColor = '#ffffff';
        this.floorPulses = [];

        // Pre-load high-res Mecha Shogun character sprites
        this.playerSpriteImg = new Image();
        this.playerSpriteImg.src = 'assets/player_mecha.jpg';
        this.playerSpriteCanvas = null;
        this.playerSpriteImg.onload = () => {
            this.playerSpriteCanvas = this.createTransparentSprite(this.playerSpriteImg);
        };

        this.enemySpriteImg = new Image();
        this.enemySpriteImg.src = 'assets/enemy_mecha.jpg';
        this.enemySpriteCanvas = null;
        this.enemySpriteImg.onload = () => {
            this.enemySpriteCanvas = this.createTransparentSprite(this.enemySpriteImg);
        };
        
        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    // Adapt canvas resolution to screen size and high pixel density (Retina/OLED)
    // Bigger team = bigger arena. Redraws the floor at the new size.
    setWorldScale(scale) {
        const next = Math.max(0.5, Math.min(1, scale));
        if (Math.abs(next - this.worldScale) < 0.001) return;
        this.worldScale = next;
        this.resize();
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Base resolution scaling factor (maintain aspect ratio 4:3 internally)
        this.width = rect.width / this.worldScale;
        this.height = rect.height / this.worldScale;
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;

        // World units -> device pixels (setting canvas.width reset the matrix)
        this.ctx.scale(dpr * this.worldScale, dpr * this.worldScale);
        
        // Match CSS display size
        this.canvas.style.width = `${this.width * this.worldScale}px`;
        this.canvas.style.height = `${this.height * this.worldScale}px`;
    }

    // Trigger screen-shake effect
    shake(intensity = 8, duration = 300) {
        this.shakeIntensity = intensity;
        this.shakeDuration = duration;
        this.shakeTime = duration;
    }

    // Update screen shake offsets, grid scrolling, and screen flash timers
    update(deltaTime, player = null) {
        if (this.shakeTime > 0) {
            this.shakeTime -= deltaTime;
            
            // Fade out the intensity as shake completes
            const currentIntensity = (this.shakeTime / this.shakeDuration) * this.shakeIntensity;
            this.shakeX = (Math.random() - 0.5) * 2 * currentIntensity;
            this.shakeY = (Math.random() - 0.5) * 2 * currentIntensity;
        } else {
            this.shakeX = 0;
            this.shakeY = 0;
        }

        // Scroll the grid based on time and player velocity
        let speedX = 0;
        let speedY = 0.015; // slow ambient downward drift
        
        if (player && player.state !== 'dead') {
            // Parallax scroll opposite to player's movement
            speedX = player.vx * 0.12;
            speedY += player.vy * 0.12;
        }
        
        this.gridOffsetX = (this.gridOffsetX - speedX * deltaTime) % 240;
        this.gridOffsetY = (this.gridOffsetY - speedY * deltaTime) % 240;

        // Fade active screen flashes
        if (this.flashTime > 0) {
            this.flashTime = Math.max(0, this.flashTime - deltaTime);
        }

        // Update active floor shockwave pulses
        if (this.floorPulses && this.floorPulses.length > 0) {
            for (let i = this.floorPulses.length - 1; i >= 0; i--) {
                const p = this.floorPulses[i];
                p.life -= deltaTime * 0.002;
                p.radius += (p.maxRadius - p.radius) * 0.12;
                if (p.life <= 0) {
                    this.floorPulses.splice(i, 1);
                }
            }
        }
    }

    addFloorPulse(x, y, color = '#00f0ff', maxRadius = 160) {
        if (!this.floorPulses) this.floorPulses = [];
        this.floorPulses.push({
            x, y, color,
            radius: 10,
            maxRadius: maxRadius,
            life: 1.0,
            maxLife: 1.0
        });
    }

    // Apply screen shake to context matrix
    applyTransformations() {
        this.ctx.save();
        if (this.shakeX !== 0 || this.shakeY !== 0) {
            this.ctx.translate(this.shakeX, this.shakeY);
        }
    }

    // Restore context after rendering
    restoreTransformations() {
        this.ctx.restore();
    }

    // Trigger screen-flash effect
    flash(color, duration) {
        this.flashColor = color;
        this.flashTime = duration;
        this.flashMaxTime = duration;
    }

    // Clear screen with custom background trails (creates amazing motion blur)
    // Generate the arena floor: irregular basalt flagstones with chiseled bevels,
    // engraved neon circuit-runes, lava-lit cracks toward the centre and carved
    // fortress walls. Rendered once at native resolution and cached; it is
    // regenerated when the canvas size changes so it never looks stretched.
    initStoneArena() {
        const W = Math.max(1, Math.round(this.width));
        const H = Math.max(1, Math.round(this.height));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);

        this.stoneCanvas = document.createElement('canvas');
        this.stoneCanvas.width = W * dpr;
        this.stoneCanvas.height = H * dpr;
        this.stoneSize = { w: W, h: H };
        const c = this.stoneCanvas.getContext('2d');
        c.scale(dpr, dpr);

        // Seeded random for a stable texture between frames/resizes
        // (every level has its own floor: floorVariant is the level number)
        let seed = 20240917 + (this.floorVariant || 0) * 7919;
        this.stoneVariant = this.floorVariant || 0;
        const rnd = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
        const between = (a, b) => a + rnd() * (b - a);

        const lavaY = H / 2;
        const heat = (y) => Math.max(0, 1 - Math.abs(y - lavaY) / 150); // 1 at the lava, 0 far away

        // 1. Deep basalt bed
        c.fillStyle = '#0b0d12';
        c.fillRect(0, 0, W, H);

        // 2. Ancient flagstone courses: centuries-old slabs with rounded, chipped
        //    edges, pitting, moss in the joints, broken and missing stones, and
        //    engravings worn almost smooth.
        const wallThick = 18;
        const gap = 4;
        // Sandy mortar showing through the joints
        c.fillStyle = '#17161a';
        c.fillRect(0, 0, W, H);
        for (let k = 0; k < 400; k++) {
            c.fillStyle = rnd() > 0.5 ? 'rgba(90, 80, 60, 0.10)' : 'rgba(0, 0, 0, 0.35)';
            c.fillRect(rnd() * W, rnd() * H, between(2, 9), between(1, 3));
        }

        // Irregular flagstones: a Voronoi pattern from jittered points, so every
        // stone has its own shape and size, like a real old stone floor.
        const cellW = 60, cellH = 52;
        const sites = [];
        for (let gy = -1; gy * cellH < H + cellH; gy++) {
            for (let gx = -1; gx * cellW < W + cellW; gx++) {
                const ox = (gy % 2 ? cellW * 0.5 : 0);
                sites.push([gx * cellW + ox + between(-0.38, 0.38) * cellW, gy * cellH + between(-0.38, 0.38) * cellH]);
            }
        }
        // Keep the side of the line a*x + b*y <= c (Sutherland-Hodgman)
        const clipHalf = (poly, A, B, C) => {
            const out = [];
            for (let i = 0; i < poly.length; i++) {
                const p = poly[i], q = poly[(i + 1) % poly.length];
                const dp = A * p[0] + B * p[1] - C, dq = A * q[0] + B * q[1] - C;
                if (dp <= 0) out.push(p);
                if ((dp < 0) !== (dq < 0)) {
                    const f = dp / (dp - dq);
                    out.push([p[0] + (q[0] - p[0]) * f, p[1] + (q[1] - p[1]) * f]);
                }
            }
            return out;
        };
        const reach = Math.max(cellW, cellH) * 2.2;
        const cells = sites.map(([px, py]) => {
            let poly = [[px - reach, py - reach], [px + reach, py - reach], [px + reach, py + reach], [px - reach, py + reach]];
            for (const [qx, qy] of sites) {
                if (qx === px && qy === py) continue;
                if (Math.abs(qx - px) > reach || Math.abs(qy - py) > reach) continue;
                // closer to p than to q
                poly = clipHalf(poly, qx - px, qy - py, (qx * qx + qy * qy - px * px - py * py) / 2);
                if (poly.length < 3) break;
            }
            return poly;
        });

        // Shrink toward the middle for the mortar joint, then roughen every edge
        // so no joint is a straight line
        const stoneOutline = (poly) => {
            const cx = poly.reduce((t, p) => t + p[0], 0) / poly.length;
            const cy = poly.reduce((t, p) => t + p[1], 0) / poly.length;
            const inset = poly.map(([x, y]) => {
                const dx = x - cx, dy = y - cy, d = Math.hypot(dx, dy) || 1;
                const k = Math.max(0.2, (d - gap * 0.8 - between(0, 1.5)) / d);
                return [cx + dx * k, cy + dy * k];
            });
            const rough = [];
            for (let i = 0; i < inset.length; i++) {
                const p = inset[i], q = inset[(i + 1) % inset.length];
                const len = Math.hypot(q[0] - p[0], q[1] - p[1]);
                const n = Math.max(1, Math.ceil(len / 7));
                const nx = -(q[1] - p[1]) / (len || 1), ny = (q[0] - p[0]) / (len || 1);
                for (let k = 0; k < n; k++) {
                    const f = k / n;
                    const jit = k === 0 ? between(-0.8, 0.8) : between(-2.6, 2.6);
                    rough.push([p[0] + (q[0] - p[0]) * f + nx * jit, p[1] + (q[1] - p[1]) * f + ny * jit]);
                }
            }
            return { pts: rough, cx, cy };
        };
        const tracePoly = (pts, ox = 0, oy = 0) => {
            c.beginPath();
            pts.forEach(([x, y], i) => (i === 0 ? c.moveTo(x + ox, y + oy) : c.lineTo(x + ox, y + oy)));
            c.closePath();
        };
        // A point on the outline, roughly at the given angle from the middle
        const edgePoint = (st, ang) => {
            let best = st.pts[0], bestD = Infinity;
            st.pts.forEach((p) => {
                const a2 = Math.atan2(p[1] - st.cy, p[0] - st.cx);
                const d = Math.abs(Math.atan2(Math.sin(a2 - ang), Math.cos(a2 - ang)));
                if (d < bestD) { bestD = d; best = p; }
            });
            // a little inside the edge so the crack starts at the joint
            return [st.cx + (best[0] - st.cx) * 0.97, st.cy + (best[1] - st.cy) * 0.97];
        };
        // A jagged crack line from a to b
        const crackPath = (a, b, jag) => {
            const pts = [a];
            const n = 5 + Math.floor(rnd() * 4);
            const len = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
            const nx = -(b[1] - a[1]) / len, ny = (b[0] - a[0]) / len;
            for (let k = 1; k < n; k++) {
                const f = k / n, off = between(-jag, jag);
                pts.push([a[0] + (b[0] - a[0]) * f + nx * off, a[1] + (b[1] - a[1]) * f + ny * off]);
            }
            pts.push(b);
            return pts;
        };

        cells.forEach((cell) => {
            if (cell.length < 3) return;
            const st = stoneOutline(cell);
            const pts = st.pts;
            const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
            const sx = Math.min(...xs), sy = Math.min(...ys);
            const sw = Math.max(...xs) - sx, sh = Math.max(...ys) - sy;
            const cx = st.cx, cy = st.cy;
            if (sx > W || sy > H || sx + sw < 0 || sy + sh < 0) return;
            const h = heat(cy);

            // Some stones are gone entirely: rubble and packed earth remain
            if (rnd() < 0.045) {
                c.fillStyle = '#121014';
                tracePoly(pts); c.fill();
                for (let k = 0; k < 9; k++) {
                    const gr = between(2, 6);
                    c.fillStyle = `rgba(${Math.round(between(40, 70))}, ${Math.round(between(36, 60))}, ${Math.round(between(30, 50))}, 0.9)`;
                    c.beginPath(); c.arc(cx + between(-sw, sw) * 0.3, cy + between(-sh, sh) * 0.3, gr, 0, Math.PI * 2); c.fill();
                }
                return;
            }

            // Uneven floor: some stones stand proud, some have settled lower
            const lift = rnd() < 0.2 ? -1 : rnd() < 0.3 ? 1 : 0; // -1 sunk, 1 raised
            const shadowOff = lift === 1 ? 3 : lift === 0 ? 1.8 : 0.6;
            c.fillStyle = `rgba(0, 0, 0, ${lift === 1 ? 0.6 : 0.45})`;
            tracePoly(pts, shadowOff, shadowOff * 1.2); c.fill();
            if (lift !== -1) {
                c.fillStyle = 'rgba(255, 240, 220, 0.07)';
                tracePoly(pts, -1, -1); c.fill();
            }

            // Tone: dusty warm grey, each stone a little different, and a tilt
            // (a random light-to-dark direction) so the surface is not flat
            const base = (lift === -1 ? 23 : lift === 1 ? 36 : 30) + between(-5, 7) + h * 8;
            const warm = between(0, 10);
            const r = base + warm + h * 12, g = base + warm * 0.6 + 2, b = base + 4 - warm * 0.4;
            const tilt = between(0, Math.PI * 2);
            const tx = Math.cos(tilt) * Math.max(sw, sh) * 0.5, ty = Math.sin(tilt) * Math.max(sw, sh) * 0.5;
            const grad = c.createLinearGradient(cx - tx, cy - ty, cx + tx, cy + ty);
            const tiltAmt = lift === 1 ? 11 : 7;
            grad.addColorStop(0, `rgb(${Math.round(r + tiltAmt)}, ${Math.round(g + tiltAmt)}, ${Math.round(b + tiltAmt)})`);
            grad.addColorStop(1, `rgb(${Math.round(r - tiltAmt)}, ${Math.round(g - tiltAmt)}, ${Math.round(b - tiltAmt * 0.8)})`);
            c.fillStyle = grad;
            tracePoly(pts); c.fill();

            c.save();
            tracePoly(pts); c.clip();

            // Worn edges: lit on the top-left rim, dark on the bottom-right rim
            c.lineWidth = 2.5;
            c.strokeStyle = lift === -1 ? 'rgba(0, 0, 0, 0.5)' : 'rgba(255, 245, 225, 0.07)';
            tracePoly(pts, 1, 1); c.stroke();
            c.strokeStyle = 'rgba(0, 0, 0, 0.45)';
            tracePoly(pts, -1.2, -1.2); c.stroke();

            // Pitting and erosion
            // Worn hollows: centuries of feet and weather wore shallow dips
            for (let k = 0; k < 1 + Math.floor(rnd() * 3); k++) {
                const hx = sx + sw * between(0.2, 0.8), hy = sy + sh * between(0.2, 0.8), hr = between(5, 14);
                const hg = c.createRadialGradient(hx, hy, 0, hx, hy, hr);
                hg.addColorStop(0, 'rgba(0, 0, 0, 0.22)');
                hg.addColorStop(1, 'rgba(0, 0, 0, 0)');
                c.fillStyle = hg;
                c.fillRect(hx - hr, hy - hr, hr * 2, hr * 2);
            }
            for (let k = 0; k < Math.round(sw * sh / 130); k++) {
                const px = sx + rnd() * sw, py = sy + rnd() * sh, pr = between(0.6, 2.2);
                c.fillStyle = 'rgba(0, 0, 0, 0.3)';
                c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
                c.fillStyle = 'rgba(255, 240, 220, 0.05)';
                c.beginPath(); c.arc(px + 0.6, py + 1.1, pr * 0.8, 0, Math.PI * 2); c.fill();
            }

            // Mineral / water stains running down
            if (rnd() < 0.4) {
                const stx = sx + rnd() * sw;
                const stG = c.createLinearGradient(0, sy, 0, sy + sh);
                stG.addColorStop(0, 'rgba(70, 60, 40, 0.0)');
                stG.addColorStop(1, 'rgba(70, 60, 40, 0.22)');
                c.fillStyle = stG;
                c.fillRect(stx, sy, between(4, 12), sh);
            }

            // Soot blot
            if (rnd() < 0.16) {
                const gx = sx + rnd() * sw, gy = sy + rnd() * sh, gr = between(10, 28);
                const g2 = c.createRadialGradient(gx, gy, 0, gx, gy, gr);
                g2.addColorStop(0, 'rgba(0, 0, 0, 0.38)');
                g2.addColorStop(1, 'rgba(0, 0, 0, 0)');
                c.fillStyle = g2;
                c.fillRect(sx, sy, sw, sh);
            }

            // Cracks: some stones are split right through (one half has dropped),
            // more have a branching crack, and near the lava magma shows inside
            const ang = between(0, Math.PI);
            const split = rnd() < 0.18;
            if (split || rnd() < 0.62 + h * 0.3) {
                const a = edgePoint(st, ang + between(-0.4, 0.4));
                const bEnd = split ? edgePoint(st, ang + Math.PI + between(-0.4, 0.4))
                    : [cx + (edgePoint(st, ang + Math.PI)[0] - cx) * between(0.2, 0.8),
                       cy + (edgePoint(st, ang + Math.PI)[1] - cy) * between(0.2, 0.8)];
                const main = crackPath(a, bEnd, split ? 4 : 3.2);
                const branches = [];
                const nb = split ? 1 + Math.floor(rnd() * 2) : 1 + Math.floor(rnd() * 3);
                for (let k = 0; k < nb; k++) {
                    const from = main[1 + Math.floor(rnd() * (main.length - 2))];
                    const bang = ang + Math.PI * 0.5 * (rnd() < 0.5 ? -1 : 1) + between(-0.5, 0.5);
                    const blen = between(8, Math.max(10, Math.min(sw, sh) * 0.45));
                    branches.push(crackPath(from, [from[0] + Math.cos(bang) * blen, from[1] + Math.sin(bang) * blen], 2));
                }
                const stroke = (line, ox = 0, oy = 0) => {
                    c.beginPath();
                    line.forEach(([x, y], i) => (i === 0 ? c.moveTo(x + ox, y + oy) : c.lineTo(x + ox, y + oy)));
                    c.stroke();
                };

                if (split) {
                    // the far side of the split has sunk: darker
                    const A = -(bEnd[1] - a[1]), B = bEnd[0] - a[0];
                    c.save();
                    c.beginPath();
                    const far = clipHalf(pts, A, B, A * a[0] + B * a[1]);
                    far.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
                    c.closePath();
                    c.fillStyle = 'rgba(0, 0, 0, 0.22)';
                    c.fill();
                    c.restore();
                }

                const glowing = h > 0.25 && rnd() < h;
                c.lineCap = 'round';
                c.lineJoin = 'round';
                // soft darkening beside the crack, the crack itself, a light lip
                c.strokeStyle = 'rgba(0, 0, 0, 0.22)';
                c.lineWidth = split ? 6 : 4.5;
                stroke(main); branches.forEach((br) => stroke(br));
                if (glowing) {
                    c.save();
                    c.shadowColor = 'rgba(255, 110, 20, 0.9)';
                    c.shadowBlur = 8 + h * 8;
                    c.strokeStyle = `rgba(255, ${Math.round(110 + 80 * h)}, 30, ${0.55 + h * 0.4})`;
                    c.lineWidth = split ? 2.2 : 1.6;
                    stroke(main); branches.forEach((br) => stroke(br));
                    c.restore();
                } else {
                    c.strokeStyle = 'rgba(4, 4, 6, 0.95)';
                    c.lineWidth = split ? 2.8 : 1.9;
                    stroke(main);
                    c.lineWidth = 1.3;
                    branches.forEach((br) => stroke(br));
                }
                c.strokeStyle = 'rgba(255, 240, 220, 0.16)';
                c.lineWidth = 1;
                stroke(main, 1.1, 1.4); branches.forEach((br) => stroke(br, 0.9, 1.3));
            }

            // Hairline cracks: short, thin and faint, on most stones
            const hairlines = rnd() < 0.8 ? 1 + Math.floor(rnd() * 4) : 0;
            for (let k = 0; k < hairlines; k++) {
                const hx = sx + sw * between(0.15, 0.85), hy = sy + sh * between(0.15, 0.85);
                const ha = between(0, Math.PI * 2), hl = between(6, Math.max(8, Math.min(sw, sh) * 0.4));
                const line = crackPath([hx, hy], [hx + Math.cos(ha) * hl, hy + Math.sin(ha) * hl], 1.4);
                c.strokeStyle = 'rgba(6, 6, 9, 0.7)';
                c.lineWidth = 0.8;
                c.beginPath();
                line.forEach(([x, y], i) => (i === 0 ? c.moveTo(x, y) : c.lineTo(x, y)));
                c.stroke();
            }

            // Worn engraving: an ancient cyber-rune, most of its glow long gone
            if (rnd() < 0.09 && sw > 50) {
                const color = cy < lavaY ? '255, 0, 119' : '0, 240, 255';
                const alive = rnd() < 0.35; // a few still flicker faintly
                c.save();
                if (alive) { c.shadowColor = `rgba(${color}, 0.8)`; c.shadowBlur = 6; }
                c.lineWidth = 1.6;
                let px = cx - sw * 0.25, py = cy + between(-sh, sh) * 0.2;
                const runePts = [[px, py]];
                for (let k = 0; k < 4; k++) {
                    if (k % 2 === 0) px = Math.min(sx + sw - 6, px + between(8, 18));
                    else py = Math.min(sy + sh - 5, Math.max(sy + 5, py + between(-12, 12)));
                    runePts.push([px, py]);
                }
                c.strokeStyle = 'rgba(0, 0, 0, 0.55)';
                c.beginPath(); runePts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1])); c.stroke();
                c.strokeStyle = 'rgba(255, 240, 220, 0.06)';
                c.beginPath(); runePts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1] + 1.5) : c.lineTo(p[0], p[1] + 1.5)); c.stroke();
                c.strokeStyle = `rgba(${color}, ${alive ? between(0.22, 0.38) : between(0.06, 0.12)})`;
                c.lineWidth = 1;
                c.beginPath(); runePts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1])); c.stroke();
                c.restore();
            }
            // Chipped edges: bites broken off the rim, showing the joint below
            const chips = Math.floor(rnd() * 4);
            for (let k = 0; k < chips; k++) {
                const [ex, ey] = pts[Math.floor(rnd() * pts.length)];
                const cr = between(2.5, 6);
                c.fillStyle = 'rgba(14, 13, 16, 0.9)';
                c.beginPath();
                for (let q = 0; q < 5; q++) {
                    const qa = (q / 5) * Math.PI * 2 + between(-0.3, 0.3), qr = cr * between(0.6, 1.1);
                    const qx = ex + Math.cos(qa) * qr, qy = ey + Math.sin(qa) * qr;
                    if (q === 0) c.moveTo(qx, qy); else c.lineTo(qx, qy);
                }
                c.closePath();
                c.fill();
            }

            // Lichen: pale crusty rosettes on stones away from the heat
            if (h < 0.35 && rnd() < 0.35) {
                const spots = 1 + Math.floor(rnd() * 3);
                for (let k = 0; k < spots; k++) {
                    const lx = sx + sw * between(0.1, 0.9), ly = sy + sh * between(0.1, 0.9);
                    const lr = between(2, 6);
                    c.fillStyle = `rgba(${Math.round(between(150, 185))}, ${Math.round(between(160, 185))}, ${Math.round(between(110, 135))}, 0.16)`;
                    for (let q = 0; q < 6; q++) {
                        c.beginPath();
                        c.arc(lx + between(-lr, lr), ly + between(-lr, lr), between(0.8, 2.2), 0, Math.PI * 2);
                        c.fill();
                    }
                }
            }

            // Age: the colour faded and dusty
            c.fillStyle = 'rgba(95, 85, 70, 0.08)';
            tracePoly(pts); c.fill();
            c.restore(); // stone clip

            // Moss and lichen creeping in from the joints (not near the lava)
            if (h < 0.3 && rnd() < 0.6) {
                const patches = 1 + Math.floor(rnd() * 3);
                for (let m = 0; m < patches; m++) {
                    const [mx, my] = pts[Math.floor(rnd() * pts.length)];
                    const mr = between(5, 16);
                    const mg = c.createRadialGradient(mx, my, 0, mx, my, mr);
                    mg.addColorStop(0, `rgba(${Math.round(between(55, 80))}, ${Math.round(between(95, 120))}, ${Math.round(between(50, 70))}, 0.38)`);
                    mg.addColorStop(1, 'rgba(60, 100, 55, 0)');
                    c.fillStyle = mg;
                    c.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
                    for (let l = 0; l < 4; l++) {
                        c.fillStyle = `rgba(${Math.round(between(120, 160))}, ${Math.round(between(140, 170))}, ${Math.round(between(80, 110))}, 0.28)`;
                        c.beginPath(); c.arc(mx + between(-mr, mr) * 0.7, my + between(-mr, mr) * 0.7, between(0.6, 1.6), 0, Math.PI * 2); c.fill();
                    }
                }
            }
        });

        // Worn lighter in the middle of each half, where the fighting happens
        [H * 0.28, H * 0.72].forEach((wy) => {
            c.save();
            c.translate(W / 2, wy);
            c.scale(W * 0.42, H * 0.2);
            const wg = c.createRadialGradient(0, 0, 0, 0, 0, 1);
            wg.addColorStop(0, 'rgba(160, 150, 130, 0.07)');
            wg.addColorStop(1, 'rgba(160, 150, 130, 0)');
            c.fillStyle = wg;
            c.fillRect(-1, -1, 2, 2);
            c.restore();
        });

        // Real rock surface over all of it: grain, bumps lit from the top left
        // and mottled colour, so the slabs read as stone instead of paint
        this.applyStoneSurface(c, dpr);

        // 3. Heat haze & scorched belt around the lava channel
        const heatBand = c.createLinearGradient(0, lavaY - 170, 0, lavaY + 170);
        heatBand.addColorStop(0, 'rgba(255, 90, 0, 0)');
        heatBand.addColorStop(0.5, 'rgba(255, 110, 10, 0.16)');
        heatBand.addColorStop(1, 'rgba(255, 90, 0, 0)');
        c.fillStyle = heatBand;
        c.fillRect(0, lavaY - 170, W, 340);

        // 4. Faint team tint on each half
        const topTint = c.createLinearGradient(0, 0, 0, H * 0.4);
        topTint.addColorStop(0, 'rgba(255, 0, 119, 0.06)');
        topTint.addColorStop(1, 'rgba(255, 0, 119, 0)');
        c.fillStyle = topTint; c.fillRect(0, 0, W, H * 0.4);
        const botTint = c.createLinearGradient(0, H, 0, H * 0.6);
        botTint.addColorStop(0, 'rgba(0, 240, 255, 0.06)');
        botTint.addColorStop(1, 'rgba(0, 240, 255, 0)');
        c.fillStyle = botTint; c.fillRect(0, H * 0.6, W, H * 0.4);

        // 5. Carved fortress walls with riveted trim
        c.fillStyle = '#0a0b0f';
        c.fillRect(0, 0, W, wallThick); c.fillRect(0, H - wallThick, W, wallThick);
        c.fillRect(0, 0, wallThick, H); c.fillRect(W - wallThick, 0, wallThick, H);
        const bH = 30;
        for (let by = 0; by < H; by += bH) {
            const shade = Math.round(between(24, 36));
            c.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 8})`;
            c.fillRect(1, by + 1, wallThick - 2, bH - 2);
            c.fillRect(W - wallThick + 1, by + 1, wallThick - 2, bH - 2);
            c.strokeStyle = 'rgba(255,255,255,0.08)';
            c.strokeRect(1.5, by + 1.5, wallThick - 3, bH - 3);
            c.strokeRect(W - wallThick + 1.5, by + 1.5, wallThick - 3, bH - 3);
        }
        for (let bx = 0; bx < W; bx += 46) {
            const shade = Math.round(between(24, 36));
            c.fillStyle = `rgb(${shade}, ${shade + 2}, ${shade + 8})`;
            c.fillRect(bx + 1, 1, 44, wallThick - 2);
            c.fillRect(bx + 1, H - wallThick + 1, 44, wallThick - 2);
        }
        c.strokeStyle = '#2b3140';
        c.lineWidth = 2.5;
        c.strokeRect(wallThick, wallThick, W - wallThick * 2, H - wallThick * 2);
        c.strokeStyle = '#06070a';
        c.lineWidth = 1.5;
        c.strokeRect(wallThick - 2, wallThick - 2, W - (wallThick - 2) * 2, H - (wallThick - 2) * 2);

        // Glowing rivets along the inner trim
        const rivet = (rx, ry, col) => {
            c.save();
            c.shadowColor = col; c.shadowBlur = 8;
            c.fillStyle = col;
            c.beginPath(); c.arc(rx, ry, 2.2, 0, Math.PI * 2); c.fill();
            c.restore();
        };
        for (let rx = wallThick + 30; rx < W - wallThick; rx += 60) {
            rivet(rx, wallThick, 'rgba(255, 0, 119, 0.55)');
            rivet(rx, H - wallThick, 'rgba(0, 240, 255, 0.55)');
        }
        for (let ry = wallThick + 30; ry < H - wallThick; ry += 60) {
            const col = ry < lavaY ? 'rgba(255, 0, 119, 0.4)' : 'rgba(0, 240, 255, 0.4)';
            rivet(wallThick, ry, col);
            rivet(W - wallThick, ry, col);
        }

        // 6. Baked-in ambient darkening toward the corners
        const vig = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.35, W / 2, H / 2, Math.max(W, H) * 0.75);
        vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
        vig.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
        c.fillStyle = vig;
        c.fillRect(0, 0, W, H);
    }

    // Per-pixel pass over the floor: a noise height map lit from the top left
    // (every little bump gets a light and a dark side), mottling, and grain.
    // Done once when the floor is generated, not per frame.
    applyStoneSurface(c, dpr) {
        const PW = c.canvas.width, PH = c.canvas.height;
        let img;
        try { img = c.getImageData(0, 0, PW, PH); } catch (e) { return; }
        const d = img.data;
        const step = 2; // height map at half resolution: plenty for bumps of a few px
        const hw = Math.ceil(PW / step) + 2, hh = Math.ceil(PH / step) + 2;
        const hm = new Float32Array(hw * hh);
        const cell = 11 * dpr; // bump size in device px
        for (let y = 0; y < hh; y++) {
            for (let x = 0; x < hw; x++) {
                hm[y * hw + x] = fbm((x * step) / cell, (y * step) / cell, 1 << 20, 5, 3);
            }
        }
        for (let y = 0; y < PH; y++) {
            const hy = Math.min(hh - 2, Math.max(1, (y / step) | 0));
            for (let x = 0; x < PW; x++) {
                const hx = Math.min(hw - 2, Math.max(1, (x / step) | 0));
                const i0 = hy * hw + hx;
                const h = hm[i0];
                // slope towards the light (top left) = lit, away = shadow
                const shade = ((hm[i0 - 1] - hm[i0 + 1]) + (hm[i0 - hw] - hm[i0 + hw])) * 95;
                const mottle = (h - 0.5) * 22;
                const grain = (latticeHash(x, y, 9) - 0.5) * 12;
                const v = shade + mottle + grain;
                const i = (y * PW + x) * 4;
                d[i] = Math.max(0, Math.min(255, d[i] + v * 1.05));
                d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + v));
                d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + v * 0.9));
            }
        }
        c.putImageData(img, 0, 0);
    }

    // Lava textures, built once: the molten flow (bright, swirling, darker
    // and cooler toward the shores) and a crust layer of cooled basalt plates
    // with glowing cracks and rims. Both tile left to right, so the river is
    // drawn by scrolling them at different speeds.
    getLavaTextures() {
        if (this.lavaTex) return this.lavaTex;
        const S = 2;               // texture px per screen px: crisp on phones
        const TW = 480, TH = 72;   // screen px; the river is ~50 px thick plus wobble
        const w = TW * S, h = TH * S;
        const P = 12;              // lattice cells across the tile
        const cellPx = w / P;
        const make = () => {
            const cv = document.createElement('canvas');
            cv.width = w; cv.height = h;
            const cx = cv.getContext('2d');
            return [cv, cx, cx.createImageData(w, h)];
        };
        const ramp = [
            [0.00, 30, 3, 0], [0.28, 105, 8, 0], [0.48, 205, 40, 0],
            [0.66, 255, 105, 5], [0.82, 255, 175, 45], [1.00, 255, 240, 175]
        ];
        const heatColor = (t) => {
            for (let k = 1; k < ramp.length; k++) {
                if (t <= ramp[k][0]) {
                    const a = ramp[k - 1], b = ramp[k];
                    const f = (t - a[0]) / (b[0] - a[0]);
                    return [a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f, a[3] + (b[3] - a[3]) * f];
                }
            }
            return [255, 240, 175];
        };

        const [molten, mctx, mimg] = make();
        const [crust, cctx, cimg] = make();
        const md = mimg.data, cd = cimg.data;
        for (let y = 0; y < h; y++) {
            const v = y / cellPx;
            // distance from the middle of the river: 0 centre, 1 at the shore
            const edge = Math.abs(y / S - TH / 2) / 25;
            const cool = smoothstep(0.45, 1.05, edge);
            for (let x = 0; x < w; x++) {
                const u = x / cellPx;
                const i = (y * w + x) * 4;
                // Molten rock: domain-warped noise so it swirls like a thick fluid
                const qx = fbm(u, v, P, 1, 3), qy = fbm(u + 5.2, v + 1.3, P, 2, 3);
                const n = fbm(u + 1.8 * (qx - 0.5), v + 1.8 * (qy - 0.5), P, 3, 4);
                const heat = Math.min(1, Math.max(0, n * 1.5 - 0.08 - cool * 0.55)); // hot: lots of orange and yellow
                const [r, g, b] = heatColor(heat);
                md[i] = r; md[i + 1] = g; md[i + 2] = b; md[i + 3] = 255;

                // Cooled crust: plates where the noise is high, thicker at the shores
                const c = fbm(u * 2, v * 2, P * 2, 7, 4) + cool * 0.12;
                const plate = smoothstep(0.53, 0.58, c);
                const rim = smoothstep(0.47, 0.53, c) * (1 - plate);
                const crackLine = Math.abs(fbm(u * 4, v * 4, P * 4, 11, 2) - 0.5);
                const crack = plate * (1 - smoothstep(0.0, 0.035, crackLine));
                if (crack > 0.05) {
                    // glowing seam through a plate
                    cd[i] = 255; cd[i + 1] = 95 + 60 * crack; cd[i + 2] = 10; cd[i + 3] = 255 * crack;
                } else if (plate > 0.01) {
                    const grain = 0.7 + 0.6 * latticeHash(x, y, 13);
                    const lum = (16 + 20 * fbm(u * 8, v * 8, P * 8, 17, 2)) * grain;
                    cd[i] = lum * 1.25; cd[i + 1] = lum * 0.9; cd[i + 2] = lum * 0.8; cd[i + 3] = 255 * plate;
                } else if (rim > 0.01) {
                    // the plate edge still glows red where it meets the melt
                    cd[i] = 255; cd[i + 1] = 60; cd[i + 2] = 0; cd[i + 3] = 170 * rim;
                } else {
                    cd[i + 3] = 0;
                }
            }
        }
        mctx.putImageData(mimg, 0, 0);
        cctx.putImageData(cimg, 0, 0);
        this.lavaTex = { molten, crust, tw: TW, th: TH };
        return this.lavaTex;
    }

    // Light and shade: the arena is dim, and the light comes from real
    // sources - the lava above all, the towers, and each fighter's own glow.
    // The dark layer with the fixed lights cut out is built once per size;
    // each frame only the fighters' light is cut out of a copy of it.
    drawLighting(sources) {
        // (at least 1 px: drawImage throws on a 0-size canvas, and a throw in
        // draw() ends the animation loop for good)
        const W = Math.max(1, Math.round(this.width)), H = Math.max(1, Math.round(this.height));
        const S = 0.5; // soft gradients only: half resolution is plenty
        const key = W + 'x' + H;
        if (this.lightKey !== key) {
            this.lightKey = key;
            const mk = () => {
                const cv = document.createElement('canvas');
                cv.width = Math.ceil(W * S);
                cv.height = Math.ceil(H * S);
                return cv;
            };
            this.lightBase = mk();
            this.lightFrame = mk();
            const c = this.lightBase.getContext('2d');
            c.scale(S, S);
            c.fillStyle = 'rgba(3, 3, 10, 0.42)';
            c.fillRect(0, 0, W, H);
            c.globalCompositeOperation = 'destination-out';
            const light = (x, y, rx, ry, strength) => {
                c.save();
                c.translate(x, y);
                c.scale(rx, ry);
                const g = c.createRadialGradient(0, 0, 0, 0, 0, 1);
                g.addColorStop(0, `rgba(0, 0, 0, ${strength})`);
                g.addColorStop(1, 'rgba(0, 0, 0, 0)');
                c.fillStyle = g;
                c.fillRect(-1, -1, 2, 2);
                c.restore();
            };
            light(W / 2, H / 2, W / 2 + 40, 160, 1.0);   // the lava lights up the middle
            light(W / 2, H / 2, W * 0.75, H * 0.45, 0.35); // and spills further out
            light(W / 2, 60, 120, 95, 0.7);               // the towers
            light(W / 2, H - 60, 120, 95, 0.7);
            light(80, 60, 95, 80, 0.5);                   // boss-round corner towers
            light(W - 80, 60, 95, 80, 0.5);
        }
        const f = this.lightFrame.getContext('2d');
        f.setTransform(1, 0, 0, 1, 0, 0);
        f.globalCompositeOperation = 'source-over';
        f.clearRect(0, 0, this.lightFrame.width, this.lightFrame.height);
        f.drawImage(this.lightBase, 0, 0);
        f.setTransform(S, 0, 0, S, 0, 0);
        f.globalCompositeOperation = 'destination-out';
        sources.forEach(({ x, y, r }) => {
            const g = f.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
            g.addColorStop(1, 'rgba(0, 0, 0, 0)');
            f.fillStyle = g;
            f.fillRect(x - r, y - r, r * 2, r * 2);
        });
        this.ctx.drawImage(this.lightFrame, 0, 0, W, H);
    }

    clear(opacity = 0.25) {
        // Draw the stone arena floor & fortress walls
        this.drawStoneArena();

        // Render floor pulses
        if (this.floorPulses && this.floorPulses.length > 0) {
            this.ctx.save();
            this.floorPulses.forEach(p => {
                this.setNeonGlow(p.color, 16);
                this.ctx.strokeStyle = p.color;
                this.ctx.lineWidth = 2.5;
                this.ctx.globalAlpha = Math.max(0, p.life * 0.6);
                this.ctx.beginPath();
                this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.ctx.stroke();
            });
            this.ctx.restore();
        }

        // Render full screen flash overlay if active
        if (this.flashTime > 0) {
            this.ctx.save();
            const alpha = (this.flashTime / this.flashMaxTime) * 0.18; // cap max opacity to prevent blinding
            this.ctx.fillStyle = this.flashColor;
            this.ctx.globalAlpha = alpha;
            this.ctx.fillRect(0, 0, this.width, this.height);
            this.ctx.restore();
        }
    }

    // Render stone arena background
    drawStoneArena() {
        const W = Math.round(this.width), H = Math.round(this.height);
        if (!this.stoneCanvas || !this.stoneSize || this.stoneSize.w !== W || this.stoneSize.h !== H ||
            this.stoneVariant !== (this.floorVariant || 0)) {
            this.initStoneArena();
        }
        this.ctx.drawImage(this.stoneCanvas, 0, 0, this.width, this.height);
    }

    /* NEON DRAWING UTILITIES */

    // Setup neon glow parameters for context drawing
    setNeonGlow(color, size = 15) {
        this.ctx.shadowColor = color;
        this.ctx.shadowBlur = size;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
    }

    // Reset neon glow parameters (increases canvas performance)
    resetNeonGlow() {
        this.ctx.shadowBlur = 0;
    }

    drawNeonCircle(x, y, radius, strokeColor, fillColor = null, glowSize = 12) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        
        if (fillColor) {
            this.ctx.fillStyle = fillColor;
            this.ctx.fill();
        }
        
        if (strokeColor) {
            this.ctx.save();
            this.setNeonGlow(strokeColor, glowSize);
            this.ctx.strokeStyle = strokeColor;
            this.ctx.lineWidth = 2;
            this.ctx.stroke();
            this.ctx.restore();
        }
    }

    drawNeonLine(x1, y1, x2, y2, color, width = 3, glowSize = 15) {
        this.ctx.save();
        this.setNeonGlow(color, glowSize);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(x1, y1);
        this.ctx.lineTo(x2, y2);
        this.ctx.stroke();
        this.ctx.restore();
    }

    drawNeonPath(points, color, width = 3, glowSize = 15, close = false) {
        if (points.length < 2) return;
        
        this.ctx.save();
        this.setNeonGlow(color, glowSize);
        this.ctx.strokeStyle = color;
        this.ctx.lineWidth = width;
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        
        this.ctx.beginPath();
        this.ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length; i++) {
            this.ctx.lineTo(points[i].x, points[i].y);
        }
        
        if (close) {
            this.ctx.closePath();
        }
        this.ctx.stroke();
        this.ctx.restore();
    }

    createTransparentSprite(img) {
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;
        const tCtx = tempCanvas.getContext('2d');
        tCtx.drawImage(img, 0, 0);

        try {
            const imgData = tCtx.getImageData(0, 0, img.width, img.height);
            const data = imgData.data;

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // Smooth green-screen / white background removal for sprites
                if ((r < 30 && g < 30 && b < 30) || (r > 225 && g > 225 && b > 225)) {
                    data[i + 3] = 0; // Make transparent
                }
            }

            tCtx.putImageData(imgData, 0, 0);
        } catch (e) {
            console.warn('Unable to process sprite background transparency:', e);
        }
        return tempCanvas;
    }

    // Draw subtle cinematic vignette for optic focus and arena depth
    drawVignette() {
        const ctx = this.ctx;
        const w = this.width;
        const h = this.height;
        const cx = w / 2;
        const cy = h / 2;
        const radius = Math.max(w, h) * 0.75;

        ctx.save();
        const grad = ctx.createRadialGradient(cx, cy, radius * 0.45, cx, cy, radius);
        grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
        grad.addColorStop(0.7, 'rgba(0, 0, 0, 0.25)');
        grad.addColorStop(1, 'rgba(0, 0, 0, 0.7)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, w, h);
        ctx.restore();
    }

    drawSamuraiCharacter(ctx, x, y, radius, color, angle, profileKey, isAiming, aimDx, aimDy, hpPercent, trailHistory = [], inChargingZone = false, speed = 0) {
        ctx.save();

        const isCyan = (color === '#00f0ff' || color === '#00ffff' || color.includes('00f0'));
        const spriteCanvas = isCyan ? this.playerSpriteCanvas : this.enemySpriteCanvas;

        // 0A. REALISTIC DYNAMIC SOFT GROUND SHADOW (Stretches & deforms with speed)
        ctx.save();
        const shadowStretch = 1.0 + Math.min(0.6, speed * 1.5);
        const shadowOffsetY = radius * 0.38 + Math.min(6, speed * 10);
        const shadowGrad = ctx.createRadialGradient(x, y + shadowOffsetY, 0, x, y + shadowOffsetY, radius * 1.5 * shadowStretch);
        shadowGrad.addColorStop(0, 'rgba(0, 0, 0, 0.85)');
        shadowGrad.addColorStop(0.45, 'rgba(0, 0, 0, 0.45)');
        shadowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = shadowGrad;
        ctx.beginPath();
        ctx.ellipse(x, y + shadowOffsetY, radius * 1.35 * shadowStretch, radius * 0.75, angle, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();

        // 0B. REALISTIC DIRECTIONAL FLOOR LIGHTING BEAM (Headlight / Ki Spotlight Cone)
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        const beamGrad = ctx.createRadialGradient(0, 0, radius * 0.3, radius * 2.8, 0, radius * 3.8);
        beamGrad.addColorStop(0, isCyan ? 'rgba(0, 240, 255, 0.28)' : 'rgba(255, 0, 119, 0.28)');
        beamGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = beamGrad;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.arc(0, 0, radius * 3.8, -Math.PI * 0.25, Math.PI * 0.25);
        ctx.closePath();
        ctx.fill();
        ctx.restore();

        // 0C. REALISTIC BLADE SLASH ARC TRAIL (when moving fast)
        if (speed > 0.18) {
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(angle);
            
            // Draw crescent slash wave
            const slashRadius = radius * 1.8;
            ctx.save();
            this.setNeonGlow(color, 24);
            ctx.strokeStyle = color;
            ctx.lineWidth = 4.5;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.arc(0, 0, slashRadius, -Math.PI * 0.4, Math.PI * 0.4);
            ctx.stroke();

            // Inner hot white razor edge
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.8;
            ctx.stroke();
            ctx.restore();

            ctx.restore();
        }

        // 1. Ghost trails (afterimages)
        if (trailHistory && trailHistory.length > 0) {
            trailHistory.forEach((pt, idx) => {
                const opacity = ((idx + 1) / (trailHistory.length + 1)) * 0.35;
                ctx.save();
                ctx.globalAlpha = opacity;
                this.setNeonGlow(color, 12);
                if (spriteCanvas) {
                    ctx.save();
                    ctx.translate(pt.x, pt.y);
                    ctx.rotate(pt.angle + Math.PI / 2);
                    const trailSize = radius * 2.85;
                    ctx.drawImage(spriteCanvas, -trailSize / 2, -trailSize / 2, trailSize, trailSize);
                    ctx.restore();
                } else {
                    ctx.fillStyle = color;
                    ctx.beginPath();
                    ctx.arc(pt.x, pt.y, radius * 0.85, 0, Math.PI * 2);
                    ctx.fill();
                }
                ctx.restore();
            });
        }

        // 2. Ambient Energy Glow Aura around character base
        const auraPulse = 1.0 + Math.sin(Date.now() * 0.008) * 0.08;
        ctx.save();
        this.setNeonGlow(color, 24);
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(x, y, radius * 1.25 * auraPulse, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();

        // Ki Guard Shield Ring if in charging zone
        if (inChargingZone && !isAiming) {
            ctx.save();
            const shieldPulse = 1.0 + Math.sin(Date.now() * 0.01) * 0.08;
            this.setNeonGlow(color, 28);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3.5;
            ctx.setLineDash([8, 6]);
            ctx.beginPath();
            ctx.arc(x, y, radius * 1.65 * shieldPulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // 3. DRAW REAL MECHA SAMURAI SPRITE GRAPHIC
        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle + Math.PI / 2);

        if (spriteCanvas) {
            const spriteSize = radius * 2.85;
            this.setNeonGlow(color, 18);
            ctx.drawImage(spriteCanvas, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
        } else {
            // Fallback if canvas transparency step is loading
            const fallbackImg = isCyan ? this.playerSpriteImg : this.enemySpriteImg;
            if (fallbackImg && fallbackImg.complete) {
                const spriteSize = radius * 2.85;
                this.setNeonGlow(color, 18);
                ctx.drawImage(fallbackImg, -spriteSize / 2, -spriteSize / 2, spriteSize, spriteSize);
            }
        }
        ctx.restore();

        // 4. DYNAMIC AIMING SWORD LASER OVERLAY
        // (not before the swipe has a direction: atan2(-0, -0) points the sword left)
        if (isAiming && (aimDx !== 0 || aimDy !== 0)) {
            ctx.save();
            const swordAngle = Math.atan2(-aimDy, -aimDx);
            const handX = x + Math.cos(swordAngle) * (radius * 0.5);
            const handY = y + Math.sin(swordAngle) * (radius * 0.5);

            const swordLength = radius * 2.2;
            const swordEndX = handX + Math.cos(swordAngle) * swordLength;
            const swordEndY = handY + Math.sin(swordAngle) * swordLength;

            // Outer Neon Glow Blade Sheath
            this.setNeonGlow(color, 24);
            ctx.strokeStyle = color;
            ctx.lineWidth = 6;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(handX, handY);
            ctx.lineTo(swordEndX, swordEndY);
            ctx.stroke();

            // Inner Hot White Core Blade
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            ctx.stroke();

            // Hilt Guard (Tsuba)
            this.setNeonGlow('#ffcc00', 16);
            ctx.strokeStyle = '#ffcc00';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(handX - Math.sin(swordAngle) * 7, handY + Math.cos(swordAngle) * 7);
            ctx.lineTo(handX + Math.sin(swordAngle) * 7, handY - Math.cos(swordAngle) * 7);
            ctx.stroke();
            ctx.restore();
        }

        // 5. Futuristic Floating Health Bar
        const barW = Math.max(54, radius * 1.6);
        const barH = 6;
        const barY = y - radius - 24;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(x - barW / 2, barY, barW, barH);

        this.setNeonGlow(color, 10);
        ctx.fillStyle = color;
        ctx.fillRect(x - barW / 2, barY, Math.max(0, hpPercent * barW), barH);

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.strokeRect(x - barW / 2, barY, barW, barH);

        ctx.restore();
    }
}
