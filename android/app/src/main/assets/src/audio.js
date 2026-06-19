/* DANGEROUS FIGHT - PROCEDURAL CYBERPUNK SOUND EFFECTS SYNTHESIZER */
/* Uses the HTML5 Web Audio API to generate retro-futuristic sound effects procedurally. */

export class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        
        // Listeners to activate AudioContext on user interaction
        const unlock = () => {
            this.init();
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchstart', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchstart', unlock);
    }

    init() {
        if (this.ctx) return;
        try {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
        } catch (e) {
            console.warn("Web Audio API is not supported in this browser:", e);
            this.enabled = false;
        }
    }

    // Ensure AudioContext is running (resumes if suspended by browser)
    async resume() {
        this.init();
        if (this.ctx && this.ctx.state === 'suspended') {
            try {
                await this.ctx.resume();
            } catch (e) {
                // Silently absorb browser autoplay blocking exceptions
            }
        }
    }

    playClick() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(150, this.ctx.currentTime + 0.05);
        
        gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
        gain.gain.linearRampToValueAtTime(0.001, this.ctx.currentTime + 0.05);
        
        osc.start();
        osc.stop(this.ctx.currentTime + 0.05);
    }

    playSlash(type = 'katana') {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        if (type === 'katana') {
            // High speed metal swish
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(1800, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.12);

            filter.type = 'highpass';
            filter.frequency.setValueAtTime(2000, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.12);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
            
            osc.start(now);
            osc.stop(now + 0.15);
            
        } else if (type === 'blades') {
            // Ultra-fast plasma buzz
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(3000, now);
            osc.frequency.exponentialRampToValueAtTime(600, now + 0.08);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2500, now);
            filter.frequency.exponentialRampToValueAtTime(400, now + 0.08);
            filter.Q.setValueAtTime(5, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.12, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
            
            osc.start(now);
            osc.stop(now + 0.09);

        } else if (type === 'hammer') {
            // Heavy cyber smash swoop
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(250, now);
            osc.frequency.exponentialRampToValueAtTime(35, now + 0.3);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(400, now);
            filter.frequency.exponentialRampToValueAtTime(70, now + 0.3);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.25, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);
            
            osc.start(now);
            osc.stop(now + 0.35);
        }
    }

    playDodge() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        const now = this.ctx.currentTime;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(200, now);
        osc.frequency.exponentialRampToValueAtTime(1400, now + 0.15);
        
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.08, now + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        osc.start(now);
        osc.stop(now + 0.16);
    }

    playParry() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        // 1. Crystal ringing bell sound
        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        // 2. High laser counter shield charge (sweeps up)
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain2 = this.ctx.createGain();
        osc2.connect(filter);
        filter.connect(gain2);
        gain2.connect(this.ctx.destination);

        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(400, now);
        osc2.frequency.exponentialRampToValueAtTime(2200, now + 0.25);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(500, now);
        filter.frequency.exponentialRampToValueAtTime(2000, now + 0.25);
        filter.Q.setValueAtTime(8, now);

        gain2.gain.setValueAtTime(0.001, now);
        gain2.gain.linearRampToValueAtTime(0.12, now + 0.05);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.3);
    }

    playClash() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        // Ringing metallic spike
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.setValueAtTime(1600, now + 0.01);
        
        gain.gain.setValueAtTime(0.15, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        // Buzzing impact core
        const osc2 = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain2 = this.ctx.createGain();
        
        osc2.connect(filter);
        filter.connect(gain2);
        gain2.connect(this.ctx.destination);
        
        osc2.type = 'sawtooth';
        osc2.frequency.setValueAtTime(180, now);
        osc2.frequency.exponentialRampToValueAtTime(30, now + 0.15);

        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(600, now);
        filter.frequency.linearRampToValueAtTime(100, now + 0.15);

        gain2.gain.setValueAtTime(0.2, now);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc2.start(now);
        osc.stop(now + 0.25);
        osc2.stop(now + 0.16);
    }

    playHit() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;

        // Heavy low frequency impact drum
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(120, now);
        osc.frequency.exponentialRampToValueAtTime(20, now + 0.2);

        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

        // Static electrical explosion white noise
        const bufferSize = this.ctx.sampleRate * 0.15; // 0.15 seconds of noise
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }

        const noiseNode = this.ctx.createBufferSource();
        noiseNode.buffer = buffer;

        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'bandpass';
        noiseFilter.frequency.setValueAtTime(400, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(100, now + 0.15);

        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.12, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        noiseNode.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);

        osc.start(now);
        noiseNode.start(now);
        
        osc.stop(now + 0.25);
        noiseNode.stop(now + 0.16);
    }

    playUpgrade() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        const melody = [300, 450, 600, 900];
        const noteDuration = 0.08;

        melody.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, now + index * noteDuration);
            
            gain.gain.setValueAtTime(0.001, now + index * noteDuration);
            gain.gain.linearRampToValueAtTime(0.08, now + index * noteDuration + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * noteDuration + noteDuration * 1.5);
            
            osc.start(now + index * noteDuration);
            osc.stop(now + index * noteDuration + noteDuration * 2);
        });
    }

    playVictory() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        // Uplifting cyberpunk neon minor-to-major synth lead
        const notes = [293.66, 349.23, 440.00, 523.25, 587.33, 698.46, 880.00]; // D minor pentatonic rising
        const duration = 0.12;

        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + index * duration * 0.8);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(2000, now + index * duration * 0.8);
            
            gain.gain.setValueAtTime(0.001, now + index * duration * 0.8);
            gain.gain.linearRampToValueAtTime(0.05, now + index * duration * 0.8 + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * duration * 0.8 + 0.3);
            
            osc.start(now + index * duration * 0.8);
            osc.stop(now + index * duration * 0.8 + 0.45);
        });
    }

    playDefeat() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        // Distorted, falling sorrowful low chord
        const notes = [220.00, 164.81, 110.00]; // Falling A minor chord
        const duration = 0.25;

        notes.forEach((freq, index) => {
            const osc = this.ctx.createOscillator();
            const filter = this.ctx.createBiquadFilter();
            const gain = this.ctx.createGain();
            
            osc.connect(filter);
            filter.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(freq, now + index * duration * 0.5);
            osc.frequency.linearRampToValueAtTime(freq - 15, now + index * duration * 0.5 + 0.8);
            
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(500, now + index * duration * 0.5);
            
            gain.gain.setValueAtTime(0.001, now + index * duration * 0.5);
            gain.gain.linearRampToValueAtTime(0.08, now + index * duration * 0.5 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + index * duration * 0.5 + 0.9);
            
            osc.start(now + index * duration * 0.5);
            osc.stop(now + index * duration * 0.5 + 1.0);
        });
    }
}
