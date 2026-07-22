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

    drawSamuraiCharacter(ctx, x, y, radius, color, angle, profileKey, isAiming, aimDx, aimDy, hpPercent, trailHistory = [], inChargingZone = false) {
        // 1. Draw ghost trails (afterimages) if Ninja (hammer) or moving fast
        if (trailHistory && trailHistory.length > 0) {
            trailHistory.forEach((pt, idx) => {
                const opacity = (idx + 1) / (trailHistory.length + 1) * 0.28;
                ctx.save();
                this.setNeonGlow(color, 8);
                ctx.strokeStyle = color;
                ctx.globalAlpha = opacity;
                ctx.lineWidth = 2.5;
                
                const ptDirX = Math.cos(pt.angle);
                const ptDirY = Math.sin(pt.angle);
                const ptPerpX = -ptDirY;
                const ptPerpY = ptDirX;
                
                // Draw head
                ctx.beginPath();
                ctx.arc(pt.x + ptDirX * (radius * 0.5), pt.y + ptDirY * (radius * 0.5), radius * 0.35, 0, Math.PI * 2);
                ctx.stroke();
                
                // Draw torso
                const ptTorsoTopX = pt.x + ptDirX * (radius * 0.2);
                const ptTorsoTopY = pt.y + ptDirY * (radius * 0.2);
                const ptTorsoBottomX = pt.x - ptDirX * (radius * 0.4);
                const ptTorsoBottomY = pt.y - ptDirY * (radius * 0.4);
                ctx.beginPath();
                ctx.moveTo(ptTorsoBottomX, ptTorsoBottomY);
                ctx.lineTo(ptTorsoTopX, ptTorsoTopY);
                ctx.stroke();
                
                // Draw legs
                ctx.beginPath();
                ctx.moveTo(ptTorsoBottomX, ptTorsoBottomY);
                ctx.lineTo(ptTorsoBottomX - ptDirX * (radius * 0.4) - ptPerpX * (radius * 0.25), ptTorsoBottomY - ptDirY * (radius * 0.4) - ptPerpY * (radius * 0.25));
                ctx.moveTo(ptTorsoBottomX, ptTorsoBottomY);
                ctx.lineTo(ptTorsoBottomX - ptDirX * (radius * 0.4) + ptPerpX * (radius * 0.25), ptTorsoBottomY - ptDirY * (radius * 0.4) + ptPerpY * (radius * 0.25));
                ctx.stroke();

                ctx.restore();
            });
        }

        ctx.save();
        
        // 2. Draw Ki Guard Ring Shield
        if (inChargingZone && !isAiming) {
            ctx.save();
            const pulse = 1.0 + Math.sin(Date.now() * 0.007) * 0.08;
            this.setNeonGlow(color, 15);
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.5;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.arc(x, y, radius * 1.55 * pulse, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Torso
        this.setNeonGlow(color, 12);
        ctx.strokeStyle = color;
        ctx.lineWidth = 3.5;
        ctx.lineCap = 'round';
        
        const dirX = Math.cos(angle);
        const dirY = Math.sin(angle);
        const perpX = -dirY;
        const perpY = dirX;
        
        const torsoTopX = x + dirX * (radius * 0.2);
        const torsoTopY = y + dirY * (radius * 0.2);
        const torsoBottomX = x - dirX * (radius * 0.4);
        const torsoBottomY = y - dirY * (radius * 0.4);
        
        // Torso Line
        ctx.beginPath();
        ctx.moveTo(torsoBottomX, torsoBottomY);
        ctx.lineTo(torsoTopX, torsoTopY);
        ctx.stroke();

        // 3. Draw Legs (makes it a real stickman!)
        const leftHipX = torsoBottomX - perpX * (radius * 0.15);
        const leftHipY = torsoBottomY - perpY * (radius * 0.15);
        const rightHipX = torsoBottomX + perpX * (radius * 0.15);
        const rightHipY = torsoBottomY + perpY * (radius * 0.15);

        const leftFootX = leftHipX - dirX * (radius * 0.45) - perpX * (radius * 0.2);
        const leftFootY = leftHipY - dirY * (radius * 0.45) - perpY * (radius * 0.2);
        const rightFootX = rightHipX - dirX * (radius * 0.45) + perpX * (radius * 0.2);
        const rightFootY = rightHipY - dirY * (radius * 0.45) + perpY * (radius * 0.2);

        ctx.beginPath();
        // Left Leg
        ctx.moveTo(leftHipX, leftHipY);
        ctx.lineTo(leftFootX, leftFootY);
        // Right Leg
        ctx.moveTo(rightHipX, rightHipY);
        ctx.lineTo(rightFootX, rightFootY);
        ctx.stroke();
        
        // Draw Shoulders
        const leftShoulderX = torsoTopX - perpX * (radius * 0.35);
        const leftShoulderY = torsoTopY - perpY * (radius * 0.35);
        const rightShoulderX = torsoTopX + perpX * (radius * 0.35);
        const rightShoulderY = torsoTopY + perpY * (radius * 0.35);
        
        ctx.beginPath();
        ctx.moveTo(leftShoulderX, leftShoulderY);
        ctx.lineTo(rightShoulderX, rightShoulderY);
        ctx.stroke();
        
        // Draw Head
        const headX = x + dirX * (radius * 0.5);
        const headY = y + dirY * (radius * 0.5);
        ctx.fillStyle = '#0f0f1b';
        ctx.beginPath();
        ctx.arc(headX, headY, radius * 0.35, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        // Glowing visor slit (Exactly like the cyber-mask on the picture!)
        ctx.save();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(headX - perpX * (radius * 0.2) + dirX * (radius * 0.1), headY - perpY * (radius * 0.2) + dirY * (radius * 0.1));
        ctx.lineTo(headX + perpX * (radius * 0.2) + dirX * (radius * 0.1), headY + perpY * (radius * 0.2) + dirY * (radius * 0.1));
        ctx.stroke();
        ctx.restore();
        
        // 4. Draw flowing cyber-scarf/obi for Cyber Ronin (katana)
        if (profileKey === 'katana') {
            ctx.save();
            this.setNeonGlow(color, 12);
            ctx.strokeStyle = color;
            ctx.lineWidth = 3.5;
            ctx.lineCap = 'round';
            
            const neckX = x + dirX * (radius * 0.3);
            const neckY = y + dirY * (radius * 0.3);
            
            const waveOffset = Math.sin(Date.now() * 0.012) * 6;
            const oppositeAngle = angle + Math.PI;
            
            ctx.beginPath();
            ctx.moveTo(neckX, neckY);
            const midX = neckX + Math.cos(oppositeAngle) * (radius * 0.7) + Math.cos(oppositeAngle + Math.PI/2) * waveOffset;
            const midY = neckY + Math.sin(oppositeAngle) * (radius * 0.7) + Math.sin(oppositeAngle + Math.PI/2) * waveOffset;
            const endX = neckX + Math.cos(oppositeAngle) * (radius * 1.4) - Math.cos(oppositeAngle + Math.PI/2) * waveOffset * 0.5;
            const endY = neckY + Math.sin(oppositeAngle) * (radius * 1.4) - Math.sin(oppositeAngle + Math.PI/2) * waveOffset * 0.5;
            
            ctx.quadraticCurveTo(midX, midY, endX, endY);
            ctx.stroke();
            ctx.restore();
        }

        // Draw Hat/Helmet based on profile
        this.resetNeonGlow();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2;
        if (profileKey === 'blades') {
            // Samurai Shogun Helmet (Kabuto)
            ctx.beginPath();
            ctx.arc(headX, headY - radius * 0.1, radius * 0.3, Math.PI, 0);
            ctx.stroke();
            
            // Large Golden Crescent Horns
            ctx.save();
            this.setNeonGlow('#ffaa00', 10);
            ctx.strokeStyle = '#ffaa00';
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.arc(headX - radius * 0.18, headY - radius * 0.25, radius * 0.25, Math.PI * 0.5, Math.PI * 1.35, false);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(headX + radius * 0.18, headY - radius * 0.25, radius * 0.25, Math.PI * 0.5, Math.PI * 1.65, true);
            ctx.stroke();
            ctx.restore();
        } else {
            // Straw Hat (Ronin / Ninja) - Cyber kasa with glowing neon rim!
            ctx.fillStyle = '#1b1b22';
            ctx.beginPath();
            ctx.moveTo(headX - perpX * (radius * 0.6) - dirX * (radius * 0.1), headY - perpY * (radius * 0.6) - dirY * (radius * 0.1));
            ctx.lineTo(headX + dirX * (radius * 0.35), headY + dirY * (radius * 0.35)); // peak
            ctx.lineTo(headX + perpX * (radius * 0.6) - dirX * (radius * 0.1), headY + perpY * (radius * 0.6) - dirY * (radius * 0.1));
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Glowing cyan rim for Ronin hat
            ctx.save();
            this.setNeonGlow(color, 10);
            ctx.strokeStyle = color;
            ctx.lineWidth = 2.5;
            ctx.beginPath();
            ctx.moveTo(headX - perpX * (radius * 0.6) - dirX * (radius * 0.1), headY - perpY * (radius * 0.6) - dirY * (radius * 0.1));
            ctx.lineTo(headX + perpX * (radius * 0.6) - dirX * (radius * 0.1), headY + perpY * (radius * 0.6) - dirY * (radius * 0.1));
            ctx.stroke();
            ctx.restore();
        }
        
        // Draw Katana (sword)
        this.setNeonGlow(color, 16);
        ctx.strokeStyle = '#ffffff';
        ctx.shadowColor = color;
        ctx.lineWidth = 2.5;
        
        let swordAngle = angle + Math.PI * 0.25;
        if (isAiming) {
            swordAngle = Math.atan2(-aimDy, -aimDx) - Math.PI * 0.15;
        }
        
        const handX = x + perpX * (radius * 0.4);
        const handY = y + perpY * (radius * 0.4);
        const swordLength = radius * 1.35;
        const swordEndX = handX + Math.cos(swordAngle) * swordLength;
        const swordEndY = handY + Math.sin(swordAngle) * swordLength;
        
        ctx.beginPath();
        ctx.moveTo(handX, handY);
        ctx.lineTo(swordEndX, swordEndY);
        ctx.stroke();
        
        // Draw Hilt (Tsuba)
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(handX - Math.sin(swordAngle) * 4, handY + Math.cos(swordAngle) * 4);
        ctx.lineTo(handX + Math.sin(swordAngle) * 4, handY - Math.cos(swordAngle) * 4);
        ctx.stroke();

        // 5. Draw Arms (connecting shoulders to hands)
        this.resetNeonGlow();
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        // Arm holding the sword
        ctx.moveTo(leftShoulderX, leftShoulderY);
        ctx.lineTo(handX, handY);
        // Free arm in fighting pose
        const freeHandX = rightShoulderX + dirX * (radius * 0.1) + perpX * (radius * 0.3);
        const freeHandY = rightShoulderY + dirY * (radius * 0.1) + perpY * (radius * 0.3);
        ctx.moveTo(rightShoulderX, rightShoulderY);
        ctx.lineTo(freeHandX, freeHandY);
        ctx.stroke();
        
        // Draw simple health bar above head
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(x - 20, y - radius - 15, 40, 4);
        ctx.fillStyle = color;
        ctx.fillRect(x - 20, y - radius - 15, hpPercent * 40, 4);
        
        ctx.restore();
    }
}
