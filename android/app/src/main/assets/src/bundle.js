
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
            // Do not start the soundtrack on top of the narrator (the very first
            // tap may well be the read-aloud button)
            if (!this._musicWasPlaying && !this.isReadingAloud()) this.startMusic();
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
        
        // 1. DYNAMIC FM SYNTHESIS FOR METALLIC RINGING OVERTONES
        // Carrier + Modulator creates genuine vibrating inharmonic sword steel resonance
        const carrier = this.ctx.createOscillator();
        const mod = this.ctx.createOscillator();
        const modGain = this.ctx.createGain();
        const mainGain = this.ctx.createGain();

        mod.frequency.setValueAtTime(1420, now);
        mod.frequency.exponentialRampToValueAtTime(800, now + 0.35);
        modGain.gain.setValueAtTime(900, now);
        modGain.gain.exponentialRampToValueAtTime(10, now + 0.35);

        mod.connect(carrier.frequency);
        carrier.type = 'sine';
        carrier.frequency.setValueAtTime(960, now);
        carrier.frequency.exponentialRampToValueAtTime(420, now + 0.4);

        carrier.connect(mainGain);
        mainGain.connect(this.ctx.destination);

        mainGain.gain.setValueAtTime(0.22, now);
        mainGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

        mod.start(now);
        carrier.start(now);
        mod.stop(now + 0.45);
        carrier.stop(now + 0.45);

        // 2. HIGH-FREQUENCY RESOCLASH (Crisp harmonic chimes)
        const freqs = [1200, 1850, 2400, 3800];
        freqs.forEach((freq, idx) => {
            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.connect(gain);
            gain.connect(this.ctx.destination);
            
            osc.type = idx % 2 === 0 ? 'sine' : 'triangle';
            osc.frequency.setValueAtTime(freq, now);
            osc.frequency.linearRampToValueAtTime(freq * 0.96, now + 0.4);
            
            const duration = 0.25 + idx * 0.06;
            gain.gain.setValueAtTime(0.09, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + duration);
            
            osc.start(now);
            osc.stop(now + duration + 0.05);
        });

        // 3. STEEL FRICTION / SCRAPE (High-passed air burst)
        const bufferSize = Math.floor(this.ctx.sampleRate * 0.12);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = Math.random() * 2 - 1;
        }
        
        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;
        
        const noiseFilter = this.ctx.createBiquadFilter();
        noiseFilter.type = 'highpass';
        noiseFilter.frequency.setValueAtTime(3200, now);
        noiseFilter.frequency.exponentialRampToValueAtTime(7500, now + 0.12);
        
        const noiseGain = this.ctx.createGain();
        noiseGain.gain.setValueAtTime(0.18, now);
        noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
        
        noise.connect(noiseFilter);
        noiseFilter.connect(noiseGain);
        noiseGain.connect(this.ctx.destination);
        
        noise.start(now);
        noise.stop(now + 0.14);

        // 4. LOW IMPACT SUB PUNCH (Solid kinetic mass thud)
        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.connect(punchGain);
        punchGain.connect(this.ctx.destination);
        
        punchOsc.type = 'triangle';
        punchOsc.frequency.setValueAtTime(180, now);
        punchOsc.frequency.exponentialRampToValueAtTime(35, now + 0.15);
        
        punchGain.gain.setValueAtTime(0.35, now);
        punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
        
        punchOsc.start(now);
        punchOsc.stop(now + 0.18);
    }

    // Realistic physical wall bounce thud with reverberant metal ringing
    playWallThud(intensity = 1.0) {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        osc.frequency.setValueAtTime(140 * Math.min(1.5, intensity), now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.12);

        const vol = Math.min(0.35, 0.15 * intensity);
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        osc.start(now);
        osc.stop(now + 0.16);

        // Metallic arena resonance
        const ringOsc = this.ctx.createOscillator();
        const ringGain = this.ctx.createGain();
        ringOsc.connect(ringGain);
        ringGain.connect(this.ctx.destination);

        ringOsc.type = 'triangle';
        ringOsc.frequency.setValueAtTime(480, now);
        ringOsc.frequency.exponentialRampToValueAtTime(240, now + 0.2);

        ringGain.gain.setValueAtTime(vol * 0.4, now);
        ringGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        ringOsc.start(now);
        ringOsc.stop(now + 0.22);
    }

    // Realistic hot bubbling pop sound for bursting magma bubbles
    playLavaBubblePop(volume = 0.15) {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.type = 'sine';
        const startFreq = 220 + Math.random() * 180;
        const endFreq = startFreq + 280 + Math.random() * 120;
        osc.frequency.setValueAtTime(startFreq, now);
        osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.04);
        osc.frequency.exponentialRampToValueAtTime(90, now + 0.09);

        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(volume, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        osc.start(now);
        osc.stop(now + 0.11);
    }

    // Realistic thermal magma sizzle / burning crackle sound effect
    playLavaSizzle() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const now = this.ctx.currentTime;

        const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * (Math.random() > 0.3 ? 1 : 0.2);
        }

        const noise = this.ctx.createBufferSource();
        noise.buffer = buffer;

        const filter = this.ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.setValueAtTime(1400 + Math.random() * 600, now);
        filter.Q.setValueAtTime(3.0, now);

        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.18, now + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

        noise.connect(filter);
        filter.connect(gain);
        gain.connect(this.ctx.destination);

        noise.start(now);
        noise.stop(now + 0.15);
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
    // ---- Read-aloud (accessibility): speak arbitrary Swedish text ----
    canReadAloud() {
        return !!(window.AndroidTTS && window.AndroidTTS.speakText) || ('speechSynthesis' in window);
    }

    isReadingAloud() {
        if (window.AndroidTTS && window.AndroidTTS.isSpeaking) {
            try { return !!window.AndroidTTS.isSpeaking(); } catch (e) { return false; }
        }
        return ('speechSynthesis' in window) && window.speechSynthesis.speaking;
    }

    stopReadAloud() {
        if (this._musicWasPlaying) { this._musicWasPlaying = false; this.startMusic(); }
        if (window.AndroidTTS && window.AndroidTTS.stop) {
            try { window.AndroidTTS.stop(); } catch (e) {}
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this._readAloudPoll) { clearInterval(this._readAloudPoll); this._readAloudPoll = null; }
    }

    // Speak `text` in Swedish; onEnd fires when done or stopped
    readAloud(text, onEnd = null) {
        this.stopReadAloud();
        const clean = (text || '').trim();
        if (!clean) { if (onEnd) onEnd(); return false; }

        // Pause the music so the narrator is not fighting the soundtrack
        this._musicWasPlaying = this.musicPlaying;
        if (this.musicPlaying) this.stopMusic();
        const finish = () => {
            if (this._musicWasPlaying) { this._musicWasPlaying = false; this.startMusic(); }
            if (onEnd) onEnd();
        };

        if (window.AndroidTTS && window.AndroidTTS.speakText) {
            try {
                // Deep bass narrator voice, like the intro
                // A real male voice at a natural-but-deep pitch sounds human;
                // extreme pitch shifting just sounds robotic
                // The native side picks a real (neural, male) voice and nudges the
                // pitch back up when it is a neural one - see MainActivity.applyVoice
                window.AndroidTTS.speakText(clean, 'sv-SE', 0.42, 0.92);
            } catch (e) {
                if (onEnd) onEnd();
                return false;
            }
            // The native side has no callback into the page: poll until it goes quiet
            let armed = false;
            const onEndNative = finish;
            let quiet = 0;
            this._readAloudPoll = setInterval(() => {
                let speaking = false;
                try { speaking = !!window.AndroidTTS.isSpeaking(); } catch (e) {}
                if (speaking) { armed = true; quiet = 0; return; }
                // the engine reports idle for a moment between sentences: wait for a real pause
                if (armed && ++quiet >= 4) {
                    clearInterval(this._readAloudPoll);
                    this._readAloudPoll = null;
                    onEndNative();
                }
            }, 250);
            // Safety: if it never started (missing language etc.), give up after 3 s
            setTimeout(() => {
                if (this._readAloudPoll && !armed) {
                    clearInterval(this._readAloudPoll);
                    this._readAloudPoll = null;
                    finish();
                }
            }, 3000);
            return true;
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(clean);
            utterance.lang = 'sv-SE';
            utterance.pitch = 0.45; // dark bass narrator
            utterance.rate = 0.9;
            const voices = window.speechSynthesis.getVoices().filter(v => v.lang && v.lang.toLowerCase().startsWith('sv'));
            // Prefer a male Swedish voice when the platform offers one
            const male = voices.find(v => /male|man\b|oskar|erik|magnus|per\b|mattias|sven|bengt|klaus/i.test(v.name) && !/female|kvinna/i.test(v.name));
            const sv = male || voices[0];
            if (sv) utterance.voice = sv;
            utterance.volume = 1.0; // as loud as the platform allows
            utterance.onend = () => finish();
            utterance.onerror = () => finish();
            window.speechSynthesis.speak(utterance);
            return true;
        }

        finish();
        return false;
    }

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


/* --- BUNDLED FROM: src/particles.js --- */
/* DANGEROUS FIGHT - HIGH-PERFORMANCE NEON & REALISTIC PHYSICS PARTICLE CONTROLLER */

class Particle {
    constructor(x, y, vx, vy, color, size, life, decay, type = 'spark') {
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.baseColor = color;
        this.color = color;
        this.size = size;
        this.maxLife = life;
        this.life = life; // Remaining time in ms
        this.decay = decay; // Subtracted from life per ms
        this.type = type; // 'spark', 'dust', 'block', 'ring', 'ember', 'smoke', 'lava_drop', 'metal_shard'
        this.alpha = 1;
        this.angle = Math.random() * Math.PI * 2;
        this.rotSpeed = (Math.random() - 0.5) * 0.02;
        this.bounces = 0;
        this.maxBounces = 2;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        const progress = Math.max(0, this.life / this.maxLife); // 1.0 (new) to 0.0 (dead)
        this.alpha = progress;
        
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        
        if (this.type === 'spark') {
            // Realistic gravity and air drag for sparks
            this.vy += 0.00040 * deltaTime;
            this.vx *= Math.pow(0.982, deltaTime / 16);
            this.vy *= Math.pow(0.982, deltaTime / 16);
            
            // Thermal cooling color transition: White-hot -> Yellow -> Fiery Orange -> Deep Red
            if (progress > 0.75) {
                this.color = '#ffffff';
            } else if (progress > 0.45) {
                this.color = '#ffdd44';
            } else if (progress > 0.2) {
                this.color = '#ff5500';
            } else {
                this.color = '#aa1100';
            }
        } else if (this.type === 'lava_drop') {
            // High gravity & drag for molten viscous lava droplets
            this.vy += 0.00055 * deltaTime;
            this.vx *= Math.pow(0.975, deltaTime / 16);
            this.vy *= Math.pow(0.975, deltaTime / 16);
            
            // Thermal cooling
            if (progress > 0.6) {
                this.color = '#fff3c4';
            } else if (progress > 0.3) {
                this.color = '#ff6600';
            } else {
                this.color = '#660b00';
            }
        } else if (this.type === 'metal_shard') {
            // Heavy physics shard with tumbling
            this.vy += 0.0005 * deltaTime;
            this.vx *= Math.pow(0.96, deltaTime / 16);
            this.vy *= Math.pow(0.96, deltaTime / 16);
            this.angle += this.rotSpeed * deltaTime;
        } else if (this.type === 'block') {
            // High drag for debris blocks
            this.vx *= Math.pow(0.95, deltaTime / 16);
            this.vy *= Math.pow(0.95, deltaTime / 16);
            this.angle += this.rotSpeed * deltaTime;
        } else if (this.type === 'ring') {
            // Expansion
            this.size += 0.18 * deltaTime;
        } else if (this.type === 'smoke') {
            // Rising volumetric smoke expanding over time
            this.vy -= 0.00018 * deltaTime;
            this.vx += (Math.random() - 0.5) * 0.00025 * deltaTime;
            this.size += 0.025 * deltaTime;
        } else if (this.type === 'ember') {
            // Hot thermal buoyancy
            this.vy -= 0.00035 * deltaTime;
            this.vx += Math.sin(this.life * 0.02) * 0.0006 * deltaTime;
        }
        
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        
        if (this.type === 'spark') {
            // Draw glowing realistic streak
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 12;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = this.size;
            ctx.lineCap = 'round';
            ctx.beginPath();
            ctx.moveTo(this.x, this.y);
            ctx.lineTo(this.x - this.vx * 16, this.y - this.vy * 16);
            ctx.stroke();
            
            // Core hot white center
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = Math.max(1, this.size * 0.4);
            ctx.stroke();
            
        } else if (this.type === 'lava_drop') {
            // Molten lava tear/droplet
            ctx.shadowColor = '#ff5500';
            ctx.shadowBlur = 14;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

            // Searing core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(this.x, this.y, Math.max(0.5, this.size * 0.4), 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'metal_shard') {
            // Angular jagged metal piece
            ctx.translate(this.x, this.y);
            ctx.rotate(this.angle);
            ctx.fillStyle = this.baseColor;
            ctx.shadowColor = this.baseColor;
            ctx.shadowBlur = 6;
            ctx.beginPath();
            ctx.moveTo(-this.size, -this.size * 0.5);
            ctx.lineTo(this.size, -this.size * 0.2);
            ctx.lineTo(this.size * 0.5, this.size * 0.7);
            ctx.closePath();
            ctx.fill();

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
            ctx.shadowBlur = 18;
            ctx.strokeStyle = this.color;
            ctx.lineWidth = 3.5;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.stroke();

        } else if (this.type === 'smoke') {
            // Volumetric dark smoke cloud
            const grad = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size);
            grad.addColorStop(0, 'rgba(35, 30, 30, 0.45)');
            grad.addColorStop(0.6, 'rgba(20, 15, 15, 0.25)');
            grad.addColorStop(1, 'rgba(10, 10, 15, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();

        } else if (this.type === 'ember') {
            // Intense glowing ember dot
            ctx.shadowColor = this.color;
            ctx.shadowBlur = 8;
            ctx.fillStyle = this.color;
            ctx.beginPath();
            ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Realistic Ground Decal (Scorch marks, oil splatters, tire skid marks)
class Decal {
    constructor(x, y, radius, color = 'rgba(0,0,0,0.6)', type = 'scorch', angle = 0) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.type = type; // 'scorch', 'skid'
        this.angle = angle;
        this.maxLife = 12000; // 12 seconds persistence on arena floor
        this.life = this.maxLife;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        const alpha = Math.min(1.0, (this.life / this.maxLife) * 1.5);
        ctx.globalAlpha = alpha * 0.45;

        ctx.translate(this.x, this.y);
        ctx.rotate(this.angle);

        if (this.type === 'scorch') {
            const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius);
            grad.addColorStop(0, 'rgba(15, 15, 20, 0.95)');
            grad.addColorStop(0.5, 'rgba(255, 60, 0, 0.25)');
            grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = grad;
            ctx.beginPath();
            ctx.ellipse(0, 0, this.radius, this.radius * 0.6, 0, 0, Math.PI * 2);
            ctx.fill();
        } else if (this.type === 'skid') {
            ctx.fillStyle = 'rgba(10, 10, 15, 0.7)';
            ctx.fillRect(-this.radius, -3, this.radius * 2, 6);
        }

        ctx.restore();
    }
}

// Floating Physical Damage Popup Text (-25, CRIT! -200, PARRY!)
class DamageText {
    constructor(x, y, text, color = '#ff0055', scale = 1.0) {
        this.x = x + (Math.random() - 0.5) * 20;
        this.y = y;
        this.vx = (Math.random() - 0.5) * 0.08;
        this.vy = -(Math.random() * 0.15 + 0.12);
        this.text = text;
        this.color = color;
        this.scale = scale;
        this.maxLife = 750;
        this.life = this.maxLife;
    }

    update(deltaTime) {
        this.life -= deltaTime;
        this.x += this.vx * deltaTime;
        this.y += this.vy * deltaTime;
        this.vy += 0.0003 * deltaTime; // gravity arc
        return this.life > 0;
    }

