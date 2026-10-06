/* DANGEROUS FIGHT - SETTINGS: volumes, voice, vibration, difficulty */
/* Kept in their own localStorage entry (not in the game save), so they are
   per device and survive anything that resets progress. */

export class Settings {
    constructor() {
        this.key = 'dangerous_fight_settings';
        this.values = {
            music: 0.8,       // 0..1
            effects: 1.0,     // 0..1
            voice: true,      // narrator lines and read-aloud
            vibration: true,  // phone buzz on hits
            difficulty: 'normal' // 'easy' | 'normal' | 'hard' (matches against the computer)
        };
        try {
            const saved = JSON.parse(localStorage.getItem(this.key));
            if (saved && typeof saved === 'object') {
                if (typeof saved.music === 'number') this.values.music = Math.min(1, Math.max(0, saved.music));
                if (typeof saved.effects === 'number') this.values.effects = Math.min(1, Math.max(0, saved.effects));
                if (typeof saved.voice === 'boolean') this.values.voice = saved.voice;
                if (typeof saved.vibration === 'boolean') this.values.vibration = saved.vibration;
                if (['easy', 'normal', 'hard'].includes(saved.difficulty)) this.values.difficulty = saved.difficulty;
            }
        } catch (e) {}
        this.listeners = [];
    }

    get(name) { return this.values[name]; }

    set(name, value) {
        this.values[name] = value;
        try { localStorage.setItem(this.key, JSON.stringify(this.values)); } catch (e) {}
        this.listeners.forEach((fn) => fn(name, value));
    }

    onChange(fn) { this.listeners.push(fn); }

    // A short buzz on the phone. `pattern` is ms, or [on, off, on...] ms.
    vibrate(pattern) {
        if (!this.values.vibration) return;
        if (window.game && window.game.trailer && window.game.trailer.active) return; // the trailer is just for watching
        try {
            // the Android app's own vibrator works without a tap in the page first
            if (window.AndroidHaptics && window.AndroidHaptics.vibrate) {
                window.AndroidHaptics.vibrate(String(Array.isArray(pattern) ? pattern.join(',') : pattern));
            } else if (navigator.vibrate) {
                navigator.vibrate(pattern);
            }
        } catch (e) {}
    }
}
