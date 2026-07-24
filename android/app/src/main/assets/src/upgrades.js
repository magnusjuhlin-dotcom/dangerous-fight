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
