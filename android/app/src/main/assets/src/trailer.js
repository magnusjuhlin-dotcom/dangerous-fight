/* DANGEROUS FIGHT - TRAILER: a ~40 s cinematic that plays itself */
/* It runs the real game: real matches against the computer with the
   player's samurai on autopilot, a boss round and a 4v4, cut together with
   captions, cinema bars, eruptions and slow motion, ending on the title card.
   Everything cinematic is drawn on the game canvas, so recording the canvas
   (start({ record: true })) captures the whole trailer as a video.
   Nothing it does is kept: the save is snapshotted at the start and put back
   at the end, and no match is ever allowed to finish. */

export class Trailer {
    constructor(game) {
        this.game = game;
        this.active = false;
        // Only a click catcher and the skip hint live in the DOM
        this.overlay = document.getElementById('trailer-overlay');
        if (this.overlay) {
            // straight on <body>: the game container gets zoomed on big hits
            document.body.appendChild(this.overlay);
            this.overlay.addEventListener('click', () => this.stop());
        }
    }

    // The storyboard: when (ms) each thing happens
    get script() {
        return [
            { at: 0, scene: 'duel', black: true, caption: 'I EN VÄRLD AV LAVA OCH STEN...', bass: true },
            { at: 3600, black: false, caption: '...FINNS BARA EN REGEL', eruptions: true },
            { at: 7200, caption: 'KÄMPA!', flash: true, big: true },
            { at: 8600, caption: '' },
            { at: 11000, slowmo: true },
            { at: 14500, slowmo: true },
            { at: 17000, scene: 'boss', flashBlack: true, caption: 'SHOGUN VAKNAR...' },
            { at: 20000, caption: '' },
            { at: 21000, bossRage: true },
            { at: 22500, slowmo: true },
            { at: 25500, scene: 'team', flashBlack: true, caption: 'UPP TILL 4 MOT 4' },
            { at: 28500, caption: '' },
            { at: 29500, playerRage: true },
            { at: 30500, slowmo: true },
            { at: 33500, black: true, caption: '', title: true },
            { at: 41000, end: true }
        ];
    }

    // options.record: also record the canvas and the game sound; the video
    // (a webm Blob) is handed to options.onVideo when the trailer ends
    start(options = {}) {
        const g = this.game;
        if (this.active) return;
        this.active = true;
        this.options = options;
        this.saved = JSON.stringify(g.upgradeMgr.state);
        g.upgradeMgr.purchaseLog = []; // hjälpmedel/fusk bought meanwhile (see stop)
        this.t0 = performance.now();
        this.step = 0;
        this.nextMove = 0;
        this.black = 1;
        this.blackTarget = 1;
        this.blackFlashUntil = 0;
        this.caption = '';
        this.captionAt = 0;
        this.captionBig = false;
        this.titleAt = 0;
        this.pickAt = 0;
        this.lastDraw = performance.now();
        // (read once: asking for it every frame forces a style recalculation)
        this.font = (getComputedStyle(document.documentElement).getPropertyValue('--font-cyber') || 'sans-serif').trim();
        // A room left open by the last online match (result screen ->
        // scoreboard -> back) would otherwise keep sending and taking packets
        // in the trailer's matches, or end one when its connection closes
        g.cleanupNetwork();
        const a = g.audioSynth;
        // The music is put back as it was when the trailer is over (a
        // narrator may only have paused it; forget that, or stopping the
        // reading restarts it for a moment). The startup line, playing or
        // still to come with this first tap, starts it too.
        this.musicWas = a.musicPlaying || !!a._musicWasPlaying || !!a._startupPlaying || !a._startupDone;
        a._musicWasPlaying = false;
        if (a._readFinish) a._readFinish(); // (resets the read-aloud button)
        a.stopReadAloud();
        a.stopMusic();
        if (this.overlay) this.overlay.classList.remove('hidden');
        document.getElementById('hud').style.visibility = 'hidden';
        if (options.record) this.startRecording();
    }

