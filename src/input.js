/* DANGEROUS FIGHT - HYBRID TOUCH & MOUSE INPUT CONTROLLER */

export class InputController {
    constructor(canvas) {
        this.canvas = canvas;
        
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragCurrentX = 0;
        this.dragCurrentY = 0;
        
        // Callbacks registered by Game
        this.onDragStart = null;
        this.onDragMove = null;
        this.onDragEnd = null;
        this.onKeyboardLaunch = null;

        this.initEvents();
    }

    initEvents() {
        // Helper to translate client coordinates to relative canvas coordinates
        const getCoords = (clientX, clientY) => {
            const rect = this.canvas.getBoundingClientRect();
            return {
                x: clientX - rect.left,
                y: clientY - rect.top
            };
        };

        // --- 1. MOBILE TOUCH LISTENERS (Direct touch event APIs) ---
        this.touchId = null;

        this.canvas.addEventListener('touchstart', (e) => {
            if (this.isDragging) return; // Only track one drag touch at a time

            for (let i = 0; i < e.changedTouches.length; i++) {
                const touch = e.changedTouches[i];
                const coords = getCoords(touch.clientX, touch.clientY);
                
                if (this.onDragStart && this.onDragStart(coords.x, coords.y)) {
                    this.isDragging = true;
                    this.touchId = touch.identifier;
                    this.dragStartX = coords.x;
                    this.dragStartY = coords.y;
                    this.dragCurrentX = coords.x;
                    this.dragCurrentY = coords.y;
                    
                    if (e.cancelable) e.preventDefault();
                    break;
                }
            }
        }, { passive: false });

        this.canvas.addEventListener('touchmove', (e) => {
            if (!this.isDragging) return;
            
            let activeTouch = null;
            for (let i = 0; i < e.touches.length; i++) {
                if (e.touches[i].identifier === this.touchId) {
                    activeTouch = e.touches[i];
                    break;
                }
            }

            if (activeTouch) {
                const coords = getCoords(activeTouch.clientX, activeTouch.clientY);
                this.dragCurrentX = coords.x;
                this.dragCurrentY = coords.y;

                if (this.onDragMove) {
                    this.onDragMove(coords.x - this.dragStartX, coords.y - this.dragStartY);
                }
                if (e.cancelable) e.preventDefault();
            }
        }, { passive: false });

        const handleTouchEnd = (e) => {
            if (!this.isDragging) return;
            
            let endedTouch = null;
            for (let i = 0; i < e.changedTouches.length; i++) {
                if (e.changedTouches[i].identifier === this.touchId) {
                    endedTouch = e.changedTouches[i];
                    break;
                }
            }

            if (endedTouch) {
                this.isDragging = false;
                this.touchId = null;
                
                const coords = getCoords(endedTouch.clientX, endedTouch.clientY);
                this.dragCurrentX = coords.x;
                this.dragCurrentY = coords.y;

                const dx = this.dragCurrentX - this.dragStartX;
                const dy = this.dragCurrentY - this.dragStartY;

                if (this.onDragEnd) {
                    this.onDragEnd(dx, dy);
                }
                if (e.cancelable) e.preventDefault();
            }
        };

        this.canvas.addEventListener('touchend', handleTouchEnd, { passive: false });
        this.canvas.addEventListener('touchcancel', handleTouchEnd, { passive: false });

        // --- 2. DESKTOP MOUSE LISTENERS ---
        this.canvas.addEventListener('mousedown', (e) => {
            const coords = getCoords(e.clientX, e.clientY);
            
            if (this.onDragStart && this.onDragStart(coords.x, coords.y)) {
                this.isDragging = true;
                this.dragStartX = coords.x;
                this.dragStartY = coords.y;
                this.dragCurrentX = coords.x;
                this.dragCurrentY = coords.y;
            }
        });

        window.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            
            const coords = getCoords(e.clientX, e.clientY);
            this.dragCurrentX = coords.x;
            this.dragCurrentY = coords.y;

            if (this.onDragMove) {
                this.onDragMove(coords.x - this.dragStartX, coords.y - this.dragStartY);
            }
        });

        window.addEventListener('mouseup', (e) => {
            if (!this.isDragging) return;
            this.isDragging = false;
            
            const coords = getCoords(e.clientX, e.clientY);
            const dx = coords.x - this.dragStartX;
            const dy = coords.y - this.dragStartY;

            if (this.onDragEnd) {
                this.onDragEnd(dx, dy);
            }
        });

        // --- 3. KEYBOARD FALLBACK ---
        window.addEventListener('keydown', (e) => {
            const key = e.code;
            let dirX = 0;
            let dirY = 0;
            
            if (key === 'KeyA' || key === 'ArrowLeft') dirX = -1;
            if (key === 'KeyD' || key === 'ArrowRight') dirX = 1;
            if (key === 'KeyW' || key === 'ArrowUp') dirY = -1;
            if (key === 'KeyS' || key === 'ArrowDown') dirY = 1;

            if ((dirX !== 0 || dirY !== 0) && this.onKeyboardLaunch) {
                this.onKeyboardLaunch(dirX, dirY);
            }
        });
    }
}
