/* DANGEROUS FIGHT - HUD & SCREEN CONTROLLER */

export class UIController {
    constructor() {
        this.screens = {
            menu: document.getElementById('main-menu'),
            weapons: document.getElementById('weapons-menu'),
            upgrades: document.getElementById('upgrades-menu'),
            rewards: document.getElementById('rewards-screen'),
            gameover: document.getElementById('game-over-screen'),
            victory: document.getElementById('victory-screen'),
            hud: document.getElementById('hud')
        };
        
        this.highestWaveVal = document.getElementById('highest-wave-val');
        this.creditsWeaponsVal = document.getElementById('credits-weapons-val');
        this.creditsUpgradesVal = document.getElementById('credits-upgrades-val');
        
        // HUD bars
        this.playerHpBar = document.getElementById('player-hp-bar');
        this.playerPostureBar = document.getElementById('player-posture-bar');
        this.enemyHpBar = document.getElementById('enemy-hp-bar');
        this.enemyPostureBar = document.getElementById('enemy-posture-bar');
        this.enemyName = document.getElementById('enemy-name');
        
        this.waveDisplay = document.getElementById('wave-display');
        this.creditsHud = document.getElementById('credits-hud');
        
        // Game Over and Victory stats
        this.statWaveReached = document.getElementById('stat-wave-reached');
        this.statCreditsEarned = document.getElementById('stat-credits-earned');
        this.statVictoryCredits = document.getElementById('stat-victory-credits');
        this.statVictoryTime = document.getElementById('stat-victory-time');
    }

    // Single point to hide everything and display one specific screen
    showScreen(activeScreenId) {
        for (const [key, element] of Object.entries(this.screens)) {
            if (key === 'hud') {
                if (activeScreenId === 'hud') {
                    element.classList.remove('hidden');
                } else if (activeScreenId === 'rewards' || activeScreenId === 'victory' || activeScreenId === 'gameover') {
                    // Let HUD be faintly visible behind overlays for gameover/rewards
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

    // Refresh HUD bars
    updateHUD(player, enemy, wave, runCredits) {
        // Player HP
        const hpPercent = Math.max(0, (player.hp / player.maxHp) * 100);
        this.playerHpBar.style.width = `${hpPercent}%`;
        
        // Player Posture/Balance
        const posturePercent = Math.max(0, (player.posture / player.maxPosture) * 100);
        this.playerPostureBar.style.width = `${posturePercent}%`;
        
        // Enemy HP & Posture
        if (enemy) {
            this.enemyName.innerText = enemy.name;
            const enemyHpPercent = Math.max(0, (enemy.hp / enemy.maxHp) * 100);
            this.enemyHpBar.style.width = `${enemyHpPercent}%`;
            
            const enemyPosturePercent = Math.max(0, (enemy.posture / enemy.maxPostureVal) * 100);
            this.enemyPostureBar.style.width = `${enemyPosturePercent}%`;
        } else {
            this.enemyName.innerText = "SÖKER MOTSTÅNDARE...";
            this.enemyHpBar.style.width = '0%';
            this.enemyPostureBar.style.width = '0%';
        }
        
        // Wave badge
        this.waveDisplay.innerText = `VÅG ${wave}`;
        
        // Credits
        this.creditsHud.innerText = `⚡ ${runCredits}`;
    }

    // Populate weapon shop elements and handle selections
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
                costValSpan.innerText = cost;
                newBtn.disabled = false;
                
                newBtn.addEventListener('click', () => {
                    audioController.playClick();
                    onPurchase(key);
                });
            }
        });
    }

    // Dynamic generation of roguelite cards for wave rewards
    renderRewardCards(cards, onSelect, audioController) {
        const container = document.getElementById('cards-container');
        container.innerHTML = ''; // Clear prior cards
        
        cards.forEach(card => {
            const cardEl = document.createElement('div');
            cardEl.className = `reward-card ${card.color}`;
            
            cardEl.innerHTML = `
                <div class="card-icon" style="color: ${card.color.includes('cyan') ? 'var(--neon-cyan)' : card.color.includes('pink') ? 'var(--neon-pink)' : 'var(--neon-orange)'}">${card.icon}</div>
                <h3>${card.title}</h3>
                <p>${card.desc}</p>
            `;
            
            cardEl.addEventListener('click', () => {
                audioController.playClick();
                audioController.playUpgrade();
                onSelect(card.key);
            });
            
            container.appendChild(cardEl);
        });

        this.showScreen('rewards');
    }

    // Display Game Over screen
    renderGameOver(waveReached, creditsEarned) {
        this.statWaveReached.innerText = waveReached;
        this.statCreditsEarned.innerText = creditsEarned;
        this.showScreen('gameover');
    }

    // Display Game Victory Screen
    renderVictory(finalCredits, runDurationSeconds) {
        this.statVictoryCredits.innerText = finalCredits;
        
        const minutes = Math.floor(runDurationSeconds / 60);
        const seconds = Math.floor(runDurationSeconds % 60);
        this.statVictoryTime.innerText = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        this.showScreen('victory');
    }
}
