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
        this.initGamepad();
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
    // --- 4. GAMEPAD (Xbox / standard mapping) ---
    // Polled once per frame from the game loop. In a match the left stick
    // aims like the slingshot (push, release to launch; A launches at once),
    // X / RT fires, Y reads the screen aloud. In menus the d-pad / stick moves
    // a focus ring, A activates, B goes back.
    initGamepad() {
        this.gamepadIndex = null;
        this.gpPrev = { buttons: [], axes: [0, 0] };
        this.gpAiming = false;
        this.gpPeakMag = 0;
        this.gpNavRepeat = 0;
        this.onGamepadShoot = null;
        this.onGamepadSpeak = null;
        this.onGamepadMenu = null;     // (action) => void : 'up'|'down'|'left'|'right'|'confirm'|'back'
        this.isGameplayActive = null;  // () => boolean
        this.onGamepadConnected = null;

        window.addEventListener('gamepadconnected', (e) => {
            this.gamepadIndex = e.gamepad.index;
            if (this.onGamepadConnected) this.onGamepadConnected(e.gamepad);
        });
        window.addEventListener('gamepaddisconnected', (e) => {
            if (this.gamepadIndex === e.gamepad.index) this.gamepadIndex = null;
        });
    }

    getGamepad() {
        if (!navigator.getGamepads) return null;
        const pads = navigator.getGamepads();
        if (this.gamepadIndex !== null && pads[this.gamepadIndex]) return pads[this.gamepadIndex];
        for (const p of pads) {
            if (p && p.connected) { this.gamepadIndex = p.index; if (this.onGamepadConnected) this.onGamepadConnected(p); return p; }
        }
        return null;
    }

    pollGamepad(dt) {
        const gp = this.getGamepad();
        if (!gp) return;

        const pressed = (i) => !!(gp.buttons[i] && (gp.buttons[i].pressed || gp.buttons[i].value > 0.5));
        const wasPressed = (i) => !!this.gpPrev.buttons[i];
        const justPressed = (i) => pressed(i) && !wasPressed(i);

        const dead = 0.22;
        let ax = gp.axes[0] || 0, ay = gp.axes[1] || 0;
        let mag = Math.hypot(ax, ay);
        if (mag < dead) { ax = 0; ay = 0; mag = 0; }

        const inGame = this.isGameplayActive ? this.isGameplayActive() : false;

        if (inGame) {
            // Left stick = slingshot. Push in the direction you want to go.
            if (mag > 0) {
                if (!this.gpAiming) {
                    if (this.onDragStart && this.onDragStart(-1, -1, true)) {
                        this.gpAiming = true;
                        this.gpPeakMag = 0;
                    }
                }
                if (this.gpAiming) {
                    const norm = Math.min(1, (mag - dead) / (1 - dead));
                    this.gpPeakMag = Math.max(this.gpPeakMag, norm);
                    // drag is opposite to the launch direction
                    if (this.onDragMove) this.onDragMove(-ax / mag * 120 * norm, -ay / mag * 120 * norm);
                }
            }
            const releaseNow = this.gpAiming && (mag === 0 || justPressed(0));
            if (releaseNow) {
                this.gpAiming = false;
                if (this.gpPeakMag < 0.35 && mag === 0) {
                    // barely touched the stick: cancel instead of a weak launch
                    if (this.onDragMove) this.onDragMove(0, 0);
                }
                if (this.onDragEnd) this.onDragEnd(0, 0);
            }

            // X or right trigger fires
            if (justPressed(2) || justPressed(7)) {
                if (this.onGamepadShoot) this.onGamepadShoot();
            }
        } else {
            if (this.gpAiming) { this.gpAiming = false; if (this.onDragMove) this.onDragMove(0, 0); if (this.onDragEnd) this.onDragEnd(0, 0); }

            // Menu navigation: d-pad or left stick with auto-repeat
            let dir = null;
            if (pressed(12) || ay < -0.6) dir = 'up';
            else if (pressed(13) || ay > 0.6) dir = 'down';
            else if (pressed(14) || ax < -0.6) dir = 'left';
            else if (pressed(15) || ax > 0.6) dir = 'right';

            if (dir) {
                this.gpNavRepeat -= dt;
                const first = this.gpNavDir !== dir;
                if (first || this.gpNavRepeat <= 0) {
                    if (this.onGamepadMenu) this.onGamepadMenu(dir);
                    this.gpNavRepeat = first ? 380 : 140;
                }
                this.gpNavDir = dir;
            } else {
                this.gpNavDir = null;
                this.gpNavRepeat = 0;
            }

            if (justPressed(0) && this.onGamepadMenu) this.onGamepadMenu('confirm');
            if (justPressed(1) && this.onGamepadMenu) this.onGamepadMenu('back');
        }

        // Y reads the current screen aloud, anywhere
        if (justPressed(3) && this.onGamepadSpeak) this.onGamepadSpeak();

        this.gpPrev.buttons = gp.buttons.map(b => b.pressed || b.value > 0.5);
        this.gpPrev.axes = [ax, ay];
    }
}