    stop() {
        if (!this.active) return;
        const g = this.game;
        this.active = false;
        if (this.overlay) this.overlay.classList.add('hidden');
        // Leave no trace: the save goes back exactly as it was - except for a
        // Google Play purchase delivered meanwhile, which is paid for (a
        // trailer match never ends, so nothing else earns credits here)
        try {
            const saved = JSON.parse(this.saved);
            const bought = g.upgradeMgr.state.credits - saved.credits;
            if (bought > 0) saved.credits += bought;
            // hjälpmedel and fusk are paid for too (the trailer's own match may
            // have used some hjälpmedel: those come back with the old save)
            (g.upgradeMgr.purchaseLog || []).forEach((buy) => {
                if (buy.helpers && saved.helpers) {
                    Object.keys(buy.helpers).forEach((k) => {
                        if (k in saved.helpers) saved.helpers[k] += Math.max(0, Math.floor(buy.helpers[k] * buy.times)) || 0;
                    });
                }
                if (buy.cheats && saved.cheats) buy.cheats.forEach((k) => { if (k in saved.cheats) saved.cheats[k] = true; });
            });
            g.upgradeMgr.state = saved;
            g.upgradeMgr.save();
        } catch (e) {}
        g.upgradeMgr.purchaseLog = null;
        this.leaveMatch();
        // The perk card acts 200 ms after its click (see startScene): a skip
        // right after a scene change must not let it start a real match
        // behind the menu
        if (performance.now() - this.pickAt < 400) {
            setTimeout(() => { if (!this.active && g.gameState === 'playing') this.leaveMatch(); }, 400);
        }
        this.stopRecording();
    }

    // Back to the menu, with nothing of the trailer's match left running
    leaveMatch() {
        const g = this.game;
        document.getElementById('hud').style.visibility = '';
        const banner = document.getElementById('boss-warning');
        if (banner) banner.classList.add('hidden');
        if (this.musicWas) g.audioSynth.startMusic(); else g.audioSynth.stopMusic();
        g.teamLayout = null;
        g.clearTeamMatch();
        // A perk card clicked by the last scene acts 200 ms later: cancel it,
        // or it starts a match behind the menu after stop() - and by then the
        // trailer is no longer active, so it would use up the player's real
        // hjälpmedel and switch on their fusk
        g.perkChoice = null;
        g.slowMoTimer = 0;
        g.particles.clear();
        g.projectiles = [];
        g.gameState = 'menu';
        g.uiCtrl.showScreen('menu');
    }

    setCaption(text, big = false) {
        this.caption = text;
        this.captionBig = big;
        this.captionAt = performance.now();
    }

