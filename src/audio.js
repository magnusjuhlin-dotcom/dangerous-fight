/* DANGEROUS FIGHT - PROCEDURAL CYBERPUNK SOUND EFFECTS SYNTHESIZER */
/* Uses the HTML5 Web Audio API to generate retro-futuristic sound effects procedurally. */

export class AudioSynth {
    constructor() {
        this.ctx = null;
        this.enabled = true;

        // Chrome loads its (neural) voices asynchronously; ask early so they are
        // there by the first read-aloud instead of falling back to a robot voice.
        if ('speechSynthesis' in window) {
            window.speechSynthesis.getVoices();
            window.speechSynthesis.addEventListener?.('voiceschanged', () => window.speechSynthesis.getVoices());
        }
        
        this.musicPlaying = false;
        this.musicInterval = null;
        
        // Listeners to activate AudioContext on user interaction (touchend/click are safe mobile gestures)
        const unlock = () => {
            // resume, not just init: the recording preload has usually created
            // the context already, suspended, and only a tap can wake it
            this.resume();
            // The first tap may well be the read-aloud button: then the music
            // waits and starts when the narrator is done
            if (this.isReadingAloud()) { this._musicWasPlaying = true; this._startupDone = true; }
            // Browsers only allow sound after a tap: the startup line plays now
            // (it starts the music itself when it is done)
            else if (!this._startupDone) this.playStartupVoice();
            else if (!this._musicWasPlaying && !this._startupPlaying) this.startMusic();
            window.removeEventListener('click', unlock);
            window.removeEventListener('touchend', unlock);
        };
        window.addEventListener('click', unlock);
        window.addEventListener('touchend', unlock);
    }

    // Everything the game plays goes through one master limiter before the
    // speakers. Many sounds at once (a boss entrance, a 4v4 brawl) used to add
    // up past full scale and crackle; the limiter squeezes those peaks down
    // smoothly instead. The trailer also records from here.
    get out() {
        if (this._master && this._master.context === this.ctx) return this._effects;
        const limiter = this.ctx.createDynamicsCompressor();
        limiter.threshold.value = -4;
        limiter.knee.value = 3;
        limiter.ratio.value = 20;
        limiter.attack.value = 0.001;
        limiter.release.value = 0.15;
        const master = this.ctx.createGain();
        master.gain.value = 1;
        // a little headroom after the limiter: fast transients and audio
        // codecs overshoot slightly, and that must not clip either
        const trim = this.ctx.createGain();
        trim.gain.value = 0.85;
        master.connect(limiter);
        limiter.connect(trim);
        trim.connect(this.ctx.destination);
        // Effects (and voices) get their own volume on the way in; the music
        // bus has its own and joins the master directly (see musicOut)
        const effects = this.ctx.createGain();
        effects.gain.value = this.effectsVolume;
        effects.connect(master);
        this._master = master;
        this._effects = effects;
        this.masterOut = trim; // what reaches the speakers (for recording)
        return effects;
    }

    // Volumes from the settings screen, 0..1
    get musicVolume() { return this._musicVolume === undefined ? 0.8 : this._musicVolume; }
    get effectsVolume() { return this._effectsVolume === undefined ? 1 : this._effectsVolume; }
    setVolumes(music, effects) {
        this._musicVolume = music;
        this._effectsVolume = effects;
        if (this._musicBus && this._musicBus.context === this.ctx) this._musicBus.gain.value = music;
        if (this._effects && this._effects.context === this.ctx) this._effects.gain.value = effects;
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
        gain.connect(this.out);
        
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
        gain.connect(this.out);

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
            noiseGain.connect(this.out);
            
            noise.start(now);
            noise.stop(now + 0.2);
            
            osc.start(now);
            osc.stop(now + 0.2);
        } else if (type === 'blades' || type === 'oni') {
            // Heavy Truck launch rumble (the Oni Berserker is a heavy too)
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
        gain.connect(this.out);
        
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
        gain.connect(this.out);

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
        gain1.connect(this.out);

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
        mainGain.connect(this.out);

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
            gain.connect(this.out);
            
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
        noiseGain.connect(this.out);
        
        noise.start(now);
        noise.stop(now + 0.14);

        // 4. LOW IMPACT SUB PUNCH (Solid kinetic mass thud)
        const punchOsc = this.ctx.createOscillator();
        const punchGain = this.ctx.createGain();
        punchOsc.connect(punchGain);
        punchGain.connect(this.out);
        
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
        gain.connect(this.out);

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
        ringGain.connect(this.out);

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
        gain.connect(this.out);

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
        gain.connect(this.out);

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
        gain.connect(this.out);

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
        noiseGain.connect(this.out);

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
            gain.connect(this.out);
            
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
            gain.connect(this.out);
            
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
            gain.connect(this.out);
            
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
        if (this._reading) return true; // also covers a recording, which the engines do not know about
        if (window.AndroidTTS && window.AndroidTTS.isSpeaking) {
            try { return !!window.AndroidTTS.isSpeaking(); } catch (e) { return false; }
        }
        return ('speechSynthesis' in window) && window.speechSynthesis.speaking;
    }

