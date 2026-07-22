
/* --- BUNDLED FROM: src/audio.js --- */
/* DANGEROUS FIGHT - PROCEDURAL CYBERPUNK SOUND EFFECTS SYNTHESIZER */
/* Uses the HTML5 Web Audio API to generate retro-futuristic sound effects procedurally. */

class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;
        
        this.musicPlaying = false;
        this.musicInterval = null;
        
        // Listeners to activate AudioContext on user interaction (touchend/click are safe mobile gestures)
        const unlock = () => {
            this.init();
            this.startMusic();
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchend', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchend', unlock);
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
            // Razor-sharp sword slash whoosh
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(2000, now);
            osc.frequency.exponentialRampToValueAtTime(180, now + 0.18);

            filter.type = 'bandpass';
            filter.frequency.setValueAtTime(2200, now);
            filter.frequency.exponentialRampToValueAtTime(300, now + 0.18);
            filter.Q.setValueAtTime(2.5, now);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.3, now + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            // Add a bit of white noise whoosh for air displacement
            const bufferSize = this.ctx.sampleRate * 0.2;
            const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = Math.random() * 2 - 1;
            }
            const noise = this.ctx.createBufferSource();
            noise.buffer = buffer;
            const noiseFilter = this.ctx.createBiquadFilter();
            noiseFilter.type = 'bandpass';
            noiseFilter.frequency.setValueAtTime(3000, now);
            noiseFilter.frequency.exponentialRampToValueAtTime(500, now + 0.18);
            const noiseGain = this.ctx.createGain();
            noiseGain.gain.setValueAtTime(0.18, now);
            noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
            
            noise.connect(noiseFilter);
            noiseFilter.connect(noiseGain);
            noiseGain.connect(this.ctx.destination);
            
            noise.start(now);
            noise.stop(now + 0.2);
            
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'blades') {
            // Heavy Truck launch rumble
            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(350, now);
            osc.frequency.exponentialRampToValueAtTime(60, now + 0.28);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(600, now);
            filter.frequency.exponentialRampToValueAtTime(90, now + 0.28);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.28, now + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
            
            osc.start(now);
            osc.stop(now + 0.32);

        } else if (type === 'hammer') {
            // Speedy Cycle rapid whizz
            osc.type = 'sine';
            osc.frequency.setValueAtTime(1800, now);
            osc.frequency.exponentialRampToValueAtTime(400, now + 0.1);

            gain.gain.setValueAtTime(0.001, now);
            gain.gain.linearRampToValueAtTime(0.15, now + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
            
            osc.start(now);
            osc.stop(now + 0.12);
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

    // Sound effect for firing laser projectile
    playShoot() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc = this.ctx.createOscillator();
        const filter = this.ctx.createBiquadFilter();
        const gain = this.ctx.createGain();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        const now = this.ctx.currentTime;

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(900, now);
        osc.frequency.exponentialRampToValueAtTime(320, now + 0.18);

        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1200, now);
        filter.frequency.exponentialRampToValueAtTime(400, now + 0.18);
        filter.Q.setValueAtTime(4, now);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.12, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

        osc.start(now);
        osc.stop(now + 0.2);
    }

    playParry() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const osc1 = this.ctx.createOscillator();
        const gain1 = this.ctx.createGain();
        osc1.connect(gain1);
        gain1.connect(this.ctx.destination);

        const now = this.ctx.currentTime;
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1200, now);
        
        gain1.gain.setValueAtTime(0.18, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.start(now);
        osc1.stop(now + 0.6);
    }

    playClash() {
        this.resume();
        if (!this.enabled || !this.ctx) return;

        const now = this.ctx.currentTime;
        
        // 1. HIGH-FREQUENCY RESOCLASH (Metallic ringing chime of blades hitting)
        const freqs = [800, 1150, 1600, 2200, 3100];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.98, now + 0.5);
            
            const duration = 0.3 + idx * 0.08;
            gain.gain.setValueAtTime(0.08, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.05);
        });

        // 2. STEEL FRICTION / SCRAPE (High-passed white noise for the blade scrape)
        const bufferSize = this.ctx.sampleRate * 0.2; // 0.2 seconds
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(2500, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(8000, now + 0.15);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.15, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.2);

        // 3. LOW IMPACT PUNCH (Solid heavy thud of vehicles colliding)
        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.connect(punchGain);
        punchGain.connect(this.ctx.destination);
        
        punchOsc.type = 'triangle';
        punchOsc.frequency.setValueAtTime(150, now);
        punchOsc.frequency.exponentialRampToValueAtTime(40, now + 0.12);
        
        punchGain.gain.setValueAtTime(0.25, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        
        punchOsc.start(now);
        punchOsc.stop(now + 0.16);
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
        const notes = [293.66, 349.23, 440.00, 523.25, 587.33, 698.46, 880.00];
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
        const notes = [220.00, 164.81, 110.00];
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

    // Triggers SpeechSynthesis voice announcement saying "Dangerous fight is coming" in a bass voice
    playVoiceIntro(isHardBoss = false) {
        // Play an epic sub-bass drop to enhance the bass experience!
        this.playVoiceSubBassDrop();

        try {
            const text = isHardBoss ? "Warning. Boss fight is coming." : "Dangerous fight is coming";
            if (window.AndroidTTS) {
                window.AndroidTTS.speak(text);
            } else if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                utterance.pitch = 0.45; // Deep bass voice
                utterance.rate = 0.82;  // Slightly slower for epic build-up
                
                // Try to find a male English voice
                const voices = window.speechSynthesis.getVoices();
                const maleVoice = voices.find(voice => {
                    const name = voice.name.toLowerCase();
                    return voice.lang.startsWith('en') && 
                           (name.includes('male') || name.includes('david') || name.includes('microsoft') || name.includes('google us english'));
                });
                
                if (maleVoice) {
                    utterance.voice = maleVoice;
                }
                
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.warn("Failed to play SpeechSynthesis announcement:", e);
        }
    }

    // Procedurally synthesize a dramatic movie-trailer sub-bass drop
    playVoiceSubBassDrop() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        
        const now = this.ctx.currentTime;
        
        const subOsc = this.ctx.createOscillator();
        const subGain = this.ctx.createGain();
        const subFilter = this.ctx.createBiquadFilter();
        
        subOsc.connect(subFilter);
        subFilter.connect(subGain);
        subGain.connect(this.ctx.destination);
        
        subOsc.type = 'sine';
        // Pitch sweep from 90Hz down to 35Hz
        subOsc.frequency.setValueAtTime(90, now);
        subOsc.frequency.exponentialRampToValueAtTime(35, now + 2.0);
        
        subFilter.type = 'lowpass';
        subFilter.frequency.setValueAtTime(80, now);
        
        subGain.gain.setValueAtTime(0, now);
        subGain.gain.linearRampToValueAtTime(0.4, now + 0.1); // high gain for booming bass!
        subGain.gain.exponentialRampToValueAtTime(0.001, now + 2.5);
        
        // Add a secondary low-frequency harmonic (triangle wave) at low volume to give warm presence
        const warmOsc = this.ctx.createOscillator();
        const warmGain = this.ctx.createGain();
        warmOsc.connect(subFilter);
        subFilter.connect(warmGain);
        warmGain.connect(this.ctx.destination);
        
        warmOsc.type = 'triangle';
        warmOsc.frequency.setValueAtTime(180, now); // 2nd harmonic
        warmOsc.frequency.exponentialRampToValueAtTime(70, now + 2.0);
        
        warmGain.gain.setValueAtTime(0, now);
        warmGain.gain.linearRampToValueAtTime(0.15, now + 0.1);
        warmGain.gain.exponentialRampToValueAtTime(0.001, now + 2.2);
        
        subOsc.start(now);
        warmOsc.start(now);
        subOsc.stop(now + 2.6);
        warmOsc.stop(now + 2.6);
    }

    // Start background music loop (sequenced Japanese pentatonic Hirajoshi theme)
    startMusic() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        if (this.musicPlaying) return;
        this.musicPlaying = true;
        
        this.musicStep = 0;
        this.nextNoteTime = this.ctx.currentTime;
        
        const scheduler = () => {
            if (!this.musicPlaying) return;
            
            // Catch up if nextNoteTime fell behind due to initial load delay or tab-suspension
            if (this.nextNoteTime < this.ctx.currentTime) {
                this.nextNoteTime = this.ctx.currentTime;
            }
            
            // Schedule notes ahead of time
            while (this.nextNoteTime < this.ctx.currentTime + 0.1) {
                this.scheduleMelodyStep(this.musicStep, this.nextNoteTime);
                this.nextNoteTime += 0.22; // step duration: 220ms
                this.musicStep = (this.musicStep + 1) % 16;
            }
            this.musicInterval = setTimeout(scheduler, 50);
        };
        scheduler();
    }

    // Stop background music loop
    stopMusic() {
        this.musicPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
    }

    scheduleMelodyStep(step, time) {
        // Taiko drum beats on downbeats (0, 4, 8, 12)
        if (step === 0 || step === 4 || step === 8 || step === 12) {
            this.playTaiko(time);
        }
        
        // Bass drone at the start of each bar (every 8 steps, duration is 1.7s)
        if (step === 0) {
            this.playDrone(82.41, time, 1.6); // E2
        } else if (step === 8) {
            this.playDrone(110.00, time, 1.6); // A2
        }
        
        // Hirajoshi scale melody note frequencies:
        // E3: 164.81, F3: 174.61, A3: 220.00, B3: 246.94, C4: 261.63, E4: 329.63, F4: 349.23, A4: 440.00
        const melody = [
            164.81, // 0: E3
            220.00, // 1: A3
            164.81, // 2: E3
            246.94, // 3: B3
            220.00, // 4: A3
            261.63, // 5: C4
            220.00, // 6: A3
            329.63, // 7: E4
            174.61, // 8: F3
            220.00, // 9: A3
            174.61, // 10: F3
            261.63, // 11: C4
            220.00, // 12: A3
            349.23, // 13: F4
            329.63, // 14: E4
            246.94  // 15: B3
        ];
        
        // Play koto melody notes with basic syncopation
        const rests = [false, false, false, true, false, false, false, true, false, false, false, true, false, false, false, false];
        if (!rests[step]) {
            this.playKoto(melody[step], time);
        }
    }

    // Synthesize a plucky, hollow Japanese koto/shamisen sound
    playKoto(freq, time) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'triangle';
        
        // Pluck sweep
        osc.frequency.setValueAtTime(freq * 1.4, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.03);
        
        // Hollow bandpass filter
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(freq * 2.2, time);
        filter.frequency.exponentialRampToValueAtTime(freq * 1.1, time + 0.18);
        filter.Q.setValueAtTime(4, time);
        
        // Volume envelope
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.08, time + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.38);
        
        osc.start(time);
        osc.stop(time + 0.4);
    }

    // Synthesize a heavy, deep Japanese taiko drum boom
    playTaiko(time) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.15);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.24, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
        
        osc.start(time);
        osc.stop(time + 0.35);
    }

    // Synthesize a low frequency cyberpunk drone
    playDrone(freq, time, duration) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filter = this.ctx.createBiquadFilter();
        
        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, time);
        
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(110, time);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.045, time + 0.08);
        gain.gain.linearRampToValueAtTime(0.045, time + duration - 0.08);
        gain.gain.linearRampToValueAtTime(0.001, time + duration);
        
        osc.start(time);
        osc.stop(time + duration);
    }
}


/* --- BUNDLED FROM: src/canvas.js --- */
/* DANGEROUS FIGHT - HIGH-PERFORMANCE 2D NEON CANVAS CONTROLLER */

class CanvasController {
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


/* --- BUNDLED FROM: src/particles.js --- */
/* DANGEROUS FIGHT - HIGH-PERFORMANCE NEON PARTICLE CONTROLLER */

class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, type = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life; // Remaining time in ms
        this.decay = decay; // Subtracted from life per ms
        this.type = type; // 'spark', 'dust', 'block', 'ring'
        this.alpha = 1;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.01;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.alpha = Math.max(0, this.life / this.maxLife);
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        if (this.type === 'spark') {
            // Slight gravity for sparks
            this.vy += 0.0003 * deltaTime;
            this.vx *= Math.pow(0.99, deltaTime / 16);
        } else if (this.type === 'block') {
            // High drag for debris blocks
            this.vx *= Math.pow(0.95, deltaTime / 16);
            this.vy *= Math.pow(0.95, deltaTime / 16);
            this.angle += this.rotSpeed * deltaTime;
        } else if (this.type === 'ring') {
            // Expansion
            this.size += 0.15 * deltaTime;
        }
        
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark') {
            // Draw glowing laser line
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 10;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 15, this.y - this.vy * 15);
            ctx.stroke();
            
        } else if (this.type === 'block') {
            // Draw rotating digital glowing block
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.fillStyle = this.color;
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
            
        } else if (this.type === 'dust') {
            // Gentle ambient circles
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
            
        } else if (this.type === 'ring') {
            // Shockwave ring
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 15;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();
        }
        
        ctx.restore();
    }
}

// Draw static trails that fade out separately for optimal performance
class SwordTrail {
    constructor(points, color, width, life = 180) {
        this.points = points; // Array of {x, y}
        this.color = color;
        this.width = width;
        this.maxLife = life;
        this.life = life;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }

    draw(ctx) {
        if (this.points.length < 2) return;
        
        ctx.save();
        const alpha = Math.max(0, this.life / this.maxLife);
        ctx.globalAlpha = alpha;
        
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 20;
        ctx.strokeStyle = this.color;
        ctx.lineWidth = this.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.beginPath();
        ctx.moveTo(this.points[0].x, this.points[0].y);
        for (let i = 1; i < this.points.length; i++) {
            ctx.lineTo(this.points[i].x, this.points[i].y);
        }
        ctx.stroke();
        
        ctx.restore();
    }
}

class ParticleSystem {
    constructor() {
        this.particles = [];
        this.trails = [];
    }

    update(deltaTime) {
        this.particles = this.particles.filter(p => p.update(deltaTime));
        this.trails = this.trails.filter(t => t.update(deltaTime));
    }

    draw(ctx) {
        // Draw trails first so they render under particles
        this.trails.forEach(t => t.draw(ctx));
        this.particles.forEach(p => p.draw(ctx));
    }

    clear() {
        this.particles = [];
        this.trails = [];
    }