    // ---- Recording ----
    startRecording() {
        const g = this.game;
        const a = g.audioSynth;
        try {
            // Record a scaled copy (at most 1280 px tall): the full-size
            // canvas on a sharp screen is more than the encoder keeps up with
            const src = g.canvasCtrl.canvas;
            const scale = Math.min(1, 1280 / Math.max(src.width, src.height));
            this.recCanvas = document.createElement('canvas');
            this.recCanvas.width = Math.round(src.width * scale / 2) * 2;
            this.recCanvas.height = Math.round(src.height * scale / 2) * 2;
            this.recCtx = this.recCanvas.getContext('2d');
            const stream = this.recCanvas.captureStream(30);
            a.init();
            if (a.ctx) {
                // Everything the game plays passes the master limiter: record that
                a.out; // make sure it exists
                this.recDest = a.ctx.createMediaStreamDestination();
                a.masterOut.connect(this.recDest);
                this.recDest.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
            }
            // VP8 encodes much faster than VP9, so no frames are dropped
            const mime = ['video/webm;codecs=vp8,opus', 'video/webm;codecs=vp9,opus', 'video/webm']
                .find((m) => MediaRecorder.isTypeSupported(m));
            const chunks = [];
            this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 6000000 });
            this.recorder.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
            this.recorder.onstop = () => {
                // (the capture tracks would otherwise stay live for good)
                stream.getTracks().forEach((t) => t.stop());
                const blob = new Blob(chunks, { type: 'video/webm' });
                if (this.options && this.options.onVideo) this.options.onVideo(blob);
            };
            this.recorder.start(1000);
            this.driveFrames();
        } catch (e) {
            console.warn('Trailer recording failed:', e);
            this.recorder = null;
        }
    }

    // While recording, frames come from our own 30 fps clock instead of
    // requestAnimationFrame: the browser stops animation frames whenever the
    // page is hidden, and the video must not freeze because of that.
    driveFrames() {
        const g = this.game;
        g.externalClock = true;
        const rec = this.recorder;
        const ch = new MessageChannel();
        let last = performance.now();
        let next = last;
        ch.port1.onmessage = () => {
            // stopped, or replaced by a new recording that runs its own clock
            if (this.recorder !== rec) { if (!this.recorder) g.externalClock = false; return; }
            const now = performance.now();
            if (now >= next) {
                g.update(Math.min(100, now - last));
                g.draw();
                last = now;
                next = now + 1000 / 30;
            }
            ch.port2.postMessage(0);
        };
        ch.port2.postMessage(0);
    }

    stopRecording() {
        if (this.recDest) {
            try { this.game.audioSynth.masterOut.disconnect(this.recDest); } catch (e) {}
            this.recDest = null;
        }
        if (this.recorder && this.recorder.state !== 'inactive') this.recorder.stop();
        this.recorder = null;
        this.recCtx = null;
    }

    // Start a real match against the computer behind the cinema bars
    startScene(kind) {
        const g = this.game;
        const state = g.upgradeMgr.state;
        g.isMultiplayer = false;
        if (kind === 'team') {
            g.teamLayout = { size: 4, allies: ['ai', 'ai', 'ai'], foes: ['ai', 'ai', 'ai'], foe0: 'ai' };
        } else {
            g.teamLayout = null;
            // startRun makes every other match a boss round: pick the parity
            state.matchCount = kind === 'boss' ? 1 : 0;
        }
        g.startRun();
        // skip the perk choice (it also starts the intro voice and the music).
        // A team match has none: the grid then still holds the last scene's
        // cards, and clicking one would replay the boss banner and voice.
        if (!g.teamLayout) {
            const card = document.querySelector('#perks-selection-grid .weapon-card');
            if (card) { card.click(); this.pickAt = performance.now(); }
        }
        g.reinforcementDue = false;
        g.uiCtrl.showScreen('hud');
        document.getElementById('hud').style.visibility = 'hidden';
        if (!g.audioSynth.musicPlaying) g.audioSynth.startMusic();
        if (kind !== 'boss') {
            const banner = document.getElementById('boss-warning');
            if (banner) banner.classList.add('hidden');
        }
    }

    // Called every frame from Game.update
    update(dt) {
        if (!this.active) return;
        const g = this.game;
        const now = performance.now() - this.t0;
        const script = this.script;
        while (this.step < script.length && now >= script[this.step].at) {
            this.run(script[this.step]);
            this.step++;
            if (!this.active) return;
        }

        // Keep the match going forever: nobody wins in a trailer
        g.matchTimer = Math.max(g.matchTimer, 100000);
        [g.topTower, g.bottomTower].forEach((t) => { if (t) t.hp = Math.max(t.hp, t.maxHp * 0.35); });
        // ...and the fighters stay in the picture instead of dying in the lava
        [g.player, g.enemy, ...(g.teamMatch ? g.extraCars() : [])].forEach((c) => {
            if (c && c.state !== 'dead' && c.maxHp) c.hp = Math.max(c.hp, c.maxHp * 0.35);
        });
        g.reinforcementDue = false;

        // Autopilot: the player's samurai dashes at the nearest foe (or their
        // tower) and fires now and then, like a real player would
        const p = g.player;
        this.nextMove -= dt;
        if (p.state !== 'dead' && this.nextMove <= 0) {
            this.nextMove = 550 + Math.random() * 700;
            const foes = g.teamMatch ? g.foeTeamCars() : [g.enemy];
            const alive = foes.filter((f) => f && f.state !== 'dead');
            let tx = g.canvasCtrl.width / 2, ty = 60;
            if (alive.length && Math.random() < 0.75) {
                alive.sort((a, b) => Math.hypot(a.x - p.x, a.y - p.y) - Math.hypot(b.x - p.x, b.y - p.y));
                tx = alive[0].x; ty = alive[0].y;
            }
            const dx = tx - p.x, dy = ty - p.y, d = Math.hypot(dx, dy) || 1;
            const len = 60 + Math.random() * 60;
            if (p.startDrag(false)) {
                p.dragMove(-dx / d * len, -dy / d * len); // the pull is opposite the dash
                p.endDrag();
            }
            if (Math.random() < 0.4) p.shoot();
            if ((g.rage || 0) >= 100 && g.activateRage) g.activateRage();
        }
    }

    run(cue) {
        const g = this.game;
        if (cue.end) { this.stop(); return; }
        if (cue.scene) this.startScene(cue.scene);
        if (cue.black !== undefined) this.blackTarget = cue.black ? 1 : 0;
        if (cue.flashBlack) this.blackFlashUntil = performance.now() + 350;
        if (cue.caption !== undefined) this.setCaption(cue.caption, !!cue.big);
        if (cue.bass) g.audioSynth.playVoiceSubBassDrop();
        if (cue.eruptions) g.nextEruption = 0;
        if (cue.flash) {
            g.canvasCtrl.flash('rgba(255, 255, 255, 0.6)', 300);
            g.canvasCtrl.shake(12, 400);
            g.audioSynth.playVoiceSubBassDrop();
        }
        if (cue.slowmo) g.slowMoTimer = 1200;
        // show off the Shogun going berserk and the samurai rage
        if (cue.bossRage && g.enemy && g.enemy.isBoss) g.enemy.hp = Math.min(g.enemy.hp, g.enemy.maxHp * 0.45);
        if (cue.playerRage && g.activateRage) { g.rage = 100; g.activateRage(); }
        if (cue.title) {
            this.titleAt = performance.now();
            g.audioSynth.playVoiceSubBassDrop();
            g.audioSynth.sayTitleLine();
        }
    }

    // ---- Drawn on the canvas, over everything (screen space) ----
    draw(ctx, W, H) {
        if (!this.active) return;
        const now = performance.now();
        const dt = Math.min(100, now - this.lastDraw);
        this.lastDraw = now;
        const font = this.font;

        // Fade to and from black
        const target = now < this.blackFlashUntil ? 1 : this.blackTarget;
        const speed = dt / 600;
        this.black += Math.max(-speed, Math.min(speed, target - this.black));
        ctx.save();
        if (this.black > 0.001) {
            ctx.fillStyle = `rgba(0, 0, 0, ${this.black})`;
            ctx.fillRect(0, 0, W, H);
        }

        // Cinema bars
        const bar = Math.round(H * 0.065); // thin enough to keep the towers in view
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, W, bar);
        ctx.fillRect(0, H - bar, W, bar);

        // Caption: fades in and settles from slightly larger
        if (this.caption) {
            const t = (now - this.captionAt) / 1000;
            const k = Math.min(1, t / 0.55);
            const size = this.captionBig ? Math.min(W * 0.14, 110) : Math.max(18, Math.min(W * 0.055, 40));
            ctx.globalAlpha = k;
            ctx.translate(W / 2, H / 2);
            ctx.scale(1.08 - 0.08 * k, 1.08 - 0.08 * k);
            ctx.font = `${Math.round(size)}px ${font}`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillStyle = this.captionBig ? '#00f0ff' : '#ffffff';
            ctx.shadowColor = this.captionBig ? '#00f0ff' : 'rgba(255, 120, 30, 0.9)';
            ctx.shadowBlur = this.captionBig ? 30 : 18;
            // translated whole before it is split: the halves of a caption
            // are not in the dictionary and would stay Swedish in English
            const caption = window.i18n ? window.i18n.tr(this.caption) : this.caption;
            this.wrap(ctx, caption, W * 0.9).forEach((line, i, all) => {
                ctx.fillText(line, 0, (i - (all.length - 1) / 2) * size * 1.25);
            });
        }
        ctx.restore();

        // Title card
        if (this.titleAt) {
            const t = (now - this.titleAt) / 1000;
            const k = Math.min(1, t / 1.6);
            const size = Math.min(W * 0.11, 84);
            ctx.save();
            ctx.globalAlpha = k;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            const cx = W / 2, cy = H / 2 - size * 0.4;
            const s = 1.15 - 0.15 * k;
            ctx.translate(cx, cy);
            ctx.scale(s, s);
            ctx.font = `${Math.round(size)}px ${font}`;
            // glitchy colour split, closing in as it lands
            const split = (1 - k) * 10 + 2;
            ctx.fillStyle = 'rgba(255, 0, 119, 0.8)';
            ctx.fillText('DANGEROUS FIGHT', -split, 0);
            ctx.fillStyle = 'rgba(0, 240, 255, 0.8)';
            ctx.fillText('DANGEROUS FIGHT', split, 0);
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = '#00f0ff';
            ctx.shadowBlur = 20;
            ctx.fillText('DANGEROUS FIGHT', 0, 0);
            ctx.shadowBlur = 0;
            ctx.font = `${Math.round(size * 0.32)}px ${font}`;
            ctx.fillStyle = '#00f0ff';
            ctx.fillText('SLINGSHOT ARENA', 0, size * 0.9);
            if (t > 1.2) {
                ctx.globalAlpha = Math.min(1, (t - 1.2) / 0.8);
                ctx.font = `${Math.round(size * 0.26)}px ${font}`;
                ctx.fillStyle = '#ff9d00';
                ctx.fillText('AJ SPORTS – TO THE GAME!', 0, size * 1.6);
            }
            ctx.restore();
        }
    }

    // (the recording copy is taken after everything is drawn)
    copyFrame() {
        if (!this.recCtx) return;
        this.recCtx.drawImage(this.game.canvasCtrl.canvas, 0, 0, this.recCanvas.width, this.recCanvas.height);
    }

    // Split a caption over two lines when it is too wide for the screen
    wrap(ctx, text, maxW) {
        if (ctx.measureText(text).width <= maxW) return [text];
        const words = text.split(' ');
        let best = [text];
        for (let i = 1; i < words.length; i++) {
            const a = words.slice(0, i).join(' '), b = words.slice(i).join(' ');
            if (Math.max(ctx.measureText(a).width, ctx.measureText(b).width) <= maxW) { best = [a, b]; break; }
        }
        return best;
    }
}
