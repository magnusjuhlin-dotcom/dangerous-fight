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

    // Update screen shake offsets over time
    update(deltaTime) {
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

    // Clear screen with custom background trails (creates amazing motion blur)
    clear(opacity = 0.25) {
        // Clear with a slight transparency to let neon trails fade beautifully
        this.ctx.fillStyle = `rgba(10, 10, 15, ${opacity})`;
        this.ctx.fillRect(0, 0, this.width, this.height);
        
        // Subtle futuristic grid lines background
        this.drawGrid();
    }

    // Ambient cyberpunk background grid
    drawGrid() {
        const gridSpacing = 60;
        this.ctx.strokeStyle = 'rgba(0, 240, 255, 0.02)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.width; x += gridSpacing) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.height);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.height; y += gridSpacing) {
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
}