    // Add glowing ambient background dust particles
    spawnAmbience(width, height, count = 1) {
        if (this.particles.length > 150) return; // Prevent performance drops
        
        for (let i = 0; i < count; i++) {
            const x = Math.random() * width;
            const y = Math.random() * height;
            const size = Math.random() * 1.5 + 0.5;
            const vy = -(Math.random() * 0.01 + 0.005); // Float upwards slowly
            const vx = (Math.random() - 0.5) * 0.005;
            
            const color = Math.random() > 0.5 ? 'rgba(0, 240, 255, 0.15)' : 'rgba(255, 0, 119, 0.15)';
            const life = Math.random() * 6000 + 4000;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'dust'));
        }
    }

    // Sword clash spark shower
    spawnClashSparks(x, y, color) {
        const count = Math.floor(Math.random() * 20) + 25; // increased spark count
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.55 + 0.20; // wider velocity spread
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 2.5 + 1.5;
            const life = Math.random() * 400 + 250; // longer lifespan
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'spark'));
        }
    }

    // Exploding digital glitch blocks upon damage
    spawnDigitalBleed(x, y, color, impactDirX = 0, impactDirY = 0) {
        const count = Math.floor(Math.random() * 8) + 10;
        
        for (let i = 0; i < count; i++) {
            // Blast direction biased towards impact direction
            const angle = Math.atan2(impactDirY, impactDirX) + (Math.random() - 0.5) * 1.5;
            const speed = Math.random() * 0.35 + 0.1;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            
            const size = Math.random() * 6 + 4; // Fyrkantiga blocks
            const life = Math.random() * 400 + 300;
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'block'));
        }
    }

    // Expanding action wave (dash ripple / shield break)
    spawnShockwave(x, y, color, maxRadius = 80) {
        const life = 350; // Milliseconds
        const decay = 1;
        this.particles.push(new Particle(x, y, 0, 0, color, 10, life, decay, 'ring'));
    }

    // Add blade sword trail lines
    addSwordTrail(points, color, width = 6) {
        // Deep copy of points so entity movement doesn't alter past trail points
        const pointsCopy = points.map(p => ({ x: p.x, y: p.y }));
        this.trails.push(new SwordTrail(pointsCopy, color, width));
    }
}


/* --- BUNDLED FROM: src/upgrades.js --- */
/* DANGEROUS FIGHT - PERSISTENCE & UPGRADES STATE MANAGER */

class UpgradeManager {
    constructor() {
        this.saveKey = 'dangerous_fight_save_v1';
        
        // Initial Game State (persistent across plays)
        this.state = {
            credits: 0,
            highestWave: 1,
            matchCount: 0,
            equippedWeapon: 'katana',
            unlockedWeapons: {
                katana: true,
                blades: false,
                hammer: false
            },
            equippedCannons: ['laser'],
            unlockedCannons: {
                laser: true,
                plasma: false,
                trio: false,
                rapid: false,
                hagel: false,
                sniper: false,
                bakåt: false
            },
            upgrades: {
                health: 0,   // Level 0 to 5
                posture: 0,  // Level 0 to 5
                credits: 0   // Level 0 to 5
            }
        };

        this.load();
    }

    // Load data from LocalStorage
    load() {
        try {
            const data = localStorage.getItem(this.saveKey);
            if (data) {
                const parsed = JSON.parse(data);
                
                // Deep merge state to prevent errors on older/broken schemas
                if (typeof parsed.credits === 'number') this.state.credits = parsed.credits;
                if (typeof parsed.highestWave === 'number') this.state.highestWave = parsed.highestWave;
                if (typeof parsed.matchCount === 'number') this.state.matchCount = parsed.matchCount;
                if (typeof parsed.equippedWeapon === 'string') this.state.equippedWeapon = parsed.equippedWeapon;
                // Support both old (string) and new (array) save format
                if (Array.isArray(parsed.equippedCannons)) {
                    this.state.equippedCannons = parsed.equippedCannons;
                } else if (typeof parsed.equippedCannon === 'string') {
                    this.state.equippedCannons = [parsed.equippedCannon];
                }
                
                if (parsed.unlockedWeapons) {
                    this.state.unlockedWeapons = { ...this.state.unlockedWeapons, ...parsed.unlockedWeapons };
                }
                
                if (parsed.unlockedCannons) {
                    this.state.unlockedCannons = { ...this.state.unlockedCannons, ...parsed.unlockedCannons };
                }
                
                if (parsed.upgrades) {
                    this.state.upgrades = { ...this.state.upgrades, ...parsed.upgrades };
                }
            }
        } catch (e) {
            console.error("Failed to load save state from LocalStorage:", e);
        }
    }

    // Save data to LocalStorage
    save() {
        try {
            localStorage.setItem(this.saveKey, JSON.stringify(this.state));
        } catch (e) {
            console.error("Failed to save state to LocalStorage:", e);
        }
    }

    // Record highest wave reached
    recordHighestWave(wave) {
        if (wave > this.state.highestWave) {
            this.state.highestWave = wave;
            this.save();
        }
    }

    // Add credits to balance
    addCredits(amount) {
        this.state.credits += amount;
        this.save();
    }

    // Spend credits, returns true if successful
    spendCredits(amount) {
        if (this.state.credits >= amount) {
            this.state.credits -= amount;
            this.save();
            return true;
        }
        return false;
    }

    // Purchase upgrade
    buyUpgrade(type) {
        if (this.state.upgrades[type] === undefined) return false;
        
        const currentLvl = this.state.upgrades[type];
        if (currentLvl >= 5) return false; // Max level

        const cost = this.getUpgradeCost(type, currentLvl);
        if (this.spendCredits(cost)) {
            this.state.upgrades[type] += 1;
            this.save();
            return true;
        }
        return false;
    }

    getUpgradeCost(type, currentLvl) {
        const baseCosts = {
            health: 30,
            posture: 40,
            credits: 50
        };
        // Exponent growth in cost per level
        return baseCosts[type] * Math.pow(1.8, currentLvl);
    }

    // Unlock custom weapon
    buyWeapon(weaponKey, cost) {
        if (this.state.unlockedWeapons[weaponKey] === undefined) return false;
        if (this.state.unlockedWeapons[weaponKey]) return true; // Already unlocked

        if (this.spendCredits(cost)) {
            this.state.unlockedWeapons[weaponKey] = true;
            this.state.equippedWeapon = weaponKey; // Auto-equip
            this.save();
            return true;
        }
        return false;
    }

    equipWeapon(weaponKey) {
        if (this.state.unlockedWeapons[weaponKey]) {
            this.state.equippedWeapon = weaponKey;
            this.save();
            return true;
        }
        return false;
    }

    buyCannon(cannonKey, cost) {
        if (this.state.unlockedCannons[cannonKey] === undefined) return false;
        if (this.state.unlockedCannons[cannonKey]) return true; // Already unlocked

        if (this.spendCredits(cost)) {
            this.state.unlockedCannons[cannonKey] = true;
            // Auto-add to active cannons on purchase
            if (!this.state.equippedCannons.includes(cannonKey)) {
                this.state.equippedCannons.push(cannonKey);
            }
            this.save();
            return true;
        }
        return false;
    }

    // Toggle a cannon on/off. Laser is always kept active as the base.
    toggleCannon(cannonKey) {
        if (!this.state.unlockedCannons[cannonKey]) return false;
        const idx = this.state.equippedCannons.indexOf(cannonKey);
        if (idx === -1) {
            // Activate it
            this.state.equippedCannons.push(cannonKey);
        } else {
            // Deactivate it – but laser can never be removed
            if (cannonKey === 'laser') return false;
            this.state.equippedCannons.splice(idx, 1);
        }
        this.save();
        return true;
    }

    /* ROGUELITE IN-RUN CARDS DEFINITIONS */
    
    // Generate 3 randomized in-run cybernetic perk upgrades
    getRandomPerks() {
        const perkPool = [
            {
                key: 'vampirism',
                title: 'CYBER-VAMPYRIS',
                icon: '🩸',
                desc: 'Återställ 8% av max hälsa vid en lyckad parering.',
                color: 'pink-card'
            },
            {
                key: 'lightningSlash',
                title: 'BLIXTHUGG',
                icon: '⚡',
                desc: 'Hugg under dashes gör 30% mer skada på fiendens balans (posture).',
                color: 'cyan-card'
            },
            {
                key: 'shieldCharge',
                title: 'ENERGISKÖLD',
                icon: '🛡️',
                desc: 'Skapar en passiv sköld som absorberar en träff helt. Laddas om var 12:e sek.',
                color: 'pink-card'
            },
            {
                key: 'nanites',
                title: 'NANIT-INJEKTION',
                icon: '🔋',
                desc: 'Dina hugg gör 15% mer skada och du rör dig smidigare.',
                color: 'orange-card'
            },
            {
                key: 'overdrive',
                title: 'OVERDRIVE KÄRNA',
                icon: '💥',
                desc: 'Gör 30% mer skada med dina slag, men du tar 10% mer skada själv.',
                color: 'orange-card'
            },
            {
                key: 'timeDilation',
                title: 'TIDSSAKTNAD',
                icon: '⏳',
                desc: 'En perfekt parering (kollision med skott under dash) saktar ner tiden i 2.5 sek.',
                color: 'green-card'
            },
            {
                key: 'critSlash',
                title: 'KRITISKT HUGG',
                icon: '🎯',
                desc: '20% chans att ditt dash-hugg eller din svärdsvåg gör 100% mer skada.',
                color: 'cyan-card'
            },
            {
                key: 'towerRepair',
                title: 'TORN-REPARATION',
                icon: '🛠️',
                desc: 'Att stå still i laddningszonen reparerar långsamt ditt torn (+5 HP/sek).',
                color: 'green-card'
            }
        ];

        // Shuffle and select 3 items
        const shuffled = [...perkPool].sort(() => 0.5 - Math.random());
        return shuffled.slice(0, 3);
    }
}


/* --- BUNDLED FROM: src/ui.js --- */
/* DANGEROUS FIGHT - HUD & SCREEN CONTROLLER */

class UIController {
    constructor() {
        this.screens = {
            menu: document.getElementById('main-menu'),
            multiplayer: document.getElementById('multiplayer-menu'),
            lobby: document.getElementById('lobby-screen'),
            join: document.getElementById('join-room-screen'),
            weapons: document.getElementById('weapons-menu'), // Garage
            cannons: document.getElementById('cannons-menu'),
            upgrades: document.getElementById('upgrades-menu'),
            gameover: document.getElementById('game-over-screen'),
            victory: document.getElementById('victory-screen'),
            hud: document.getElementById('hud'),
            perks: document.getElementById('perk-selection-screen')
        };
        
        this.highestWaveVal = document.getElementById('highest-wave-val');
        this.creditsWeaponsVal = document.getElementById('credits-weapons-val');
        this.creditsCannonsVal = document.getElementById('credits-cannons-val');
        this.creditsUpgradesVal = document.getElementById('credits-upgrades-val');
        
        // Slingshot Arena HUD elements
        this.topTowerHpBar = document.getElementById('top-tower-hp-bar');
        this.bottomTowerHpBar = document.getElementById('bottom-tower-hp-bar');
        this.playerCarHpText = document.getElementById('player-car-hp-text');
        this.enemyCarHpText = document.getElementById('enemy-car-hp-text');
        this.playerCarCharge = document.getElementById('player-car-charge');
        this.shootBtn = document.getElementById('shoot-btn');
        this.topTowerLabel = document.getElementById('top-tower-label');
        this.bottomTowerLabel = document.getElementById('bottom-tower-label');
        
        // Game Over and Victory stats
        this.statDefeatWinner = document.getElementById('stat-defeat-winner');
        this.statCreditsEarned = document.getElementById('stat-credits-earned');
        this.statVictoryCredits = document.getElementById('stat-victory-credits');
    }

