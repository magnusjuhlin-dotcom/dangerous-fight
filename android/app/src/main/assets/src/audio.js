/* DANGEROUS FIGHT - PROCEDURAL CYBERPUNK SOUND EFFECTS SYNTHESIZER */
/* Uses the HTML5 Web Audio API to generate retro-futuristic sound effects procedurally. */

export class AudioSynth {
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