    stopReadAloud() {
        this._reading = false;
        this._readFinish = null;
        if (this._musicWasPlaying) { this._musicWasPlaying = false; this.startMusic(); }
        if (window.AndroidTTS && window.AndroidTTS.stop) {
            try { window.AndroidTTS.stop(); } catch (e) {}
        }
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }
        if (this._readAloudPoll) { clearInterval(this._readAloudPoll); this._readAloudPoll = null; }
        this._readToken = (this._readToken || 0) + 1; // a recording still loading must not start
        if (this._voiceAudio) { this._voiceAudio.stop(); this._voiceAudio = null; }
    }

    // Recorded lines live in assets/voice/<key>.<ext> (see voice-studio.html).
    // A real person always sounds more real than any speech engine, so a
    // recording wins whenever one exists. Resolves to a player
    // ({ play(), stop(), onended }), or null when there is no recording.
    loadRecording(key) {
        this._recordingCache = this._recordingCache || {};
        if (!(key in this._recordingCache)) {
            this._recordingCache[key] = this.findRecording(key).then((found) => {
                if (!found) return null;
                // Decode it ourselves so the clipping can be repaired; if that is
                // not possible the plain file is still better than no recording
                return this.decodeRecording(found.data)
                    .then((buffer) => this.deepenVoice(this.repairClipping(buffer)))
                    .catch(() => ({ src: found.src }));
            });
        }
        return this._recordingCache[key].then((rec) => rec && this.makeRecordingPlayer(rec));
    }

    // Repairing and deepening a long recording takes a moment (seconds on a
    // phone), so do it for every line up front, one at a time, while the
    // player is still in the menus
    preloadRecordings(keys) {
        const next = (i) => {
            if (i >= keys.length) return;
            this.loadRecording(keys[i]).catch(() => {}).then(() => setTimeout(() => next(i + 1), 50));
        };
        setTimeout(() => next(0), 1500);
    }

    // Which file (if any) exists for this key, with its bytes. Plain XHR
    // rather than probing with an <audio> element: those never fire a single
    // event on browsers that do not preload media before a tap, which left the
    // reading hanging with the music paused. XHR (not fetch) because the
    // Android app runs from file://, where fetch is refused and a successful
    // load reports status 0.
    findRecording(key) {
        const exts = ['mp3', 'm4a', 'webm', 'ogg', 'wav'];
        return new Promise((resolve) => {
            const tryExt = (i) => {
                if (i >= exts.length) { resolve(null); return; }
                const src = `assets/voice/${key}.${exts[i]}`;
                const xhr = new XMLHttpRequest();
                xhr.open('GET', src);
                xhr.responseType = 'arraybuffer';
                xhr.timeout = 10000;
                xhr.onload = () => {
                    const ok = (xhr.status === 200 || xhr.status === 0) && xhr.response && xhr.response.byteLength > 0;
                    if (ok) resolve({ src, data: xhr.response }); else tryExt(i + 1);
                };
                xhr.onerror = xhr.ontimeout = () => tryExt(i + 1);
                try { xhr.send(); } catch (e) { tryExt(i + 1); }
            };
            tryExt(0);
        });
    }

    decodeRecording(data) {
        this.init();
        if (!this.ctx) return Promise.reject(new Error('no Web Audio'));
        // callback form: older Android WebViews have no promise version
        return new Promise((resolve, reject) => this.ctx.decodeAudioData(data, resolve, reject));
    }

    // Recordings made close to the mic hit full scale, and the mic cut the tops
    // of the waveform off flat. Those flat tops are the crackle. Rebuild each
    // one from the curve on either side of it, then round off the loudest
    // peaks softly so nothing is cut off again on the way out.
    repairClipping(buffer) {
        const T = 0.88;       // the flat tops sit at ~0.9-1.05 after decoding
        const MIN_RUN = 3;    // 1-2 samples up there are ordinary peaks
        const CTX = 4;        // samples on each side the curve is fitted to
        for (let c = 0; c < buffer.numberOfChannels; c++) {
            const x = buffer.getChannelData(c);
            const n = x.length;
            let i = 0;
            while (i < n) {
                if (Math.abs(x[i]) <= T) { i++; continue; }
                const sign = Math.sign(x[i]);
                let j = i;
                while (j < n && Math.abs(x[j]) > T && Math.sign(x[j]) === sign) j++;
                if (j - i >= MIN_RUN && i - CTX >= 0 && j + CTX <= n) {
                    // least-squares cubic through the good samples around the run
                    const ts = [], ys = [];
                    for (let k = i - CTX; k < i; k++) { ts.push(k - i); ys.push(x[k]); }
                    for (let k = j; k < j + CTX; k++) { ts.push(k - i); ys.push(x[k]); }
                    const coef = this.fitCubic(ts, ys);
                    if (coef) {
                        for (let k = i; k < j; k++) {
                            const t = k - i;
                            const y = coef[0] + t * (coef[1] + t * (coef[2] + t * coef[3]));
                            // clipping only ever removes height, and a wild fit must not blow up
                            if (Math.sign(y) === sign && Math.abs(y) > Math.abs(x[k])) {
                                x[k] = sign * Math.min(Math.abs(y), 2.2);
                            }
                        }
                    }
                }
                i = j;
            }
            // soft knee: untouched below 0.7, the rebuilt peaks rounded into 1.0
            for (let k = 0; k < n; k++) {
                const a = Math.abs(x[k]);
                if (a > 0.7) x[k] = Math.sign(x[k]) * (0.7 + 0.3 * Math.tanh((a - 0.7) / 0.3));
            }
        }
        return buffer;
    }

    // Solve the 4x4 normal equations for y = c0 + c1 t + c2 t^2 + c3 t^3
    fitCubic(ts, ys) {
        const A = [[0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]];
        for (let s = 0; s < ts.length; s++) {
            const p = [1, ts[s], ts[s] * ts[s], ts[s] * ts[s] * ts[s]];
            for (let r = 0; r < 4; r++) {
                for (let q = 0; q < 4; q++) A[r][q] += p[r] * p[q];
                A[r][4] += p[r] * ys[s];
            }
        }
        for (let col = 0; col < 4; col++) {
            let piv = col;
            for (let r = col + 1; r < 4; r++) if (Math.abs(A[r][col]) > Math.abs(A[piv][col])) piv = r;
            if (Math.abs(A[piv][col]) < 1e-12) return null;
            [A[col], A[piv]] = [A[piv], A[col]];
            for (let r = 0; r < 4; r++) {
                if (r === col) continue;
                const f = A[r][col] / A[col][col];
                for (let q = col; q < 5; q++) A[r][q] -= f * A[col][q];
            }
        }
        return [0, 1, 2, 3].map((r) => A[r][4] / A[r][r]);
    }

    // How many semitones darker the recorded voice is played
    get voiceShiftSemitones() { return -3; }

    // Lower the pitch without slowing the voice down: squeeze it shorter here
    // (WSOLA: overlap-add of short grains, each placed where its waveform
    // lines up with the last one so the joins do not warble), then play it
    // back slower by the same factor. Formants move down too, so it sounds
    // like a bigger person rather than a slowed-down tape.
    deepenVoice(buffer) {
        const factor = Math.pow(2, -this.voiceShiftSemitones / 12);
        const chans = buffer.numberOfChannels;
        const len = buffer.length;
        // shorter than one grain: nothing to stretch, play it as it is
        if (len < 4096) return { buffer, rate: 1 };
        // the recordings are mono in two channels, so work on one
        const x = new Float32Array(len);
        for (let c = 0; c < chans; c++) {
            const d = buffer.getChannelData(c);
            for (let k = 0; k < len; k++) x[k] += d[k] / chans;
        }
        const N = 1024, HS = N / 2, TOL = 256, CORR = 256;
        const win = new Float32Array(N);
        for (let k = 0; k < N; k++) win[k] = 0.5 - 0.5 * Math.cos(2 * Math.PI * k / N);
        const outLen = Math.ceil(len / factor);
        const y = new Float32Array(outLen + N);
        const wsum = new Float32Array(outLen + N);
        let prev = -1;
        for (let out = 0; out < outLen; out += HS) {
            const nominal = Math.round(out * factor);
            let pos = nominal;
            if (prev >= 0) {
                // the grain that would continue the previous one seamlessly
                const natural = prev + HS;
                let best = -Infinity;
                for (let d = -TOL; d <= TOL; d += 2) {
                    const cand = nominal + d;
                    if (cand < 0 || cand + N > len || natural + CORR > len) continue;
                    let corr = 0;
                    for (let k = 0; k < CORR; k += 2) corr += x[natural + k] * x[cand + k];
                    if (corr > best) { best = corr; pos = cand; }
                }
            }
            pos = Math.max(0, Math.min(len - N, pos));
            for (let k = 0; k < N; k++) {
                y[out + k] += x[pos + k] * win[k];
                wsum[out + k] += win[k];
            }
            prev = pos;
        }
        const outBuf = this.ctx.createBuffer(1, outLen, buffer.sampleRate);
        const o = outBuf.getChannelData(0);
        for (let k = 0; k < outLen; k++) o[k] = wsum[k] > 1e-3 ? y[k] / wsum[k] : 0;
        return { buffer: outBuf, rate: 1 / factor };
    }

    // A short, dark room: exponentially decaying noise with the highs
    // dying away faster than the lows
    voiceReverb() {
        if (this._voiceIR) return this._voiceIR;
        const ctx = this.ctx;
        const sr = ctx.sampleRate;
        const n = Math.floor(sr * 0.7);
        const ir = ctx.createBuffer(2, n, sr);
        for (let c = 0; c < 2; c++) {
            const d = ir.getChannelData(c);
            let lp = 0;
            for (let k = 0; k < n; k++) {
                const t = k / sr;
                const cutoff = 0.5 * Math.exp(-t * 6); // darker as it fades
                lp += cutoff * ((Math.random() * 2 - 1) - lp);
                d[k] = lp * Math.exp(-t * 5.5);
            }
        }
        this._voiceIR = ir;
        return ir;
    }

    // Plays a repaired, deepened buffer through a trailer-voice chain: more
    // chest, the harsh top taken down, compressed so every word hits hard,
    // and a little arena echo. The plain file is the fallback.
    makeRecordingPlayer(rec) {
        const player = { onended: null, stop() {}, play() { return Promise.resolve(); } };
        if (rec.buffer && this.ctx) {
            let srcNode = null;
            let stopped = false;
            player.play = () => { stopped = false; return this.resume().then(() => {
                if (stopped) return; // stopped while the context was still waking up
                const ctx = this.ctx;
                srcNode = ctx.createBufferSource();
                srcNode.buffer = rec.buffer;
                srcNode.playbackRate.value = rec.rate || 1;
                const low = ctx.createBiquadFilter();
                low.type = 'lowshelf'; low.frequency.value = 140; low.gain.value = 5;
                const mud = ctx.createBiquadFilter(); // keep the boost from turning boomy
                mud.type = 'peaking'; mud.frequency.value = 400; mud.Q.value = 1; mud.gain.value = -2;
                const high = ctx.createBiquadFilter();
                high.type = 'highshelf'; high.frequency.value = 6000; high.gain.value = -5;
                const comp = ctx.createDynamicsCompressor();
                comp.threshold.value = -22; comp.knee.value = 8; comp.ratio.value = 4;
                comp.attack.value = 0.004; comp.release.value = 0.15;
                const dry = ctx.createGain();
                dry.gain.value = 1.15; // make-up for the compression
                const verb = ctx.createConvolver();
                verb.buffer = this.voiceReverb();
                const wet = ctx.createGain();
                wet.gain.value = 0.16;
                srcNode.connect(low); low.connect(mud); mud.connect(high); high.connect(comp);
                comp.connect(dry); dry.connect(this.out);
                comp.connect(verb); verb.connect(wet); wet.connect(this.out);
                srcNode.onended = () => { srcNode = null; if (player.onended) player.onended(); };
                srcNode.start();
            }); };
            player.stop = () => {
                stopped = true;
                if (!srcNode) return;
                const node = srcNode;
                srcNode = null;
                node.onended = null;
                try { node.stop(); } catch (e) {}
            };
        } else {
            const audio = new Audio(rec.src);
            audio.volume = 0.6; // unrepaired, so keep the loudest words under full scale
            audio.onended = () => { if (player.onended) player.onended(); };
            audio.onerror = audio.onended;
            player.play = () => audio.play();
            player.stop = () => { audio.onended = audio.onerror = null; audio.pause(); };
        }
        return player;
    }

    // Rewrite on-screen text into something a speech engine reads like a person.
    // The menus are all-caps and full of shorthand, which engines either shout
    // or spell out letter by letter - that is what makes it sound synthetic.
    humanizeForSpeech(text) {
        const abbrev = {
            HP: 'liv', VS: 'mot', XP: 'erfarenhet', AI: 'datorn', CPU: 'datorn',
            OK: 'okej', NR: 'nummer', KO: 'utslagen', MVP: 'bästa spelare',
            WASD: 'tangentbordet', RT: 'höger avtryckare', LT: 'vänster avtryckare',
            PX: 'pixlar', SEK: 'sekunder'
        };
        // A Swedish engine mangles the English words in the menus, so feed it a
        // Swedish spelling of how the word should actually sound (or the Swedish
        // word outright when there is a good one).
        const pronounce = {
            dangerous: 'dejndsjörös', fight: 'fajt', slingshot: 'slingsjott',
            cyber: 'sajber', credits: 'kredits', credit: 'kredit', online: 'onlajn',
            boss: 'båss', kills: 'besegrade', slash: 'släsch', shogun: 'sjågun',
            armored: 'armerad', samurai: 'samuraj', perk: 'pörk', hack: 'hack',
            dash: 'däsch', dasha: 'däscha', dashar: 'däschar', dashen: 'däschen',
            xbox: 'eksboks', respawnar: 'återuppstår', respawn: 'återuppstånd',
            highscore: 'hajskor', score: 'skorr', level: 'nivå', power: 'pauer'
        };
        let s = (text || '');
        // 1 200 -> 1200, so it is read as one number instead of "one. two hundred"
        s = s.replace(/(\d)[\s ](\d{3})\b/g, '$1$2');
        // "1 2 3 4" (a room code) must not be dictated character by character
        s = s.replace(/\b(?:\d\s+){2,}\d\b/g, (m) => m.replace(/\s+/g, ''));
        // say the loan words the way they are meant to sound
        s = s.replace(/[A-Za-z\u00c5\u00c4\u00d6\u00e5\u00e4\u00f6]+/g, (w) => {
            const hit = pronounce[w.toLowerCase()];
            return hit === undefined ? w : hit;
        });
        // ALL-CAPS words -> ordinary words. Lower case, not Title Case: a
        // capitalised word makes the engine read it as a name, one word at a time.
        s = s.replace(/\b[A-ZÅÄÖ][A-ZÅÄÖ]+\b/g, (w) => abbrev[w] || w.toLowerCase());
        // symbols the engine would skip or spell out
        s = s.replace(/(\d)\s*v\s*(\d)/gi, '$1 mot $2'); // 2v2 -> 2 mot 2
        s = s.replace(/(\d)\s*%/g, '$1 procent');
        s = s.replace(/(\d+)\s*\/\s*(\d+)/g, '$1 av $2');
        s = s.replace(/(\d)\s*[x×]\s*(?=[^ ])/gi, '$1 gånger ');
        // "X / RT" is a choice, not the word "slash"
        s = s.replace(/\s\/\s/g, ' eller ');
        // a lone dash is a pause, not a word
        s = s.replace(/\s[-–—]\s/g, ', ');
        s = s.replace(/\s+([.,!?:])/g, '$1');
        s = s.replace(/\s+/g, ' ').trim();

        // Menu labels are single words. Read one per sentence and it turns into
        // dictation, so chain the short ones into a flowing list and keep full
        // stops for the parts that really are sentences.
        const out = [];
        s.split(/(?<=[.!?:])\s+/).forEach((frag) => {
            const piece = frag.replace(/[.,]+$/, '').trim();
            if (!piece) return;
            const last = out.length ? out[out.length - 1] : null;
            if (last !== null && !/[!?]$/.test(last) && piece.length < 30 && last.length < 150 && !/[!?]$/.test(piece)) {
                // after a colon the next part is the value, so no comma in between
                out[out.length - 1] = last + (/:$/.test(last) ? ' ' : ', ') + piece;
            } else {
                out.push(piece);
            }
        });
        return out
            .map((sent) => {
                const t = sent.charAt(0).toUpperCase() + sent.slice(1);
                return /[.!?]$/.test(t) ? t : t + '.';
            })
            .join(' ');
    }

    // Pick the most human-sounding voice for a language. The neural voices
    // ("Natural"/"Online" in Edge, "Google" in Chrome) are recorded people;
    // the old desktop voices are concatenated diphones and sound like robots.
    // For the dark bass sound it also has to be a male voice:
    // male neural > unknown neural > male old > female.
    pickHumanVoice(lang) {
        const voices = window.speechSynthesis.getVoices()
            .filter(v => v.lang && v.lang.toLowerCase().startsWith(lang));
        const neural = v => /natural|online|neural|premium|enhanced|google/i.test(v.name);
        const female = v => /female|kvinna|sofie|hillevi|alva|klara|zira|aria|jenny|samantha/i.test(v.name);
        const male = v => /\bmale|\bman\b|oskar|erik|magnus|per\b|mattias|sven|bengt|klaus|guy|davis|andrew|brian|christopher|eric|roger|steffan|david/i.test(v.name)
            && !female(v);
        const score = v => female(v) ? 0 : (male(v) && neural(v)) ? 4 : neural(v) ? 3 : male(v) ? 2 : 1;
        return voices.sort((a, b) => score(b) - score(a))[0] || null;
    }

    // Speak `text` in Swedish; onEnd fires when done (not after
    // stopReadAloud, whose caller cleans up itself). With a
    // `recordingKey` a recorded voice file for that screen is played instead
    // when there is one.
    readAloud(text, onEnd = null, recordingKey = null) {
        this.stopReadAloud();
        // The screen recordings are in Swedish: in English the voice reads the text
        if (window.gameLang === 'en') recordingKey = null;
        const clean = (text || '').trim();
        if (!clean && !recordingKey) { if (onEnd) onEnd(); return false; }

        // Pause the music so the narrator is not fighting the soundtrack
        // (remembered after stopMusic, which forgets it). The startup line
        // counts as playing: it leaves the music to a reading that is on.
        const wasPlaying = this.musicPlaying || !!this._startupPlaying;
        this._reading = true;
        if (wasPlaying) this.stopMusic();
        this._musicWasPlaying = wasPlaying;
        const token = this._readToken;
        const finish = () => {
            // once only, and never for a reading that was stopped or replaced:
            // that would bring the music back over the new narrator
            if (token !== this._readToken || this._readFinish !== finish) return;
            this._readFinish = null;
            this._reading = false;
            if (this._musicWasPlaying) { this._musicWasPlaying = false; this.startMusic(); }
            if (onEnd) onEnd();
        };
        this._readFinish = finish;

        if (recordingKey) {
            this.loadRecording(recordingKey).then((audio) => {
                if (token !== this._readToken) return; // stopped while loading
                if (!audio) {
                    // speakTTS calls finish itself, also when it cannot speak
                    if (clean) this.speakTTS(clean, finish); else finish();
                    return;
                }
                this._voiceAudio = audio;
                audio.onended = () => { if (this._voiceAudio === audio) this._voiceAudio = null; finish(); };
                audio.play().catch(audio.onended);
            });
            return true;
        }
        return this.speakTTS(clean, finish);
    }

    // The speech-engine fallback for readAloud
    speakTTS(clean, finish) {
        // (the Swedish rewrite would mangle English: only tidy the symbols)
        const english = window.gameLang === 'en';
        const spoken = english
            ? clean.replace(/\s\/\s/g, ' or ').replace(/(\d)\s*%/g, '$1 percent').replace(/\s+/g, ' ').trim()
            : this.humanizeForSpeech(clean);
        const lang = english ? 'en-US' : 'sv-SE';

        if (window.AndroidTTS && window.AndroidTTS.speakText) {
            try {
                // Dark but human: a male neural voice (picked natively) lowered to
                // 0.85, the floor before the formants smear into a robot, and a
                // calmer pace. The native side clamps the pitch to that floor.
                window.AndroidTTS.speakText(spoken, lang, 0.85, 0.93);
            } catch (e) {
                // finish() also brings back the music paused above
                finish();
                return false;
            }
            // The native side has no callback into the page: poll until it goes quiet
            let armed = false;
            const onEndNative = finish;
            let quiet = 0;
            const poll = setInterval(() => {
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
            this._readAloudPoll = poll;
            // Safety: if it never started (missing language etc.), give up after 3 s.
            // Only for this reading: a newer one has its own poll and must not be cut off.
            setTimeout(() => {
                if (this._readAloudPoll === poll && !armed) {
                    clearInterval(this._readAloudPoll);
                    this._readAloudPoll = null;
                    finish();
                }
            }, 3000);
            return true;
        }

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(spoken);
            utterance.lang = lang;
            // Dark but human: 0.85 is as low as the pitch goes before the voice
            // smears into a robot, and a calmer pace makes it sound deeper still
            utterance.pitch = 0.85;
            utterance.rate = 0.93;
            const sv = this.pickHumanVoice(english ? 'en' : 'sv');
            if (sv) utterance.voice = sv;
            utterance.volume = 1.0; // as loud as the platform allows
            utterance.onend = () => finish();
            utterance.onerror = () => finish();
            // Chrome loses onend when nothing holds on to the utterance, and
            // the music would then never come back
            this._utterance = utterance;
            window.speechSynthesis.speak(utterance);
            return true;
        }

        finish();
        return false;
    }

    playVoiceIntro(isHardBoss = false) {
        // Play an epic sub-bass drop to enhance the bass experience!
        this.playVoiceSubBassDrop();

        // The fight is on: a narrator still reading a menu ends here instead of
        // talking over the intro (as the speech engine's cancel does anyway)
        if (this._readFinish) { this._readFinish(); this.stopReadAloud(); }

        if (this.voiceOn === false) return;
        // A recorded intro beats the speech engine
        this.loadRecording(isHardBoss ? 'intro-boss' : 'intro').then((audio) => {
            if (audio) {
                audio.play().catch(() => this.speakIntroTTS(isHardBoss));
            } else {
                this.speakIntroTTS(isHardBoss);
            }
        });
    }

    // "AJ Sports - to the game!" once when the game starts, in the recorded
    // voice (assets/voice/startup.*) or the English intro voice until there is
    // one. The music starts when it is done.
    playStartupVoice() {
        if (this._startupDone) return;
        this._startupDone = true;
        if (this.voiceOn === false) {
            if (!this._reading) this.startMusic();
            return;
        }
        this._startupPlaying = true;
        const done = () => {
            if (!this._startupPlaying) return;
            this._startupPlaying = false;
            // (not isReadingAloud: the engine may still be saying the line itself)
            if (!this._reading) this.startMusic();
        };
        const speak = () => {
            this.speakIntroTTS(false, 'A J Sports. To the game!');
            // Music once the engine has said it. Right after launch the engine
            // may need a moment to start, so wait for it to begin and finish.
            let started = false;
            let quiet = 0;
            const t0 = Date.now();
            const poll = setInterval(() => {
                let talking = false;
                try {
                    talking = window.AndroidTTS ? !!window.AndroidTTS.isSpeaking() : window.speechSynthesis.speaking;
                } catch (e) {}
                if (talking) { started = true; quiet = 0; }
                else if (started) quiet++;
                // the engine reports idle for a moment mid-line: wait for a real pause
                if (quiet >= 4 || Date.now() - t0 > 15000) {
                    clearInterval(poll);
                    done();
                }
            }, 200);
        };
        this.playVoiceSubBassDrop();
        this.loadRecording('startup').then((player) => {
            if (!player) { speak(); return; }
            player.onended = done;
            player.play().catch(speak);
        });
    }

    // The "AJ Sports - to the game!" line on demand (the trailer's title card)
    sayTitleLine() {
        if (this.voiceOn === false) return;
        const tts = () => this.speakIntroTTS(false, 'A J Sports. To the game!');
        this.loadRecording('startup').then((player) => {
            if (player) player.play().catch(tts);
            else tts();
        });
    }

    // Android plays sound without a tap: say the startup line as soon as the
    // game is up. In a browser this waits for the first tap (see unlock).
    tryStartupVoice() {
        this.resume().then(() => {
            if (this.ctx && this.ctx.state === 'running') this.playStartupVoice();
        });
    }

    speakIntroTTS(isHardBoss, line = null) {
        try {
            const text = line || (isHardBoss ? "Warning. Boss fight is coming." : "Dangerous fight is coming");
            if (window.AndroidTTS) {
                window.AndroidTTS.speak(text);
            } else if ('speechSynthesis' in window) {
                // Cancel any ongoing speech
                window.speechSynthesis.cancel();

                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                // A little lower and slower for the build-up, but not so far
                // that the voice stops sounding like a person
                utterance.pitch = 0.85;
                utterance.rate = 0.9;

                const maleVoice = this.pickHumanVoice('en');

                if (maleVoice) {
                    utterance.voice = maleVoice;
                }
                
                window.speechSynthesis.speak(utterance);
            }
        } catch (e) {
            console.warn("Failed to play SpeechSynthesis announcement:", e);
        }
    }

    // A deep temple gong over a taiko hit: the samurai rage, and the Shogun
    // going berserk. Inharmonic partials are what make a gong sound like metal.
    playGong() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        const ctx = this.ctx;
        const now = ctx.currentTime;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, now);
        g.gain.linearRampToValueAtTime(0.32, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.001, now + 3.2);
        g.connect(this.out);
        [[70, 1], [70 * 1.47, 0.35], [70 * 2.76, 0.5], [70 * 5.4, 0.22]].forEach(([f, amp]) => {
            const o = ctx.createOscillator();
            const og = ctx.createGain();
            o.type = 'sine';
            o.frequency.setValueAtTime(f * 1.03, now); // the strike bends the pitch for a moment
            o.frequency.exponentialRampToValueAtTime(f, now + 0.4);
            og.gain.value = amp;
            o.connect(og);
            og.connect(g);
            o.start(now);
            o.stop(now + 3.3);
        });
        this.playTaiko(now);
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
        subGain.connect(this.out);
        
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
        warmGain.connect(this.out);
        
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

    // Fight music: dark samurai metal at 130 BPM, tuned down to low F#.
    // A shakuhachi (bamboo flute) sings a slow line on the Japanese In scale
    // (its flat second is what makes it sound both Japanese and dark), a
    // shamisen plucks underneath and a taiko ensemble drives the rhythm.
    // Below that: a grinding minor choir, low distorted guitars chugging
    // F# - F# - G - C/G, a temple bell and a trailer "braaam" on every loop.
    get musicStepTime() { return 60 / 130 / 4; } // one 16th note

    startMusic() {
        this.resume();
        if (!this.enabled || !this.ctx) return;
        if (this.musicPlaying) return;
        this.musicPlaying = true;

        this.musicStep = 0;
        this.nextNoteTime = this.ctx.currentTime + 0.05;

        const scheduler = () => {
            if (!this.musicPlaying) return;

            // Catch up if nextNoteTime fell behind due to initial load delay or tab-suspension
            if (this.nextNoteTime < this.ctx.currentTime) {
                this.nextNoteTime = this.ctx.currentTime;
            }

            // Schedule notes ahead of time
            while (this.nextNoteTime < this.ctx.currentTime + 0.12) {
                this.scheduleMelodyStep(this.musicStep, this.nextNoteTime);
                this.nextNoteTime += this.musicStepTime;
                this.musicStep = (this.musicStep + 1) % 64;
            }
            this.musicInterval = setTimeout(scheduler, 40);
        };
        scheduler();
    }

    // Stop background music loop
    stopMusic() {
        this.musicPlaying = false;
        // stopped for real (match over): the end of a reading must not bring it back
        this._musicWasPlaying = false;
        if (this.musicInterval) {
            clearTimeout(this.musicInterval);
            this.musicInterval = null;
        }
    }

    // All music goes through one bus: a compressor glues the drums and bass
    // together and gives the track its punch without drowning the effects
    musicOut() {
        if (this._musicBus && this._musicBus.context === this.ctx) return this._musicBus;
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -18; comp.knee.value = 6; comp.ratio.value = 4;
        comp.attack.value = 0.003; comp.release.value = 0.12;
        // Dark master tone: the top end rolled off so nothing sounds bright
        const dark = this.ctx.createBiquadFilter();
        dark.type = 'highshelf'; dark.frequency.value = 2500; dark.gain.value = -10;
        const muffle = this.ctx.createBiquadFilter();
        muffle.type = 'lowpass'; muffle.frequency.value = 5500;
        const bus = this.ctx.createGain();
        bus.gain.value = this.musicVolume;
        bus.connect(dark);
        dark.connect(muffle);
        muffle.connect(comp);
        this.out; // make sure the master exists
        comp.connect(this._master);
        this._musicBus = bus;
        return bus;
    }

    noiseBuffer() {
        if (this._noise) return this._noise;
        const n = Math.floor(this.ctx.sampleRate * 0.5);
        const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
        const d = buf.getChannelData(0);
        for (let k = 0; k < n; k++) d[k] = Math.random() * 2 - 1;
        this._noise = buf;
        return buf;
    }

    scheduleMelodyStep(step, time) {
        const bar = Math.floor(step / 16);
        const s = step % 16;
        // Everything is written in B and played five semitones down, in F#
        const k = Math.pow(2, -5 / 12);
        const B = 61.74 * k, C = 65.41 * k, F = 87.31 * k;

        // Riff: A = open accent chord, m = palm-muted chug, . = rest
        const riffs = [
            'A.mmm.mmA.mmmmmm',
            'A.mmm.mmA.mmA.mm',
            'A.mmm.mmA.mmmmmm',
            'A.mmA.mmA.mmmmmm'
        ];
        const root = bar === 2 ? C : bar === 3 ? (s < 8 ? F : C) : B;
        const hit = riffs[bar][s];
        if (hit === 'A') this.playChug(root, time, true);
        else if (hit === 'm') this.playChug(B, time, false); // chugs stay on the lowest string

        // Bass doubles every guitar hit
        if (hit !== '.') this.playBassPulse(hit === 'A' ? root : B, time, this.musicStepTime * (hit === 'A' ? 1.9 : 0.9));

        // Braaam: the whole loop opens with a huge, dark trailer hit
        if (step === 0) this.playBraam(B, time, this.musicStepTime * 24);

        // Choir pad: minor with a grinding semitone, then the tritone
        if (s === 0) {
            const pads = [
                [123.47, 130.81, 146.83, 185.00],
                [123.47, 130.81, 146.83, 185.00],
                [130.81, 155.56, 196.00],
                [87.31, 123.47, 174.61]
            ];
            this.playPad(pads[bar].map((f) => f * k), time, this.musicStepTime * 16);
        }

        // Shakuhachi: long breathy notes on the In scale (B C E F# G)
        const flute = {
            0: [369.99, 6], 6: [392.00, 2], 8: [369.99, 4], 12: [329.63, 4],
            16: [261.63, 8], 24: [246.94, 8],
            32: [493.88, 6], 38: [523.25, 2], 40: [493.88, 4], 44: [392.00, 4],
            48: [369.99, 4], 52: [392.00, 4], 56: [261.63, 8]
        };
        if (flute[step]) this.playShakuhachi(flute[step][0] * k, time, this.musicStepTime * flute[step][1]);

        // Shamisen: plucked 8ths on the scale, walking with the harmony
        const pluck = [
            [123.47, 185.00, 246.94, 185.00, 261.63, 246.94, 185.00, 164.81],
            [123.47, 185.00, 246.94, 185.00, 196.00, 185.00, 164.81, 130.81],
            [130.81, 196.00, 261.63, 196.00, 246.94, 196.00, 164.81, 130.81],
            [174.61, 246.94, 174.61, 246.94, 130.81, 196.00, 261.63, 196.00]
        ];
        if (s % 2 === 0) this.playShamisen(pluck[bar][s / 2] * k, time, s % 8 === 0);

        // Temple bell once a loop
        if (step === 0) this.playBell(369.99 * k, time);

        // Kick: on the beat, doubling the gallop in the second half
        if (s % 4 === 0 || (bar >= 2 && hit === 'm')) this.playKick(time, s % 4 === 0 ? 1 : 0.7);

        // Half-time snare all the way: once a bar feels twice as heavy
        if (s === 8) this.playSnare(time, 1.3);
        if (bar === 3 && (s === 14 || s === 15)) this.playSnare(time, 0.8);

        // Crash on every bar, no hats: they only brighten it up
        if (s === 0) this.playCrash(time, bar === 0 ? 1 : 0.6);

        // Taiko ensemble: the big odaiko on a syncopated pattern, the small
        // shime-daiko ticking in between, and a roll into the next loop
        if (s === 0 || s === 7 || s === 10) this.playTaiko(time);
        if (bar === 3 && s >= 8 && (s % 2 === 0 || s >= 12)) this.playTaiko(time);
        else if (s % 4 === 2 || s === 15) this.playShime(time);
    }

    // Synthesize a heavy, deep Japanese taiko drum boom
    playTaiko(time) {
        if (!this.ctx) return;
        
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.connect(gain);
        gain.connect(this.musicOut());
        
        osc.type = 'sine';
        osc.frequency.setValueAtTime(130, time);
        osc.frequency.exponentialRampToValueAtTime(50, time + 0.15);
        
        gain.gain.setValueAtTime(0, time);
        gain.gain.linearRampToValueAtTime(0.24, time + 0.005);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.32);
        
        osc.start(time);
        osc.stop(time + 0.35);
    }

    // Punchy kick: a fast pitch drop plus a short click for the attack
    playKick(time, level = 1) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(150, time);
        osc.frequency.exponentialRampToValueAtTime(45, time + 0.12);
        gain.gain.setValueAtTime(0.5 * level, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
        osc.connect(gain);
        gain.connect(this.musicOut());
        osc.start(time);
        osc.stop(time + 0.3);
    }

    // Snare: a band of noise for the rattle and a tone for the body
    playSnare(time, level = 1) {
        const ctx = this.ctx;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer();
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 1200;
        const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.28 * level, time);
        ng.gain.exponentialRampToValueAtTime(0.001, time + 0.16);
        noise.connect(hp); hp.connect(ng); ng.connect(this.musicOut());
        noise.start(time);
        noise.stop(time + 0.18);

        const body = ctx.createOscillator();
        const bg = ctx.createGain();
        body.type = 'triangle';
        body.frequency.setValueAtTime(220, time);
        body.frequency.exponentialRampToValueAtTime(140, time + 0.08);
        bg.gain.setValueAtTime(0.16 * level, time);
        bg.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
        body.connect(bg); bg.connect(this.musicOut());
        body.start(time);
        body.stop(time + 0.12);
    }

    // Growling bass: two detuned saws through a lowpass that snaps shut
    playBassPulse(freq, time, dur) {
        const ctx = this.ctx;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = 6;
        lp.frequency.setValueAtTime(900, time);
        lp.frequency.exponentialRampToValueAtTime(160, time + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.13, time + 0.005);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        lp.connect(g); g.connect(this.musicOut());
        [-6, 6].forEach((cents) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = freq;
            osc.detune.value = cents;
            osc.connect(lp);
            osc.start(time);
            osc.stop(time + dur + 0.02);
        });
    }

    // Guitar-amp distortion curve (soft clip, very hot), built once
    distortionCurve() {
        if (this._distCurve) return this._distCurve;
        const n = 2048, k = 60;
        const curve = new Float32Array(n);
        for (let i = 0; i < n; i++) {
            const x = (i / (n - 1)) * 2 - 1;
            curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
        }
        this._distCurve = curve;
        return curve;
    }

    // Distorted power chord (root, fifth, octave) through an amp and a
    // speaker cabinet. Palm mutes are short and dark; accents ring out bright.
    playChug(root, time, accent) {
        const ctx = this.ctx;
        const dur = accent ? this.musicStepTime * 1.9 : this.musicStepTime * 0.8;
        const pre = ctx.createGain();
        pre.gain.value = 0.5;
        const amp = ctx.createWaveShaper();
        amp.curve = this.distortionCurve();
        amp.oversample = '2x'; // 4x doubles the cost for little audible gain; phones need the headroom
        const lowCut = ctx.createBiquadFilter();
        lowCut.type = 'highpass'; lowCut.frequency.value = 70;
        const cab = ctx.createBiquadFilter();
        cab.type = 'lowpass'; cab.Q.value = 0.9;
        cab.frequency.setValueAtTime(accent ? 2600 : 950, time);
        const out = ctx.createGain();
        out.gain.setValueAtTime(0.0001, time);
        out.gain.linearRampToValueAtTime(accent ? 0.075 : 0.06, time + 0.003);
        out.gain.setValueAtTime(accent ? 0.075 : 0.06, time + dur * 0.6);
        out.gain.exponentialRampToValueAtTime(0.001, time + dur);
        pre.connect(amp); amp.connect(lowCut); lowCut.connect(cab); cab.connect(out); out.connect(this.musicOut());
        [[root, -8], [root * 1.5, 6], [root * 2, 4]].forEach(([f, cents]) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            osc.detune.value = cents;
            osc.connect(pre);
            osc.start(time);
            osc.stop(time + dur + 0.02);
        });
    }

    // Crash cymbal: a long wash of bright noise
    playCrash(time, level = 1) {
        const ctx = this.ctx;
        const noise = ctx.createBufferSource();
        noise.buffer = this.noiseBuffer();
        noise.loop = true;
        const hp = ctx.createBiquadFilter();
        hp.type = 'highpass'; hp.frequency.value = 5000;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12 * level, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 1.1);
        noise.connect(hp); hp.connect(g); g.connect(this.musicOut());
        noise.start(time);
        noise.stop(time + 1.15);
    }

    // Reverb send for the pad and bells, sharing the voice's dark room
    musicReverb() {
        if (this._musicVerb && this._musicVerb.context === this.ctx) return this._musicVerb;
        const verb = this.ctx.createConvolver();
        verb.buffer = this.voiceReverb();
        const wet = this.ctx.createGain();
        wet.gain.value = 1.3; // a big, dark hall around the choir, bell and braaam
        verb.connect(wet);
        wet.connect(this.musicOut());
        this._musicVerb = verb;
        return verb;
    }

    // Low, breathy choir: detuned saws per note through a dark vowel filter,
    // swelling in slowly so it sits under the guitars
    playPad(freqs, time, dur) {
        const ctx = this.ctx;
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = 700; lp.Q.value = 1;
        const vowel = ctx.createBiquadFilter(); // an "oh" formant
        vowel.type = 'peaking'; vowel.frequency.value = 450; vowel.Q.value = 2; vowel.gain.value = 6;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.055, time + dur * 0.35);
        g.gain.linearRampToValueAtTime(0.05, time + dur * 0.9);
        g.gain.linearRampToValueAtTime(0.0001, time + dur + 0.2);
        lp.connect(vowel); vowel.connect(g);
        g.connect(this.musicOut());
        g.connect(this.musicReverb());
        freqs.forEach((f) => {
            [-12, 0, 12].forEach((cents) => {
                const osc = ctx.createOscillator();
                osc.type = 'sawtooth';
                osc.frequency.value = f;
                osc.detune.value = cents;
                osc.connect(lp);
                osc.start(time);
                osc.stop(time + dur + 0.25);
            });
        });
    }

    // Dark bell: a sine with an out-of-tune partial, long decay into the echo
    playBell(freq, time, level = 1) {
        const ctx = this.ctx;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.05 * level, time + 0.004);
        g.gain.exponentialRampToValueAtTime(0.001, time + 2.2);
        g.connect(this.musicOut());
        g.connect(this.musicReverb());
        [[1, 1], [2.76, 0.35], [5.4, 0.12]].forEach(([ratio, amp]) => {
            const osc = ctx.createOscillator();
            const pg = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.value = freq * ratio;
            pg.gain.value = amp;
            osc.connect(pg); pg.connect(g);
            osc.start(time);
            osc.stop(time + 2.3);
        });
    }

    // Trailer "braaam": a wall of detuned saws (root, fifth, octaves) through
    // the amp, with a filter that slowly opens and closes like a huge horn
    playBraam(root, time, dur) {
        const ctx = this.ctx;
        const pre = ctx.createGain();
        pre.gain.value = 0.25;
        const amp = ctx.createWaveShaper();
        amp.curve = this.distortionCurve();
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = 3;
        lp.frequency.setValueAtTime(120, time);
        lp.frequency.exponentialRampToValueAtTime(900, time + dur * 0.25);
        lp.frequency.exponentialRampToValueAtTime(150, time + dur);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.11, time + 0.08);
        g.gain.setValueAtTime(0.11, time + dur * 0.5);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur);
        pre.connect(amp); amp.connect(lp); lp.connect(g);
        g.connect(this.musicOut());
        g.connect(this.musicReverb());
        [[root, -10], [root, 10], [root * 1.5, -5], [root * 2, 5], [root / 2, 0]].forEach(([f, cents]) => {
            const osc = ctx.createOscillator();
            osc.type = 'sawtooth';
            osc.frequency.value = f;
            osc.detune.value = cents;
            osc.connect(pre);
            osc.start(time);
            osc.stop(time + dur + 0.05);
        });
    }

    // Shakuhachi: a breathy bamboo flute. The note slides up into pitch from
    // below (the "meri" bend), a slow vibrato grows in, and bandpassed breath
    // noise rides on top.
    playShakuhachi(freq, time, dur) {
        const ctx = this.ctx;
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(0.07, time + 0.12);
        g.gain.setValueAtTime(0.07, time + dur * 0.7);
        g.gain.exponentialRampToValueAtTime(0.001, time + dur + 0.15);
        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.frequency.value = freq * 4;
        lp.connect(g);
        g.connect(this.musicOut());
        g.connect(this.musicReverb());

        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq * 0.94, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.18);
        const vib = ctx.createOscillator();
        const vibDepth = ctx.createGain();
        vib.frequency.value = 5;
        vibDepth.gain.setValueAtTime(0, time);
        vibDepth.gain.linearRampToValueAtTime(freq * 0.012, time + Math.max(0.3, dur * 0.6));
        vib.connect(vibDepth); vibDepth.connect(osc.frequency);
        osc.connect(lp);

        const breath = ctx.createBufferSource();
        breath.buffer = this.noiseBuffer();
        breath.loop = true;
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.frequency.value = freq * 2; bp.Q.value = 3;
        const bg = ctx.createGain();
        bg.gain.value = 0.35;
        breath.connect(bp); bp.connect(bg); bg.connect(lp);

        const end = time + dur + 0.2;
        [osc, vib, breath].forEach((n) => { n.start(time); n.stop(end); });
    }

    // Shamisen: a sharp pluck that twangs down into pitch and dies fast
    playShamisen(freq, time, accent) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq * 1.03, time);
        osc.frequency.exponentialRampToValueAtTime(freq, time + 0.04);
        const bp = ctx.createBiquadFilter();
        bp.type = 'bandpass'; bp.Q.value = 2.5;
        bp.frequency.setValueAtTime(freq * 5, time);
        bp.frequency.exponentialRampToValueAtTime(freq * 1.5, time + 0.15);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, time);
        g.gain.linearRampToValueAtTime(accent ? 0.09 : 0.065, time + 0.002);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.3);
        osc.connect(bp); bp.connect(g);
        g.connect(this.musicOut());
        osc.start(time);
        osc.stop(time + 0.32);
    }

    // Shime-daiko: the small, tight, high taiko that keeps time
    playShime(time) {
        const ctx = this.ctx;
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(420, time);
        osc.frequency.exponentialRampToValueAtTime(210, time + 0.05);
        const g = ctx.createGain();
        g.gain.setValueAtTime(0.12, time);
        g.gain.exponentialRampToValueAtTime(0.001, time + 0.09);
        osc.connect(g);
        g.connect(this.musicOut());
        osc.start(time);
        osc.stop(time + 0.1);
    }
}