    // Single point to hide everything and display one specific screen
    showScreen(activeScreenId) {
        for (const [key, element] of Object.entries(this.screens)) {
            if (!element) continue;
            if (key === 'hud') {
                if (activeScreenId === 'hud') {
                    element.classList.remove('hidden');
                } else if (activeScreenId === 'victory' || activeScreenId === 'gameover') {
                    // Let HUD be faintly visible behind overlays
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            } else {
                if (key === activeScreenId) {
                    element.classList.remove('hidden');
                } else {
                    element.classList.add('hidden');
                }
            }
        }
    }

    // Refresh HUD bars and statuses
    updateHUD(player, enemy, isMultiplayer, isClient) {
        // Towers HP
        // Symmetrically, player sees themselves at the bottom.
        // So Bottom Tower is the local player's tower. Top Tower is the opponent/AI's tower.
        let localTower, remoteTower;
        let localCarHp, remoteCarHp;
        let localCarEnergy = 0;
        
        if (isMultiplayer) {
            if (isClient) {
                // Client is Player 2
                localTower = player.game.topTower;
                remoteTower = player.game.bottomTower;
                localCarHp = player.game.enemyCar ? player.game.enemyCar.hp : 100;
                remoteCarHp = player.hp;
                localCarEnergy = player.game.enemyCar ? player.game.enemyCar.energy : 0;
                
                this.bottomTowerLabel.innerText = "DITT TORN";
                this.topTowerLabel.innerText = "SPELARE 1:S TORN";
            } else {
                // Host is Player 1
                localTower = player.game.bottomTower;
                remoteTower = player.game.topTower;
                localCarHp = player.hp;
                remoteCarHp = player.game.enemyCar ? player.game.enemyCar.hp : 100;
                localCarEnergy = player.energy;
                
                this.bottomTowerLabel.innerText = "DITT TORN";
                this.topTowerLabel.innerText = "SPELARE 2:S TORN";
            }
        } else {
            // vs AI
            localTower = player.game.bottomTower;
            remoteTower = player.game.topTower;
            localCarHp = player.hp;
            remoteCarHp = enemy ? enemy.hp : 100;
            localCarEnergy = player.energy;
            
            this.bottomTowerLabel.innerText = "DITT TORN";
            this.topTowerLabel.innerText = "DATORNS TORN";
        }

        // Apply tower percentages
        const localTowerPercent = Math.max(0, (localTower.hp / localTower.maxHp) * 100);
        const remoteTowerPercent = Math.max(0, (remoteTower.hp / remoteTower.maxHp) * 100);
        this.bottomTowerHpBar.style.width = `${localTowerPercent}%`;
        this.topTowerHpBar.style.width = `${remoteTowerPercent}%`;

        // Apply car HP text
        this.playerCarHpText.innerText = Math.max(0, Math.ceil(localCarHp));
        this.enemyCarHpText.innerText = Math.max(0, Math.ceil(remoteCarHp));

        // Update charge indicator lights (max 3)
        if (this.playerCarCharge) {
            const lights = this.playerCarCharge.querySelectorAll('.light');
            lights.forEach((light, idx) => {
                if (idx < localCarEnergy) {
                    light.classList.add('active');
                } else {
                    light.classList.remove('active');
                }
            });
        }
        
        // Show/hide shoot button based on energy
        if (this.shootBtn) {
            if (localCarEnergy > 0) {
                this.shootBtn.disabled = false;
                this.shootBtn.style.opacity = 1;
            } else {
                this.shootBtn.disabled = true;
                this.shootBtn.style.opacity = 0.4;
            }
        }
    }

    // Populate garage (weapon shop) elements and handle selections
    renderWeaponShop(upgradeManager, onEquipOrUnlock, audioController) {
        const state = upgradeManager.state;
        this.creditsWeaponsVal.innerText = state.credits;
        
        const wpnKeys = ['katana', 'blades', 'hammer'];
        wpnKeys.forEach(key => {
            const card = document.getElementById(`wpn-${key}`);
            if (!card) return;
            
            const isUnlocked = state.unlockedWeapons[key];
            const isEquipped = state.equippedWeapon === key;
            const costText = card.querySelector('.weapon-cost');
            
            // Remove previous event listeners by cloning
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Set styles
            if (isEquipped) {
                newCard.className = 'weapon-card selected';
                costText.innerText = 'EQUIPPED';
            } else if (isUnlocked) {
                newCard.className = 'weapon-card';
                costText.innerText = 'KLICKA FÖR ATT VÄLJA';
            } else {
                newCard.className = 'weapon-card locked';
                const costs = { blades: 100, hammer: 250 };
                costText.innerText = `Kostar ⚡ ${costs[key]}`;
            }

            newCard.addEventListener('click', () => {
                audioController.playClick();
                onEquipOrUnlock(key);
            });
        });
    }

    // Populate persistent upgrade rows
    renderPersistentUpgrades(upgradeManager, onPurchase, audioController) {
        const state = upgradeManager.state;
        this.creditsUpgradesVal.innerText = state.credits;
        
        const upgKeys = ['health', 'posture', 'credits'];
        upgKeys.forEach(key => {
            const row = document.getElementById(`upg-${key}`);
            if (!row) return;
            
            const lvl = state.upgrades[key];
            const lvlLabel = row.querySelector('.upgrade-level');
            const btn = row.querySelector('.btn-upgrade');
            const costValSpan = row.querySelector('.cost-val');
            
            // Remove previous event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);

            if (lvl >= 5) {
                lvlLabel.innerText = `Nivå MAX`;
                newBtn.innerText = 'MAXAD';
                newBtn.disabled = true;
                newBtn.className = 'btn btn-upgrade neon-btn-cyan';
                newBtn.style.opacity = 0.5;
            } else {
                const cost = upgradeManager.getUpgradeCost(key, lvl);
                lvlLabel.innerText = `Nivå ${lvl}/5`;
                costValSpan.innerText = Math.round(cost);
                newBtn.disabled = false;
                
                newBtn.addEventListener('click', () => {
                    audioController.playClick();
                    onPurchase(key);
                });
            }
        });
    }

    // Populate cannon shop elements and handle selections
    renderCannonShop(upgradeManager, onEquipOrUnlock, audioController) {
        const state = upgradeManager.state;
        this.creditsCannonsVal.innerText = state.credits;
        
        const cannonKeys = ['laser', 'plasma', 'rapid', 'trio', 'hagel', 'sniper', 'bakåt'];
        const equipped = state.equippedCannons || [state.equippedCannon || 'laser'];
        cannonKeys.forEach(key => {
            const card = document.getElementById(`cnn-${key}`);
            if (!card) return;
            
            const isUnlocked = state.unlockedCannons[key];
            const isActive = equipped.includes(key);
            const costText = card.querySelector('.weapon-cost');
            
            // Remove previous event listeners by cloning
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            
            // Set styles – multi-select checkbox style
            const newCostText = newCard.querySelector('.weapon-cost');
            if (!isUnlocked) {
                newCard.className = 'weapon-card locked';
                const costs = { plasma: 150, rapid: 200, trio: 300, hagel: 350, sniper: 450, bakåt: 500 };
                newCostText.innerText = `Kostar ⚡ ${costs[key]}`;
            } else if (isActive) {
                newCard.className = 'weapon-card selected';
                newCostText.innerText = key === 'laser' ? '✅ ALLTID AKTIV' : '✅ AKTIV – klicka för att stänga av';
            } else {
                newCard.className = 'weapon-card';
                newCostText.innerText = '◻ INAKTIV – klicka för att aktivera';
            }

            newCard.addEventListener('click', () => {
                audioController.playClick();
                onEquipOrUnlock(key);
            });
        });
    }

    // Display Game Over / Defeat screen
    renderGameOver(creditsEarned, winnerName) {
        if (this.statDefeatWinner) {
            this.statDefeatWinner.innerText = winnerName;
        }
        if (this.statCreditsEarned) {
            this.statCreditsEarned.innerText = creditsEarned;
        }
        this.showScreen('gameover');
    }

    // Display Game Victory Screen
    renderVictory(finalCredits, isBoss = false) {
        if (this.statVictoryCredits) {
            this.statVictoryCredits.innerText = finalCredits;
        }
        
        const titleEl = this.screens.victory.querySelector('h1');
        const subtitleEl = this.screens.victory.querySelector('.subtitle');
        if (isBoss) {
            if (titleEl) {
                titleEl.innerText = "BOSS BESEGRAAD!";
                titleEl.setAttribute('data-text', "BOSS BESEGRAAD!");
            }
            if (subtitleEl) {
                subtitleEl.innerText = "Du krossade den svåra bossen!";
            }
        } else {
            if (titleEl) {
                titleEl.innerText = "STRID VUNNEN!";
                titleEl.setAttribute('data-text', "SYSTEM VICTORY");
            }
            if (subtitleEl) {
                subtitleEl.innerText = "Du förstörde motståndarens torn.";
            }
        }
        
        this.showScreen('victory');
    }

    renderPerkSelection(perks, onSelect, audioController) {
        const grid = document.getElementById('perks-selection-grid');
        if (!grid) return;
        
        grid.innerHTML = ''; // Clear previous content
        
        perks.forEach(perk => {
            const card = document.createElement('div');
            card.className = 'weapon-card';
            card.style.flex = '1';
            card.style.minWidth = '200px';
            card.style.maxWidth = '250px';
            card.style.margin = '10px';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.justifyContent = 'space-between';
            card.style.alignItems = 'center';
            card.style.textAlign = 'center';
            card.style.padding = '20px';
            
            // Neon glow strip
            const glow = document.createElement('div');
            glow.className = `weapon-glow ${perk.color}`;
            card.appendChild(glow);
            
            // Icon
            const iconEl = document.createElement('div');
            iconEl.style.fontSize = '3rem';
            iconEl.style.marginBottom = '12px';
            iconEl.innerText = perk.icon;
            card.appendChild(iconEl);
            
            // Title
            const titleEl = document.createElement('h3');
            titleEl.style.fontSize = '1.05rem';
            titleEl.style.margin = '8px 0';
            titleEl.innerText = perk.title;
            card.appendChild(titleEl);
            
            // Description
            const descEl = document.createElement('p');
            descEl.style.fontSize = '0.85rem';
            descEl.style.color = 'rgba(255, 255, 255, 0.7)';
            descEl.style.lineHeight = '1.4';
            descEl.style.margin = '12px 0';
            descEl.innerText = perk.desc;
            card.appendChild(descEl);
            
            // Install button
            const selectText = document.createElement('div');
            selectText.className = 'weapon-cost';
            selectText.innerText = 'INSTALLERA';
            card.appendChild(selectText);
            
            // Click Handler
            card.addEventListener('click', () => {
                card.classList.add('perk-selected');
                audioController.playClick();
                // Brief delay for visual select animation feedback
                setTimeout(() => {
                    onSelect(perk.key);
                }, 200);
            });
            
            grid.appendChild(card);
        });
    }
}


/* --- BUNDLED FROM: src/input.js --- */
/* DANGEROUS FIGHT - HYBRID TOUCH & MOUSE INPUT CONTROLLER */

class InputController {
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


/* --- BUNDLED FROM: src/player.js --- */
/* DANGEROUS FIGHT - PLAYER CHARACTER (CAR) CONTROLLER */

class Player {
    constructor(x, y, game) {
        this.game = game;
        
        // Physics variables
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.985;
        this.isAiming = false;
        this.aimDx = 0;
        this.aimDy = 0;
        
        // Perks system
        this.activePerk = null;
        this.shieldHp = 0;
        this.shieldCooldown = 0;
        
        // Upgrade Levels (synced from state)
        this.upgHealthLvl = 0;
        this.upgPostureLvl = 0;
        this.upgCreditsLvl = 0;

        // Vehicle stats based on key
        this.activeWeaponKey = 'katana'; // default (Cyber Car)
        
        // Combat stats
        this.maxHp = 100;
        this.hp = 100;
        this.energy = 0; // max 3 shots
        this.chargeTimer = 0; // ms
        
        this.state = 'idle'; // 'idle', 'dead'
        this.respawnTimer = 0; // ms
        
        // Visual angle
        this.angle = -Math.PI / 2; // pointing up
        
        // Trail history for ghost afterimages
        this.trailHistory = [];
        
        // Size & weight definitions
        this.profiles = {
            katana: {
                name: "Cyber Ronin",
                radius: 20,
                mass: 1.0,
                baseHp: 100,
                ramDamage: 100,
                speedMultiplier: 1.0,
                color: "#00f0ff"
            },
            blades: {
                name: "Armored Shogun",
                radius: 26,
                mass: 1.8,
                baseHp: 150,
                ramDamage: 180,
                speedMultiplier: 0.75,
                color: "#ff0077"
            },
            hammer: {
                name: "Shadow Ninja",
                radius: 16,
                mass: 0.6,
                baseHp: 70,
                ramDamage: 70,
                speedMultiplier: 1.35,
                color: "#ff9900"
            }
        };
    }

    get profile() {
        return this.profiles[this.activeWeaponKey] || this.profiles.katana;
    }

    get radius() { return this.profile.radius; }
    get color() { return this.profile.color; }
    get mass() { return this.profile.mass; }

    applyPermanentUpgrades(levels) {
        this.upgHealthLvl = levels.health || 0;
        this.upgPostureLvl = levels.posture || 0;
        this.upgCreditsLvl = levels.credits || 0;

        // health lvl gives +15 to car maxHp, wait, let's keep car max HP stable or scale it slightly
        this.maxHp = this.profile.baseHp + (this.upgHealthLvl * 10);
        this.hp = this.maxHp;
    }

    resetForRun() {
        this.hp = this.maxHp;
        this.energy = 0;
        this.chargeTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.state = 'idle';
        this.isAiming = false;
        
        this.activePerk = null;
        this.shieldHp = 0;
        this.shieldCooldown = 0;
    }

    // Check if a point is inside the car's body or control zone
    containsPoint(px, py) {
        if (this.state === 'dead') return false;
        const dist = Math.hypot(px - this.x, py - this.y);
        const height = this.game.canvasCtrl.height;
        // Accept touches close to the car OR anywhere in the bottom half of the screen (excluding the very edges)
        return dist <= this.radius * 3.0 || (py > height * 0.5 && py < height - 5);
    }

    // Called when the user starts a drag
    startDrag() {
        if (this.state === 'dead') return false;
        this.isAiming = true;
        this.aimDx = 0;
        this.aimDy = 0;
        this.vx = 0;
        this.vy = 0;
        return true;
    }

    // Called when dragging
    dragMove(dx, dy) {
        if (!this.isAiming) return;
        
        // Cap drag distance to 120 pixels
        const dist = Math.hypot(dx, dy);
        if (dist > 120) {
            this.aimDx = (dx / dist) * 120;
            this.aimDy = (dy / dist) * 120;
        } else {
            this.aimDx = dx;
            this.aimDy = dy;
        }

        // Set visual angle facing the launch direction (opposite of drag)
        if (dist > 5) {
            this.angle = Math.atan2(-this.aimDy, -this.aimDx);
        }
    }

    // Called when user releases drag to launch
    endDrag() {
        if (!this.isAiming) return;
        this.isAiming = false;
        
        const dist = Math.hypot(this.aimDx, this.aimDy);
        if (dist > 15) {
            // Slingshot velocity scale: launch opposite to drag direction
            const launchScale = 0.12 * this.profile.speedMultiplier;
            this.vx = -this.aimDx * launchScale;
            this.vy = -this.aimDy * launchScale;
            
            // Play slingshot sounds
            this.game.audioSynth.playSlash(this.activeWeaponKey);
        }
    }

    // Laser firing – fires all equipped cannons simultaneously from the car's position
    shoot() {
        if (this.state === 'dead' || this.energy <= 0) return;
        
        this.energy--;
        const equippedCannons = this.game.upgradeMgr.state.equippedCannons
            || [this.game.upgradeMgr.state.equippedCannon || 'laser'];
        
        // Fire from the car's own position, aimed straight up
        const startX = this.x;
        const startY = this.y;
        const speed = 0.45;

        this.game.audioSynth.playShoot();

        const sizeBonus = (this.activeWeaponKey === 'katana' ? 2 : 0);

        equippedCannons.forEach(cannon => {
            if (cannon === 'plasma') {
                // Heavy Plasma: slow moving, huge size, massive damage
                this.game.spawnProjectile(startX, startY, 0, -speed * 0.65, 16 + sizeBonus, 'player', 'plasma');
            } else if (cannon === 'rapid') {
                // Dubbel-Laser: two parallel neon-green lasers
                this.game.spawnProjectile(startX - 10, startY, 0, -speed, 6 + sizeBonus, 'player', 'rapid');
                this.game.spawnProjectile(startX + 10, startY, 0, -speed, 6 + sizeBonus, 'player', 'rapid');
            } else if (cannon === 'trio') {
                // Trio-Laser: three spread shots
                this.game.spawnProjectile(startX, startY, 0, -speed, 7 + sizeBonus, 'player', 'trio');
                this.game.spawnProjectile(startX, startY, -0.12, -speed, 7 + sizeBonus, 'player', 'trio');
                this.game.spawnProjectile(startX, startY, 0.12, -speed, 7 + sizeBonus, 'player', 'trio');
            } else if (cannon === 'hagel') {
                // Hagel-Laser: 5 shots in a wide spread
                const spreads = [-0.28, -0.14, 0, 0.14, 0.28];
                spreads.forEach(s => this.game.spawnProjectile(startX, startY, s, -speed, 5 + sizeBonus, 'player', 'hagel'));
            } else if (cannon === 'sniper') {
                // Sniper-Laser: single ultra-fast pinpoint beam
                this.game.spawnProjectile(startX, startY, 0, -speed * 2.2, 4 + sizeBonus, 'player', 'sniper');
            } else if (cannon === 'bakåt') {
                // Bakåt-Laser: fires both up and down simultaneously
                this.game.spawnProjectile(startX, startY, 0, -speed, 8 + sizeBonus, 'player', 'bakåt');
                this.game.spawnProjectile(startX, startY, 0, speed, 8 + sizeBonus, 'player', 'bakåt');
            } else {
                // Standard Puls-Laser
                this.game.spawnProjectile(startX, startY, 0, -speed, 8 + sizeBonus, 'player', 'laser');
            }
        });
    }