    draw(ctx) {
        ctx.save();
        const progress = 1 - (this.life / this.maxLife);
        const alpha = Math.max(0, 1 - Math.pow(progress, 3));
        const currentScale = (1 + Math.sin(progress * Math.PI) * 0.4) * this.scale;

        ctx.globalAlpha = alpha;
        ctx.translate(this.x, this.y);
        ctx.scale(currentScale, currentScale);

        ctx.font = '900 18px "Orbitron", sans-serif';
        ctx.textAlign = 'center';

        // Outer Glow + Dark Stroke
        ctx.shadowColor = this.color;
        ctx.shadowBlur = 12;
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 4;
        ctx.strokeText(this.text, 0, 0);

        // Core Glowing Text
        ctx.fillStyle = this.color;
        ctx.fillText(this.text, 0, 0);

        // Hot white core
        ctx.fillStyle = '#ffffff';
        ctx.fillText(this.text, 0, 0);

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
        this.decals = [];
        this.damageTexts = [];
    }

    update(deltaTime) {
        this.decals = this.decals.filter(d => d.update(deltaTime));
        this.particles = this.particles.filter(p => p.update(deltaTime));
        this.trails = this.trails.filter(t => t.update(deltaTime));
        this.damageTexts = this.damageTexts.filter(dt => dt.update(deltaTime));
    }

    draw(ctx) {
        // 1. Draw decals on ground first
        this.decals.forEach(d => d.draw(ctx));
        // 2. Draw sword trails
        this.trails.forEach(t => t.draw(ctx));
        // 3. Draw particles
        this.particles.forEach(p => p.draw(ctx));
        // 4. Draw damage text popups on top
        this.damageTexts.forEach(dt => dt.draw(ctx));
    }

    clear() {
        this.particles = [];
        this.trails = [];
        this.decals = [];
        this.damageTexts = [];
    }

    // Add ground scorch or skid mark
    addDecal(x, y, radius, color = 'rgba(0,0,0,0.6)', type = 'scorch', angle = 0) {
        if (this.decals.length > 50) this.decals.shift();
        this.decals.push(new Decal(x, y, radius, color, type, angle));
    }

    // Add physical floating 3D popup damage text
    spawnDamageText(x, y, text, color = '#ff0055', scale = 1.0) {
        this.damageTexts.push(new DamageText(x, y, text, color, scale));
    }

    // Add glowing ambient background dust particles
    spawnAmbience(width, height, count = 1) {
        if (this.particles.length > 180) return; // Prevent performance drops
        
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

    // Sword clash spark shower with realistic temperature color
    spawnClashSparks(x, y, color) {
        const count = Math.floor(Math.random() * 15) + 25; // increased spark count
        
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.55 + 0.18; // wider velocity spread
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 2.2 + 1.2;
            const life = Math.random() * 450 + 220; // longer lifespan
            
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'spark'));
        }

