/* DANGEROUS FIGHT - DAILY MISSIONS */
/* Three missions a day, picked from a pool by the date (the same three all
   day, new ones tomorrow). The game reports what happens with track(event);
   a finished mission is claimed for Cyber-Credits in the missions screen. */

export const MISSION_POOL = [
    { id: 'win', text: 'Vinn 2 matcher mot datorn', goal: 2, reward: 60, event: 'win' },
    { id: 'play', text: 'Spela 3 matcher', goal: 3, reward: 40, event: 'matchEnd' },
    { id: 'boss', text: 'Besegra Shogun-bossen', goal: 1, reward: 100, event: 'bossWin' },
    { id: 'ram', text: 'Ramma motståndarens torn 5 gånger', goal: 5, reward: 60, event: 'ram' },
    { id: 'ko', text: 'Slå ut motståndaren 5 gånger', goal: 5, reward: 60, event: 'ko' },
    { id: 'parry', text: 'Parera 3 skott', goal: 3, reward: 50, event: 'parry' },
    { id: 'dash', text: 'Gör 40 dashar', goal: 40, reward: 30, event: 'dash' },
    { id: 'online', text: 'Spela en onlinematch', goal: 1, reward: 50, event: 'onlineMatch' },
    { id: 'team', text: 'Vinn en lagmatch', goal: 1, reward: 70, event: 'teamWin' },
    { id: 'shot', text: 'Skjut 25 svärdsvågor', goal: 25, reward: 30, event: 'shot' },
    { id: 'rage', text: 'Använd samurajraseri 2 gånger', goal: 2, reward: 50, event: 'rage' }
];

export class Missions {
    constructor(upgradeMgr) {
        this.upgradeMgr = upgradeMgr;
        this.key = 'dangerous_fight_missions';
        this.load();
    }

    today() {
        const d = new Date();
        return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    }

    // Today's three missions, the same all day
    pick(date) {
        let seed = 0;
        for (const ch of date) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0;
        const pool = MISSION_POOL.map((m) => m.id);
        const out = [];
        while (out.length < 3 && pool.length) {
            seed = (seed * 1103515245 + 12345) >>> 0;
            out.push(pool.splice(seed % pool.length, 1)[0]);
        }
        return out;
    }

    load() {
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(this.key)); } catch (e) {}
        const date = this.today();
        if (saved && saved.date === date && Array.isArray(saved.ids)) {
            this.state = { date, ids: saved.ids, progress: saved.progress || {}, claimed: saved.claimed || {} };
        } else {
            this.state = { date, ids: this.pick(date), progress: {}, claimed: {} };
            this.save();
        }
    }

    save() {
        try { localStorage.setItem(this.key, JSON.stringify(this.state)); } catch (e) {}
    }

    // New day while the game is open: new missions
    refresh() {
        if (this.state.date !== this.today()) this.load();
    }

    list() {
        this.refresh();
        return this.state.ids.map((id) => {
            const m = MISSION_POOL.find((x) => x.id === id);
            if (!m) return null; // saved by a version that had a mission no longer in the pool
            const progress = Math.min(m.goal, this.state.progress[id] || 0);
            return { ...m, progress, done: progress >= m.goal, claimed: !!this.state.claimed[id] };
        }).filter(Boolean);
    }

    // Something happened in a match. The trailer plays real matches: those don't count.
    track(event, amount = 1) {
        if (window.game && window.game.trailer && window.game.trailer.active) return;
        this.refresh();
        let changed = false;
        this.state.ids.forEach((id) => {
            const m = MISSION_POOL.find((x) => x.id === id);
            if (!m || m.event !== event || this.state.claimed[id]) return;
            const before = this.state.progress[id] || 0;
            if (before >= m.goal) return;
            this.state.progress[id] = Math.min(m.goal, before + amount);
            changed = true;
        });
        if (changed) this.save();
    }

    // Missions that are done but not yet claimed (for the badge on the button)
    readyCount() {
        return this.list().filter((m) => m.done && !m.claimed).length;
    }

    claim(id) {
        const m = this.list().find((x) => x.id === id);
        if (!m || !m.done || m.claimed) return 0;
        this.state.claimed[id] = true;
        this.save();
        this.upgradeMgr.addCredits(m.reward);
        return m.reward;
    }
}