    takeDamage(amount, attackerX, attackerY, particleSystem, canvasController) {
        if (this.state === 'dead') return;
        
        // Check Shield Perk
        if (this.activePerk === 'shieldCharge' && this.shieldHp > 0) {
            this.shieldHp = 0;
            this.shieldCooldown = 12000; // 12 seconds
            particleSystem.spawnShockwave(this.x, this.y, '#ff00aa', 60);
            canvasController.shake(4, 100);
            this.game.audioSynth.playParry();
            
            // Pushback still applies
            const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
            this.vx = Math.cos(pushAngle) * 0.15;
            this.vy = Math.sin(pushAngle) * 0.15;
            return;
        }
        
        let dmg = amount;
        if (this.activeWeaponKey === 'blades') {
            dmg *= 0.85; // 15% damage reduction
        }
        if (this.activePerk === 'overdrive') {
            dmg *= 1.10; // Take 10% more damage
        }
        
        this.hp = Math.max(0, this.hp - dmg);
        
        // Spark particles
        particleSystem.spawnClashSparks(this.x, this.y, this.color);
        canvasController.flash('rgba(255, 0, 51, 0.4)', 220); // brief red damage flash
        canvasController.shake(8, 180);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            this.respawnTimer = 3000; // 3 seconds respawn
            this.vx = 0;
            this.vy = 0;
            this.isAiming = false;
            
            // Explosion particles
            particleSystem.spawnShockwave(this.x, this.y, this.color, 70);
            for (let i = 0; i < 20; i++) {
                particleSystem.spawnAmbience(this.game.canvasCtrl.width, this.game.canvasCtrl.height, 2);
            }
            this.game.audioSynth.playDefeat();
        } else {
            // Pushback force
            const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
            this.vx = Math.cos(pushAngle) * 0.22;
            this.vy = Math.sin(pushAngle) * 0.22;
        }
    }

    update(deltaTime, width, height, particleSystem) {
        // Update active shield cooldown
        if (this.activePerk === 'shieldCharge' && this.state !== 'dead') {
            if (this.shieldHp === 0) {
                this.shieldCooldown -= deltaTime;
                if (this.shieldCooldown <= 0) {
                    this.shieldHp = 1;
                    this.shieldCooldown = 0;
                    particleSystem.spawnShockwave(this.x, this.y, '#ff00aa', 35);
                }
            }
        }

        if (this.state === 'dead') {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                // Respawn
                this.state = 'idle';
                this.hp = this.maxHp;
                this.x = width / 2;
                this.y = height - 120;
                this.vx = 0;
                this.vy = 0;
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
            }
            return;
        }

        // Apply friction
        if (!this.isAiming) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            const currentFriction = this.activeWeaponKey === 'hammer' ? 0.99 : this.friction;
            this.vx *= Math.pow(currentFriction, deltaTime / 16);
            this.vy *= Math.pow(currentFriction, deltaTime / 16);
            
            let bounced = false;
            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = -this.vx * 0.6;
                bounced = true;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -this.vx * 0.6;
                bounced = true;
            }
            
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = -this.vy * 0.6;
                bounced = true;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -this.vy * 0.6;
                bounced = true;
            }
            
            if (bounced && Math.hypot(this.vx, this.vy) > 0.03) {
                this.game.audioSynth.playClick();
            }
            
            // Cap velocities
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.05) {
                this.angle = Math.atan2(this.vy, this.vx);
            }
        }

        // --- ENERGY CHARGING LOGIC ---
        // Player charging zone is at the bottom (y > height - 150)
        const inChargingZone = this.y > height - 150;
        const isMovingSlowly = Math.hypot(this.vx, this.vy) < 0.04;
        
        if (inChargingZone && isMovingSlowly && !this.isAiming) {
            // Shadow Ninja charges energy 20% faster
            const ninjaFactor = this.activeWeaponKey === 'hammer' ? 1.20 : 1.0;
            const chargeNeeded = 1500 / ((1 + this.upgPostureLvl * 0.15) * ninjaFactor); // ms
            
            if (this.energy < 3) {
                this.chargeTimer += deltaTime;
                
                // Spawn charging sparkles
                if (Math.random() < 0.1) {
                    particleSystem.spawnClashSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#ffffff');
                }

                if (this.chargeTimer >= chargeNeeded) {
                    this.energy++;
                    this.chargeTimer = 0;
                    this.game.audioSynth.playUpgrade();
                    particleSystem.spawnShockwave(this.x, this.y, '#ffffff', 30);
                }
            }

            // Tower Repair Perk: regenerates 5 HP per second (0.005 HP/ms)
            if (this.activePerk === 'towerRepair' && this.game.bottomTower.hp < this.game.bottomTower.maxHp) {
                this.game.bottomTower.hp = Math.min(this.game.bottomTower.maxHp, this.game.bottomTower.hp + 0.005 * deltaTime);
                if (Math.random() < 0.08) {
                    particleSystem.spawnClashSparks(this.x + (Math.random() - 0.5) * 15, this.y + (Math.random() - 0.5) * 15, '#00ff66');
                }
            }
        } else {
            this.chargeTimer = 0;
        }

        // Maintain trail history
        if (this.state !== 'dead') {
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.04) {
                this.trailHistory.push({ x: this.x, y: this.y, angle: this.angle });
                if (this.trailHistory.length > 4) {
                    this.trailHistory.shift();
                }
            } else {
                if (this.trailHistory.length > 0) {
                    this.trailHistory.shift();
                }
            }
        } else {
            this.trailHistory = [];
        }
    }

    draw(ctx, canvasController) {
        if (this.state === 'dead') return;

        ctx.save();
        
        // Aiming line
        if (this.isAiming) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 2;
            ctx.setLineDash([6, 6]);
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            // Draw in opposite direction of drag
            ctx.lineTo(this.x - this.aimDx * 2, this.y - this.aimDy * 2);
            ctx.stroke();
            ctx.restore();
        }

        // Draw the samurai character
        canvasController.drawSamuraiCharacter(
            ctx, 
            this.x, 
            this.y, 
            this.radius, 
            this.color, 
            this.angle, 
            this.activeWeaponKey, 
            this.isAiming, 
            this.aimDx, 
            this.aimDy, 
            this.hp / this.maxHp,
            this.trailHistory,
            (this.y > this.game.canvasCtrl.height - 150)
        );

        ctx.restore();
    }
}


/* --- BUNDLED FROM: src/enemy.js --- */
/* DANGEROUS FIGHT - CYBERPUNK 1V1 BOSS AI & REMOTE PLAYER REPLICA */

class Enemy {
    constructor(x, y, game) {
        this.game = game;
        
        // Physics variables
        this.x = x;
        this.y = y;
        this.vx = 0;
        this.vy = 0;
        this.friction = 0.985;
        this.radius = 20;
        this.mass = 1.0;
        this.color = "#ff0077"; // Neon Pink
        
        // Combat stats
        this.maxHp = 100;
        this.hp = 100;
        this.energy = 0; // max 3 shots
        this.chargeTimer = 0; // ms
        this.isBoss = false;
        
        this.state = 'idle'; // 'idle', 'dead'
        this.respawnTimer = 0; // ms
        
        // Visual angle
        this.angle = Math.PI / 2; // pointing down
        
        // Trail history for ghost afterimages
        this.trailHistory = [];
        
        // AI behavior state machine
        this.aiState = 'idle'; // 'idle', 'recharging', 'aiming_ram', 'cooldown'
        this.aiTimer = 1000; // time until next AI action
        
        // Profiles for multiplayer vehicle matching
        this.profiles = {
            katana: { radius: 20, mass: 1.0, color: "#ff0077" }, // Cyber Car
            blades: { radius: 26, mass: 1.8, color: "#ff0088" }, // Plasma Truck
            hammer: { radius: 16, mass: 0.6, color: "#ff4400" }  // Laser Cycle
        };
    }

    resetForRun(isBoss = false) {
        this.isBoss = isBoss;
        if (isBoss) {
            this.maxHp = 500;
            this.radius = 24; // Torso radius
            this.mass = 2.0;
            this.color = 'crimson';
            
            // Initialize ragdoll nodes
            this.ragdollNodes = [
                { name: 'torso', x: this.x, y: this.y, vx: 0, vy: 0, radius: 24, mass: 1.5, color: 'crimson' },
                { name: 'head', x: this.x, y: this.y - 32, vx: 0, vy: 0, radius: 14, mass: 0.8, color: '#ff0055' },
                { name: 'leftHand', x: this.x - 34, y: this.y - 8, vx: 0, vy: 0, radius: 10, mass: 0.5, color: '#ff0077' },
                { name: 'rightHand', x: this.x + 34, y: this.y - 8, vx: 0, vy: 0, radius: 10, mass: 0.5, color: '#ff0077' },
                { name: 'leftFoot', x: this.x - 18, y: this.y + 32, vx: 0, vy: 0, radius: 11, mass: 0.7, color: '#990033' },
                { name: 'rightFoot', x: this.x + 18, y: this.y + 32, vx: 0, vy: 0, radius: 11, mass: 0.7, color: '#990033' }
            ];

            // Define distance constraints between nodes
            this.ragdollConstraints = [
                [0, 1, 32], // torso to head
                [0, 2, 34], // torso to leftHand
                [0, 3, 34], // torso to rightHand
                [0, 4, 32], // torso to leftFoot
                [0, 5, 32], // torso to rightFoot
                [1, 2, 38], // head to leftHand
                [1, 3, 38], // head to rightHand
                [4, 5, 28]  // leftFoot to rightFoot
            ];
        } else {
            this.ragdollNodes = null;
            this.ragdollConstraints = null;
            this.maxHp = 100;
            this.radius = 20;
            this.mass = 1.0;
            this.color = "#ff0077";
        }
        this.hp = this.maxHp;
        this.energy = 0;
        this.chargeTimer = 0;
        this.vx = 0;
        this.vy = 0;
        this.state = 'idle';
        this.aiState = 'idle';
        this.aiTimer = 1000;
        
        // Trail history for ghost afterimages
        this.trailHistory = [];
    }

    resetRagdollPositions() {
        if (!this.isBoss || !this.ragdollNodes) return;
        
        const torso = this.ragdollNodes[0];
        const head = this.ragdollNodes[1];
        const leftHand = this.ragdollNodes[2];
        const rightHand = this.ragdollNodes[3];
        const leftFoot = this.ragdollNodes[4];
        const rightFoot = this.ragdollNodes[5];
        
        torso.x = this.x; torso.y = this.y; torso.vx = 0; torso.vy = 0;
        head.x = this.x; head.y = this.y - 32; head.vx = 0; head.vy = 0;
        leftHand.x = this.x - 34; leftHand.y = this.y - 8; leftHand.vx = 0; leftHand.vy = 0;
        rightHand.x = this.x + 34; rightHand.y = this.y - 8; rightHand.vx = 0; rightHand.vy = 0;
        leftFoot.x = this.x - 18; leftFoot.y = this.y + 32; leftFoot.vx = 0; leftFoot.vy = 0;
        rightFoot.x = this.x + 18; rightFoot.y = this.y + 32; rightFoot.vx = 0; rightFoot.vy = 0;
    }

    setVehicleType(type) {
        const p = this.profiles[type] || this.profiles.katana;
        this.radius = p.radius;
        this.mass = p.mass;
        this.color = p.color;
    }

