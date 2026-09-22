/* DANGEROUS FIGHT - HIGH-PERFORMANCE 2D NEON CANVAS CONTROLLER */

export class CanvasController {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        
        // Logical bounds for positioning elements independently of display resolution
        this.width = 800;
        this.height = 600;
        
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
    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        
        // Base resolution scaling factor (maintain aspect ratio 4:3 internally)
        this.width = rect.width;
        this.height = rect.height;
        
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = this.width * dpr;
        this.canvas.height = this.height * dpr;
        
        // Scale the canvas rendering context by devicePixelRatio
        this.ctx.scale(dpr, dpr);
        
        // Match CSS display size
        this.canvas.style.width = `${this.width}px`;
        this.canvas.style.height = `${this.height}px`;
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
        let seed = 20240917;
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

        let y = wallThick - between(6, 20);
        while (y < H) {
            const rowH = between(34, 54);
            let x = wallThick - between(10, 60);
            while (x < W) {
                const slabW = between(44, 116);
                const sx = x + gap / 2, sy = y + gap / 2, sw = slabW - gap, sh = rowH - gap;
                const cx = sx + sw / 2, cy = sy + sh / 2;
                const h = heat(cy);

                // Some stones are gone entirely: rubble and packed earth remain
                if (rnd() < 0.045) {
                    c.fillStyle = '#121014';
                    c.fillRect(sx, sy, sw, sh);
                    for (let k = 0; k < 9; k++) {
                        const gr = between(2, 6);
                        c.fillStyle = `rgba(${Math.round(between(40, 70))}, ${Math.round(between(36, 60))}, ${Math.round(between(30, 50))}, 0.9)`;
                        c.beginPath(); c.arc(sx + between(gr, sw - gr), sy + between(gr, sh - gr), gr, 0, Math.PI * 2); c.fill();
                    }
                    x += slabW;
                    continue;
                }

                // Weathered slab outline: rounded, jittered corners, sometimes a chipped one
                const j = () => between(-2.5, 2.5);
                const corners = [
                    [sx + j(), sy + j()], [sx + sw + j(), sy + j()],
                    [sx + sw + j(), sy + sh + j()], [sx + j(), sy + sh + j()]
                ];
                const chip = rnd() < 0.3 ? Math.floor(rnd() * 4) : -1;
                const chipSize = between(6, 14);
                const outline = () => {
                    c.beginPath();
                    corners.forEach(([px, py], i) => {
                        const prev = corners[(i + 3) % 4], next = corners[(i + 1) % 4];
                        const toPrev = [Math.sign(prev[0] - px), Math.sign(prev[1] - py)];
                        const toNext = [Math.sign(next[0] - px), Math.sign(next[1] - py)];
                        const r = i === chip ? chipSize : 3;
                        const a = [px + toPrev[0] * r, py + toPrev[1] * r];
                        const b = [px + toNext[0] * r, py + toNext[1] * r];
                        if (i === 0) c.moveTo(a[0], a[1]); else c.lineTo(a[0], a[1]);
                        if (i === chip) {
                            // a bite taken out of the corner
                            c.lineTo(px + toPrev[0] * r * 0.5 + toNext[0] * r * 0.4, py + toPrev[1] * r * 0.5 + toNext[1] * r * 0.4);
                            c.lineTo(b[0], b[1]);
                        } else {
                            c.quadraticCurveTo(px, py, b[0], b[1]);
                        }
                    });
                    c.closePath();
                };

                // Aged tone: dusty warm grey, sun-bleached on top, sooty at the bottom
                const sunk = rnd() < 0.18;                    // slab has settled lower
                const base = (sunk ? 20 : 27) + between(-5, 7) + h * 8;
                const warm = between(0, 9);
                let r = base + warm + h * 12, g = base + warm * 0.6 + 2, b = base + 4 - warm * 0.4;
                const grad = c.createLinearGradient(sx, sy, sx + sw * 0.4, sy + sh);
                grad.addColorStop(0, `rgb(${Math.round(r + 9)}, ${Math.round(g + 8)}, ${Math.round(b + 7)})`);
                grad.addColorStop(1, `rgb(${Math.round(r - 7)}, ${Math.round(g - 7)}, ${Math.round(b - 5)})`);
                c.fillStyle = grad;
                outline(); c.fill();

                // Soft worn bevel
                c.save();
                outline(); c.clip();
                c.lineWidth = 3;
                c.strokeStyle = sunk ? 'rgba(0, 0, 0, 0.55)' : 'rgba(255, 245, 225, 0.06)';
                c.beginPath(); c.moveTo(sx, sy + sh); c.lineTo(sx, sy); c.lineTo(sx + sw, sy); c.stroke();
                c.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                c.beginPath(); c.moveTo(sx + sw, sy); c.lineTo(sx + sw, sy + sh); c.lineTo(sx, sy + sh); c.stroke();

                // Pitting and erosion
                for (let k = 0; k < 14; k++) {
                    const px = sx + 3 + rnd() * (sw - 6), py = sy + 3 + rnd() * (sh - 6), pr = between(0.6, 2.2);
                    c.fillStyle = 'rgba(0, 0, 0, 0.32)';
                    c.beginPath(); c.arc(px, py, pr, 0, Math.PI * 2); c.fill();
                    c.fillStyle = 'rgba(255, 240, 220, 0.05)';
                    c.beginPath(); c.arc(px + 0.6, py + 1.1, pr * 0.8, 0, Math.PI * 2); c.fill();
                }

                // Mineral / water stains running down
                if (rnd() < 0.22) {
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

                // Broken slab: split clean through, one half dropped a little
                const broken = rnd() < 0.12;
                if (broken) {
                    const bx = sx + between(sw * 0.3, sw * 0.7);
                    c.fillStyle = 'rgba(0, 0, 0, 0.18)';
                    c.fillRect(bx, sy, sw - (bx - sx), sh);
                    c.strokeStyle = 'rgba(4, 4, 6, 0.95)';
                    c.lineWidth = 2;
                    c.beginPath();
                    c.moveTo(bx + between(-4, 4), sy);
                    c.lineTo(bx + between(-8, 8), sy + sh * 0.5);
                    c.lineTo(bx + between(-4, 4), sy + sh);
                    c.stroke();
                }

                // Fissures - glowing with magma the closer they are to the lava
                if (rnd() < 0.32 + h * 0.4) {
                    const pts = [[sx + between(6, sw - 6), sy + between(4, sh - 4)]];
                    const segs = 2 + Math.floor(rnd() * 4);
                    for (let s = 0; s < segs; s++) {
                        const [px, py] = pts[pts.length - 1];
                        pts.push([
                            Math.min(sx + sw - 3, Math.max(sx + 3, px + between(-18, 18))),
                            Math.min(sy + sh - 3, Math.max(sy + 3, py + between(-12, 12)))
                        ]);
                    }
                    const path = () => { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); pts.slice(1).forEach(p => c.lineTo(p[0], p[1])); };
                    if (h > 0.25 && rnd() < h) {
                        c.save();
                        c.shadowColor = 'rgba(255, 110, 20, 0.9)';
                        c.shadowBlur = 8 + h * 8;
                        c.strokeStyle = `rgba(255, ${Math.round(120 + 80 * h)}, 30, ${0.35 + h * 0.5})`;
                        c.lineWidth = 1.4;
                        path(); c.stroke();
                        c.restore();
                    } else {
                        c.strokeStyle = 'rgba(5, 6, 9, 0.85)';
                        c.lineWidth = between(0.8, 1.6);
                        path(); c.stroke();
                        c.strokeStyle = 'rgba(255, 240, 220, 0.05)';
                        c.lineWidth = 1;
                        c.beginPath(); c.moveTo(pts[0][0] + 1, pts[0][1] + 1); pts.slice(1).forEach(p => c.lineTo(p[0] + 1, p[1] + 1)); c.stroke();
                    }
                }

                // Worn engraving: an ancient cyber-rune, most of its glow long gone
                if (rnd() < 0.09 && sw > 60) {
                    const color = cy < lavaY ? '255, 0, 119' : '0, 240, 255';
                    const alive = rnd() < 0.35; // a few still flicker faintly
                    c.save();
                    if (alive) { c.shadowColor = `rgba(${color}, 0.8)`; c.shadowBlur = 6; }
                    c.lineWidth = 1.6;
                    let px = sx + between(8, sw * 0.4), py = sy + between(6, sh - 6);
                    const runePts = [[px, py]];
                    for (let s = 0; s < 4; s++) {
                        if (s % 2 === 0) px = Math.min(sx + sw - 6, px + between(8, 22));
                        else py = Math.min(sy + sh - 5, Math.max(sy + 5, py + between(-14, 14)));
                        runePts.push([px, py]);
                    }
                    // carved groove: dark line with a light lower lip
                    c.strokeStyle = 'rgba(0, 0, 0, 0.55)';
                    c.beginPath(); runePts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1])); c.stroke();
                    c.strokeStyle = 'rgba(255, 240, 220, 0.06)';
                    c.beginPath(); runePts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1] + 1.5) : c.lineTo(p[0], p[1] + 1.5)); c.stroke();
                    c.strokeStyle = `rgba(${color}, ${alive ? between(0.22, 0.38) : between(0.06, 0.12)})`;
                    c.lineWidth = 1;
                    c.beginPath(); runePts.forEach((p, i) => i === 0 ? c.moveTo(p[0], p[1]) : c.lineTo(p[0], p[1])); c.stroke();
                    c.restore();
                }
                c.restore(); // slab clip

                // Moss and lichen creeping in from the joints (not near the lava)
                if (h < 0.3 && rnd() < 0.42) {
                    const patches = 1 + Math.floor(rnd() * 3);
                    for (let m = 0; m < patches; m++) {
                        // hug a random edge of the slab
                        const edge = Math.floor(rnd() * 4);
                        const mx = edge === 3 ? sx : edge === 1 ? sx + sw : sx + rnd() * sw;
                        const my = edge === 0 ? sy : edge === 2 ? sy + sh : sy + rnd() * sh;
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

                x += slabW;
            }
            y += rowH;
        }

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
        if (!this.stoneCanvas || !this.stoneSize || this.stoneSize.w !== W || this.stoneSize.h !== H) {
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
        if (isAiming) {
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