        // Add a few flying metal shards on heavy clash
        this.spawnMetalShards(x, y, color, 4);
    }

    // Realistic jagged metallic shards from armor/weapon impacts
    spawnMetalShards(x, y, color = '#ffffff', count = 5) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.35 + 0.12;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 0.15; // upward kick
            const size = Math.random() * 3.5 + 2.0;
            const life = Math.random() * 500 + 400;
            this.particles.push(new Particle(x, y, vx, vy, color, size, life, 1, 'metal_shard'));
        }
    }

    // Realistic volcanic magma burst from popping lava bubbles
    spawnLavaBurst(x, y) {
        const count = Math.floor(Math.random() * 6) + 6;
        for (let i = 0; i < count; i++) {
            const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.8; // spray upwards
            const speed = Math.random() * 0.35 + 0.12;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed;
            const size = Math.random() * 3.2 + 1.8;
            const life = Math.random() * 550 + 350;
            this.particles.push(new Particle(x, y, vx, vy, '#ff5500', size, life, 1, 'lava_drop'));
        }

        // Add rising smoke and hot embers
        for (let i = 0; i < 3; i++) {
            const vx = (Math.random() - 0.5) * 0.04;
            const vy = -(Math.random() * 0.08 + 0.03);
            this.particles.push(new Particle(x, y, vx, vy, '#ffaa00', Math.random() * 2.5 + 1.5, 450, 1, 'ember'));
            this.particles.push(new Particle(x, y, vx * 0.5, vy * 0.6, 'rgba(30,20,20,0.4)', Math.random() * 10 + 6, 750, 1, 'smoke'));
        }
    }

    // Viscous magma splash when vehicles enter or plow through the lava
    spawnLavaSplash(x, y, dirX = 0, dirY = -1) {
        const count = Math.floor(Math.random() * 12) + 14;
        const baseAngle = Math.atan2(dirY, dirX);

        for (let i = 0; i < count; i++) {
            const angle = baseAngle + (Math.random() - 0.5) * 1.6;
            const speed = Math.random() * 0.45 + 0.15;
            const vx = Math.cos(angle) * speed;
            const vy = Math.sin(angle) * speed - 0.1;
            const size = Math.random() * 4.0 + 2.0;
            const life = Math.random() * 650 + 400;
            this.particles.push(new Particle(x, y, vx, vy, '#ff6600', size, life, 1, 'lava_drop'));
        }

        // Heavy dark smoke cloud
        for (let i = 0; i < 5; i++) {
            const vx = (Math.random() - 0.5) * 0.06;
            const vy = -(Math.random() * 0.07 + 0.03);
            this.particles.push(new Particle(x, y, vx, vy, 'rgba(25,18,18,0.5)', Math.random() * 16 + 10, 900, 1, 'smoke'));
        }
    }

    // Spawn damage embers and smoke for low-HP damaged vehicles/towers
    spawnDamageEmbers(x, y, color) {
        if (Math.random() < 0.4) {
            const vx = (Math.random() - 0.5) * 0.05;
            const vy = -(Math.random() * 0.08 + 0.02);
            this.particles.push(new Particle(x, y, vx, vy, color, Math.random() * 3 + 1.5, 400, 1, 'ember'));
        }
        if (Math.random() < 0.3) {
            const vx = (Math.random() - 0.5) * 0.03;
            const vy = -(Math.random() * 0.04 + 0.01);
            this.particles.push(new Particle(x, y, vx, vy, 'rgba(40,40,50,0.5)', Math.random() * 12 + 6, 800, 1, 'smoke'));
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
            },
            // Scoreboard and Arena battle statistics
            highScore: 0,
            totalScore: 0,
            totalWins: 0,
            totalLosses: 0,
            totalKills: 0,
            leaderboard: [],
            playerName: ''
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
                if (typeof parsed.credits === 'number') this.state.credits = Math.floor(parsed.credits);
                if (typeof parsed.highestWave === 'number') this.state.highestWave = parsed.highestWave;
                if (typeof parsed.matchCount === 'number') this.state.matchCount = parsed.matchCount;
                if (typeof parsed.equippedWeapon === 'string') this.state.equippedWeapon = parsed.equippedWeapon;
                // Support both old (string) and new (array) save format
                if (Array.isArray(parsed.equippedCannons)) {
                    this.state.equippedCannons = parsed.equippedCannons;
                } else if (typeof parsed.equippedCannon === 'string') {
                    this.state.equippedCannons = [parsed.equippedCannon];
                }
                if (parsed.unlockedCannons) {
                    this.state.unlockedCannons = { ...this.state.unlockedCannons, ...parsed.unlockedCannons };
                }
                this.normalizeCannons();
                
                if (parsed.unlockedWeapons) {
                    this.state.unlockedWeapons = { ...this.state.unlockedWeapons, ...parsed.unlockedWeapons };
                }
                
                if (parsed.upgrades) {
                    this.state.upgrades = { ...this.state.upgrades, ...parsed.upgrades };
                }

                // Load scoreboard data
                if (typeof parsed.highScore === 'number') this.state.highScore = parsed.highScore;
                if (typeof parsed.totalScore === 'number') this.state.totalScore = parsed.totalScore;
                if (typeof parsed.totalWins === 'number') this.state.totalWins = parsed.totalWins;
                if (typeof parsed.totalLosses === 'number') this.state.totalLosses = parsed.totalLosses;
                if (typeof parsed.totalKills === 'number') this.state.totalKills = parsed.totalKills;
                if (Array.isArray(parsed.leaderboard)) this.state.leaderboard = parsed.leaderboard;
                if (typeof parsed.playerName === 'string') this.state.playerName = parsed.playerName;
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

    // Record match result to scoreboard
    recordMatchResult({ score = 0, wave = 1, samurai = 'Cyber Ronin', result = 'Vinst', kills = 0 }) {
        this.state.totalScore = (this.state.totalScore || 0) + score;
        this.state.totalKills = (this.state.totalKills || 0) + kills;
        if (result === 'Vinst') {
            this.state.totalWins = (this.state.totalWins || 0) + 1;
        } else {
            this.state.totalLosses = (this.state.totalLosses || 0) + 1;
        }

        const isNewHighScore = score > (this.state.highScore || 0);
        if (isNewHighScore) {
            this.state.highScore = score;
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

        if (!Array.isArray(this.state.leaderboard)) {
            this.state.leaderboard = [];
        }

        const entry = {
            id: Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            score: Math.round(score),
            wave: wave,
            samurai: samurai,
            result: result,
            kills: kills,
            date: dateStr
        };

        this.state.leaderboard.push(entry);
        this.state.leaderboard.sort((a, b) => b.score - a.score);
        if (this.state.leaderboard.length > 10) {
            this.state.leaderboard = this.state.leaderboard.slice(0, 10);
        }

        this.save();
        const rank = this.state.leaderboard.findIndex(e => e.id === entry.id) + 1;
        return { isNewHighScore, rank, entryId: entry.id };
    }

    // Attach the player's own name to a leaderboard entry (podium placements)
    setLeaderboardName(entryId, name) {
        const clean = (name || '').trim().slice(0, 14);
        if (!clean) return false;
        const entry = (this.state.leaderboard || []).find(e => e.id === entryId);
        if (!entry) return false;
        entry.name = clean;
        this.state.playerName = clean; // remembered as default next time
        this.save();
        return true;
    }

    // Reset only scoreboard statistics
    resetScoreboard() {
        this.state.highScore = 0;
        this.state.totalScore = 0;
        this.state.totalWins = 0;
        this.state.totalLosses = 0;
        this.state.totalKills = 0;
        this.state.leaderboard = [];
        this.save();
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
        this.state.credits = Math.floor(this.state.credits + amount);
        this.save();
    }

    // Spend credits, returns true if successful
    spendCredits(amount) {
        const cost = Math.round(amount);
        if (this.state.credits >= cost) {
            this.state.credits = Math.floor(this.state.credits - cost);
            this.save();
            return true;
        }
        return false;
    }

    // Purchase upgrade
    buyUpgrade(type) {
        if (this.state.upgrades[type] === undefined) return false;
        
        const currentLvl = this.state.upgrades[type];
        // No level cap: upgrades can be bought indefinitely

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
        // Exponential cost growth per level, tuned so that an endless
        // upgrade ladder stays reachable (lvl 10 ≈ 20x, lvl 20 ≈ 400x)
        return Math.round(baseCosts[type] * Math.pow(1.35, currentLvl));
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
            // A new technique goes straight into the active loadout
            this.activateCannon(cannonKey);
            this.save();
            return true;
        }
        return false;
    }

    // At most this many sword-wave techniques fire per shot. Every active
    // cannon adds its own projectiles, so an unlimited stack one-shots towers.
    static get MAX_ACTIVE_CANNONS() { return 2; }

    // Make sure the loadout is valid: at least one cannon, never more than the cap
    normalizeCannons() {
        let list = (this.state.equippedCannons || []).filter((k, i, a) => this.state.unlockedCannons[k] && a.indexOf(k) === i);
        if (list.length === 0) list = ['laser'];
        if (list.length > UpgradeManager.MAX_ACTIVE_CANNONS) {
            list = list.slice(-UpgradeManager.MAX_ACTIVE_CANNONS); // keep the most recent picks
        }
        this.state.equippedCannons = list;
    }

    // Activate a cannon; when the loadout is full the oldest pick is swapped out
    activateCannon(cannonKey) {
        const list = this.state.equippedCannons;
        if (list.includes(cannonKey)) return;
        list.push(cannonKey);
        while (list.length > UpgradeManager.MAX_ACTIVE_CANNONS) list.shift();
    }

    // Toggle a cannon on/off (max 2 active, at least 1 must stay active)
    toggleCannon(cannonKey) {
        if (!this.state.unlockedCannons[cannonKey]) return false;
        const list = this.state.equippedCannons;
        const idx = list.indexOf(cannonKey);
        if (idx === -1) {
            this.activateCannon(cannonKey);
        } else {
            if (list.length <= 1) return false; // you always need one technique
            list.splice(idx, 1);
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
            matchmaking: document.getElementById('matchmaking-screen'),
            lobby: document.getElementById('lobby-screen'),
            join: document.getElementById('join-room-screen'),
            weapons: document.getElementById('weapons-menu'), // Garage
            cannons: document.getElementById('cannons-menu'),
            upgrades: document.getElementById('upgrades-menu'),
            scoreboard: document.getElementById('scoreboard-screen'),
            howto: document.getElementById('howto-screen'),
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
        this.matchTimerBox = document.getElementById('match-timer');
        this.hudScoreVal = document.getElementById('hud-score-val');
        this.hudKillsVal = document.getElementById('hud-kills-val');
        
        // Game Over and Victory stats
        this.statDefeatWinner = document.getElementById('stat-defeat-winner');
        this.statCreditsEarned = document.getElementById('stat-credits-earned');
        this.statDefeatScore = document.getElementById('stat-defeat-score');
        this.statDefeatKills = document.getElementById('stat-defeat-kills');
        this.statDefeatHighscoreBadge = document.getElementById('stat-defeat-highscore-badge');

        this.statVictoryCredits = document.getElementById('stat-victory-credits');
        this.statVictoryScore = document.getElementById('stat-victory-score');
        this.statVictoryKills = document.getElementById('stat-victory-kills');
        this.statVictoryHighscoreBadge = document.getElementById('stat-victory-highscore-badge');
    }

    // Single point to hide everything and display one specific screen
    showScreen(activeScreenId) {
        for (const [key, element] of Object.entries(this.screens)) {
            if (!element) continue;
            if (key === activeScreenId) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    }

    // Refresh HUD bars, timer, and statuses
    updateHUD(player, enemy, isMultiplayer, isClient, matchTimerMs = 240000, currentScore = 0, matchKills = 0) {
        // Live Score and Kills in HUD
        if (this.hudScoreVal) {
            this.hudScoreVal.innerText = Math.round(currentScore).toLocaleString('sv-SE');
        }
        if (this.hudKillsVal) {
            this.hudKillsVal.innerText = matchKills;
        }

        // Match timer display mm:ss
        if (this.matchTimerBox) {
            const totalSeconds = Math.max(0, Math.ceil(matchTimerMs / 1000));
            const mins = Math.floor(totalSeconds / 60);
            const secs = totalSeconds % 60;
            const formattedMins = String(mins).padStart(2, '0');
            const formattedSecs = String(secs).padStart(2, '0');
            this.matchTimerBox.innerText = `${formattedMins}:${formattedSecs}`;

            if (totalSeconds <= 30) {
                this.matchTimerBox.classList.add('timer-warning');
            } else {
                this.matchTimerBox.classList.remove('timer-warning');
            }
        }

        // Towers HP
        // Symmetrically, player sees themselves at the bottom.
        // So Bottom Tower is the local player's tower. Top Tower is the opponent/AI's tower.
        let localTower, remoteTower;
        let localCarHp, remoteCarHp;
        let localCarEnergy = 0;
        
        if (isMultiplayer) {
            // Both sides see themselves at the bottom: the local car is
            // `player`, the local tower is bottomTower, the opponent's
            // replica is `enemy` / topTower (mirrored view).
            localTower = player.game.bottomTower;
            remoteTower = player.game.topTower;
            localCarHp = player.hp;
            remoteCarHp = enemy ? enemy.hp : 100;
            localCarEnergy = player.energy;

            this.bottomTowerLabel.innerText = "DITT TORN";
            this.topTowerLabel.innerText = isClient ? "SPELARE 1:S TORN" : "SPELARE 2:S TORN";
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
            
            // Remove previous event listeners
            const newBtn = btn.cloneNode(true);
            btn.parentNode.replaceChild(newBtn, btn);
            // The cost span lives inside the button, so look it up on the clone
            const costValSpan = newBtn.querySelector('.cost-val') || row.querySelector('.cost-val');

            // Upgrades have no level cap
            const cost = upgradeManager.getUpgradeCost(key, lvl);
            lvlLabel.innerText = `Nivå ${lvl}`;
            costValSpan.innerText = Math.round(cost);
            newBtn.disabled = false;
            newBtn.style.opacity = state.credits >= cost ? 1 : 0.6;
            
            newBtn.addEventListener('click', () => {
                audioController.playClick();
                onPurchase(key);
            });
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
                newCostText.innerText = equipped.length <= 1 ? '✅ AKTIV' : '✅ AKTIV – klicka för att stänga av';
            } else {
                newCard.className = 'weapon-card';
                newCostText.innerText = equipped.length >= 2 ? '◻ INAKTIV – klicka för att byta in (max 2 aktiva)' : '◻ INAKTIV – klicka för att aktivera';
            }

            newCard.addEventListener('click', () => {
                audioController.playClick();
                onEquipOrUnlock(key);
            });
        });
    }

    // Display Game Over / Defeat screen
    renderGameOver(creditsEarned, winnerName, score = 0, kills = 0, isNewHighScore = false) {
        if (this.statDefeatWinner) {
            this.statDefeatWinner.innerText = winnerName;
        }
        if (this.statCreditsEarned) {
            this.statCreditsEarned.innerText = creditsEarned;
        }
        if (this.statDefeatScore) {
            this.statDefeatScore.innerText = Math.round(score).toLocaleString('sv-SE');
        }
        if (this.statDefeatKills) {
            this.statDefeatKills.innerText = kills;
        }
        if (this.statDefeatHighscoreBadge) {
            if (isNewHighScore) {
                this.statDefeatHighscoreBadge.classList.remove('hidden');
            } else {
                this.statDefeatHighscoreBadge.classList.add('hidden');
            }
        }
        this.showScreen('gameover');
    }

    // Display Game Victory Screen
    renderVictory(finalCredits, isBoss = false, score = 0, kills = 0, isNewHighScore = false) {
        if (this.statVictoryCredits) {
            this.statVictoryCredits.innerText = finalCredits;
        }
        if (this.statVictoryScore) {
            this.statVictoryScore.innerText = Math.round(score).toLocaleString('sv-SE');
        }
        if (this.statVictoryKills) {
            this.statVictoryKills.innerText = kills;
        }
        if (this.statVictoryHighscoreBadge) {
            if (isNewHighScore) {
                this.statVictoryHighscoreBadge.classList.remove('hidden');
            } else {
                this.statVictoryHighscoreBadge.classList.add('hidden');
            }
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

    // Render Poängtavla (Scoreboard & Leaderboard)
    renderScoreboard(upgradeMgr) {
        const state = upgradeMgr.state;
        const highScoreEl = document.getElementById('sb-high-score');
        const totalScoreEl = document.getElementById('sb-total-score');
        const matchesWinLossEl = document.getElementById('sb-matches-winloss');
        const winrateEl = document.getElementById('sb-winrate');
        const totalKillsEl = document.getElementById('sb-total-kills');
        const highestWaveEl = document.getElementById('sb-highest-wave');
        const leaderboardBody = document.getElementById('leaderboard-body');
        const leaderboardEmpty = document.getElementById('leaderboard-empty');

        const wins = state.totalWins || 0;
        const losses = state.totalLosses || 0;
        const totalMatches = wins + losses;
        const winRatePct = totalMatches > 0 ? Math.round((wins / totalMatches) * 100) : 0;

        if (highScoreEl) highScoreEl.innerText = (state.highScore || 0).toLocaleString('sv-SE');
        if (totalScoreEl) totalScoreEl.innerText = (state.totalScore || 0).toLocaleString('sv-SE');
        if (matchesWinLossEl) matchesWinLossEl.innerText = `${wins} / ${losses}`;
        if (winrateEl) winrateEl.innerText = `${winRatePct}% Vinst`;
        if (totalKillsEl) totalKillsEl.innerText = (state.totalKills || 0).toLocaleString('sv-SE');
        if (highestWaveEl) highestWaveEl.innerText = state.highestWave || 1;

        if (leaderboardBody) {
            leaderboardBody.innerHTML = '';
            const entries = state.leaderboard || [];

            if (entries.length === 0) {
                if (leaderboardEmpty) leaderboardEmpty.classList.remove('hidden');
            } else {
                if (leaderboardEmpty) leaderboardEmpty.classList.add('hidden');
                entries.forEach((entry, idx) => {
                    const tr = document.createElement('tr');
                    
                    let rankBadge = `#${idx + 1}`;
                    let rankClass = '';
                    if (idx === 0) {
                        rankBadge = '🥇 1';
                        rankClass = 'rank-gold';
                    } else if (idx === 1) {
                        rankBadge = '🥈 2';
                        rankClass = 'rank-silver';
                    } else if (idx === 2) {
                        rankBadge = '🥉 3';
                        rankClass = 'rank-bronze';
                    }

                    const isWin = entry.result === 'Vinst';
                    const resultBadge = `<span class="badge ${isWin ? 'badge-win' : 'badge-loss'}">${entry.result}</span>`;

                    tr.innerHTML = `
                        <td class="col-rank ${rankClass}">${rankBadge}</td>
                        <td class="col-score font-bold neon-text-cyan">${(entry.score || 0).toLocaleString('sv-SE')}</td>
                        <td class="col-name">${this.escapeHtml(entry.name || '-')}</td>
                        <td class="col-wave">Våg ${entry.wave || 1}</td>
                        <td class="col-samurai">${entry.samurai || 'Cyber Ronin'}</td>
                        <td class="col-result">${resultBadge}</td>
                        <td class="col-kills">${entry.kills || 0}</td>
                        <td class="col-date">${entry.date || '-'}</td>
                    `;
                    leaderboardBody.appendChild(tr);
                });
            }
        }
    }

    escapeHtml(str) {
        return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // Podium (top 3) name entry on the victory/defeat screens.
    // `kind` is 'victory' or 'defeat'; onSave(name) persists it and returns true on success.
    showPodiumForm(kind, rank, defaultName, onSave) {
        const oldForm = document.getElementById(`podium-form-${kind}`);
        if (!oldForm) return;
        if (!rank || rank > 3) {
            oldForm.classList.add('hidden');
            return;
        }

        // Replace the form node to drop any previous submit listener
        const form = oldForm.cloneNode(true);
        oldForm.parentNode.replaceChild(form, oldForm);

        const input = form.querySelector('.podium-input');
        const rankEl = form.querySelector('.podium-rank');
        const saveBtn = form.querySelector('.podium-save');
        const medals = { 1: '🥇', 2: '🥈', 3: '🥉' };

        if (rankEl) rankEl.innerText = `${medals[rank]} #${rank}`;
        input.value = defaultName || '';
        input.disabled = false;
        saveBtn.disabled = false;
        saveBtn.innerText = 'SPARA';
        form.classList.remove('hidden', 'saved');

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = (input.value || '').trim();
            if (!name) {
                input.focus();
                return;
            }
            if (onSave(name)) {
                input.disabled = true;
                saveBtn.disabled = true;
                saveBtn.innerText = 'SPARAT ✓';
                form.classList.add('saved');
            }
        });
        // Enter in the field saves too (explicit, in case implicit submission is blocked)
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                form.requestSubmit ? form.requestSubmit() : saveBtn.click();
            }
        });
        setTimeout(() => input.focus(), 50);
    }

    hidePodiumForms() {
        ['victory', 'defeat'].forEach(kind => {
            const form = document.getElementById(`podium-form-${kind}`);
            if (form) form.classList.add('hidden');
        });
    }

    renderPerkSelection(perks, onSelect, audioController) {
        const grid = document.getElementById('perks-selection-grid');
        if (!grid) return;
        
        grid.innerHTML = ''; // Clear previous content
        
        perks.forEach(perk => {
            const card = document.createElement('div');
            card.className = 'weapon-card';
            card.style.flex = '0 0 auto'; // never shrink to fit: the grid scrolls instead
            card.style.width = '100%';
            card.style.margin = '0';
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
        this.friction = 0.99;   // glides further before the dash dies out
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
        
        // Size & weight definitions (Scaled up by ~75% for Mecha-Shogun graphics)
        this.profiles = {
            katana: {
                name: "Cyber Ronin",
                radius: 34,
                mass: 1.0,
                baseHp: 100,
                ramDamage: 100,
                speedMultiplier: 1.0,
                color: "#00f0ff"
            },
            blades: {
                name: "Armored Shogun",
                radius: 42,
                mass: 1.8,
                baseHp: 150,
                ramDamage: 180,
                speedMultiplier: 0.75,
                color: "#a25bff"
            },
            hammer: {
                name: "Shadow Ninja",
                radius: 28,
                mass: 0.6,
                baseHp: 70,
                ramDamage: 70,
                speedMultiplier: 1.35,
                color: "#39ff14"
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
            // Full 120 px pull = ~1.1 px/ms, roughly twice the AI's dash speed, so the
            // samurai crosses the arena in well under a second. (0.12 was the old value
            // and gave 10+ px/ms, which shot it across in a few frames like a pinball.)
            const launchScale = 0.0092 * this.profile.speedMultiplier;
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
            // Recoil kickback on weapon firing
            this.vy += (0.045 / this.mass);
            if (this.game.canvasCtrl) {
                this.game.canvasCtrl.shake(2, 60);
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
        
        // Physical Damage Text & Ground Scorch Decal
        particleSystem.spawnDamageText(this.x, this.y, `-${Math.round(dmg)}`, '#ff0055', 1.1);
        particleSystem.addDecal(this.x, this.y, 22, 'rgba(0,0,0,0.65)', 'scorch');

        // Spark particles
        particleSystem.spawnClashSparks(this.x, this.y, this.color);
        particleSystem.spawnDigitalBleed(this.x, this.y, this.color);
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
        // Low HP Ember Smoke Plumes
        if (this.state !== 'dead' && this.hp < this.maxHp * 0.4) {
            particleSystem.spawnDamageEmbers(this.x, this.y, '#ff3300');
        }

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

        // Apply friction & momentum
        if (!this.isAiming) {
            this.x += this.vx * deltaTime;
            this.y += this.vy * deltaTime;

            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.22 && Math.random() < 0.25) {
                particleSystem.addDecal(this.x, this.y, 6, 'rgba(0,0,0,0.5)', 'skid', this.angle);
            }

            const currentFriction = this.activeWeaponKey === 'hammer' ? 0.99 : this.friction;
            this.vx *= Math.pow(currentFriction, deltaTime / 16);
            this.vy *= Math.pow(currentFriction, deltaTime / 16);
            
            let bounced = false;
            let impactSpeed = speed;
            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = -this.vx * 0.72; // improved restitution
                bounced = true;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -this.vx * 0.72;
                bounced = true;
            }
            
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = -this.vy * 0.72;
                bounced = true;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -this.vy * 0.72;
                bounced = true;
            }
            
            if (bounced && impactSpeed > 0.04) {
                particleSystem.spawnClashSparks(this.x, this.y, '#ffffff');
                this.game.audioSynth.playWallThud(impactSpeed * 3.0);
            }
            
            // Smooth angular rotation interpolation (banking dynamic tilt)
            if (speed > 0.04) {
                const targetAngle = Math.atan2(this.vy, this.vx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * Math.min(1.0, 0.18 * (deltaTime / 16));
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

        const currentSpeed = Math.hypot(this.vx, this.vy);

        // Draw the samurai character with realistic speed effects and dynamic shadow
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
            (this.y > this.game.canvasCtrl.height - 150),
            currentSpeed
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
        this.radius = 34;
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
        
        // Profiles for multiplayer vehicle matching (Scaled up by ~75%)
        this.profiles = {
            katana: { radius: 34, mass: 1.0, color: "#ff0077" }, // Cyber Car
            blades: { radius: 42, mass: 1.8, color: "#ff0088" }, // Plasma Truck
            hammer: { radius: 28, mass: 0.6, color: "#ff4400" }  // Laser Cycle
        };
    }

    resetForRun(isBoss = false) {
        this.isBoss = isBoss;
        if (isBoss) {
            this.maxHp = 500;
            this.radius = 42; // Torso radius (was 24)
            this.mass = 2.5;
            this.color = 'crimson';
            
            // Initialize scaled ragdoll nodes
            this.ragdollNodes = [
                { name: 'torso', x: this.x, y: this.y, vx: 0, vy: 0, radius: 42, mass: 2.0, color: 'crimson' },
                { name: 'head', x: this.x, y: this.y - 52, vx: 0, vy: 0, radius: 24, mass: 1.0, color: '#ff0055' },
                { name: 'leftHand', x: this.x - 55, y: this.y - 12, vx: 0, vy: 0, radius: 18, mass: 0.7, color: '#ff0077' },
                { name: 'rightHand', x: this.x + 55, y: this.y - 12, vx: 0, vy: 0, radius: 18, mass: 0.7, color: '#ff0077' },
                { name: 'leftFoot', x: this.x - 30, y: this.y + 52, vx: 0, vy: 0, radius: 18, mass: 0.8, color: '#990033' },
                { name: 'rightFoot', x: this.x + 30, y: this.y + 52, vx: 0, vy: 0, radius: 18, mass: 0.8, color: '#990033' }
            ];

            // Define distance constraints between nodes
            this.ragdollConstraints = [
                [0, 1, 52], // torso to head
                [0, 2, 55], // torso to leftHand
                [0, 3, 55], // torso to rightHand
                [0, 4, 52], // torso to leftFoot
                [0, 5, 52], // torso to rightFoot
                [1, 2, 60], // head to leftHand
                [1, 3, 60], // head to rightHand
                [4, 5, 45]  // leftFoot to rightFoot
            ];
        } else {
            this.ragdollNodes = null;
            this.ragdollConstraints = null;
            this.maxHp = 100;
            this.radius = 34;
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
        this.activeWeaponKey = this.profiles[type] ? type : 'katana';
        this.radius = p.radius;
        this.mass = p.mass;
        this.color = p.color;
    }

    takeDamage(amount, attackerX, attackerY, particleSystem, canvasController) {
        if (this.state === 'dead') return;

        // Multiplayer: this object is a replica of the opponent, who owns
        // their own hp/death and reports it via 'sync'. Only show the hit.
        if (this.game && this.game.isMultiplayer) {
            particleSystem.spawnDamageText(this.x, this.y, `-${Math.round(amount)}`, '#00f0ff', 1.1);
            particleSystem.spawnClashSparks(this.x, this.y, this.color);
            particleSystem.spawnDigitalBleed(this.x, this.y, this.color);
            canvasController.flash('rgba(0, 240, 255, 0.2)', 180);
            canvasController.shake(6, 150);
            return;
        }
        
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
        
        // Physical Damage Text & Ground Scorch Decal
        particleSystem.spawnDamageText(this.x, this.y, `-${Math.round(dmg)}`, '#00f0ff', 1.1);
        particleSystem.addDecal(this.x, this.y, 22, 'rgba(0,0,0,0.65)', 'scorch');
        
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
        particleSystem.spawnDigitalBleed(sparkX, sparkY, this.color);
        canvasController.flash('rgba(0, 240, 255, 0.2)', 180); // Cyan flash when damaging enemy
        canvasController.shake(6, 150);
        
        if (this.hp <= 0) {
            this.state = 'dead';
            this.respawnTimer = 3000; // 3 seconds respawn
            this.vx = 0;
            this.vy = 0;
            this.aiState = 'idle';
            this.aiTimer = 3000;
            
            if (this.game && typeof this.game.onEnemyDefeated === 'function') {
                this.game.onEnemyDefeated(this.isBoss);
            }
            
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
                    audioController.playWallThud(Math.hypot(node.vx, node.vy) * 2.0);
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
            let impactSpeed = Math.hypot(this.vx, this.vy);
            if (this.x < this.radius) {
                this.x = this.radius;
                this.vx = -this.vx * 0.72;
                bounced = true;
            } else if (this.x > width - this.radius) {
                this.x = width - this.radius;
                this.vx = -this.vx * 0.72;
                bounced = true;
            }
            
            if (this.y < this.radius) {
                this.y = this.radius;
                this.vy = -this.vy * 0.72;
                bounced = true;
            } else if (this.y > height - this.radius) {
                this.y = height - this.radius;
                this.vy = -this.vy * 0.72;
                bounced = true;
            }
            
            if (bounced && impactSpeed > 0.03 && audioController) {
                audioController.playWallThud(impactSpeed * 3.0);
            }
            
            const speed = Math.hypot(this.vx, this.vy);
            if (speed > 0.04) {
                const targetAngle = Math.atan2(this.vy, this.vx);
                let angleDiff = targetAngle - this.angle;
                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
                this.angle += angleDiff * Math.min(1.0, 0.18 * (deltaTime / 16));
            }
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

        // --- SINGLE PLAYER AI CONTROLLER ---
        if (!this.game.isMultiplayer) {
            this.updateAI(deltaTime, player, particleSystem, width, height);
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
                    // Fire from where the samurai actually is, aimed at the player
                    const startX = this.x;
                    const startY = this.y;
                    const dx = player.x - startX;
                    const speed = 0.45;
                    this.game.spawnProjectile(startX, startY, dx * 0.0015, speed, 8, 'enemy');
                    this.vy -= 0.045 / this.mass; // recoil, like the player
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

        // Standard or Boss Mecha Shogun Enemy rendering
        const renderRadius = this.isBoss ? this.radius * 1.25 : this.radius;
        const enemyColor = this.color || '#ff0077';
        const currentSpeed = Math.hypot(this.vx, this.vy);

        canvasController.drawSamuraiCharacter(
            ctx, 
            this.x, 
            this.y, 
            renderRadius, 
            enemyColor, 
            this.angle, 
            'blades', 
            false, 
            0, 
            0, 
            this.hp / this.maxHp,
            this.trailHistory,
            (this.y < 150),
            currentSpeed
        );

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
        this.hitStopTimer = 0; // Hit-stop impact micro freeze
        
        // Multiplayer WebRTC state
        this.isMultiplayer = false;
        this.isClient = false;
        this.peer = null;
        this.conn = null;
        this.roomId = '';
        this.mmWs = null;                   // matchmaking lobby socket
        this.mmId = null;
        this.mmTimers = [];
        this.quickMatch = false;            // true when the room was arranged by matchmaking
        this.remoteProfile = null;          // opponent's vehicle/upgrades from the handshake
        this.restartRequestedLocal = false;
        this.restartRequestedRemote = false;
        this.netSyncAccumulator = 0;
        this.remoteMeleeCooldown = 0;       // debounce replica hits between sync packets
        this.enemyRamCooldown = 0;          // one tower ram per charge (ragdoll nodes would otherwise re-trigger every frame)
        this.playerRamCooldown = 0;

        // Realistic Lava Simulation state
        this.lavaTime = 0;
        this.lastLavaSizzlePlayer = 0;
        this.lastLavaSizzleEnemy = 0;
        this.lavaBubbles = [];
        this.lavaCrustPlates = [];
        const plateCount = 13;
        for (let i = 0; i < plateCount; i++) {
            this.lavaCrustPlates.push({
                // position as a fraction of the river length, so it fits any screen width
                u: (i + Math.random() * 0.6) / plateCount,
                yOffset: (Math.random() - 0.5) * 20,
                // everything drifts with the current (to the right), slow plates lag behind
                vx: Math.random() * 0.02 + 0.014,
                width: Math.random() * 46 + 26,
                height: Math.random() * 16 + 11,
                angle: Math.random() * Math.PI,
                rotSpeed: (Math.random() - 0.5) * 0.0006,
                points: [
                    { x: -1, y: -0.8 + Math.random() * 0.3 },
                    { x: -0.2 + Math.random() * 0.3, y: -1 },
                    { x: 1, y: -0.6 + Math.random() * 0.3 },
                    { x: 0.8 + Math.random() * 0.3, y: 0.8 },
                    { x: -0.3 + Math.random() * 0.3, y: 1 },
                    { x: -1, y: 0.5 + Math.random() * 0.3 }
                ]
            });
        }
        
        // Roaming white-hot spots inside the lava
        this.lavaHotspots = [];
        for (let i = 0; i < 7; i++) {
            this.lavaHotspots.push({
                u: Math.random(),
                speed: 0.012 + Math.random() * 0.012,
                size: 22 + Math.random() * 20,
                phase: Math.random() * Math.PI * 2
            });
        }

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
        
        // "Spela online" = automatic matchmaking against the next player searching
        document.getElementById('btn-play-online').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.startQuickMatch();
        });

        document.getElementById('btn-mm-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork(); // also drops a half-established room connection
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Play with a friend via room code instead
        document.getElementById('btn-mm-code').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.uiCtrl.showScreen('multiplayer');
        });

        // Private-room menu back
        document.getElementById('btn-multi-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.gameState = 'menu';
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

        // Read-aloud speaker: reads every visible text on the current screen
        const speakBtn = document.getElementById('btn-speak');
        if (speakBtn) {
            if (!this.audioSynth.canReadAloud()) speakBtn.classList.add('unavailable');
            speakBtn.addEventListener('click', () => {
                if (speakBtn.classList.contains('speaking')) {
                    this.audioSynth.stopReadAloud();
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                    return;
                }
                const text = this.collectScreenText();
                speakBtn.classList.add('speaking');
                speakBtn.innerText = '⏹';
                const started = this.audioSynth.readAloud(text, () => {
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                });
                if (!started) {
                    speakBtn.classList.remove('speaking');
                    speakBtn.innerText = '🔊';
                }
            });
        }

        // How to play
        document.getElementById('btn-howto').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('howto');
        });
        document.getElementById('btn-howto-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        // Scoreboard (Poängtavla) menu buttons
        document.getElementById('btn-scoreboard').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.renderScoreboard(this.upgradeMgr);
            this.uiCtrl.showScreen('scoreboard');
        });

        document.getElementById('btn-scoreboard-back').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.uiCtrl.showScreen('menu');
        });

        document.getElementById('btn-reset-scoreboard').addEventListener('click', () => {
            this.audioSynth.playClick();
            if (window.confirm("Är du säker på att du vill nollställa poängtavlan och matchstatistiken?")) {
                this.upgradeMgr.resetScoreboard();
                this.uiCtrl.renderScoreboard(this.upgradeMgr);
            }
        });

        const btnGameOverScoreboard = document.getElementById('btn-gameover-scoreboard');
        if (btnGameOverScoreboard) {
            btnGameOverScoreboard.addEventListener('click', () => {
                this.audioSynth.playClick();
                this.uiCtrl.renderScoreboard(this.upgradeMgr);
                this.uiCtrl.showScreen('scoreboard');
            });
        }

        const btnVictoryScoreboard = document.getElementById('btn-victory-scoreboard');
        if (btnVictoryScoreboard) {
            btnVictoryScoreboard.addEventListener('click', () => {
                this.audioSynth.playClick();
                this.uiCtrl.renderScoreboard(this.upgradeMgr);
                this.uiCtrl.showScreen('scoreboard');
            });
        }
        
        // Game Over screen buttons
        document.getElementById('btn-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.requestRestart();
        });

        document.getElementById('btn-gameover-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.resetRestartButtons();
            this.gameState = 'menu';
            this.uiCtrl.showScreen('menu');
        });

        // Victory screen buttons
        document.getElementById('btn-victory-restart').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.requestRestart();
        });

        document.getElementById('btn-victory-menu').addEventListener('click', () => {
            this.audioSynth.playClick();
            this.cleanupNetwork();
            this.resetRestartButtons();
            this.gameState = 'menu';
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
        this.inputCtrl.onDragStart = (x, y, fromGamepad = false) => {
            if (this.gameState !== 'playing') return false;
            if (fromGamepad || this.player.containsPoint(x, y)) {
                return this.player.startDrag();
            }
            return false;
        };

        // Gamepad (Xbox) hooks
        this.inputCtrl.isGameplayActive = () => this.gameState === 'playing';
        this.inputCtrl.onGamepadShoot = () => {
            if (this.gameState === 'playing') this.player.shoot();
        };
        this.inputCtrl.onGamepadSpeak = () => {
            const b = document.getElementById('btn-speak');
            if (b) b.click();
        };
        this.inputCtrl.onGamepadMenu = (action) => this.gamepadMenuNav(action);
        this.inputCtrl.onGamepadConnected = (pad) => this.onGamepadConnected(pad);
        
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
            this.player.vx = dirX * 0.9 * this.player.profile.speedMultiplier;
            this.player.vy = dirY * 0.9 * this.player.profile.speedMultiplier;
            this.audioSynth.playSlash(this.player.activeWeaponKey);
        };
    }

    // ------------------------------------------------------------------
    // GAMEPAD MENU NAVIGATION (Xbox controller in Edge, or any standard pad)
    // ------------------------------------------------------------------
    onGamepadConnected(pad) {
        if (this.gamepadAnnounced) return;
        this.gamepadAnnounced = true;
        document.body.classList.add('has-gamepad');
        const hint = document.querySelector('.touch-hint');
        if (hint) hint.innerText = 'Vänster spak: sikta och släpp för att dasha | X / RT: svärdsvåg | Y: läs upp';
        this.showToast('🎮 Handkontroll ansluten – A: välj, B: tillbaka, Y: läs upp');
        this.gamepadMenuNav('focus');
    }

    showToast(text, ms = 4000) {
        let el = document.getElementById('gp-toast');
        if (!el) {
            el = document.createElement('div');
            el.id = 'gp-toast';
            el.className = 'gp-toast';
            document.body.appendChild(el);
        }
        el.innerText = text;
        el.classList.add('show');
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => el.classList.remove('show'), ms);
    }

    gamepadFocusables(screen) {
        return [...screen.querySelectorAll('button, .weapon-card, input')]
            .filter(el => !el.disabled && !el.closest('.hidden') && el.offsetParent !== null);
    }

    gamepadMenuNav(action) {
        const screen = [...document.querySelectorAll('.overlay-screen')].find(el => !el.classList.contains('hidden'));
        if (!screen) return;
        const items = this.gamepadFocusables(screen);
        if (!items.length) return;

        if (this.gpFocusScreen !== screen.id) {
            this.gpFocusScreen = screen.id;
            this.gpFocusIdx = 0;
        }
        let idx = items.indexOf(this.gpFocusEl);
        if (idx < 0) idx = Math.min(this.gpFocusIdx || 0, items.length - 1);

        if (action === 'up' || action === 'left') {
            idx = (idx - 1 + items.length) % items.length;
        } else if (action === 'down' || action === 'right') {
            idx = (idx + 1) % items.length;
        } else if (action === 'confirm') {
            const el = items[idx];
            if (el.tagName === 'INPUT') el.focus(); // Xbox Edge opens its on-screen keyboard
            else el.click();
            return;
        } else if (action === 'back') {
            const back = items.find(el => /back|menu|tillbaka|avbryt|huvudmeny/i.test(el.id + ' ' + (el.innerText || '')));
            if (back) back.click();
            return;
        }
        this.setGamepadFocus(items[idx], idx);
    }

    setGamepadFocus(el, idx) {
        document.querySelectorAll('.gp-focus').forEach(e => e.classList.remove('gp-focus'));
        el.classList.add('gp-focus');
        this.gpFocusEl = el;
        this.gpFocusIdx = idx;
        try { el.scrollIntoView({ block: 'nearest' }); } catch (e) {}
    }

    // Gather all readable text on whatever screen is showing (menus, shops,
    // help, result screens, or the HUD during a match), in reading order.
    collectScreenText() {
        const visible = [...document.querySelectorAll('.overlay-screen')].filter(el => !el.classList.contains('hidden'));
        const hud = document.getElementById('hud');
        const roots = visible.length ? visible : (hud && !hud.classList.contains('hidden') ? [hud] : []);
        const parts = [];
        roots.forEach(root => {
            root.querySelectorAll('h1, h2, h3, p, label, button, li, td, th, .glitch-title, .subtitle, .stat-item, .label, .mini-label, .lobby-status, .status-msg, .high-score-display, .hud-score-item, .match-timer-box, .touch-hint, .upgrade-level, .weapon-cost, .stat-row, .room-code-display, .mm-timer, .podium-title').forEach(el => {
                // skip hidden nodes and things nested inside an element we already took
                if (el.closest('.hidden') || el.offsetParent === null && getComputedStyle(el).position !== 'fixed' && !el.closest('#hud')) return;
                if (el.parentElement && el.parentElement.closest('h1, h2, h3, p, label, button, li, td, th, .stat-item')) return;
                let t = (el.innerText || '').replace(/\s+/g, ' ').trim();
                if (!t) return;
                // digits in the room code are read one by one
                if (el.classList.contains('room-code-display') && /^\d{4}$/.test(t)) t = t.split('').join(' ');
                parts.push(t);
            });
        });
        // drop duplicates and make sure each part ends like a sentence
        const seen = new Set();
        const sentences = parts.filter(t => { const k = t.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; })
            .map(t => /[.!?:]$/.test(t) ? t : t + '.');
        // strip emoji/symbols the voice would spell out
        return sentences.join(' ')
            .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{200D}]/gu, ' ')
            .replace(/[⚡✅◻⏹🔊❔]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
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

    // ------------------------------------------------------------------
    // MULTIPLAYER (relayed over itty.ws WebSocket channels)
    //
    // Authority model (symmetric, no host-side simulation of the opponent):
    //  - Each side owns its OWN car (hp, death, energy) and its OWN tower
    //    (bottomTower). Damage to *me* is computed on *my* machine from the
    //    mirrored projectiles / rams I see, and then broadcast in 'sync'.
    //  - The opponent's car and the top tower are pure replicas of what the
    //    other side reports. Local hits on them only show effects.
    //  - The host owns the match clock and the time-out verdict. A side whose
    //    tower falls declares its own defeat via 'match_end'.
    // ------------------------------------------------------------------

    buildProfilePacket(type) {
        return {
            type,
            vehicle: this.player.activeWeaponKey,
            cannon: this.upgradeMgr.state.equippedCannons || [this.upgradeMgr.state.equippedCannon || 'laser'],
            upgrades: this.upgradeMgr.state.upgrades
        };
    }

    // Host Multiplayer Setup (High-Speed WebSocket Channel).
    // `presetCode` is set by matchmaking; otherwise a private room code is generated.
    setupMultiplayerHost(presetCode = null) {
        this.cleanupNetwork();
        this.isMultiplayer = true;
        this.isClient = false;
        this.gameState = 'lobby';
        this.quickMatch = !!presetCode;

        const randomCode = presetCode || Math.floor(1000 + Math.random() * 9000).toString();
        this.roomId = randomCode;

        const codeEl = document.getElementById('lobby-code-val');
        if (codeEl) codeEl.innerText = '...';
        const codeBlock = document.getElementById('lobby-code-block');
        if (codeBlock) codeBlock.classList.toggle('hidden', this.quickMatch);
        const titleEl = document.getElementById('lobby-title');
        if (titleEl) titleEl.innerText = this.quickMatch ? 'MOTSTÅNDARE HITTAD' : 'RUM SKAPAT';
        const lobbyStatus = document.querySelector('.lobby-status');
        if (lobbyStatus) lobbyStatus.innerText = this.quickMatch ? 'Kopplar ihop er...' : 'Kopplar upp mot spelservern...';
        this.uiCtrl.showScreen('lobby');

        const socketUrl = `wss://itty.ws/c/dangerousfight-${randomCode}`;
        this.ws = new WebSocket(socketUrl);

        this.ws.onopen = () => {
            console.log('Host room open with code:', randomCode);
            if (codeEl) codeEl.innerText = randomCode;
            if (lobbyStatus) lobbyStatus.innerText = this.quickMatch ? 'Väntar på motståndaren...' : 'Rummet är öppet! Väntar på att Spelare 2 ansluter...';
        };

        this.ws.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.self) return; // Ignore own echoes

                const data = payload.message || payload;

                if (payload.type === 'join' && payload.total >= 2) {
                    console.log('Player 2 connected to room!');
                    if (lobbyStatus) lobbyStatus.innerText = 'Spelare 2 anslöt! Startar matchen...';
                    this.sendNetworkPacket(this.buildProfilePacket('host_ready'));
                    return;
                }

                if (payload.type === 'leave') {
                    console.log('Opponent left the room');
                    if (this.gameState === 'lobby' || (this.gameState !== 'playing' && this.gameState !== 'gameover' && this.gameState !== 'victory')) {
                        if (this.quickMatch) {
                            // Matched opponent bailed before the match: search again
                            this.startQuickMatch();
                            return;
                        }
                        // Private room: keep it open for a new opponent
                        if (lobbyStatus) lobbyStatus.innerText = 'Spelare 2 lämnade. Väntar på ny motståndare...';
                        return;
                    }
                    this.handleOpponentLeft('Motståndaren lämnade matchen');
                    return;
                }

                if (data && data.type) {
                    this.handleIncomingPacket(data);
                }
            } catch (err) {
                console.error('Error parsing packet:', err);
            }
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket Host error:', err);
            if (lobbyStatus) lobbyStatus.innerText = 'Nätverksfel vid anslutning.';
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            if (lobbyStatus && this.gameState !== 'playing') lobbyStatus.innerText = 'Anslutningen till spelservern bröts.';
            this.handleOpponentLeft('Anslutningen bröts');
        };
    }

    // Client Multiplayer Setup. `viaMatchmaking` keeps the status on the matchmaking screen.
    setupMultiplayerClient(code, viaMatchmaking = false) {
        this.cleanupNetwork();
        this.isMultiplayer = true;
        this.isClient = true;
        this.gameState = 'join';
        this.quickMatch = viaMatchmaking;
        const cleanCode = (code || '').trim();
        this.roomId = cleanCode;

        const statusEl = viaMatchmaking
            ? document.getElementById('mm-status')
            : document.getElementById('join-status-text');
        statusEl.innerText = viaMatchmaking ? 'Motståndare hittad! Kopplar ihop er...' : 'Ansluter till rum ' + cleanCode + '...';
        if (viaMatchmaking) this.uiCtrl.showScreen('matchmaking');

        const socketUrl = `wss://itty.ws/c/dangerousfight-${cleanCode}`;
        this.ws = new WebSocket(socketUrl);

        const sendHandshake = () => this.sendNetworkPacket(this.buildProfilePacket('handshake'));

        this.ws.onopen = () => {
            console.log('Client connected to room:', cleanCode);
            statusEl.innerText = viaMatchmaking ? 'Ihopkopplade! Förbereder match...' : 'Ansluten! Förbereder match...';
            sendHandshake();

            if (this.handshakeInterval) clearInterval(this.handshakeInterval);
            this.handshakeInterval = setInterval(() => {
                if (this.gameState === 'playing') {
                    clearInterval(this.handshakeInterval);
                    this.handshakeInterval = null;
                } else {
                    sendHandshake();
                }
            }, 500);
        };

        if (this.connectionTimeout) clearTimeout(this.connectionTimeout);
        this.connectionTimeout = setTimeout(() => {
            if (this.isClient && this.gameState !== 'playing') {
                console.warn('Connection timed out to host:', cleanCode);
                if (viaMatchmaking) {
                    // Opponent vanished during the hand-off: go back to searching
                    this.startQuickMatch();
                    return;
                }
                statusEl.innerText = 'Inget svar från rummet. Kontrollera att värden har rum ' + cleanCode + ' öppet.';
                this.cleanupNetwork();
            }
        }, 12000);

        this.ws.onmessage = (e) => {
            try {
                const payload = JSON.parse(e.data);
                if (payload.self) {
                    if (payload.total === 1 && !viaMatchmaking) {
                        statusEl.innerText = 'Väntar på att värden skapar rum ' + cleanCode + '...';
                    }
                    return;
                }

                const data = payload.message || payload;

                if (payload.type === 'leave') {
                    console.log('Host left the room');
                    if (this.gameState !== 'playing' && this.gameState !== 'gameover' && this.gameState !== 'victory') {
                        if (viaMatchmaking) {
                            this.startQuickMatch();
                            return;
                        }
                        statusEl.innerText = 'Värden stängde rummet.';
                        this.cleanupNetwork();
                        return;
                    }
                    this.handleOpponentLeft('Värden lämnade matchen');
                    return;
                }

                if (data && data.type) {
                    this.handleIncomingPacket(data);
                }
            } catch (err) {
                console.error('Error parsing packet:', err);
            }
        };

        this.ws.onerror = (err) => {
            console.error('WebSocket Client error:', err);
            statusEl.innerText = 'Kunde inte ansluta till rummet.';
        };

        this.ws.onclose = () => {
            console.log('WebSocket closed');
            if (this.gameState !== 'playing') statusEl.innerText = 'Anslutningen till spelservern bröts.';
            this.handleOpponentLeft('Anslutningen bröts');
        };
    }

    // Opponent gone (left / connection lost). Ends a running match and
    // turns the post-match buttons back into single-player controls.
    handleOpponentLeft(reason) {
        const wasMultiplayer = this.isMultiplayer;
        if (this.gameState === 'playing') {
            this.gameState = 'gameover';
            this.audioSynth.stopMusic();
            this.uiCtrl.renderGameOver(0, reason, this.currentScore || 0, this.matchKills || 0, false);
            this.uiCtrl.hidePodiumForms();
        } else if (wasMultiplayer && (this.gameState === 'gameover' || this.gameState === 'victory')) {
            const winnerEl = document.getElementById('stat-defeat-winner');
            if (winnerEl && this.gameState === 'gameover') winnerEl.innerText = reason;
        }
        this.resetRestartButtons();
        this.cleanupNetwork();
    }

    cleanupNetwork() {
        this.cleanupMatchmaking();
        if (this.handshakeInterval) {
            clearInterval(this.handshakeInterval);
            this.handshakeInterval = null;
        }
        if (this.connectionTimeout) {
            clearTimeout(this.connectionTimeout);
            this.connectionTimeout = null;
        }
        if (this.ws) {
            this.ws.onopen = null;
            this.ws.onmessage = null;
            this.ws.onerror = null;
            this.ws.onclose = null;
            try { this.ws.close(); } catch (e) {}
            this.ws = null;
        }
        this.isMultiplayer = false;
        this.isClient = false;
        this.remoteProfile = null;
        this.restartRequestedLocal = false;
        this.restartRequestedRemote = false;
        this.netSyncAccumulator = 0;
    }

    sendNetworkPacket(data) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(data));
        }
    }

    // Remember what the opponent is driving; applied in startRun() after the
    // enemy reset (which would otherwise wipe the vehicle profile).
    applyRemoteProfile(data) {
        this.remoteProfile = {
            vehicle: data.vehicle || 'katana',
            upgrades: data.upgrades || {}
        };
        this.enemy.setVehicleType(this.remoteProfile.vehicle);
    }

    // Both players must press "Spela igen" before a rematch starts
    requestRestart() {
        if (!this.isMultiplayer) {
            this.startRun();
            return;
        }
        this.restartRequestedLocal = true;
        this.sendNetworkPacket({ type: 'restart_request' });
        const winnerEl = document.getElementById('stat-defeat-winner');
        if (winnerEl && this.gameState === 'gameover') winnerEl.innerText = 'Väntar på motståndare...';
        ['btn-restart', 'btn-victory-restart'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (!btn.dataset.label) btn.dataset.label = btn.innerText;
            btn.innerText = 'VÄNTAR PÅ MOTSTÅNDARE...';
            btn.disabled = true;
        });
        this.tryMutualRestart();
    }

    resetRestartButtons() {
        ['btn-restart', 'btn-victory-restart'].forEach(id => {
            const btn = document.getElementById(id);
            if (!btn) return;
            if (btn.dataset.label) btn.innerText = btn.dataset.label;
            btn.disabled = false;
        });
    }

    tryMutualRestart() {
        if (this.restartRequestedLocal && this.restartRequestedRemote) {
            this.restartRequestedLocal = false;
            this.restartRequestedRemote = false;
            this.resetRestartButtons();
            this.startRun();
        }
    }

    // ------------------------------------------------------------------
    // QUICK MATCH (automatic matchmaking)
    //
    // Everyone searching sits in one shared lobby channel and announces
    // themselves with 'seek'. When two seekers see each other, the one with
    // the lexically smaller id becomes host: it picks a room code and sends
    // 'match' to the other, who confirms with 'match_ack'. Both then leave
    // the lobby and meet in the private room like a code-based game.
    // ------------------------------------------------------------------
    startQuickMatch() {
        this.cleanupNetwork();
        this.gameState = 'matchmaking';
        this.quickMatch = true;

        const statusEl = document.getElementById('mm-status');
        const timerEl = document.getElementById('mm-timer');
        if (statusEl) {
            statusEl.classList.remove('mm-found');
            statusEl.innerText = 'Kopplar upp mot spelservern...';
        }
        this.uiCtrl.showScreen('matchmaking');

        this.mmId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
        this.mmPending = null;   // { peer, room, sentAt } while waiting for an ack
        this.mmMatched = false;
        const startedAt = Date.now();

        const ws = new WebSocket('wss://itty.ws/c/dangerousfight-lobby');
        this.mmWs = ws;

        const send = (obj) => {
            if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj));
        };
        const seek = () => send({ type: 'seek', id: this.mmId });

        ws.onopen = () => {
            if (statusEl) statusEl.innerText = 'Söker motståndare...';
            seek();
            this.mmTimers.push(setInterval(seek, 1000));
            this.mmTimers.push(setInterval(() => {
                if (!timerEl) return;
                const secs = Math.floor((Date.now() - startedAt) / 1000);
                timerEl.innerText = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;
                // A proposal nobody answered: forget it and keep searching
                if (this.mmPending && Date.now() - this.mmPending.sentAt > 4000) {
                    this.mmPending = null;
                    if (statusEl) statusEl.innerText = 'Söker motståndare...';
                }
            }, 500));
        };

        ws.onmessage = (e) => {
            if (this.mmWs !== ws || this.mmMatched) return;
            let payload;
            try { payload = JSON.parse(e.data); } catch (err) { return; }
            if (payload.self) return;
            const data = payload.message || payload;
            if (!data || !data.id || data.id === this.mmId) return;

            if (data.type === 'seek') {
                if (this.mmPending) return; // already proposing to someone
                if (this.mmId < data.id) {
                    // I host: propose a room to this seeker
                    const room = Math.floor(1000 + Math.random() * 9000).toString();
                    this.mmPending = { peer: data.id, room, sentAt: Date.now() };
                    if (statusEl) statusEl.innerText = 'Spelare hittad, förhandlar...';
                    send({ type: 'match', id: this.mmId, to: data.id, room });
                } else {
                    // Make sure the would-be host sees me right away
                    seek();
                }
            } else if (data.type === 'match' && data.to === this.mmId && data.room) {
                // Accept the proposal and join as client - unless I am mid-proposal
                // to someone else (then the proposer times out and retries)
                if (this.mmPending) return;
                this.mmMatched = true;
                send({ type: 'match_ack', id: this.mmId, to: data.id, room: data.room });
                if (statusEl) {
                    statusEl.classList.add('mm-found');
                    statusEl.innerText = 'Motståndare hittad!';
                }
                this.audioSynth.playUpgrade();
                setTimeout(() => this.setupMultiplayerClient(data.room, true), 150);
            } else if (data.type === 'match_ack' && data.to === this.mmId && this.mmPending && data.id === this.mmPending.peer) {
                this.mmMatched = true;
                if (statusEl) {
                    statusEl.classList.add('mm-found');
                    statusEl.innerText = 'Motståndare hittad!';
                }
                this.audioSynth.playUpgrade();
                const room = this.mmPending.room;
                setTimeout(() => this.setupMultiplayerHost(room), 150);
            }
        };

        ws.onerror = () => {
            if (statusEl) statusEl.innerText = 'Nätverksfel – kunde inte nå spelservern.';
        };
        ws.onclose = () => {
            if (this.mmWs !== ws || this.mmMatched) return;
            if (statusEl) statusEl.innerText = 'Anslutningen bröts. Försöker igen...';
            this.mmTimers.push(setTimeout(() => {
                if (this.mmWs === ws && this.gameState === 'matchmaking') this.startQuickMatch();
            }, 2000));
        };
    }

    cleanupMatchmaking() {
        this.mmTimers.forEach(t => { clearInterval(t); clearTimeout(t); });
        this.mmTimers = [];
        if (this.mmWs) {
            const ws = this.mmWs;
            this.mmWs = null;
            ws.onopen = null; ws.onmessage = null; ws.onerror = null; ws.onclose = null;
            try { ws.close(); } catch (e) {}
        }
        this.mmPending = null;
    }

    handleIncomingPacket(data) {
        if (data.type === 'host_ready') {
            this.applyRemoteProfile(data);
            this.sendNetworkPacket(this.buildProfilePacket('handshake'));
        } else if (data.type === 'handshake') {
            this.applyRemoteProfile(data);
            if (this.handshakeInterval) {
                clearInterval(this.handshakeInterval);
                this.handshakeInterval = null;
            }

            // Handshake response from client to host
            if (!this.isClient) {
                this.sendNetworkPacket(this.buildProfilePacket('handshake_ack'));
                if (this.gameState !== 'playing') {
                    this.startRun();
                }
            }
        } else if (data.type === 'handshake_ack') {
            this.applyRemoteProfile(data);
            if (this.handshakeInterval) {
                clearInterval(this.handshakeInterval);
                this.handshakeInterval = null;
            }
            if (this.gameState !== 'playing') {
                this.startRun();
            }
        } else if (data.type === 'sync') {
            if (this.gameState !== 'playing') return;
            // Sync positions (Note: Mirrored view mapping!)
            const w = this.canvasCtrl.width;
            const h = this.canvasCtrl.height;
            const rp = data.player;

            // Opponent car replica
            this.enemy.x = w - rp.x;
            this.enemy.y = h - rp.y;
            this.enemy.vx = -rp.vx;
            this.enemy.vy = -rp.vy;
            if (typeof rp.maxHp === 'number') this.enemy.maxHp = rp.maxHp;
            this.enemy.energy = rp.energy;

            // Death / respawn is owned by the opponent's machine
            if (rp.dead && this.enemy.state !== 'dead') {
                this.enemy.state = 'dead';
                this.enemy.hp = 0;
                this.enemy.respawnTimer = Number.MAX_SAFE_INTEGER; // revived by sync, not by timer
                this.enemy.vx = 0;
                this.enemy.vy = 0;
                this.particles.spawnShockwave(this.enemy.x, this.enemy.y, this.enemy.color, 70);
                this.audioSynth.playVictory();
                this.onEnemyDefeated(false);
            } else if (!rp.dead && this.enemy.state === 'dead') {
                this.enemy.state = 'idle';
                this.enemy.respawnTimer = 0;
                this.particles.spawnShockwave(this.enemy.x, this.enemy.y, this.enemy.color, 40);
            }
            if (!rp.dead) this.enemy.hp = rp.hp;

            // Sync screen shake
            if (data.shake) {
                this.canvasCtrl.shake(data.shake.amt, data.shake.dur);
            }

            // Opponent's own tower is our top tower
            if (data.tower) {
                if (typeof data.tower.maxHp === 'number') this.topTower.maxHp = data.tower.maxHp;
                this.topTower.hp = data.tower.hp;
            }

            // Host owns the match clock
            if (this.isClient && typeof data.matchTimer === 'number') {
                this.matchTimer = data.matchTimer;
            }
        } else if (data.type === 'projectile_fired') {
            if (this.gameState !== 'playing') return;
            // Opponent spawned a projectile, replicate it mirrored
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
        } else if (data.type === 'match_end') {
            if (this.gameState !== 'playing') return;
            if (data.result === 'you_win') {
                this.handleVictory();
            } else {
                this.handleDefeat();
            }
        } else if (data.type === 'restart_request') {
            this.restartRequestedRemote = true;
            this.tryMutualRestart();
        }
    }

    // Locally-owned match outcome (my tower fell / host timed out the match)
    declareMatchEnd(iWin) {
        if (this.isMultiplayer) {
            this.sendNetworkPacket({ type: 'match_end', result: iWin ? 'you_lose' : 'you_win' });
        }
        if (iWin) this.handleVictory();
        else this.handleDefeat();
    }

    // Apply damage to a tower respecting network authority. In multiplayer
    // only my own (bottom) tower is simulated locally; the top tower is a
    // replica that only the opponent may change.
    damageTower(which, amount) {
        const tower = which === 'top' ? this.topTower : this.bottomTower;
        if (this.isMultiplayer && which === 'top') return;
        tower.hp = Math.max(0, tower.hp - amount);
    }

    // Triggered when starting a game
    startRun() {
        this.runCredits = 0;
        this.currentScore = 0;
        this.matchKills = 0;
        this.particles.clear();
        this.projectiles = [];
        this.slowMoTimer = 0; // reset slow motion
        this.matchTimer = 240000; // 4 minutes match duration
        
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
        
        // Settle active weapon on player BEFORE hp is derived from its profile
        this.player.activeWeaponKey = this.upgradeMgr.state.equippedWeapon || 'katana';
        this.player.applyPermanentUpgrades(this.upgradeMgr.state.upgrades);
        this.player.resetForRun();

        // Both cars start the match at their own base, whatever happened last round
        const arenaW = this.canvasCtrl.width;
        const arenaH = this.canvasCtrl.height;
        this.player.x = arenaW / 2;
        this.player.y = arenaH - 120;
        this.player.angle = -Math.PI / 2;
        this.player.trailHistory = [];
        this.enemy.x = arenaW / 2;
        this.enemy.y = 120;
        this.enemy.angle = Math.PI / 2;
        this.enemy.trailHistory = [];

        // Reset enemy car
        this.enemy.resetForRun(isBoss);
        if (isBoss) this.enemy.resetRagdollPositions();

        if (this.isMultiplayer) {
            // The enemy is a replica of the opponent: restore their vehicle
            // profile (resetForRun wiped it) and size their tower by their
            // own health upgrade. Live hp/maxHp values arrive via 'sync'.
            const remote = this.remoteProfile || { vehicle: 'katana', upgrades: {} };
            this.enemy.setVehicleType(remote.vehicle);
            this.enemy.maxHp = (this.player.profiles[remote.vehicle]?.baseHp || 100) + ((remote.upgrades.health || 0) * 10);
            this.enemy.hp = this.enemy.maxHp;
            const remoteTowerMax = 500 + (remote.upgrades.health || 0) * 50;
            this.topTower = { hp: remoteTowerMax, maxHp: remoteTowerMax };
            this.restartRequestedLocal = false;
            this.restartRequestedRemote = false;
            this.netSyncAccumulator = 0;
        }
        
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

    // Add points to current match score with optional floating indicator
    addScore(points, x = null, y = null, label = null) {
        if (this.gameState !== 'playing') return;
        const pts = Math.round(points);
        this.currentScore = (this.currentScore || 0) + pts;
        
        if (x !== null && y !== null) {
            const text = label ? `${label} +${pts}` : `+${pts}`;
            const color = pts >= 500 ? '#ffcc00' : (pts >= 100 ? '#00f0ff' : '#39ff14');
            this.particles.spawnDamageText(x, y, text, color, pts >= 500 ? 1.4 : 1.1);
        }
    }

    // Handler when enemy samurai is destroyed
    onEnemyDefeated(isBoss) {
        this.matchKills = (this.matchKills || 0) + 1;
        if (isBoss) {
            this.addScore(2000, this.enemy.x, this.enemy.y, 'BOSS K.O.!');
        } else {
            this.addScore(500, this.enemy.x, this.enemy.y, 'K.O.!');
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

        // Micro hit-stop impact freeze frame
        if (this.hitStopTimer > 0) {
            this.hitStopTimer -= dt;
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

        // 4-Minute Match Timer Countdown
        if (this.gameState === 'playing') {
            this.matchTimer -= dt;
            if (this.matchTimer <= 0) {
                this.matchTimer = 0;
                this.handleMatchTimeout();
                return;
            }
        }

        // Update systems
        this.canvasCtrl.update(dt, this.player);
        this.particles.spawnAmbience(this.canvasCtrl.width, this.canvasCtrl.height, 1);
        this.particles.update(dt);
        
        // Update lava simulation state
        this.lavaTime += dt * 0.0012;
        
        // Spawn magma bubbles in lava region
        const lavaMinX = 80;
        const lavaMaxX = this.canvasCtrl.width - 80;
        const lavaCenterY = this.canvasCtrl.height / 2;
        
        if (Math.random() < 0.035 && this.lavaBubbles.length < 9) {
            this.lavaBubbles.push({
                x: lavaMinX + 25 + Math.random() * (lavaMaxX - lavaMinX - 50),
                y: lavaCenterY + (Math.random() - 0.5) * 32,
                radius: 0.5,
                maxRadius: Math.random() * 8 + 4,
                growth: Math.random() * 0.014 + 0.008
            });
        }

        for (let i = this.lavaBubbles.length - 1; i >= 0; i--) {
            const b = this.lavaBubbles[i];
            b.radius += b.growth * dt;
            if (b.radius >= b.maxRadius) {
                this.audioSynth.playLavaBubblePop(0.14);
                this.particles.spawnLavaBurst(b.x, b.y);
                this.lavaBubbles.splice(i, 1);
            }
        }

        // Drifting basalt / obsidian crust plates ride the current
        const riverLen = Math.max(1, lavaMaxX - lavaMinX);
        this.lavaCrustPlates.forEach(plate => {
            plate.u += (plate.vx * dt) / riverLen;
            plate.angle += plate.rotSpeed * dt;
            if (plate.u > 1.04) plate.u -= 1.08;
        });

        // Constant trickle of embers and smoke rising off the magma
        if (Math.random() < 0.35) {
            const ex = lavaMinX + Math.random() * riverLen;
            this.particles.spawnDamageEmbers(ex, lavaCenterY + (Math.random() - 0.5) * 30, Math.random() < 0.5 ? '#ff7a00' : '#ffb830');
        }

        if (this.remoteMeleeCooldown > 0) this.remoteMeleeCooldown -= dt;
        if (this.enemyRamCooldown > 0) this.enemyRamCooldown -= dt;
        if (this.playerRamCooldown > 0) this.playerRamCooldown -= dt;

        this.player.update(dt, this.canvasCtrl.width, this.canvasCtrl.height, this.particles);
        this.enemy.update(enemyDt, this.player, this.audioSynth, this.particles, this.canvasCtrl, this.canvasCtrl.width, this.canvasCtrl.height);
        
        this.updatePhysics(physicsDt);
        this.checkCollisions(physicsDt);
        
        // Network Sync (~30 Hz; the replica dead-reckons between packets)
        if (this.isMultiplayer) {
            this.netSyncAccumulator = (this.netSyncAccumulator || 0) + dt;
            if (this.netSyncAccumulator >= 33) {
                this.netSyncAccumulator = 0;
                this.sendNetworkPacket({
                    type: 'sync',
                    matchTimer: this.matchTimer,
                    player: {
                        x: this.player.x,
                        y: this.player.y,
                        vx: this.player.vx,
                        vy: this.player.vy,
                        hp: this.player.hp,
                        maxHp: this.player.maxHp,
                        energy: this.player.energy,
                        dead: this.player.state === 'dead'
                    },
                    tower: {
                        hp: this.bottomTower.hp,
                        maxHp: this.bottomTower.maxHp
                    }
                });
            }
        }
    }

    handleMatchTimeout() {
        // In multiplayer the host owns the clock and the verdict; the client
        // just waits for 'match_end'.
        if (this.isMultiplayer && this.isClient) return;

        // 4 minutes expired! Calculate damage taken on both sides
        const topTowerDamage = this.topTower.maxHp - this.topTower.hp;
        const bottomTowerDamage = this.bottomTower.maxHp - this.bottomTower.hp;

        this.particles.spawnDamageText(this.canvasCtrl.width / 2, this.canvasCtrl.height / 2, 'TIDEN UTE!', '#ffcc00', 2.0);

        let iWin;
        if (topTowerDamage > bottomTowerDamage) {
            // Enemy tower took MORE damage -> Player Wins!
            iWin = true;
        } else if (bottomTowerDamage > topTowerDamage) {
            // Player tower took MORE damage -> Enemy Wins!
            iWin = false;
        } else {
            // Equal tower damage, compare samurai car damage taken
            const playerCarDamage = this.player.maxHp - this.player.hp;
            const enemyCarDamage = this.enemy.maxHp - this.enemy.hp;
            iWin = enemyCarDamage >= playerCarDamage;
        }
        this.declareMatchEnd(iWin);
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
            
            // Viscous fluid drag & thermal buoyant kick
            this.player.vx *= Math.pow(0.95, dt / 16);
            this.player.vy *= Math.pow(0.95, dt / 16);
            this.player.vy += 0.004 * dt; // buoyant repulsion back to your own side
            
            const now = Date.now();
            if (now - this.lastLavaSizzlePlayer > 160) {
                this.lastLavaSizzlePlayer = now;
                this.audioSynth.playLavaSizzle();
                this.particles.spawnLavaSplash(this.player.x, this.player.y, this.player.vx, this.player.vy);
                this.particles.addDecal(this.player.x, this.player.y > h / 2 ? lavaMaxY : lavaMinY, 16, 'rgba(0,0,0,0.8)', 'scorch');
            }
            if (this.player.hp <= 0) {
                this.player.takeDamage(1, this.player.x, this.player.y, this.particles, this.canvasCtrl);
            }
        }

        // Check enemy car in lava
        if (this.enemy.x > lavaMinX && this.enemy.x < lavaMaxX && this.enemy.y > lavaMinY && this.enemy.y < lavaMaxY && this.enemy.state !== 'dead') {
            // In multiplayer the opponent computes their own lava damage
            if (!this.isMultiplayer) this.enemy.hp = Math.max(0, this.enemy.hp - lavaDamagePerMs * dt);
            
            // Viscous fluid drag & thermal buoyant kick
            this.enemy.vx *= Math.pow(0.95, dt / 16);
            this.enemy.vy *= Math.pow(0.95, dt / 16);
            this.enemy.vy -= 0.004 * dt; // buoyant repulsion back to its own side
            
            const now = Date.now();
            if (now - this.lastLavaSizzleEnemy > 160) {
                this.lastLavaSizzleEnemy = now;
                this.audioSynth.playLavaSizzle();
                this.particles.spawnLavaSplash(this.enemy.x, this.enemy.y, this.enemy.vx, this.enemy.vy);
                this.particles.addDecal(this.enemy.x, this.enemy.y > h / 2 ? lavaMaxY : lavaMinY, 16, 'rgba(0,0,0,0.8)', 'scorch');
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
            // A shot never damages the shooter's own tower (it just bounces on)
            if (p.owner === 'enemy') hitTopTower = false;
            if (p.owner === 'player') hitBottomTower = false;
            
            if (hitTopTower) {
                // Damage top tower (each technique has its own tower damage)
                const towerDmg = p.damageTower || 50;
                this.damageTower('top', towerDmg);
                if (p.owner === 'player') {
                    this.addScore(Math.round(towerDmg), p.x, p.y);
                }
                this.hitStopTimer = 25; // hit-stop micro freeze
                this.particles.spawnDamageText(p.x, p.y, `-${towerDmg}`, '#ff0077', 1.25);
                this.particles.addDecal(p.x, p.y, 28, 'rgba(0,0,0,0.7)', 'scorch');
                this.particles.spawnShockwave(p.x, p.y, '#ff0077', 45);
                this.canvasCtrl.addFloorPulse(p.x, p.y, '#ff0077', 180);
                this.canvasCtrl.flash('rgba(255, 0, 119, 0.25)', 200);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            } else if (hitBottomTower) {
                // Damage bottom tower
                const towerDmg = p.damageTower || 50;
                this.damageTower('bottom', towerDmg);
                this.hitStopTimer = 25; // hit-stop micro freeze
                this.particles.spawnDamageText(p.x, p.y, `-${towerDmg}`, '#00f0ff', 1.25);
                this.particles.addDecal(p.x, p.y, 28, 'rgba(0,0,0,0.7)', 'scorch');
                this.particles.spawnShockwave(p.x, p.y, '#00f0ff', 45);
                this.canvasCtrl.addFloorPulse(p.x, p.y, '#00f0ff', 180);
                this.canvasCtrl.flash('rgba(0, 240, 255, 0.25)', 200);
                this.canvasCtrl.shake(8, 200);
                this.audioSynth.playHit();
                this.projectiles.splice(i, 1);
                this.checkWinCondition();
                continue;
            }
            
            // Check samurai/enemy hits (a shot never hits the car that fired it)
            if (p.owner !== 'player' && this.player.state !== 'dead' && Math.hypot(p.x - this.player.x, p.y - this.player.y) < this.player.radius + p.radius) {
                // Perfect Parry: if projectile belongs to enemy and player is launching/dashing fast
                if (p.owner === 'enemy' && Math.hypot(this.player.vx, this.player.vy) > 0.15) {
                    this.hitStopTimer = 40; // Satisfying parry freeze frame!
                    this.particles.spawnDamageText(p.x, p.y, 'PARRY!', '#ffffff', 1.4);
                    this.addScore(150, p.x, p.y, 'PARRY!');
                    this.particles.spawnShockwave(p.x, p.y, '#ffffff', 40);
                    this.canvasCtrl.addFloorPulse(p.x, p.y, '#ffffff', 200);
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

                    // Opponent must see (and be hit by) the reflected shot
                    if (this.isMultiplayer) {
                        this.sendNetworkPacket({
                            type: 'projectile_fired',
                            x: p.x, y: p.y, vx: p.vx, vy: p.vy, radius: p.radius, cannonType: p.type
                        });
                    }

                    continue;
                }
                
                this.hitStopTimer = 15;
                this.player.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                this.projectiles.splice(i, 1);
                continue;
            }
            if (p.owner !== 'enemy' && this.enemy.state !== 'dead') {
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
                    this.hitStopTimer = 15;
                    this.enemy.takeDamage(p.damageCar, p.x, p.y, this.particles, this.canvasCtrl);
                    if (p.owner === 'player') {
                        this.addScore(Math.round(p.damageCar || 25), p.x, p.y);
                    }
                    this.projectiles.splice(i, 1);
                    continue;
                }
            }
        }
    }

    checkCollisions(dt) {
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const playerAlive = this.player.state !== 'dead';
        const enemyAlive = this.enemy.state !== 'dead';

        // --- 1. SAMURAI-TO-SAMURAI ELASTIC COLLISION ---
        if (!playerAlive || !enemyAlive) {
            // No clash possible, but tower ramming below must still work
        } else if (this.enemy.isBoss && this.enemy.ragdollNodes) {
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

                        // Deal slash damage if dashing fast
                        const playerDashSpeed = Math.hypot(this.player.vx, this.player.vy);
                        if (playerDashSpeed > 0.08) {
                            const slashDmg = Math.floor((this.player.profile?.ramDamage || 100) * 0.5);
                            this.enemy.takeDamage(slashDmg, this.player.x, this.player.y, this.particles, this.canvasCtrl);
                            this.addScore(slashDmg * 2, (this.player.x + node.x) / 2, (this.player.y + node.y) / 2, 'SLASH!');
                        }
                    }
                    
                    this.hitStopTimer = 30; // Heavy clash freeze
                    this.audioSynth.playClash();
                    this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
                    this.canvasCtrl.addFloorPulse((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, '#00f0ff', 160);
                    this.particles.spawnClashSparks((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, '#ffffff');
                    this.particles.addDecal((this.player.x + node.x) / 2, (this.player.y + node.y) / 2, 20, 'rgba(0,0,0,0.6)', 'scorch');
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
                    // Pre-impact speeds: in multiplayer both machines must agree
                    // on who was dashing, independent of the impulse result.
                    const prePlayerSpeed = Math.hypot(this.player.vx, this.player.vy);
                    const preEnemySpeed = Math.hypot(this.enemy.vx, this.enemy.vy);

                    const restitution = 0.85;
                    let impulseScalar = -(1 + restitution) * velAlongNormal;
                    impulseScalar /= (1 / this.player.mass) + (1 / this.enemy.mass);

                    this.player.vx += (impulseScalar / this.player.mass) * normalX;
                    this.player.vy += (impulseScalar / this.player.mass) * normalY;
                    this.enemy.vx -= (impulseScalar / this.enemy.mass) * normalX;
                    this.enemy.vy -= (impulseScalar / this.enemy.mass) * normalY;

                    // Deal slash damage if dashing fast
                    const playerDashSpeed = this.isMultiplayer ? prePlayerSpeed : Math.hypot(this.player.vx, this.player.vy);
                    if (playerDashSpeed > 0.08) {
                        const slashDmg = Math.floor((this.player.profile?.ramDamage || 100) * 0.5);
                        this.enemy.takeDamage(slashDmg, this.player.x, this.player.y, this.particles, this.canvasCtrl);
                        this.addScore(slashDmg * 2, (this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, 'SLASH!');
                    }

                    // Multiplayer: the opponent slashing into me damages me (I own my hp)
                    if (this.isMultiplayer && preEnemySpeed > 0.08 && this.remoteMeleeCooldown <= 0) {
                        this.remoteMeleeCooldown = 400;
                        const enemyProfile = this.player.profiles[this.enemy.activeWeaponKey] || this.player.profiles.katana;
                        const slashDmg = Math.floor((enemyProfile.ramDamage || 100) * 0.5);
                        this.player.takeDamage(slashDmg, this.enemy.x, this.enemy.y, this.particles, this.canvasCtrl);
                    }
                }
                
                this.hitStopTimer = 30; // Heavy clash freeze
                this.audioSynth.playClash();
                this.canvasCtrl.flash('rgba(255, 255, 255, 0.2)', 100);
                this.canvasCtrl.addFloorPulse((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#00f0ff', 160);
                this.particles.spawnClashSparks((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, '#ffffff');
                this.particles.addDecal((this.player.x + this.enemy.x) / 2, (this.player.y + this.enemy.y) / 2, 20, 'rgba(0,0,0,0.6)', 'scorch');
            }
        }

        // --- 2. TOWER RAMMING COLLISION ---
        // Player samurai hitting top tower (enemy)
        if (playerAlive && this.player.y < 85) {
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
                if (impactForce > 0.05 && this.playerRamCooldown <= 0) {
                    this.playerRamCooldown = 500;
                    const ramDmg = this.player.profile.ramDamage;
                    this.damageTower('top', ramDmg);
                    this.addScore(250, this.player.x, 70, 'RAM!');
                    
                    this.hitStopTimer = 50; // Massive tower ram freeze frame!
                    this.particles.spawnDamageText(this.player.x, 70, `RAM! -${ramDmg}`, '#ff0077', 1.4);
                    this.particles.addDecal(this.player.x, 80, 45, 'rgba(0,0,0,0.8)', 'scorch');

                    this.player.vy = 0.28;
                    this.player.y = 88;
                    
                    this.player.takeDamage(30, this.player.x, 70, this.particles, this.canvasCtrl);
                    
                    this.particles.spawnShockwave(this.player.x, 85, this.player.color, 80);
                    this.canvasCtrl.addFloorPulse(this.player.x, 85, '#ff0077', 220);
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

        if (!enemyAlive) {
            // dead enemy cannot ram
        } else if (this.enemy.isBoss && this.enemy.ragdollNodes) {
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
            // One ram per charge: the boss ragdoll (and, online, the re-synced
            // replica) would otherwise register a new ram every frame
            if (impactForce > 0.05 && this.enemyRamCooldown <= 0) {
                this.enemyRamCooldown = this.enemy.isBoss ? 1500 : 800;
                const ramDmg = this.enemy.isBoss ? 150 : (this.player.profiles[this.enemy.activeWeaponKey]?.ramDamage || 100);
                this.damageTower('bottom', ramDmg);
                
                this.hitStopTimer = 50; // Massive tower ram freeze frame!
                this.particles.spawnDamageText(hittingNode.x, h - 70, `RAM! -${ramDmg}`, '#00f0ff', 1.4);
                this.particles.addDecal(hittingNode.x, h - 80, 45, 'rgba(0,0,0,0.8)', 'scorch');

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
                this.canvasCtrl.addFloorPulse(hittingNode.x, h - 85, '#00f0ff', 220);
                this.canvasCtrl.flash('rgba(255, 0, 51, 0.45)', 250); // red warn flash
                this.canvasCtrl.shake(14, 300);
                this.audioSynth.playHit();
                
                this.checkWinCondition();
            }
        }
    }

    checkWinCondition() {
        if (this.gameState !== 'playing') return;
        if (this.isMultiplayer) {
            // Only my own tower is simulated here; the opponent announces
            // their own tower's fall via 'match_end'.
            if (this.bottomTower.hp <= 0) this.declareMatchEnd(false);
            return;
        }
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
        
        // Victory score bonuses
        const victoryBaseBonus = isBoss ? 2500 : 1000;
        // Remaining time bonus (10 points per second left)
        const timeBonus = Math.max(0, Math.floor((this.matchTimer / 1000) * 10));
        // Remaining tower health bonus
        const towerHpBonus = Math.max(0, Math.floor(this.bottomTower.hp));
        
        const finalScore = (this.currentScore || 0) + victoryBaseBonus + timeBonus + towerHpBonus;
        this.currentScore = finalScore;

        // Record match in scoreboard
        const samuraiName = this.player.profile?.name || 'Cyber Ronin';
        const currentWave = this.upgradeMgr.state.highestWave || 1;
        const resultStats = this.upgradeMgr.recordMatchResult({
            score: finalScore,
            wave: currentWave,
            samurai: samuraiName,
            result: 'Vinst',
            kills: this.matchKills || 0
        });

        // Award credits (multiplied by hacker level)
        const creditUpgradeModifier = 1 + (this.upgradeMgr.state.upgrades.credits || 0) * 0.2; // up to +100% credits
        const baseAward = isBoss ? 120 : 60;
        const rewardCredits = Math.floor(baseAward * creditUpgradeModifier);
        
        this.upgradeMgr.addCredits(rewardCredits);
        this.upgradeMgr.recordHighestWave(currentWave + 1);
        
        this.uiCtrl.renderVictory(rewardCredits, isBoss, finalScore, this.matchKills || 0, resultStats.isNewHighScore);
        this.offerPodiumName('victory', resultStats);
        this.audioSynth.playVictory();
    }

    handleDefeat() {
        this.gameState = 'gameover';
        
        const finalScore = this.currentScore || 0;
        const samuraiName = this.player.profile?.name || 'Cyber Ronin';
        const currentWave = this.upgradeMgr.state.highestWave || 1;
        const resultStats = this.upgradeMgr.recordMatchResult({
            score: finalScore,
            wave: currentWave,
            samurai: samuraiName,
            result: 'Förlust',
            kills: this.matchKills || 0
        });

        // Suffer partial credit loss/award
        const rewardCredits = 10;
        this.upgradeMgr.addCredits(rewardCredits);
        
        this.uiCtrl.renderGameOver(rewardCredits, this.isMultiplayer ? 'Motståndaren' : 'Datorn', finalScore, this.matchKills || 0, resultStats.isNewHighScore);
        this.offerPodiumName('defeat', resultStats);
        this.audioSynth.playDefeat();
    }

    // A top-3 placement on the leaderboard lets the player sign the entry
    offerPodiumName(kind, resultStats) {
        this.uiCtrl.hidePodiumForms();
        if (!resultStats || !resultStats.rank || resultStats.rank > 3) return;
        this.uiCtrl.showPodiumForm(kind, resultStats.rank, this.upgradeMgr.state.playerName || '', (name) => {
            const ok = this.upgradeMgr.setLeaderboardName(resultStats.entryId, name);
            if (ok) this.audioSynth.playUpgrade();
            return ok;
        });
    }

    // Main Engine rendering calls
    draw() {
        // Clear screen with custom trails persistence (motion blur during play, full 1.0 clear in menus)
        const opacityTrail = this.gameState === 'playing' ? 0.38 : 1.0;
        this.canvasCtrl.clear(opacityTrail);
        
        // Apply camera screen shake translations
        this.canvasCtrl.applyTransformations();
        
        // Draw one-way gate visual effects and lava barrier only when in active playing state!
        if (this.gameState === 'playing') {
            this.drawOneWayGates();
            this.drawLavaBarrier();
        }

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
            // Towers first so a car parked at its base is never hidden behind it
            this.drawTowers();
            this.player.draw(this.canvasCtrl.ctx, this.canvasCtrl);
            this.enemy.draw(this.canvasCtrl.ctx, this.canvasCtrl);
        }
        
        // Restore matrix
        this.canvasCtrl.restoreTransformations();

        // 6. Draw cinematic vignette around arena borders
        this.canvasCtrl.drawVignette();
        
        // UI Hud updates
        if (this.gameState === 'playing') {
            this.uiCtrl.updateHUD(this.player, this.enemy, this.isMultiplayer, this.isClient, this.matchTimer, this.currentScore, this.matchKills);
        }
    }

    drawLavaBarrier() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const centerY = h / 2;
        const lavaMinX = 80;
        const lavaMaxX = w - 80;
        const lavaWidth = lavaMaxX - lavaMinX;
        const halfThick = 25;
        const t = this.lavaTime;
        const flow = t * 55; // horizontal drift of the current, in px

        ctx.save();

        // 1. FLOOR GLOW: pulsing heat bands plus roaming hot spots cast on the stone
        const heatPulse = 1.0 + Math.sin(t * 3.5) * 0.12;
        const heatGradTop = ctx.createLinearGradient(0, centerY - halfThick - 60, 0, centerY - halfThick);
        heatGradTop.addColorStop(0, 'rgba(255, 60, 0, 0)');
        heatGradTop.addColorStop(1, `rgba(255, 80, 0, ${0.38 * heatPulse})`);
        ctx.fillStyle = heatGradTop;
        ctx.fillRect(lavaMinX - 14, centerY - halfThick - 60, lavaWidth + 28, 60);

        const heatGradBottom = ctx.createLinearGradient(0, centerY + halfThick, 0, centerY + halfThick + 60);
        heatGradBottom.addColorStop(0, `rgba(255, 80, 0, ${0.38 * heatPulse})`);
        heatGradBottom.addColorStop(1, 'rgba(255, 60, 0, 0)');
        ctx.fillStyle = heatGradBottom;
        ctx.fillRect(lavaMinX - 14, centerY + halfThick, lavaWidth + 28, 60);

        // 2. RIVER OUTLINE - two undulating shores (kept for the shoreline pass below)
        const steps = 48;
        const dx = lavaWidth / steps;
        const topShore = [];
        const bottomShore = [];
        for (let i = 0; i <= steps; i++) {
            const x = lavaMinX + i * dx;
            topShore.push([x, centerY - halfThick + Math.sin(x * 0.04 + t * 2.2) * 4.5 + Math.cos(x * 0.09 - t * 1.5) * 2.2]);
            bottomShore.push([x, centerY + halfThick + Math.sin(x * 0.045 - t * 2.0) * 4.5 + Math.cos(x * 0.07 + t * 1.7) * 2.2]);
        }
        const traceRiver = () => {
            ctx.beginPath();
            topShore.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            for (let i = steps; i >= 0; i--) ctx.lineTo(bottomShore[i][0], bottomShore[i][1]);
            ctx.closePath();
        };

        traceRiver();
        const riverGrad = ctx.createLinearGradient(0, centerY - halfThick, 0, centerY + halfThick);
        riverGrad.addColorStop(0, '#2a0300');
        riverGrad.addColorStop(0.15, '#8d0f00');
        riverGrad.addColorStop(0.5, '#ff5200');
        riverGrad.addColorStop(0.85, '#8d0f00');
        riverGrad.addColorStop(1, '#2a0300');
        ctx.fillStyle = riverGrad;
        this.canvasCtrl.setNeonGlow('#ff4000', 32);
        ctx.fill();
        this.canvasCtrl.resetNeonGlow();

        // 3. EVERYTHING BELOW IS CLIPPED TO THE RIVER
        ctx.save();
        traceRiver();
        ctx.clip();

        // 3a. Flowing current bands: dashed strokes whose dash offset scrolls with the flow
        const bandColors = ['rgba(255, 40, 0, 0.55)', 'rgba(255, 120, 0, 0.5)', 'rgba(255, 190, 40, 0.45)', 'rgba(255, 120, 0, 0.5)', 'rgba(255, 40, 0, 0.55)'];
        for (let k = 0; k < 5; k++) {
            const layerY = centerY + (k - 2) * 9.5;
            const speedMul = 0.7 + Math.abs(k - 2) * -0.15 + 0.3; // centre flows fastest
            ctx.strokeStyle = bandColors[k];
            ctx.lineWidth = 7;
            ctx.lineCap = 'round';
            ctx.setLineDash([22 + k * 6, 14 + k * 4]);
            ctx.lineDashOffset = -flow * speedMul - k * 17;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = lavaMinX + i * dx;
                const wave = Math.sin(x * 0.035 - t * 3.0 + k) * 4.0 + Math.sin(x * 0.09 + t * 1.3 - k) * 2.0;
                if (i === 0) ctx.moveTo(x, layerY + wave);
                else ctx.lineTo(x, layerY + wave);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);

        // 3b. Roaming incandescent hot spots (additive so they really burn)
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        this.lavaHotspots.forEach(hs => {
            const u = ((hs.u + t * hs.speed) % 1 + 1) % 1;
            const x = lavaMinX + u * lavaWidth;
            const y = centerY + Math.sin(t * 2.0 + hs.phase) * 9;
            const r = hs.size * (1 + 0.2 * Math.sin(t * 5 + hs.phase));
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, 'rgba(255, 255, 210, 0.75)');
            g.addColorStop(0.35, 'rgba(255, 200, 60, 0.45)');
            g.addColorStop(1, 'rgba(255, 90, 0, 0)');
            ctx.fillStyle = g;
            ctx.fillRect(x - r, y - r, r * 2, r * 2);
        });
        ctx.restore();

        // 3c. White-hot core veins
        ctx.strokeStyle = 'rgba(255, 250, 225, 0.9)';
        ctx.lineWidth = 2.0;
        ctx.shadowColor = '#ffffff';
        ctx.shadowBlur = 10;
        ctx.setLineDash([60, 40]);
        for (let v = 0; v < 2; v++) {
            ctx.lineDashOffset = -flow * (1.2 + v * 0.3) - v * 50;
            ctx.beginPath();
            for (let i = 0; i <= steps; i++) {
                const x = lavaMinX + i * dx;
                const wave = Math.sin(x * 0.06 + t * 4.0 + v * 2) * 3.5 + Math.cos(x * 0.12 - t * 3.2) * 2.0;
                const y = centerY + (v === 0 ? -4 : 5) + wave;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
            }
            ctx.stroke();
        }
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;

        // 3d. Drifting obsidian crust plates with a molten rim and glowing fractures
        this.lavaCrustPlates.forEach(plate => {
            const px = lavaMinX + plate.u * lavaWidth;
            ctx.save();
            ctx.translate(px, centerY + plate.yOffset);
            ctx.rotate(plate.angle);

            const body = () => {
                ctx.beginPath();
                plate.points.forEach((pt, idx) => {
                    const ppx = pt.x * (plate.width / 2);
                    const ppy = pt.y * (plate.height / 2);
                    if (idx === 0) ctx.moveTo(ppx, ppy);
                    else ctx.lineTo(ppx, ppy);
                });
                ctx.closePath();
            };

            // Molten rim glow around the cold rock
            ctx.shadowColor = '#ff6a00';
            ctx.shadowBlur = 14;
            ctx.fillStyle = '#120a0a';
            body();
            ctx.fill();
            ctx.shadowBlur = 0;

            // Rock body shading
            const rockGrad = ctx.createLinearGradient(-plate.width / 2, -plate.height / 2, plate.width / 2, plate.height / 2);
            rockGrad.addColorStop(0, '#2a1a18');
            rockGrad.addColorStop(1, '#0d0707');
            ctx.fillStyle = rockGrad;
            body();
            ctx.fill();
            ctx.strokeStyle = '#5a2412';
            ctx.lineWidth = 1.5;
            ctx.stroke();

            // Glowing fractures, pulsing
            const crackGlow = 0.6 + 0.4 * Math.sin(t * 6 + plate.u * 20);
            ctx.strokeStyle = `rgba(255, ${Math.round(110 + 60 * crackGlow)}, 0, ${0.7 + 0.3 * crackGlow})`;
            ctx.lineWidth = 1.3;
            ctx.shadowColor = '#ff5500';
            ctx.shadowBlur = 6 + 6 * crackGlow;
            ctx.beginPath();
            ctx.moveTo(-plate.width * 0.38, plate.height * 0.05);
            ctx.lineTo(-plate.width * 0.05, -plate.height * 0.2);
            ctx.lineTo(plate.width * 0.12, plate.height * 0.28);
            ctx.lineTo(plate.width * 0.36, -plate.height * 0.08);
            ctx.moveTo(-plate.width * 0.05, -plate.height * 0.2);
            ctx.lineTo(plate.width * 0.02, -plate.height * 0.45);
            ctx.stroke();

            ctx.restore();
        });

        // 3e. Swelling magma bubbles
        this.lavaBubbles.forEach(b => {
            ctx.save();
            const bubbleGrad = ctx.createRadialGradient(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.1, b.x, b.y, b.radius);
            bubbleGrad.addColorStop(0, '#ffffff');
            bubbleGrad.addColorStop(0.3, '#ffcc00');
            bubbleGrad.addColorStop(0.7, '#ff3300');
            bubbleGrad.addColorStop(1, '#660a00');
            ctx.fillStyle = bubbleGrad;
            ctx.shadowColor = '#ff6600';
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1.0;
            ctx.beginPath();
            ctx.arc(b.x - b.radius * 0.2, b.y - b.radius * 0.2, b.radius * 0.4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.restore();
        });

        ctx.restore(); // end river clip

        // 4. COOLED SHORELINE: dark crust lip with a searing seam just inside it
        const strokeShore = (pts) => {
            ctx.beginPath();
            pts.forEach(([x, y], i) => i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y));
            ctx.stroke();
        };
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#1a0806';
        ctx.lineWidth = 4;
        strokeShore(topShore);
        strokeShore(bottomShore);
        ctx.strokeStyle = `rgba(255, 150, 20, ${0.75 + 0.25 * Math.sin(t * 4)})`;
        ctx.lineWidth = 1.6;
        ctx.shadowColor = '#ff8a00';
        ctx.shadowBlur = 10;
        strokeShore(topShore.map(([x, y]) => [x, y + 3]));
        strokeShore(bottomShore.map(([x, y]) => [x, y - 3]));
        ctx.shadowBlur = 0;

        // 5. HEAT SHIMMER: faint rising streaks above and below the river
        for (let i = 0; i < 14; i++) {
            const u = ((i / 14) + t * 0.03 + Math.sin(i * 7.3) * 0.02) % 1;
            const x = lavaMinX + u * lavaWidth;
            const rise = ((t * 40 + i * 13) % 70);
            const alpha = 0.035 + 0.03 * Math.sin(t * 6 + i);
            const sw = 10 + (i % 3) * 6;
            const gTop = ctx.createLinearGradient(0, centerY - halfThick - rise, 0, centerY - halfThick - rise - 55);
            gTop.addColorStop(0, `rgba(255, 140, 20, ${alpha})`);
            gTop.addColorStop(1, 'rgba(255, 140, 20, 0)');
            ctx.fillStyle = gTop;
            ctx.fillRect(x - sw / 2, centerY - halfThick - rise - 55, sw, 55);
            const gBot = ctx.createLinearGradient(0, centerY + halfThick + rise, 0, centerY + halfThick + rise + 55);
            gBot.addColorStop(0, `rgba(255, 140, 20, ${alpha})`);
            gBot.addColorStop(1, 'rgba(255, 140, 20, 0)');
            ctx.fillStyle = gBot;
            ctx.fillRect(x + sw / 2, centerY + halfThick + rise, sw, 55);
        }

        ctx.restore();
    }

    drawOneWayGates() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const centerY = h / 2;
        
        ctx.save();
        
        // 1. LEFT PASSAGE (UPWARDS ONLY): Carved Stone Archway & Glowing Green Runes
        ctx.fillStyle = '#1c2026';
        ctx.strokeStyle = '#383f4c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(14, centerY - 6, 52, 12, 4);
        } else {
            ctx.rect(14, centerY - 6, 52, 12);
        }
        ctx.fill();
        ctx.stroke();

        // Carved directional stone glyph pointing UP
        this.canvasCtrl.setNeonGlow('var(--neon-green)', 16);
        ctx.fillStyle = '#39ff14';
        ctx.beginPath();
        ctx.moveTo(40, centerY - 16);
        ctx.lineTo(32, centerY - 5);
        ctx.lineTo(48, centerY - 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 2. RIGHT PASSAGE (DOWNWARDS ONLY): Carved Stone Archway & Glowing Crimson/Pink Runes
        ctx.fillStyle = '#1c2026';
        ctx.strokeStyle = '#383f4c';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(w - 66, centerY - 6, 52, 12, 4);
        } else {
            ctx.rect(w - 66, centerY - 6, 52, 12);
        }
        ctx.fill();
        ctx.stroke();

        // Carved directional stone glyph pointing DOWN
        this.canvasCtrl.setNeonGlow('var(--neon-pink)', 16);
        ctx.fillStyle = '#ff0077';
        ctx.beginPath();
        ctx.moveTo(w - 40, centerY + 16);
        ctx.lineTo(w - 48, centerY + 5);
        ctx.lineTo(w - 32, centerY + 5);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        ctx.restore();
    }

    drawTowers() {
        const ctx = this.canvasCtrl.ctx;
        const w = this.canvasCtrl.width;
        const h = this.canvasCtrl.height;
        const t = this.lavaTime;

        ctx.save();

        // Helper to render a majestic fortress citadel tower
        const renderGrandCitadel = (centerX, centerY, isTop, hp, maxHp, primaryColor, coreColor, isLeftOrRightSplit = false) => {
            ctx.save();
            const dir = isTop ? 1 : -1;
            const healthRatio = Math.max(0, hp / maxHp);
            const baseWidth = isLeftOrRightSplit ? 90 : 190;
            const halfW = baseWidth / 2;
            const citadelH = 80;

            // 1. AMBIENT RADIANT POWER GLOW (Backdrop lighting from reactor)
            const corePulse = 1.0 + Math.sin(t * 3.5 + (isTop ? 0 : 2.0)) * 0.15;
            const auraGrad = ctx.createRadialGradient(centerX, centerY + dir * 35, 10, centerX, centerY + dir * 35, 90);
            auraGrad.addColorStop(0, primaryColor.replace('rgb', 'rgba').replace(')', `, ${0.35 * corePulse})`));
            auraGrad.addColorStop(0.6, primaryColor.replace('rgb', 'rgba').replace(')', `, ${0.12 * corePulse})`));
            auraGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            ctx.fillStyle = auraGrad;
            ctx.fillRect(centerX - 110, isTop ? 0 : h - 110, 220, 110);

            // 2. MONUMENTAL BASALT FORTRESS CITADEL BODY
            // Main Outer Fortress Base
            ctx.fillStyle = '#14171d';
            ctx.strokeStyle = '#2d3542';
            ctx.lineWidth = 3;
            ctx.beginPath();
            if (isTop) {
                ctx.moveTo(centerX - halfW - 12, 0);
                ctx.lineTo(centerX + halfW + 12, 0);
                ctx.lineTo(centerX + halfW + 6, citadelH - 16);
                ctx.lineTo(centerX + halfW - 14, citadelH);
                ctx.lineTo(centerX - halfW + 14, citadelH);
                ctx.lineTo(centerX - halfW - 6, citadelH - 16);
            } else {
                ctx.moveTo(centerX - halfW - 12, h);
                ctx.lineTo(centerX + halfW + 12, h);
                ctx.lineTo(centerX + halfW + 6, h - citadelH + 16);
                ctx.lineTo(centerX + halfW - 14, h - citadelH);
                ctx.lineTo(centerX - halfW + 14, h - citadelH);
                ctx.lineTo(centerX - halfW - 6, h - citadelH + 16);
            }
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            // Chiseled Stone Bastion Blocks & Quoins
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
            ctx.lineWidth = 1.5;
            for (let step = 1; step <= 3; step++) {
                const yOff = isTop ? step * 20 : h - step * 20;
                ctx.beginPath();
                ctx.moveTo(centerX - halfW + 8, yOff);
                ctx.lineTo(centerX + halfW - 8, yOff);
                ctx.stroke();
            }

            // Flanking Watchtower Bastion Spires (Left & Right Conductor Pylons)
            const pylonW = 18;
            [-1, 1].forEach(side => {
                const px = centerX + side * (halfW - 8);
                ctx.fillStyle = '#1b1f28';
                ctx.strokeStyle = primaryColor;
                ctx.lineWidth = 2;
                this.canvasCtrl.setNeonGlow(primaryColor, 10);
                
                ctx.beginPath();
                if (isTop) {
                    ctx.rect(px - pylonW / 2, 0, pylonW, citadelH + 6);
                } else {
                    ctx.rect(px - pylonW / 2, h - citadelH - 6, pylonW, citadelH + 6);
                }
                ctx.fill();
                ctx.stroke();

                // Conductor Gem on Pylon Tip
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                const tipY = isTop ? citadelH + 6 : h - citadelH - 6;
                ctx.arc(px, tipY, 4.5, 0, Math.PI * 2);
                ctx.fill();
            });

            // 3. CEREMONIAL RUNIC CHARGING MATRIX (LADDA ZONE)
            const chargeCenterY = isTop ? 42 : h - 42;
            ctx.save();
            this.canvasCtrl.setNeonGlow(primaryColor, 18);
            
            // Outer Glowing Runic Circle
            ctx.strokeStyle = primaryColor;
            ctx.lineWidth = 2.0;
            ctx.beginPath();
            ctx.arc(centerX, chargeCenterY, 32, 0, Math.PI * 2);
            ctx.stroke();

            // Concentric Hexagonal Energy Flux Web
            ctx.lineWidth = 1.2;
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const ang = (i * Math.PI) / 3 + t * 0.8 * dir;
                const hx = centerX + Math.cos(ang) * 22;
                const hy = chargeCenterY + Math.sin(ang) * 22;
                if (i === 0) ctx.moveTo(hx, hy);
                else ctx.lineTo(hx, hy);
            }
            ctx.closePath();
            ctx.stroke();

            // Radial Power Conduits
            for (let i = 0; i < 4; i++) {
                const ang = (i * Math.PI) / 2 + t * 1.2 * dir;
                ctx.beginPath();
                ctx.moveTo(centerX + Math.cos(ang) * 8, chargeCenterY + Math.sin(ang) * 8);
                ctx.lineTo(centerX + Math.cos(ang) * 30, chargeCenterY + Math.sin(ang) * 30);
                ctx.stroke();
            }
            ctx.restore();

            // 4. FLOATING PLASMA / ARCANE REACTOR CORE
            ctx.save();
            const coreY = isTop ? 42 : h - 42;
            const coreSize = 14 * corePulse;
            
            // Dynamic Rotating Plasma Core Halo
            const coreGrad = ctx.createRadialGradient(centerX, coreY, 2, centerX, coreY, coreSize * 1.5);
            coreGrad.addColorStop(0, '#ffffff');
            coreGrad.addColorStop(0.4, coreColor);
            coreGrad.addColorStop(0.8, primaryColor);
            coreGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            ctx.fillStyle = coreGrad;
            this.canvasCtrl.setNeonGlow(coreColor, 25);
            ctx.beginPath();
            ctx.arc(centerX, coreY, coreSize * 1.5, 0, Math.PI * 2);
            ctx.fill();

            // Searing Diamond Core
            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.moveTo(centerX, coreY - coreSize * 0.7);
            ctx.lineTo(centerX + coreSize * 0.7, coreY);
            ctx.lineTo(centerX, coreY + coreSize * 0.7);
            ctx.lineTo(centerX - coreSize * 0.7, coreY);
            ctx.closePath();
            ctx.fill();

            // Electric Arcs crackling from the core
            if (Math.random() < 0.35) {
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 1.5;
                const arcAng = Math.random() * Math.PI * 2;
                const arcDist = 18 + Math.random() * 18;
                ctx.beginPath();
                ctx.moveTo(centerX, coreY);
                ctx.lineTo(centerX + Math.cos(arcAng) * (arcDist * 0.5) + (Math.random() - 0.5) * 8, coreY + Math.sin(arcAng) * (arcDist * 0.5) + (Math.random() - 0.5) * 8);
                ctx.lineTo(centerX + Math.cos(arcAng) * arcDist, coreY + Math.sin(arcAng) * arcDist);
                ctx.stroke();
            }
            ctx.restore();

            // 5. GRAND FORTRESS EMBEDDED HEALTH ARCH & CREST
            const barW = Math.min(130, baseWidth - 30);
            const barH = 7;
            const barX = centerX - barW / 2;
            const barY = isTop ? 72 : h - 79;

            // Bar Stone Housing
            ctx.fillStyle = '#0a0d12';
            ctx.strokeStyle = '#323a48';
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            ctx.rect(barX - 2, barY - 2, barW + 4, barH + 4);
            ctx.fill();
            ctx.stroke();

            // Glowing Power Fill
            const fillW = Math.max(0, barW * healthRatio);
            if (fillW > 0) {
                const barGrad = ctx.createLinearGradient(barX, 0, barX + fillW, 0);
                barGrad.addColorStop(0, primaryColor);
                barGrad.addColorStop(0.7, coreColor);
                barGrad.addColorStop(1, '#ffffff');
                ctx.fillStyle = barGrad;
                this.canvasCtrl.setNeonGlow(coreColor, 12);
                ctx.fillRect(barX, barY, fillW, barH);
            }

            ctx.restore();
        };

        // --- RENDER TOP CITADEL (Crimson Magma Fortress) ---
        const topPrimary = this.isHardBossRound ? 'rgb(220, 20, 60)' : 'rgb(255, 0, 119)';
        const topCore = this.isHardBossRound ? '#ff2200' : '#ff44aa';

        if (this.isHardBossRound) {
            renderGrandCitadel(120, 0, true, this.topTower.hp, this.topTower.maxHp, topPrimary, topCore, true);
            renderGrandCitadel(w - 120, 0, true, this.topTower.hp, this.topTower.maxHp, topPrimary, topCore, true);
        } else {
            renderGrandCitadel(w / 2, 0, true, this.topTower.hp, this.topTower.maxHp, topPrimary, topCore, false);
        }

        // --- RENDER BOTTOM CITADEL (Arcane Plasma Fortress) ---
        const botPrimary = 'rgb(0, 240, 255)';
        const botCore = '#aaffff';
        renderGrandCitadel(w / 2, h, false, this.bottomTower.hp, this.bottomTower.maxHp, botPrimary, botCore, false);

        // Damage ember emissions for damaged towers
        if (this.topTower.hp < this.topTower.maxHp * 0.75) {
            // Boss rounds have twin citadels at the corners instead of one in the middle
            const emberX = this.isHardBossRound ? (Math.random() < 0.5 ? 120 : w - 120) : w / 2;
            this.particles.spawnDamageEmbers(emberX + (Math.random() - 0.5) * (this.isHardBossRound ? 70 : 140), 50, '#ff0055');
        }
        if (this.bottomTower.hp < this.bottomTower.maxHp * 0.75) {
            this.particles.spawnDamageEmbers(w / 2 + (Math.random() - 0.5) * 140, h - 50, '#00f0ff');
        }

        ctx.restore();
    }

    // Main Engine rendering cycle loop (RAF)
    loop(timestamp) {
        if (!this.lastTime) this.lastTime = timestamp;
        let dt = timestamp - this.lastTime;
        this.lastTime = timestamp;
        
        if (dt > 100) dt = 100;

        // Gamepad input (no-op when none is connected)
        this.inputCtrl.pollGamepad(dt);
        if (this.inputCtrl.gamepadIndex !== null && this.gameState !== 'playing') {
            const vis = document.querySelector('.overlay-screen:not(.hidden)');
            const id = vis ? vis.id : null;
            if (id !== this.gpLastScreen) {
                this.gpLastScreen = id;
                this.gamepadMenuNav('focus');
            }
        }

        this.update(dt);
        this.draw();
        
        requestAnimationFrame((t) => this.loop(t));
    }
}

// Start game when page resources load
window.addEventListener('DOMContentLoaded', () => {
    window.game = new Game(); // exposed for debugging in the console
});