    takeDamage(amount, attackerX, attackerY, particleSystem, canvasController) {
        if (this.state === 'dead') return;
        
        let dmg = amount;
        
        // Apply player active perks
        const player = this.game.player;
        if (player && player.state !== 'dead') {
            let mult = 1.0;
            
            // Overdrive perk: +30% damage dealt
            if (player.activePerk === 'overdrive') {
                mult += 0.30;
            }
            
            // Lightning Slash: +30% damage if player is dashing (speed > 0.15)
            if (player.activePerk === 'lightningSlash' && Math.hypot(player.vx, player.vy) > 0.15) {
                mult += 0.30;
            }
            
            dmg *= mult;
            
            // Crit Slash perk: 20% chance of double damage
            if (player.activePerk === 'critSlash' && Math.random() < 0.20) {
                dmg *= 2.0;
                // Red glowing crit flash visual
                particleSystem.spawnShockwave(attackerX, attackerY, '#ff3300', 45);
            }
        }

        this.hp = Math.max(0, this.hp - dmg);
        
        // Spark particles at closest hit node
        let sparkX = this.x;
        let sparkY = this.y;
        if (this.isBoss && this.ragdollNodes) {
            let minDist = Infinity;
            this.ragdollNodes.forEach(node => {
                const dist = Math.hypot(node.x - attackerX, node.y - attackerY);
                if (dist < minDist) {
                    minDist = dist;
                    sparkX = node.x;
                    sparkY = node.y;
                }
            });
        }
        particleSystem.spawnClashSparks(sparkX, sparkY, this.color);
        canvasController.flash('rgba(0, 240, 255, 0.2)', 180); // Cyan flash when damaging enemy
        canvasController.shake(6, 150);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            this.respawnTimer = 3000; // 3 seconds respawn
            this.vx = 0;
            this.vy = 0;
            this.aiState = 'idle';
            this.aiTimer = 3000;
            
            // Explosion particles on all joints if boss
            if (this.isBoss && this.ragdollNodes) {
                this.ragdollNodes.forEach(node => {
                    particleSystem.spawnShockwave(node.x, node.y, node.color, 45);
                });
            } else {
                particleSystem.spawnShockwave(this.x, this.y, this.color, 70);
            }
            
            for (let i = 0; i < 20; i++) {
                particleSystem.spawnAmbience(this.game.canvasCtrl.width, this.game.canvasCtrl.height, 2);
            }
            this.game.audioSynth.playVictory();
        } else {
            // Pushback force
            const pushAngle = Math.atan2(this.y - attackerY, this.x - attackerX);
            if (this.isBoss && this.ragdollNodes) {
                this.ragdollNodes.forEach(node => {
                    node.vx += Math.cos(pushAngle) * 0.18;
                    node.vy += Math.sin(pushAngle) * 0.18;
                });
            } else {
                this.vx = Math.cos(pushAngle) * 0.22;
                this.vy = Math.sin(pushAngle) * 0.22;
            }
        }
    }

    update(deltaTime, player, audioController, particleSystem, canvasController, width, height) {
        if (this.state === 'dead') {
            this.respawnTimer -= deltaTime;
            if (this.respawnTimer <= 0) {
                // Respawn
                this.state = 'idle';
                this.hp = this.maxHp;
                this.x = width / 2;
                this.y = 120;
                this.vx = 0;
                this.vy = 0;
                if (this.isBoss) {
                    this.resetRagdollPositions();
                }
                particleSystem.spawnShockwave(this.x, this.y, this.color, 40);
            }
            return;
        }

        // Apply friction & ragdoll constraints
        if (this.isBoss && this.ragdollNodes) {
            // Transfer launch velocities to torso node
            const torso = this.ragdollNodes[0];
            if (this.vx !== 0 || this.vy !== 0) {
                torso.vx = this.vx;
                torso.vy = this.vy;
                this.vx = 0;
                this.vy = 0;
            }

            // Move each node
            this.ragdollNodes.forEach(node => {
                node.x += node.vx * deltaTime;
                node.y += node.vy * deltaTime;
                node.vx *= Math.pow(this.friction, deltaTime / 16);
                node.vy *= Math.pow(this.friction, deltaTime / 16);
            });

            // Solve distance constraints
            // Solve distance constraints
            for (let iter = 0; iter < 4; iter++) {
                this.ragdollConstraints.forEach(([idxA, idxB, restLength]) => {
                    const nodeA = this.ragdollNodes[idxA];
                    const nodeB = this.ragdollNodes[idxB];
                    
                    const dx = nodeB.x - nodeA.x;
                    const dy = nodeB.y - nodeA.y;
                    const dist = Math.hypot(dx, dy) || 0.001;
                    const diff = restLength - dist;
                    const percent = (diff / dist) * 0.5;
                    
                    const totalMass = nodeA.mass + nodeB.mass;
                    const pullA = (nodeB.mass / totalMass) * percent;
                    const pullB = (nodeA.mass / totalMass) * percent;
                    
                    nodeA.x -= dx * pullA;
                    nodeA.y -= dy * pullA;
                    nodeB.x += dx * pullB;
                    nodeB.y += dy * pullB;

                    const impulseX = dx * percent * 0.05;
                    const impulseY = dy * percent * 0.05;
                    nodeA.vx -= impulseX * (nodeB.mass / totalMass);
                    nodeA.vy -= impulseY * (nodeB.mass / totalMass);
                    nodeB.vx += impulseX * (nodeA.mass / totalMass);
                    nodeB.vy += impulseY * (nodeA.mass / totalMass);
                });
            }

            // Boundary checks
            this.ragdollNodes.forEach(node => {
                let bounced = false;
                if (node.x < node.radius) {
                    node.x = node.radius;
                    node.vx = -node.vx * 0.5;
                    bounced = true;
                } else if (node.x > width - node.radius) {
                    node.x = width - node.radius;
                    node.vx = -node.vx * 0.5;
                    bounced = true;
                }
                if (node.y < node.radius) {
                    node.y = node.radius;
                    node.vy = -node.vy * 0.5;
                    bounced = true;
                } else if (node.y > height - node.radius) {
                    node.y = height - node.radius;
                    node.vy = -node.vy * 0.5;
                    bounced = true;
                }
                if (bounced && Math.hypot(node.vx, node.vy) > 0.05 && audioController) {
                    audioController.playClick();
                }
            });

            // Sync main object variables
            this.x = torso.x;
            this.y = torso.y;
            this.vx = torso.vx;
            this.vy = torso.vy;

            // Spawn foot-jet thrust flame sparks
            const leftFoot = this.ragdollNodes[4];
            const rightFoot = this.ragdollNodes[5];
            const speed = Math.hypot(torso.vx, torso.vy);
            if (speed > 0.08) {
                if (Math.random() < 0.25) {
                    particleSystem.spawnClashSparks(leftFoot.x, leftFoot.y, '#ff4400');
                    particleSystem.spawnClashSparks(rightFoot.x, rightFoot.y, '#ff4400');
                }
            }
        } else {
            // Standard enemy physics
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;
            this.vx *= Math.pow(this.friction, deltaTime / 16);
            this.vy *= Math.pow(this.friction, deltaTime / 16);
            
            let bounced = false;
            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = -this.vx * 0.6;
                bounced = true;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -this.vx * 0.6;
                bounced = true;
            }
            
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = -this.vy * 0.6;
                bounced = true;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -this.vy * 0.6;
                bounced = true;
            }
            
            if (bounced && Math.hypot(this.vx, this.vy) > 0.03 && audioController) {
                audioController.playClick();
            }
            
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.05) {
                this.angle = Math.atan2(this.vy, this.vx);
            }
        }

        // --- SINGLE PLAYER AI CONTROLLER ---
        if (!this.game.isMultiplayer) {
            this.updateAI(deltaTime, player, particleSystem, width, height);
        }

        // Maintain trail history for standard enemy
        if (!this.isBoss) {
            if (this.state !== 'dead') {
                const speed = Math.hypot(this.vx, this.vy);
                if (speed > 0.04) {
                    this.trailHistory.push({ x: this.x, y: this.y, angle: this.angle });
                    if (this.trailHistory.length > 4) {
                        this.trailHistory.shift();
                    }
                } else {
                    if (this.trailHistory.length > 0) {
                        this.trailHistory.shift();
                    }
                }
            } else {
                this.trailHistory = [];
            }
        }
    }

    updateAI(deltaTime, player, particleSystem, width, height) {
        // AI charging zone is at the top (y < 150)
        const inChargingZone = this.y < 150;
        const isMovingSlowly = Math.hypot(this.vx, this.vy) < 0.04;

        // 1. Charge energy in zone
        if (inChargingZone && isMovingSlowly && this.energy < 3) {
            const chargeSpeedMultiplier = this.isBoss ? 2.0 : 1.0;
            this.chargeTimer += deltaTime * chargeSpeedMultiplier;
            if (Math.random() < 0.1) {
                particleSystem.spawnClashSparks(this.x + (Math.random() - 0.5) * 20, this.y + (Math.random() - 0.5) * 20, '#ffffff');
            }
            if (this.chargeTimer >= 1500) {
                this.energy++;
                this.chargeTimer = 0;
                this.game.audioSynth.playUpgrade();
                particleSystem.spawnShockwave(this.x, this.y, '#ffffff', 30);
            }
        } else {
            this.chargeTimer = 0;
        }

        // Melee punch logic for boss
        if (this.isBoss && this.ragdollNodes) {
            const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
            if (distToPlayer < 200) {
                const leftHand = this.ragdollNodes[2];
                const rightHand = this.ragdollNodes[3];
                const angleToPlayer = Math.atan2(player.y - this.y, player.x - this.x);
                
                // Pull hands towards player to punch!
                leftHand.vx += Math.cos(angleToPlayer) * 0.025 * deltaTime;
                leftHand.vy += Math.sin(angleToPlayer) * 0.025 * deltaTime;
                rightHand.vx += Math.cos(angleToPlayer) * 0.025 * deltaTime;
                rightHand.vy += Math.sin(angleToPlayer) * 0.025 * deltaTime;

                if (Math.random() < 0.04) {
                    particleSystem.spawnClashSparks(leftHand.x, leftHand.y, '#ff0055');
                    particleSystem.spawnClashSparks(rightHand.x, rightHand.y, '#ff0055');
                }
            }
        }

        // AI decision logic
        this.aiTimer -= deltaTime;
        if (this.aiTimer <= 0) {
            const decisionTimeMultiplier = this.isBoss ? 0.5 : 1.0;
            this.aiTimer = (Math.random() * 1000 + 800) * decisionTimeMultiplier; // reset decision timer

            // Check if we need to recharge
            if (this.energy === 0 && !inChargingZone) {
                // Head back to charge zone
                const targetX = width / 2 + (Math.random() - 0.5) * 60;
                const targetY = 100;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                this.vx = Math.cos(angle) * 0.45;
                this.vy = Math.sin(angle) * 0.45;
                this.game.audioSynth.playSlash('katana');
            } else if (this.energy > 0 && Math.random() < 0.6) {
                // Shoot a projectile
                this.energy--;
                this.game.audioSynth.playShoot();
                
                if (this.isBoss && this.ragdollNodes) {
                    // Fire swordwaves from BOTH hands!
                    const leftHand = this.ragdollNodes[2];
                    const rightHand = this.ragdollNodes[3];
                    const speed = 0.50; // faster lasers for boss
                    
                    const dxLeft = player.x - leftHand.x;
                    this.game.spawnProjectile(leftHand.x, leftHand.y, dxLeft * 0.0015, speed, 8, 'enemy');
                    
                    const dxRight = player.x - rightHand.x;
                    this.game.spawnProjectile(rightHand.x, rightHand.y, dxRight * 0.0015, speed, 8, 'enemy');
                } else {
                    const startX = width / 2;
                    const startY = 90;
                    const dx = player.x - startX;
                    const speed = 0.45;
                    this.game.spawnProjectile(startX, startY, dx * 0.0015, speed, 8, 'enemy');
                }
            } else {
                // Ram/dash towards player or player tower
                const targetX = Math.random() < 0.65 ? player.x : (width / 2 + (Math.random() - 0.5) * 100);
                const targetY = height - 90;
                const angle = Math.atan2(targetY - this.y, targetX - this.x);
                
                const launchForceMultiplier = this.isBoss ? 1.35 : 1.0;
                const launchForce = (0.5 + Math.random() * 0.25) * launchForceMultiplier;
                this.vx = Math.cos(angle) * launchForce;
                this.vy = Math.sin(angle) * launchForce;
                this.game.audioSynth.playSlash('katana');
            }
        }
    }

    draw(ctx, canvasController) {
        if (this.state === 'dead') return;

        ctx.save();

        if (this.isBoss && this.ragdollNodes) {
            const torso = this.ragdollNodes[0];
            const head = this.ragdollNodes[1];
            const leftHand = this.ragdollNodes[2];
            const rightHand = this.ragdollNodes[3];
            const leftFoot = this.ragdollNodes[4];
            const rightFoot = this.ragdollNodes[5];

            // 1. Draw glowing neon bones (limbs)
            canvasController.setNeonGlow(this.color, 15);
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 9;
            ctx.lineCap = 'round';
            this.ragdollConstraints.forEach(([idxA, idxB]) => {
                const nodeA = this.ragdollNodes[idxA];
                const nodeB = this.ragdollNodes[idxB];
                ctx.beginPath();
                ctx.moveTo(nodeA.x, nodeA.y);
                ctx.lineTo(nodeB.x, nodeB.y);
                ctx.stroke();
            });

            // 2. Draw Giant Shogun Shoulder Pads
            canvasController.setNeonGlow(this.color, 12);
            ctx.fillStyle = '#1b0f14';
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2.5;
            
            ctx.beginPath();
            ctx.arc(torso.x - 22, torso.y - 12, 12, Math.PI, 0);
            ctx.fill();
            ctx.stroke();
            
            ctx.beginPath();
            ctx.arc(torso.x + 22, torso.y - 12, 12, Math.PI, 0);
            ctx.fill();
            ctx.stroke();

            // 3. Draw each joint node
            this.ragdollNodes.forEach(node => {
                canvasController.setNeonGlow(node.color, 15);
                ctx.fillStyle = '#0f050a';
                ctx.strokeStyle = node.color;
                ctx.lineWidth = 3.5;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
                ctx.fill();
                ctx.stroke();
                
                canvasController.resetNeonGlow();
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
                ctx.lineWidth = 1.5;
                ctx.beginPath();
                ctx.arc(node.x, node.y, node.radius * 0.5, 0, Math.PI * 2);
                ctx.stroke();
            });

            // 4. Draw giant Kabuto Samurai Horns
            canvasController.setNeonGlow(head.color, 12);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(head.x - 8, head.y - 10, 10, 0, Math.PI * 1.5, true);
            ctx.stroke();
            ctx.beginPath();
            ctx.arc(head.x + 8, head.y - 10, 10, Math.PI, Math.PI * 1.5);
            ctx.stroke();

            // 5. Draw Head Visor (faces player)
            const angleToPlayer = Math.atan2(this.game.player.y - head.y, this.game.player.x - head.x);
            ctx.save();
            ctx.translate(head.x, head.y);
            ctx.rotate(angleToPlayer);
            ctx.fillStyle = '#00ffff';
            ctx.shadowColor = '#00ffff';
            ctx.shadowBlur = 10;
            ctx.fillRect(head.radius * 0.1, -head.radius * 0.3, head.radius * 0.6, head.radius * 0.6);
            ctx.restore();

            // 6. Draw glowing neon katanas in hands
            canvasController.setNeonGlow(this.color, 18);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 3.5;
            
            const leftSwordAngle = Math.atan2(leftHand.y - torso.y, leftHand.x - torso.x) + Math.PI * 0.15;
            ctx.beginPath();
            ctx.moveTo(leftHand.x, leftHand.y);
            ctx.lineTo(leftHand.x + Math.cos(leftSwordAngle) * 45, leftHand.y + Math.sin(leftSwordAngle) * 45);
            ctx.stroke();
            
            const rightSwordAngle = Math.atan2(rightHand.y - torso.y, rightHand.x - torso.x) - Math.PI * 0.15;
            ctx.beginPath();
            ctx.moveTo(rightHand.x, rightHand.y);
            ctx.lineTo(rightHand.x + Math.cos(rightSwordAngle) * 45, rightHand.y + Math.sin(rightSwordAngle) * 45);
            ctx.stroke();

            canvasController.resetNeonGlow();

            // 7. Draw health bar above boss head
            ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
            ctx.fillRect(head.x - 30, head.y - head.radius - 28, 60, 5);
            ctx.fillStyle = this.color;
            ctx.fillRect(head.x - 30, head.y - head.radius - 28, (this.hp / this.maxHp) * 60, 5);
        } else {
            // --- DRAW STANDARD SAMURAI ENEMY ---
             canvasController.drawSamuraiCharacter(
                ctx, 
                this.x, 
                this.y, 
                this.radius, 
                this.color, 
                this.angle, 
                'katana', 
                false, 
                0, 
                0, 
                this.hp / this.maxHp,
                this.trailHistory,
                (this.y < 150)
            );
        }

        ctx.restore();
    }
}


