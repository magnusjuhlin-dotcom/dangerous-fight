/* DANGEROUS FIGHT - HUD & SCREEN CONTROLLER */

export class UIController {
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
            hud: document.getElementById('hud')
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
}
