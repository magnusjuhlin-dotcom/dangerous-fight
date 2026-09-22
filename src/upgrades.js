/* DANGEROUS FIGHT - PERSISTENCE & UPGRADES STATE MANAGER */

export class UpgradeManager {
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