/* --- BUNDLED FROM: src/game.js --- */
/* DANGEROUS FIGHT - MAIN CORE GAME LOOP & SYSTEM ORCHESTRATOR */

class Game {
    constructor() {
        // Initialize core engines
        this.canvasCtrl = new CanvasController('game-canvas');
        this.audioSynth = new AudioSynth();
        this.inputCtrl = new InputController(this.canvasCtrl.canvas);
        this.upgradeMgr = new UpgradeManager();
        this.uiCtrl = new UIController();
        this.particles = new ParticleSystem();
        
        // Symmetrical Towers setup
        this.topTower = { hp: 500, maxHp: 500 };
        this.bottomTower = { hp: 500, maxHp: 500 };

        // Entities
        this.player = new Player(this.canvasCtrl.width / 2, this.canvasCtrl.height - 120, this);
        this.enemy = new Enemy(this.canvasCtrl.width / 2, 120, this);
        this.projectiles = []; // active bouncing bullets
        
        // Gameplay session state variables
        this.gameState = 'menu'; // 'menu', 'multiplayer_select', 'lobby', 'join', 'playing', 'gameover', 'victory'
        this.runCredits = 0;
        this.isHardBossRound = false;
        this.bossWarningTimeout = null;
        this.lastTime = 0;
        this.slowMoTimer = 0;
        
        // Multiplayer WebRTC state
        this.isMultiplayer = false;
        this.isClient = false;
        this.peer = null;
        this.conn = null;
        this.roomId = '';
        
        this.initUIEvents();
        this.initInputEvents();
        
        // Setup initial menu state rendering
        this.uiCtrl.highestWaveVal.innerText = this.upgradeMgr.state.highestWave;
        this.uiCtrl.showScreen('menu');
        
        // Kickoff RAF loop
        requestAnimationFrame((t) => this.loop(t));
    }

