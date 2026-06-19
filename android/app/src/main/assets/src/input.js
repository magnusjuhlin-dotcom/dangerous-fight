/* DANGEROUS FIGHT - MOBILE-FIRST TOUCH & KEYBOARD INPUT CONTROLLER */

export class InputController {
    constructor(canvas) {
        this.canvas = canvas;
        
        // Touch tracking variables
        this.touchStartX = 0;
        this.touchStartY = 0;
        this.touchStartTime = 0;
        this.isTrackingTouch = false;
        
        // Settings
        this.minSwipeDistance = 35; // Pixels
        this.maxTapDuration = 220; // Milliseconds
        
        // Callback registration
        this.onSwipe = null; // Called as: onSwipe(dirX, dirY)
        this.onTap = null;   // Called as: onTap()

        // Desktop keyboard key binding states
        this.keys = {};

        this.initEvents();
    }

    initEvents() {
        // --- MOBILE TOUCH LISTENERS ---
        this.canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                this.touchStartX = touch.clientX - rect.left;
                this.touchStartY = touch.clientY - rect.top;
                this.touchStartTime = performance.now();
                this.isTrackingTouch = true;
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            // Prevent panning/zooming during gameplay
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        this.canvas.addEventListener('touchend', (e) => {
            if (!this.isTrackingTouch) return;
            this.isTrackingTouch = false;
            
            const touch = e.changedTouches[0];
            const rect = this.canvas.getBoundingClientRect();
            const endX = touch.clientX - rect.left;
            const endY = touch.clientY - rect.top;
            const duration = performance.now() - this.touchStartTime;

            this.processGesture(this.touchStartX, this.touchStartY, endX, endY, duration);
        }, { passive: false });

        // --- DESKTOP MOUSE FALLBACKS ---
        let isMouseDown = false;
        let mouseStartX = 0;
        let mouseStartY = 0;
        let mouseStartTime = 0;

        this.canvas.addEventListener('mousedown', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            mouseStartX = e.clientX - rect.left;
            mouseStartY = e.clientY - rect.top;
            mouseStartTime = performance.now();
            isMouseDown = true;
        });

        this.canvas.addEventListener('mouseup', (e) => {
            if (!isMouseDown) return;
            isMouseDown = false;
            
            const rect = this.canvas.getBoundingClientRect();
            const endX = e.clientX - rect.left;
            const endY = e.clientY - rect.top;
            const duration = performance.now() - mouseStartTime;

            this.processGesture(mouseStartX, mouseStartY, endX, endY, duration);
        });

        // --- DESKTOP KEYBOARD CONTROLS (WASD/Arrows for Dash, Space for Parry) ---
        window.addEventListener('keydown', (e) => {
            const key = e.code;
            this.keys[key] = true;

            // Trigger Parry instantly on Space
            if (key === 'Space') {
                e.preventDefault();
                if (this.onTap) this.onTap();
            }

            // Keyboard Dash Swipe equivalents (WASD / Arrows)
            let dirX = 0;
            let dirY = 0;
            
            if (key === 'KeyA' || key === 'ArrowLeft') dirX = -1;
            if (key === 'KeyD' || key === 'ArrowRight') dirX = 1;
            if (key === 'KeyW' || key === 'ArrowUp') dirY = -1;
            if (key === 'KeyS' || key === 'ArrowDown') dirY = 1;

            if ((dirX !== 0 || dirY !== 0) && this.onSwipe) {
                // Normalize diagonals if both are pressed, but here it triggers on keydown, so direct vector
                this.onSwipe(dirX, dirY);
            }
        });

        window.addEventListener('keyup', (e) => {
            this.keys[e.code] = false;
        });
    }

    // Determine if the touch/mouse gesture was a Swipe (Dash) or a Tap (Parry)
    processGesture(startX, startY, endX, endY, duration) {
        const dx = endX - startX;
        const dy = endY - startY;
        const distance = Math.sqrt(dx * dx + dy * dy);

        if (distance > this.minSwipeDistance && duration < 350) {
            // It's a swipe! Calculate direction vector
            const dirX = dx / distance;
            const dirY = dy / distance;
            
            if (this.onSwipe) {
                this.onSwipe(dirX, dirY);
            }
        } else if (duration < this.maxTapDuration && distance < 15) {
            // It's a tap!
            if (this.onTap) {
                this.onTap();
            }
        }
    }
}
