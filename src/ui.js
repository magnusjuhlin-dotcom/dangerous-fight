/* DANGEROUS FIGHT - HUD & SCREEN CONTROLLER */

export class UIController {
    constructor() {
        this.screens = {
            menu: document.getElementById('main-menu'),
            multiplayer: document.getElementById('multiplayer-menu'),
            matchmaking: document.getElementById('matchmaking-screen'),
            team: document.getElementById('team-screen'),
            lobby: document.getElementById('lobby-screen'),
            join: document.getElementById('join-room-screen'),
            weapons: document.getElementById('weapons-menu'), // Garage
            cannons: document.getElementById('cannons-menu'),
            coinshop: document.getElementById('coin-shop-screen'),
            helpershop: document.getElementById('helper-shop-screen'),
            cheatshop: document.getElementById('cheat-shop-screen'),
            reinforce: document.getElementById('reinforce-screen'),
            missions: document.getElementById('missions-screen'),
            settings: document.getElementById('settings-screen'),
            pause: document.getElementById('pause-screen'),
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

        // The phone's back button (MainActivity asks this first; false = leave the app)
        window.onAndroidBack = () => {
            try { return this.handleBack(); } catch (e) { return false; }
        };
    }

    // Back: close a popup, skip the trailer, pause a match, or press the
    // screen's own back button. Only the main menu lets the app go.
    handleBack() {
        const game = window.game;
        const visible = (el) => el && !el.classList.contains('hidden');
        const popup = ['daily-gift', 'stage-up', 'level-up'].map((id) => document.getElementById(id)).find(visible);
        const langBox = document.getElementById('lang-box');
        if (visible(langBox)) {
            if (!window.i18n || !window.i18n.chosen) return false; // a language has to be picked
            langBox.classList.add('hidden');
            return true;
        }
        if (popup) {
            const btn = popup.querySelector('button');
            if (btn) btn.click();
            return true;
        }
        if (game && game.trailer && game.trailer.active) {
            game.trailer.stop();
            return true;
        }
        if (game && game.gameState === 'playing' && visible(this.screens.hud)) {
            game.pauseMatch(); // (online, or during the finisher, there is no pause: stay in the match)
            return true;
        }
        const screen = [...document.querySelectorAll('.overlay-screen')].find((el) => el.id !== 'lang-box' && visible(el));
        if (!screen || screen.id === 'main-menu') return false;
        const byId = { 'pause-screen': 'btn-resume', 'game-over-screen': 'btn-gameover-menu', 'victory-screen': 'btn-victory-menu' };
        const btn = byId[screen.id] ? document.getElementById(byId[screen.id]) : screen.querySelector('.back-btn');
        if (btn && !btn.disabled) {
            btn.click();
            return true;
        }
        return false;
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
    updateHUD(player, enemy, isMultiplayer, isClient, matchTimerMs = 240000, currentScore = 0, matchKills = 0, game = null) {
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
            
            // (2 players on one phone: a tower each)
            const local2p = game && game.local2p;
            this.bottomTowerLabel.innerText = local2p ? "SPELARE 1:S TORN" : "DITT TORN";
            this.topTowerLabel.innerText = local2p ? "SPELARE 2:S TORN" : "DATORNS TORN";
        }

        // Apply tower percentages
        const localTowerPercent = Math.max(0, (localTower.hp / localTower.maxHp) * 100);
        const remoteTowerPercent = Math.max(0, (remoteTower.hp / remoteTower.maxHp) * 100);
        this.bottomTowerHpBar.style.width = `${localTowerPercent}%`;
        this.topTowerHpBar.style.width = `${remoteTowerPercent}%`;

        // Apply car HP text. In 2v2 both samurai of a team share one readout:
        // "mine + team mate's" on the bottom, both opponents on the top.
        const hpOf = (car) => (car && car.state !== 'dead' ? Math.max(0, Math.ceil(car.hp)) : 0);
        if (game && game.teamMatch) {
            this.playerCarHpText.innerText = game.myTeamCars().map(hpOf).join(' + ');
            this.enemyCarHpText.innerText = game.foeTeamCars().map(hpOf).join(' + ');
            // (a 1v1 that got a reinforcement is a team match without team colours)
            if (game.myTeamColor) {
                const myName = game.myTeamColor === 'red' ? 'RÖDA' : 'GRÖNA';
                const foeName = game.myTeamColor === 'red' ? 'GRÖNA' : 'RÖDA';
                if (this.bottomTowerLabel) this.bottomTowerLabel.innerText = `DITT TORN (${myName} LAGET)`;
                if (this.topTowerLabel) this.topTowerLabel.innerText = `${foeName} LAGETS TORN`;
            }
        } else {
            this.playerCarHpText.innerText = Math.max(0, Math.ceil(localCarHp));
            this.enemyCarHpText.innerText = Math.max(0, Math.ceil(remoteCarHp));
        }

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
        
        const wpnKeys = ['katana', 'blades', 'hammer', 'oni'];
        wpnKeys.forEach(key => {
            const card = document.getElementById(`wpn-${key}`);
            if (!card) return;
            
            const isUnlocked = state.unlockedWeapons[key];
            const isEquipped = state.equippedWeapon === key;

            // Remove previous event listeners by cloning
            const newCard = card.cloneNode(true);
            card.parentNode.replaceChild(newCard, card);
            // Look the label up on the clone: the old card is no longer in the page
            const costText = newCard.querySelector('.weapon-cost');

            // Set styles
            if (isEquipped) {
                newCard.className = 'weapon-card selected';
                costText.innerText = 'VALD';
            } else if (isUnlocked) {
                newCard.className = 'weapon-card';
                costText.innerText = 'KLICKA FÖR ATT VÄLJA';
            } else {
                newCard.className = 'weapon-card locked';
                const costs = { blades: 100, hammer: 250, oni: 600 };
                costText.innerText = `Kostar ⚡ ${costs[key]}`;
            }
            // Setting className dropped the gamepad focus ring from the card
            // the player just pressed A on
            if (card.classList.contains('gp-focus')) newCard.classList.add('gp-focus');

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
    // Samuraj-butik: one card per credit pack. Cards only react when Google
    // Play can actually sell (see CreditStore); otherwise the status says why.
    renderCreditShop(store, packs, onBuy) {
        const grid = document.getElementById('coin-shop-grid');
        if (!grid) return;
        const creditsEl = document.getElementById('credits-coinshop-val');
        if (creditsEl) creditsEl.innerText = store.upgradeMgr.state.credits;
        const statusEl = document.getElementById('coin-shop-status');
        if (statusEl) statusEl.innerText = store.status;

        // The cards are rebuilt (also when the prices arrive from Google Play):
        // put the gamepad focus ring back on the same card afterwards
        const focusIdx = [...grid.children].findIndex((el) => el.classList.contains('gp-focus'));
        grid.innerHTML = '';
        packs.forEach((pack, i) => {
            const card = document.createElement('div');
            const buyable = store.canBuy(pack);
            card.className = 'weapon-card' + (pack.badge ? ' selected' : '') + (buyable ? '' : ' locked') + (i === focusIdx ? ' gp-focus' : '');
            const glow = document.createElement('div');
            glow.className = 'weapon-glow ' + (pack.badge ? 'cyan' : 'orange');
            card.appendChild(glow);
            const title = document.createElement('h3');
            title.innerText = `⚡ ${pack.credits.toLocaleString('sv-SE')} CREDITS`;
            card.appendChild(title);
            if (pack.badge) {
                const badge = document.createElement('div');
                badge.className = 'stat-row';
                badge.innerText = `${pack.badge} Bästa köpet`;
                card.appendChild(badge);
            }
            const cost = document.createElement('div');
            cost.className = 'weapon-cost';
            cost.innerText = buyable ? `KÖP FÖR ${store.prices[pack.id]}` : pack.price;
            card.appendChild(cost);
            card.addEventListener('click', () => onBuy(pack));
            grid.appendChild(card);
        });
    }

    // Hjälpmedel-butik: one card per pack, sold through Google Play like the credits
    renderHelperShop(store, packs, helpers, onBuy) {
        const grid = document.getElementById('helper-shop-grid');
        if (!grid) return;
        const owned = store.upgradeMgr.state.helpers || {};
        const ownedEl = document.getElementById('helper-owned');
        if (ownedEl) ownedEl.innerText = Object.keys(helpers).map((k) => `${helpers[k].icon} ${owned[k] || 0}`).join('   ');
        const statusEl = document.getElementById('helper-shop-status');
        if (statusEl) statusEl.innerText = store.status;
        const focusIdx = [...grid.children].findIndex((el) => el.classList.contains('gp-focus'));
        grid.innerHTML = '';
        packs.forEach((pack, i) => {
            const card = document.createElement('div');
            const buyable = store.canBuy(pack);
            card.className = 'weapon-card' + (pack.badge ? ' selected' : '') + (buyable ? '' : ' locked') + (i === focusIdx ? ' gp-focus' : '');
            const glow = document.createElement('div');
            glow.className = 'weapon-glow ' + (pack.badge ? 'cyan' : 'green');
            card.appendChild(glow);
            const keys = Object.keys(pack.helpers);
            const title = document.createElement('h3');
            if (pack.badge) {
                title.innerText = `🧰 ${pack.badge}`;
            } else {
                const h = helpers[keys[0]];
                title.innerText = `${h.icon} ${h.name} ×${pack.helpers[keys[0]]}`;
            }
            card.appendChild(title);
            const desc = document.createElement('div');
            desc.className = 'stat-row';
            desc.innerText = pack.badge ? `${pack.helpers[keys[0]]} av varje hjälpmedel` : helpers[keys[0]].desc;
            card.appendChild(desc);
            const cost = document.createElement('div');
            cost.className = 'weapon-cost';
            cost.innerText = buyable ? `KÖP FÖR ${store.prices[pack.id]}` : pack.price;
            card.appendChild(cost);
            card.addEventListener('click', () => onBuy(pack));
            grid.appendChild(card);
        });
    }

    // Fusk-butik: one card per cheat (and one with all of them); owned ones say so
    renderCheatShop(store, packs, cheats, onBuy) {
        const grid = document.getElementById('cheat-shop-grid');
        if (!grid) return;
        const owned = store.upgradeMgr.state.cheats || {};
        const statusEl = document.getElementById('cheat-shop-status');
        if (statusEl) statusEl.innerText = store.status;
        const focusIdx = [...grid.children].findIndex((el) => el.classList.contains('gp-focus'));
        grid.innerHTML = '';
        packs.forEach((pack, i) => {
            const have = pack.cheats.every((k) => owned[k]);
            const card = document.createElement('div');
            const buyable = !have && store.canBuy(pack);
            card.className = 'weapon-card' + (pack.badge || have ? ' selected' : '') + (buyable || have ? '' : ' locked') + (i === focusIdx ? ' gp-focus' : '');
            const glow = document.createElement('div');
            glow.className = 'weapon-glow ' + (pack.badge ? 'cyan' : 'pink');
            card.appendChild(glow);
            const title = document.createElement('h3');
            title.innerText = pack.badge ? `😈 ${pack.badge}` : `${cheats[pack.cheats[0]].icon} ${cheats[pack.cheats[0]].name}`;
            card.appendChild(title);
            const desc = document.createElement('div');
            desc.className = 'stat-row';
            desc.innerText = pack.badge ? 'Alla fusk på en gång' : cheats[pack.cheats[0]].desc;
            card.appendChild(desc);
            const cost = document.createElement('div');
            cost.className = 'weapon-cost';
            cost.innerText = have ? 'DITT ✓' : buyable ? `KÖP FÖR ${store.prices[pack.id]}` : pack.price;
            card.appendChild(cost);
            card.addEventListener('click', () => onBuy(pack, have));
            grid.appendChild(card);
        });
    }

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
            // keep the gamepad focus ring on the card (className dropped it)
            if (card.classList.contains('gp-focus')) newCard.classList.add('gp-focus');

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
                titleEl.innerText = "BOSS BESEGRAD!";
                titleEl.setAttribute('data-text', "BOSS BESEGRAD!");
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
                    // (everything from the save file is escaped: it is only JSON in localStorage)
                    const esc = (v) => this.escapeHtml(v);
                    const resultBadge = `<span class="badge ${isWin ? 'badge-win' : 'badge-loss'}">${esc(entry.result || 'Förlust')}</span>`;

                    tr.innerHTML = `
                        <td class="col-rank ${rankClass}">${rankBadge}</td>
                        <td class="col-score font-bold neon-text-cyan">${(Number(entry.score) || 0).toLocaleString('sv-SE')}</td>
                        <td class="col-name">${esc(entry.name || '-')}</td>
                        <td class="col-wave">Våg ${esc(entry.wave || 1)}</td>
                        <td class="col-samurai">${esc(entry.samurai || 'Cyber Ronin')}</td>
                        <td class="col-result">${resultBadge}</td>
                        <td class="col-kills">${esc(entry.kills || 0)}</td>
                        <td class="col-date">${esc(entry.date || '-')}</td>
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
