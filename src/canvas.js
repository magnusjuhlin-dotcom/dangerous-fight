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
    clear(opacity = 0.25) {
        // Clear with a slight transparency to let neon trails fade beautifully
        this.ctx.fillStyle = `rgba(10, 10, 15, ${opacity})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Subtle futuristic grid lines background
        this.drawGrid();

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

    // Ambient dual-layer cyberpunk parallax background grid
    drawGrid() {
        // --- Layer 1: Background Grid (Faint, slow-scrolling, wide spacing) ---
        const spacingBg = 80;
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.012)';
        this.ctx.lineWidth = 1;
        
        const scrollBgX = (this.gridOffsetX * 0.4) % spacingBg;
        const scrollBgY = (this.gridOffsetY * 0.4) % spacingBg;
        
        const startBgX = scrollBgX < 0 ? scrollBgX + spacingBg : scrollBgX;
        for (let x = startBgX - spacingBg; x < this.width + spacingBg; x += spacingBg) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        const startBgY = scrollBgY < 0 ? scrollBgY + spacingBg : scrollBgY;
        for (let y = startBgY - spacingBg; y < this.height + spacingBg; y += spacingBg) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }

        // --- Layer 2: Foreground Grid (Brighter, fast-scrolling, narrow spacing) ---
        const spacingFg = 40;
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.032)';
        this.ctx.lineWidth = 1.5;
        
        const scrollFgX = this.gridOffsetX % spacingFg;
        const scrollFgY = this.gridOffsetY % spacingFg;
        
        const startFgX = scrollFgX < 0 ? scrollFgX + spacingFg : scrollFgX;
        for (let x = startFgX - spacingFg; x < this.width + spacingFg; x += spacingFg) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        const startFgY = scrollFgY < 0 ? scrollFgY + spacingFg : scrollFgY;
        for (let y = startFgY - spacingFg; y < this.height + spacingFg; y += spacingFg) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.width, y);
            this.ctx.stroke();
        }
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

                // If pixel is near-black OR pure white background fill (strips sprite sheet borders)
                if ((r < 40 && g < 40 && b < 40) || (r > 220 && g > 220 && b > 220)) {
                    data[i + 3] = 0; // Make transparent
                }
            }

            tCtx.putImageData(imgData, 0, 0);
        } catch (e) {
            console.warn('Unable to process sprite background transparency:', e);
        }
        return tempCanvas;
    }

    drawSamuraiCharacter(ctx, x, y, radius, color, angle, profileKey, isAiming, aimDx, aimDy, hpPercent, trailHistory = [], inChargingZone = false) {
        ctx.save();

        const isCyan = (color === '#00f0ff' || color === '#00ffff' || color.includes('00f0'));
        const spriteCanvas = isCyan ? this.playerSpriteCanvas : this.enemySpriteCanvas;

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

        // 3. DRAW REAL MECHA SAMURAI SPRITE GRAPHIC (Matching Screenshot 2!)
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

        // 4. DYNAMIC AIMING SWORD LASER OVERLAY (Only drawn when aiming drag action!)
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