    // Bind DOM overlay menu buttons
    initUIEvents() {
        // Single Player vs AI
        document.getElementById('btn-play-ai').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.isMultiplayer = false;
            this.startRun();
        });
        
        // Open multiplayer select screen
        document.getElementById('btn-play-online').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Multiplayer back
        document.getElementById('btn-multi-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Host a room
        document.getElementById('btn-create-room').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.setupMultiplayerHost();
        });

        // Cancel Host lobby
        document.getElementById('btn-lobby-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Join room menu
        document.getElementById('btn-join-room-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            document.getElementById('join-status-text').innerText = '';
            document.getElementById('input-room-code').value = '';
            this.uiCtrl.showScreen('join');
        });

        // Join room back
        document.getElementById('btn-join-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Connect to peer code
        document.getElementById('btn-connect-peer').addEventListener('click', () => {
            this.audioSynth.playClick();
            const code = document.getElementById('input-room-code').value.trim();
            if (code.length === 4) {
                this.setupMultiplayerClient(code);
            } else {
                document.getElementById('join-status-text').innerText = 'Ange en 4-siffrig kod!';
            }
        });

        // Garage (Weapons) menu
        document.getElementById('btn-weapons').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
            this.uiCtrl.showScreen('weapons');
        });
        
        document.getElementById('btn-weapons-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Cannons menu
        document.getElementById('btn-cannons').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderCannonShop(this.upgradeMgr, (key) => this.handleCannonArsenal(key), this.audioSynth);
            this.uiCtrl.showScreen('cannons');
        });
        
        document.getElementById('btn-cannons-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Upgrades menu
        document.getElementById('btn-upgrades').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderPersistentUpgrades(this.upgradeMgr, (key) => this.handlePersistentUpgrade(key), this.audioSynth);
            this.uiCtrl.showScreen('upgrades');
        });
        
        document.getElementById('btn-upgrades-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });
        
        // Game Over screen buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            if (this.isMultiplayer) {
                this.sendNetworkPacket({ type: 'restart_request' });
                document.getElementById('stat-defeat-winner').innerText = 'Väntar på motståndare...';
            } else {
                this.startRun();
            }
        });
        
        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('menu');
        });
        
        // Victory screen buttons
        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            if (this.isMultiplayer) {
                this.sendNetworkPacket({ type: 'restart_request' });
            } else {
                this.startRun();
            }
        });
        
        document.getElementById('btn-victory-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('menu');
        });

        // Floating shoot button with responsive touchstart and click handling
        const shootBtn = document.getElementById('shoot-btn');
        const triggerShoot = (e) => {
            if (e.cancelable) e.preventDefault();
            this.player.shoot();
        };
        shootBtn.addEventListener('click', triggerShoot);
        shootBtn.addEventListener('touchstart', triggerShoot, { passive: false });
    }

    // Bind dragging slingshot gameplay inputs
    initInputEvents() {
        this.inputCtrl.onDragStart = (x, y) => {
            if (this.gameState !== 'playing') return false;
            if (this.player.containsPoint(x, y)) {
                return this.player.startDrag();
            }
            return false;
        };
        
        this.inputCtrl.onDragMove = (dx, dy) => {
            if (this.gameState !== 'playing') return;
            this.player.dragMove(dx, dy);
        };

        this.inputCtrl.onDragEnd = (dx, dy) => {
            if (this.gameState !== 'playing') return;
            this.player.endDrag();
        };

        // Keyboard Arrow/WASD fallback
        this.inputCtrl.onKeyboardLaunch = (dirX, dirY) => {
            if (this.gameState !== 'playing' || this.player.state === 'dead') return;
            this.player.vx = dirX * 0.45 * this.player.profile.speedMultiplier;
            this.player.vy = dirY * 0.45 * this.player.profile.speedMultiplier;
            this.audioSynth.playSlash(this.player.activeWeaponKey);
        };
    }

    // Vehicle equip/unlock shop logic
    handleWeaponArsenal(weaponKey) {
        const state = this.upgradeMgr.state;
        const costs = { katana: 0, blades: 100, hammer: 250 };
        const cost = costs[weaponKey];
        
        if (state.unlockedWeapons[weaponKey]) {
            this.upgradeMgr.equipWeapon(weaponKey);
            this.player.activeWeaponKey = weaponKey;
        } else {
            if (this.upgradeMgr.buyWeapon(weaponKey, cost)) {
                this.player.activeWeaponKey = weaponKey;
                this.audioSynth.playUpgrade();
            }
        }
        this.uiCtrl.renderWeaponShop(this.upgradeMgr, (key) => this.handleWeaponArsenal(key), this.audioSynth);
    }

    // Cannon equip/unlock shop logic
    handleCannonArsenal(cannonKey) {
        const state = this.upgradeMgr.state;
        const costs = { laser: 0, plasma: 150, rapid: 200, trio: 300, hagel: 350, sniper: 450, bak\u00e5t: 500 };
        const cost = costs[cannonKey] || 0;
        
        if (state.unlockedCannons[cannonKey]) {
            // Toggle active state
            this.upgradeMgr.toggleCannon(cannonKey);
        } else {
            if (this.upgradeMgr.buyCannon(cannonKey, cost)) {
                this.audioSynth.playUpgrade();
            }
        }
        this.uiCtrl.renderCannonShop(this.upgradeMgr, (key) => this.handleCannonArsenal(key), this.audioSynth);
    }

    // Persistent upgrades purchase logic
    handlePersistentUpgrade(upgradeKey) {
        if (this.upgradeMgr.buyUpgrade(upgradeKey)) {
            this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
            this.audioSynth.playUpgrade();
        }
        this.uiCtrl.renderPersistentUpgrades(this.upgradeMgr, (key) => this.handlePersistentUpgrade(key), this.audioSynth);
    }

    // Host PeerJS Setup
    setupMultiplayerHost() {
        this.isMultiplayer = true;
        this.isClient = false;
        
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        this.roomId = randomCode;
        document.getElementById('lobby-code-val').innerText = randomCode;
        this.uiCtrl.showScreen('lobby');

        this.peer = new Peer(`dangerousfight-${randomCode}`);
        
        this.peer.on('open', (id) => {
            console.log('Room hosted with ID:', randomCode);
        });

        this.peer.on('connection', (conn) => {
            this.conn = conn;
            this.bindNetworkEvents();
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS error, retrying host...', err);
            this.cleanupNetwork();
            this.setupMultiplayerHost(); // try again with a different code
        });
    }

    // Client PeerJS Setup
    setupMultiplayerClient(code) {
        this.isMultiplayer = true;
        this.isClient = true;
        this.roomId = code;
        
        const statusEl = document.getElementById('join-status-text');
        statusEl.innerText = 'Ansluter...';

        this.peer = new Peer(); // Random Client ID
        
        this.peer.on('open', (id) => {
            const hostId = `dangerousfight-${code}`;
            this.conn = this.peer.connect(hostId);
            this.bindNetworkEvents();
        });

        this.peer.on('error', (err) => {
            console.error('PeerJS Join error:', err);
            statusEl.innerText = 'Kunde inte ansluta till rummet.';
            this.cleanupNetwork();
        });
    }

    bindNetworkEvents() {
        this.conn.on('open', () => {
            console.log('Network connection fully open!');
            this.sendNetworkPacket({
                type: 'handshake',
                vehicle: this.player.activeWeaponKey,
                cannon: this.upgradeMgr.state.equippedCannons || [this.upgradeMgr.state.equippedCannon || 'laser'],
                upgrades: this.upgradeMgr.state.upgrades
            });
        });

        this.conn.on('data', (data) => {
            this.handleIncomingPacket(data);
        });

        this.conn.on('close', () => {
            console.log('Network connection closed!');
            this.cleanupNetwork();
            if (this.gameState === 'playing') {
                this.uiCtrl.renderGameOver(0, 'Motståndaren kopplade från');
            }
        });
    }

    cleanupNetwork() {
        if (this.conn) {
            this.conn.close();
            this.conn = null;
        }
        if (this.peer) {
            this.peer.destroy();
            this.peer = null;
        }
        this.isMultiplayer = false;
        this.isClient = false;
    }

    sendNetworkPacket(data) {
        if (this.conn && this.conn.open) {
            this.conn.send(data);
        }
    }

    handleIncomingPacket(data) {
        if (data.type === 'handshake') {
            // Setup opponent's vehicle type
            this.enemy.setVehicleType(data.vehicle);
            if (data.upgrades) {
                // Symmetrically, opponent's upgrades affect their maxHP
                this.enemy.maxHp = this.enemy.profile.baseHp + ((data.upgrades.health || 0) * 10);
                this.enemy.hp = this.enemy.maxHp;
            }
            
            // Handshake response from client to host
            if (!this.isClient) {
                this.sendNetworkPacket({
                    type: 'handshake_ack',
                    vehicle: this.player.activeWeaponKey,
                    cannon: this.upgradeMgr.state.equippedCannons || [this.upgradeMgr.state.equippedCannon || 'laser'],
                    upgrades: this.upgradeMgr.state.upgrades
                });
                // Host kicks off run!
                this.startRun();
            }
        } else if (data.type === 'handshake_ack') {
            this.enemy.setVehicleType(data.vehicle);
            if (data.upgrades) {
                this.enemy.maxHp = this.enemy.profile.baseHp + ((data.upgrades.health || 0) * 10);
                this.enemy.hp = this.enemy.maxHp;
            }
            // Client kicks off run!
            this.startRun();
        } else if (data.type === 'sync') {
            // Sync positions (Note: Mirrored view mapping!)
            const w = this.canvasCtrl.width;
            const h = this.canvasCtrl.height;

            // Opponent car position/speed/HP
            this.enemy.x = w - data.player.x;
            this.enemy.y = h - data.player.y;
            this.enemy.vx = -data.player.vx;
            this.enemy.vy = -data.player.vy;
            this.enemy.hp = data.player.hp;
            this.enemy.energy = data.player.energy;
            
            // Sync screen shake
            if (data.shake) {
                this.canvasCtrl.shake(data.shake.amt, data.shake.dur);
            }
            
            // Sync spawned remote projectiles (mirrored)
            if (data.spawnedProjectiles) {
                data.spawnedProjectiles.forEach(p => {
                    this.spawnProjectile(
                        w - p.x,
                        h - p.y,
                        -p.vx,
                        -p.vy,
                        p.radius,
                        'enemy'
                    );
                });
            }
            
            // Symmetrically sync tower healths
            if (this.isClient) {
                // Host sends authoritative tower healths
                this.bottomTower.hp = data.towers.top; // Client's bottom tower is Host's top tower
                this.topTower.hp = data.towers.bottom; // Client's top tower is Host's bottom tower
            } else {
                // Host receives client car updates
                // Symmetrically, Host tower values are authoritative. We don't overwrite them here.
            }
        } else if (data.type === 'projectile_fired') {
            // Client spawned a projectile, Host replicates it
            const w = this.canvasCtrl.width;
            const h = this.canvasCtrl.height;
            this.spawnProjectile(
                w - data.x,
                h - data.y,
                -data.vx,
                -data.vy,
                data.radius,
                'enemy',
                data.cannonType || 'laser'
            );
        } else if (data.type === 'restart_request') {
            this.startRun();
        }
    }

    // Triggered when starting a game
    startRun() {
        this.runCredits = 0;
        this.particles.clear();
        this.projectiles = [];
        this.slowMoTimer = 0; // reset slow motion
        
        let isBoss = false;
        if (!this.isMultiplayer) {
            // Increment match count
            this.upgradeMgr.state.matchCount = (this.upgradeMgr.state.matchCount || 0) + 1;
            this.upgradeMgr.save();
            
            // Determine if this is a hard boss match
            if (this.upgradeMgr.state.matchCount % 2 === 0) {
                isBoss = true;
            }
        }
        this.isHardBossRound = isBoss;
        
        // Reset towers (incorporate upgrades)
        const towerUpgLvl = this.upgradeMgr.state.upgrades.health || 0;
        const towerMaxHp = 500 + towerUpgLvl * 50;
        const bossTowerMaxHp = isBoss ? Math.floor(towerMaxHp * 1.5) : towerMaxHp;
        this.topTower = { hp: bossTowerMaxHp, maxHp: bossTowerMaxHp };
        this.bottomTower = { hp: towerMaxHp, maxHp: towerMaxHp };
        
        this.player.resetForRun();
        this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
        
        // Settle active weapon on player
        this.player.activeWeaponKey = this.upgradeMgr.state.equippedWeapon || 'katana';
        
        // Reset enemy car
        this.enemy.resetForRun(isBoss);
        
        // Offer cybernetic perks in single-player before entering battle
        if (!this.isMultiplayer) {
            const randomPerks = this.upgradeMgr.getRandomPerks();
            this.uiCtrl.showScreen('perks');
            this.uiCtrl.renderPerkSelection(randomPerks, (perkKey) => {
                this.player.activePerk = perkKey;
                if (perkKey === 'shieldCharge') {
                    this.player.shieldHp = 1;
                    this.player.shieldCooldown = 0;
                }
                
                // Complete game start after perk choice
                this.gameState = 'playing';
                this.uiCtrl.showScreen('hud');
                
                // Manage HUD boss warning banner overlay
                this.showBossWarningBanner(isBoss);
                
                // Play epic bass voice intro and start background music!
                this.audioSynth.playVoiceIntro(isBoss);
                this.audioSynth.startMusic();
            }, this.audioSynth);
        } else {
            // Multiplayer starts instantly (symmetrical gameplay without active perks)
            this.gameState = 'playing';
            this.uiCtrl.showScreen('hud');
            this.audioSynth.playVoiceIntro(false);
            this.audioSynth.startMusic();
        }
    }

    showBossWarningBanner(isBoss) {
        const warningBanner = document.getElementById('boss-warning');
        if (warningBanner) {
            if (isBoss) {
                warningBanner.innerText = "VARNING: SHOGUN DETEKTERAD! 💀";
                warningBanner.classList.remove('hidden');
                if (this.bossWarningTimeout) clearTimeout(this.bossWarningTimeout);
                this.bossWarningTimeout = setTimeout(() => {
                    warningBanner.classList.add('hidden');
                }, 3000);
            } else {
                warningBanner.classList.add('hidden');
                if (this.bossWarningTimeout) {
                    clearTimeout(this.bossWarningTimeout);
                    this.bossWarningTimeout = null;
                }
            }
        }
    }

    // Projectile Spawner
    spawnProjectile(x, y, vx, vy, radius, owner, type = 'laser') {
        let damageCar = 25;
        let damageTower = 50;
        let color = '#00f0ff'; // cyan for player
        if (owner === 'enemy') {
            color = '#ff0077'; // pink/red for enemy
            damageCar = 25;
            damageTower = 50;
            if (type === 'plasma') {
                damageCar = 50;
                damageTower = 110;
                color = '#ff00ff';
            } else if (type === 'rapid') {
                damageCar = 15;
                damageTower = 30;
                color = '#39ff14'; // neon green
            } else if (type === 'trio') {
                damageCar = 15;
                damageTower = 30;
                color = '#ffff00';
            } else if (type === 'hagel') {
                damageCar = 10;
                damageTower = 20;
                color = '#aaffff'; // light cyan
            } else if (type === 'sniper') {
                damageCar = 80;
                damageTower = 160;
                color = '#ffffff'; // white hot
            } else if (type === 'bakåt') {
                damageCar = 20;
                damageTower = 40;
                color = '#00ffaa'; // teal
            }
        } else {
            // Player projectile stats based on type
            if (type === 'plasma') {
                damageCar = 50;
                damageTower = 110;
                color = '#ff00ff'; // purple/magenta
            } else if (type === 'rapid') {
                damageCar = 15;
                damageTower = 30;
                color = '#39ff14'; // neon green Dubbel-Laser
            } else if (type === 'trio') {
                damageCar = 15;
                damageTower = 30;
                color = '#ffff00'; // yellow
            } else if (type === 'hagel') {
                damageCar = 10;
                damageTower = 20;
                color = '#aaffff'; // light cyan shotgun pellets
            } else if (type === 'sniper') {
                damageCar = 80;
                damageTower = 160;
                color = '#ffffff'; // white hot precision beam
            } else if (type === 'bakåt') {
                damageCar = 20;
                damageTower = 40;
                color = '#00ffaa'; // teal bidirectional
            }
            
            // Sync with remote player in multiplayer
            if (this.isMultiplayer) {
                this.sendNetworkPacket({
                    type: 'projectile_fired',
                    x, y, vx, vy, radius, cannonType: type
                });
            }
        }
        
        this.projectiles.push({
            x, y, vx, vy, radius, owner, type, damageCar, damageTower, color
        });
    }

    // Main Engine updates (Physics & Collisions)
    update(dt) {
        if (this.gameState !== 'playing') {
            this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
            this.particles.update(dt);
            return;
        }

        // Handle slow-motion time dilation
        let enemyDt = dt;
        let physicsDt = dt;
        if (this.slowMoTimer > 0) {
            this.slowMoTimer -= dt;
            enemyDt = dt * 0.40;
            physicsDt = dt * 0.40;
            // Ambient slow-mo neon pulse
            if (Math.random() < 0.08) {
                this.canvasCtrl.flash('rgba(0, 240, 255, 0.05)', 80);
            }
        }

        // Update systems
        this.canvasCtrl.update(dt, this.player);
        this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
        this.particles.update(dt);
        
        this.player.update(dt, this.canvasCtrl.width, this.canvasCtrl.height, this.particles);
        this.enemy.update(enemyDt, this.player, this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
        
        this.updatePhysics(physicsDt);
        this.checkCollisions(physicsDt);
        
        // Network Sync
        if (this.isMultiplayer) {
            const spawnedProjsThisFrame = []; // we can check if player shot
            
            // Build Sync packet
            const syncData = {
                type: 'sync',
                player: {
                    x: this.player.x,
                    y: this.player.y,
                    vx: this.player.vx,
                    vy: this.player.vy,
                    hp: this.player.hp,
                    energy: this.player.energy
                },
                towers: {
                    bottom: this.bottomTower.hp,
                    top: this.topTower.hp
                }
            };
            
            this.sendNetworkPacket(syncData);
        }
    }

    updatePhysics(dt) {
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;

        // --- 1. LAVA COLLISION DETECTION ---
        // Lava center Y: h/2. Width: w - 160. X-range: 80 to w - 80. Height/Thick: 50.
        const lavaMinX = 80;
        const lavaMaxX = w - 80;
        const lavaMinY = h / 2 - 25;
        const lavaMaxY = h / 2 + 25;
        const lavaDamagePerMs = 0.025; // 25 HP per second

        // Check player car in lava
        if (this.player.x > lavaMinX && this.player.x < lavaMaxX && this.player.y > lavaMinY && this.player.y < lavaMaxY && this.player.state !== 'dead') {
            this.player.hp = Math.max(0, this.player.hp - lavaDamagePerMs * dt);
            
            // Slow down
            this.player.vx *= 0.85;
            this.player.vy *= 0.85;
            
            // Push player back towards bottom
            this.player.vy += 0.015 * dt;
            
            if (Math.random() < 0.15) {
                this.particles.spawnClashSparks(this.player.x, this.player.y, '#ff9900');
            }
            if (this.player.hp <= 0) {
                this.player.takeDamage(1, this.player.x, this.player.y, this.particles, this.canvasCtrl);
            }
        }

        // Check enemy car in lava
        if (this.enemy.x > lavaMinX && this.enemy.x < lavaMaxX && this.enemy.y > lavaMinY && this.enemy.y < lavaMaxY && this.enemy.state !== 'dead') {
            this.enemy.hp = Math.max(0, this.enemy.hp - lavaDamagePerMs * dt);
            
            // Slow down
            this.enemy.vx *= 0.85;
            this.enemy.vy *= 0.85;
            
            // Push enemy back towards top
            this.enemy.vy -= 0.015 * dt;
            
            if (Math.random() < 0.15) {
                this.particles.spawnClashSparks(this.enemy.x, this.enemy.y, '#ff9900');
            }
            if (this.enemy.hp <= 0) {
                this.enemy.takeDamage(1, this.enemy.x, this.enemy.y, this.particles, this.canvasCtrl);
            }
        }

        // --- 2. ONE-WAY PASSAGE GATES ---
        // Left Passage (x < 80): ONLY UPWARDS movement allowed.
        // Symmetrically, if moving downwards (vy > 0), block at y = h/2.
        const blockCheck = (obj) => {
            if (obj.x < 80) {
                // Left side: going down is blocked
                if (obj.vy > 0 && obj.y - obj.radius < h / 2 + 10 && obj.y + obj.radius > h / 2 - 10) {
                    obj.y = h / 2 - obj.radius - 2;
                    obj.vy = -obj.vy * 0.4; // slight bounce back
                }
            } else if (obj.x > w - 80) {
                // Right side: going up is blocked
                if (obj.vy < 0 && obj.y - obj.radius < h / 2 + 10 && obj.y + obj.radius > h / 2 - 10) {
                    obj.y = h / 2 + obj.radius + 2;
                    obj.vy = -obj.vy * 0.4;
                }
            }
        };

        if (this.player.state !== 'dead') blockCheck(this.player);
        if (this.enemy.state !== 'dead') blockCheck(this.enemy);

        // --- 3. PROJECTILES PHYSICS ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            
            // Wall bounce (left/right walls)
            if (p.x < p.radius) {
                p.x = p.radius;
                p.vx = -p.vx * 0.95;
                this.audioSynth.playClick();
            } else if (p.x > w - p.radius) {
                p.x = w - p.radius;
                p.vx = -p.vx * 0.95;
                this.audioSynth.playClick();
            }
            
            // Top/bottom bounce (in case they pass towers through gaps)
            if (p.y < p.radius) {
                p.y = p.radius;
                p.vy = -p.vy * 0.95;
                this.audioSynth.playClick();
            } else if (p.y > h - p.radius) {
                p.y = h - p.radius;
                p.vy = -p.vy * 0.95;
                this.audioSynth.playClick();
            }
            
            // One-way gate check for projectile
            blockCheck(p);
            
            // Check Tower Hits
            let hitTopTower = false;
            let hitBottomTower = false;
            
            if (p.y < 85) {
                if (this.isHardBossRound) {
                    if (p.x >= 80 && p.x <= 160) hitTopTower = true;
                    else if (p.x >= w - 160 && p.x <= w - 80) hitTopTower = true;
                } else {
                    if (p.x >= w / 2 - 80 && p.x <= w / 2 + 80) hitTopTower = true;
                }
            } else if (p.y > h - 85) {
                if (p.x >= w / 2 - 80 && p.x <= w / 2 + 80) hitBottomTower = true;
            }
            
            if (hitTopTower) {
                // Damage top tower
                this.topTower.hp = Math.max(0, this.topTower.hp - 50);
                this.particles.spawnShockwave(p.x, p.y, '#ff0077', 45);
                this.canvasCtrl.flash('rgba(255, 0, 119, 0.25)', 200);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            } else if (hitBottomTower) {
                // Damage bottom tower
                this.bottomTower.hp = Math.max(0, this.bottomTower.hp - 50);
                this.particles.spawnShockwave(p.x, p.y, '#00f0ff', 45);
                this.canvasCtrl.flash('rgba(0, 240, 255, 0.25)', 200);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            }
            
            // Check samurai/enemy hits
            if (this.player.state !== 'dead' && Math.hypot(p.x - this.player.x, p.y - this.player.y) < this.player.radius + p.radius) {
                // Perfect Parry: if projectile belongs to enemy and player is launching/dashing fast
                if (p.owner === 'enemy' && Math.hypot(this.player.vx, this.player.vy) > 0.15) {
                    this.particles.spawnShockwave(p.x, p.y, '#ffffff', 40);
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.4)', 150);
                    this.canvasCtrl.shake(7, 120);
                    this.audioSynth.playParry();
                    
                    // Vampirism Perk Heal
                    if (this.player.activePerk === 'vampirism') {
                        this.player.hp = Math.min(this.player.maxHp, this.player.hp + Math.floor(this.player.maxHp * 0.08));
                    }
                    
                    // Time Dilation slow motion perk
                    if (this.player.activePerk === 'timeDilation') {
                        this.slowMoTimer = 2500;
                    }
                    
                    // Deflect the projectile (reverse direction and transfer ownership to player!)
                    p.owner = 'player';
                    p.vx = -p.vx * 1.25;
                    p.vy = -p.vy * 1.25;
                    p.color = '#00f0ff'; // change laser color to player cyan!
                    
                    continue;
                }
                
                this.player.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (this.enemy.state !== 'dead') {
                let hitEnemy = false;
                if (this.enemy.isBoss && this.enemy.ragdollNodes) {
                    for (let n = 0; n < this.enemy.ragdollNodes.length; n++) {
                        const node = this.enemy.ragdollNodes[n];
                        if (Math.hypot(p.x - node.x, p.y - node.y) < node.radius + p.radius) {
                            hitEnemy = true;
                            // Push the node slightly when hit by projectile
                            const angle = Math.atan2(node.y - p.y, node.x - p.x);
                            node.vx += Math.cos(angle) * 0.05;
                            node.vy += Math.sin(angle) * 0.05;
                            break;
                        }
                    }
                } else {
                    if (Math.hypot(p.x - this.enemy.x, p.y - this.enemy.y) < this.enemy.radius + p.radius) {
                        hitEnemy = true;
                    }
                }

                if (hitEnemy) {
                    this.enemy.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
        }
    }

    checkCollisions(dt) {
        if (this.player.state === 'dead' || this.enemy.state === 'dead') return;

        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;

        // --- 1. SAMURAI-TO-SAMURAI ELASTIC COLLISION ---
        if (this.enemy.isBoss && this.enemy.ragdollNodes) {
            this.enemy.ragdollNodes.forEach(node => {
                const dist = Math.hypot(this.player.x - node.x, this.player.y - node.y);
                const touchDist = this.player.radius + node.radius;
                
                if (dist < touchDist) {
                    const angle = Math.atan2(this.player.y - node.y, this.player.x - node.x);
                    const overlap = touchDist - dist;
                    
                    this.player.x += Math.cos(angle) * overlap * 0.5;
                    this.player.y += Math.sin(angle) * overlap * 0.5;
                    node.x -= Math.cos(angle) * overlap * 0.5;
                    node.y -= Math.sin(angle) * overlap * 0.5;

                    const normalX = Math.cos(angle);
                    const normalY = Math.sin(angle);
                    
                    const rvx = this.player.vx - node.vx;
                    const rvy = this.player.vy - node.vy;
                    const velAlongNormal = rvx * normalX + rvy * normalY;
                    
                    if (velAlongNormal < 0) {
                        const restitution = 0.85;
                        let impulseScalar = -(1 + restitution) * velAlongNormal;
                        impulseScalar /= (1 / this.player.mass) + (1 / node.mass);
                        
                        this.player.vx += (impulseScalar / this.player.mass) * normalX;
                        this.player.vy += (impulseScalar / this.player.mass) * normalY;
                        node.vx -= (impulseScalar / node.mass) * normalX;
                        node.vy -= (impulseScalar / node.mass) * normalY;
                    }
                    
                    this.audioSynth.playClash();
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
                    this.particles.spawnClashSparks((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, '#ffffff');
                }
            });
        } else {
            const dist = Math.hypot(this.player.x - this.enemy.x, this.player.y - this.enemy.y);
            const touchDist = this.player.radius + this.enemy.radius;
            
            if (dist < touchDist) {
                const angle = Math.atan2(this.player.y - this.enemy.y, this.player.x - this.enemy.x);
                const overlap = touchDist - dist;
                
                this.player.x += Math.cos(angle) * overlap * 0.5;
                this.player.y += Math.sin(angle) * overlap * 0.5;
                this.enemy.x -= Math.cos(angle) * overlap * 0.5;
                this.enemy.y -= Math.sin(angle) * overlap * 0.5;

                const normalX = Math.cos(angle);
                const normalY = Math.sin(angle);
                
                const rvx = this.player.vx - this.enemy.vx;
                const rvy = this.player.vy - this.enemy.vy;
                const velAlongNormal = rvx * normalX + rvy * normalY;
                
                if (velAlongNormal < 0) {
                    const restitution = 0.85;
                    let impulseScalar = -(1 + restitution) * velAlongNormal;
                    impulseScalar /= (1 / this.player.mass) + (1 / this.enemy.mass);
                    
                    this.player.vx += (impulseScalar / this.player.mass) * normalX;
                    this.player.vy += (impulseScalar / this.player.mass) * normalY;
                    this.enemy.vx -= (impulseScalar / this.enemy.mass) * normalX;
                    this.enemy.vy -= (impulseScalar / this.enemy.mass) * normalY;
                }
                
                this.audioSynth.playClash();
                this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
                this.particles.spawnClashSparks((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#ffffff');
            }
        }

        // --- 2. TOWER RAMMING COLLISION ---
        // Player samurai hitting top tower (enemy)
        if (this.player.y < 85) {
            let hitTopTower = false;
            if (this.isHardBossRound) {
                const leftIntersect = (this.player.x + this.player.radius >= 80 && this.player.x - this.player.radius <= 160);
                const rightIntersect = (this.player.x + this.player.radius >= w - 160 && this.player.x - this.player.radius <= w - 80);
                if (leftIntersect || rightIntersect) {
                    hitTopTower = true;
                }
            } else {
                if (this.player.x + this.player.radius >= w / 2 - 80 && this.player.x - this.player.radius <= w / 2 + 80) {
                    hitTopTower = true;
                }
            }

            if (hitTopTower) {
                const impactForce = Math.abs(this.player.vy);
                if (impactForce > 0.05) {
                    const ramDmg = this.player.profile.ramDamage;
                    this.topTower.hp = Math.max(0, this.topTower.hp - ramDmg);
                    
                    this.player.vy = 0.28;
                    this.player.y = 88;
                    
                    this.player.takeDamage(30, this.player.x, 70, this.particles, this.canvasCtrl);
                    
                    this.particles.spawnShockwave(this.player.x, 85, this.player.color, 80);
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.45)', 220); // white slam flash
                    this.canvasCtrl.shake(14, 300);
                    this.audioSynth.playHit();
                    
                    this.checkWinCondition();
                }
            }
        }

        // Enemy samurai hitting bottom tower (player)
        let hitBottomTower = false;
        let hittingNode = this.enemy;
        
        if (this.enemy.isBoss && this.enemy.ragdollNodes) {
            for (let n = 0; n < this.enemy.ragdollNodes.length; n++) {
                const node = this.enemy.ragdollNodes[n];
                if (node.y + node.radius > h - 85) {
                    if (node.x + node.radius >= w / 2 - 80 && node.x - node.radius <= w / 2 + 80) {
                        hitBottomTower = true;
                        hittingNode = node;
                        break;
                    }
                }
            }
        } else {
            if (this.enemy.y + this.enemy.radius > h - 85) {
                if (this.enemy.x + this.enemy.radius >= w / 2 - 80 && this.enemy.x - this.enemy.radius <= w / 2 + 80) {
                    hitBottomTower = true;
                }
            }
        }

        if (hitBottomTower) {
            const impactForce = Math.abs(hittingNode.vy);
            if (impactForce > 0.05) {
                const ramDmg = this.enemy.isBoss ? 150 : (this.enemy.profiles[this.enemy.activeWeaponKey]?.ramDamage || 100);
                this.bottomTower.hp = Math.max(0, this.bottomTower.hp - ramDmg);
                
                if (this.enemy.isBoss && this.enemy.ragdollNodes) {
                    this.enemy.ragdollNodes.forEach(node => {
                        node.vy = -0.28;
                        node.y -= 10;
                    });
                } else {
                    this.enemy.vy = -0.28;
                    this.enemy.y = h - 88;
                }
                
                this.enemy.takeDamage(30, hittingNode.x, h - 70, this.particles, this.canvasCtrl);
                
                this.particles.spawnShockwave(hittingNode.x, h - 85, this.enemy.color, 80);
                this.canvasCtrl.flash('rgba(255, 0, 51, 0.45)', 250); // red warn flash
                this.canvasCtrl.shake(14, 300);
                this.audioSynth.playHit();
                
                this.checkWinCondition();
            }
        }
    }

    checkWinCondition() {
        if (this.topTower.hp <= 0) {
            // Player Wins!
            this.handleVictory();
        } else if (this.bottomTower.hp <= 0) {
            // Player Loses!
            this.handleDefeat();
        }
    }

    handleVictory() {
        this.gameState = 'victory';
        
        const isBoss = !this.isMultiplayer && this.isHardBossRound;
        
        // Award credits (multiplied by hacker level)
        const creditUpgradeModifier = 1 + (this.upgradeMgr.state.upgrades.credits || 0) * 0.2; // up to +100% credits
        const baseAward = isBoss ? 120 : 60;
        const rewardCredits = Math.floor(baseAward * creditUpgradeModifier);
        
        this.upgradeMgr.addCredits(rewardCredits);
        this.upgradeMgr.recordHighestWave(this.upgradeMgr.state.highestWave + 1);
        
        this.uiCtrl.renderVictory(rewardCredits, isBoss);
        this.audioSynth.playVictory();
    }

    handleDefeat() {
        this.gameState = 'gameover';
        
        // Suffer partial credit loss/award
        const rewardCredits = 10;
        this.upgradeMgr.addCredits(rewardCredits);
        
        this.uiCtrl.renderGameOver(rewardCredits, this.isMultiplayer ? 'Motståndaren' : 'Datorn');
        this.audioSynth.playDefeat();
    }

    // Main Engine rendering calls
    draw() {
        // Clear screen with custom trails persistence (motion blur)
        const opacityTrail = this.gameState === 'playing' ? 0.38 : 0.8;
        this.canvasCtrl.clear(opacityTrail);
        
        // Apply camera screen shake translations
        this.canvasCtrl.applyTransformations();
        
        // Draw one-way gate visual effects
        this.drawOneWayGates();
        
        // Draw center lava barrier
        this.drawLavaBarrier();

        // Draw glowing particles
        this.particles.draw(this.canvasCtrl.ctx);
        
        // Draw Projectiles
        if (this.gameState === 'playing') {
            this.projectiles.forEach(p => {
                this.canvasCtrl.ctx.save();
                this.canvasCtrl.setNeonGlow('#ffffff', 10);
                this.canvasCtrl.ctx.fillStyle = '#ffffff';
                this.canvasCtrl.ctx.beginPath();
                this.canvasCtrl.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                this.canvasCtrl.ctx.fill();
                this.canvasCtrl.ctx.restore();
            });
        }

        // Draw Entities
        if (this.gameState === 'playing' || this.gameState === 'gameover' || this.gameState === 'victory') {
            this.player.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            this.enemy.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            
            // Draw static glowing Towers
            this.drawTowers();
        }
        
        // Restore matrix
        this.canvasCtrl.restoreTransformations();
        
        // UI Hud updates
        if (this.gameState === 'playing') {
            this.uiCtrl.updateHUD(this.player, this.enemy, this.isMultiplayer, this.isClient);
        }
    }

    drawLavaBarrier() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        
        ctx.save();
        this.canvasCtrl.setNeonGlow(this.gameState === 'playing' ? 'var(--neon-orange)' : 'rgba(255,153,0,0.25)', 25);
        ctx.fillStyle = 'rgba(255, 90, 0, 0.9)';
        ctx.strokeStyle = '#ff9900';
        ctx.lineWidth = 3;
        
        // Lava rectangle centered
        // x: 80 to w - 80, height: 50. Centered on Y-axis
        ctx.beginPath();
        ctx.rect(80, h / 2 - 25, w - 160, 50);
        ctx.fill();
        ctx.stroke();
        
        // Draw hot inner details
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(90, h / 2);
        ctx.lineTo(w - 90, h / 2);
        ctx.stroke();
        
        ctx.restore();
    }

    drawOneWayGates() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        
        ctx.save();
        
        // Visual line of gate
        const centerY = h / 2;
        ctx.lineWidth = 4;
        ctx.lineCap = 'round';
        
        // LEFT Passage: UP-only (Green arrows pointing UP, blocks Down)
        this.canvasCtrl.setNeonGlow('var(--neon-green)', 15);
        ctx.strokeStyle = 'rgba(57, 255, 20, 0.45)';
        ctx.beginPath();
        ctx.moveTo(10, centerY);
        ctx.lineTo(70, centerY);
        ctx.stroke();
        
        // Draw directional arrows pointing UP (negative y)
        ctx.fillStyle = 'rgba(57, 255, 20, 0.65)';
        ctx.beginPath();
        ctx.moveTo(40, centerY - 15);
        ctx.lineTo(32, centerY - 6);
        ctx.lineTo(48, centerY - 6);
        ctx.closePath();
        ctx.fill();
        
        // RIGHT Passage: DOWN-only (Red/Pink arrows pointing DOWN, blocks Up)
        this.canvasCtrl.setNeonGlow('var(--neon-pink)', 15);
        ctx.strokeStyle = 'rgba(255, 0, 119, 0.45)';
        ctx.beginPath();
        ctx.moveTo(w - 70, centerY);
        ctx.lineTo(w - 10, centerY);
        ctx.stroke();
        
        // Draw directional arrows pointing DOWN (positive y)
        ctx.fillStyle = 'rgba(255, 0, 119, 0.65)';
        ctx.beginPath();
        ctx.moveTo(w - 40, centerY + 15);
        ctx.lineTo(w - 48, centerY + 6);
        ctx.lineTo(w - 32, centerY + 6);
        ctx.closePath();
        ctx.fill();
        
        ctx.restore();
    }

    drawTowers() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;

        ctx.save();
        
        // Draw Top Tower (Red neon)
        const glowColor = this.isHardBossRound ? 'crimson' : 'var(--neon-pink)';
        this.canvasCtrl.setNeonGlow(glowColor, 20);
        ctx.fillStyle = '#0f0508';
        ctx.strokeStyle = glowColor;
        ctx.lineWidth = 4;
        
        if (this.isHardBossRound) {
            // Left Top Tower: x from 80 to 160 (width 80)
            ctx.beginPath();
            ctx.rect(80, 0, 80, 80);
            ctx.fill();
            ctx.stroke();

            // Striped background for Left loading pad
            ctx.save();
            ctx.strokeStyle = 'rgba(220, 20, 60, 0.25)'; // Crimson transparent
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = 85; x < 155; x += 15) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 10, 80);
            }
            ctx.stroke();
            ctx.restore();

            // Right Top Tower: x from w - 160 to w - 80 (width 80)
            ctx.beginPath();
            ctx.rect(w - 160, 0, 80, 80);
            ctx.fill();
            ctx.stroke();

            // Striped background for Right loading pad
            ctx.save();
            ctx.strokeStyle = 'rgba(220, 20, 60, 0.25)'; // Crimson transparent
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = w - 155; x < w - 85; x += 15) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 10, 80);
            }
            ctx.stroke();
            ctx.restore();
        } else {
            // Top block (h = 80, spanning centered w-160)
            ctx.beginPath();
            ctx.rect(w / 2 - 80, 0, 160, 80);
            ctx.fill();
            ctx.stroke();
            
            // Top loading pad (striped)
            ctx.strokeStyle = 'rgba(255, 0, 119, 0.25)';
            ctx.lineWidth = 3;
            ctx.beginPath();
            for (let x = w / 2 - 70; x < w / 2 + 70; x += 15) {
                ctx.moveTo(x, 0);
                ctx.lineTo(x + 10, 80);
            }
            ctx.stroke();
        }

        // Draw Bottom Tower (Cyan neon)
        this.canvasCtrl.setNeonGlow('var(--neon-cyan)', 20);
        ctx.fillStyle = '#050c0f';
        ctx.strokeStyle = 'var(--neon-cyan)';
        ctx.lineWidth = 4;
        
        // Bottom block
        ctx.beginPath();
        ctx.rect(w / 2 - 80, h - 80, 160, 80);
        ctx.fill();
        ctx.stroke();
        
        // Bottom loading pad (striped "Ladda" zone)
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.25)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        for (let x = w / 2 - 70; x < w / 2 + 70; x += 15) {
            ctx.moveTo(x, h - 80);
            ctx.lineTo(x + 10, h);
        }
        ctx.stroke();

        ctx.restore();
    }

    // Main Engine rendering cycle loop (RAF)
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (dt > 100) dt = 100;
        
        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start game when page resources load
window.addEventListener('DOMContentLoaded', () => {
    new Game();
});

