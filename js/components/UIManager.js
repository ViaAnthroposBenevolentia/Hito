import { mapPositions } from '../utils/mapPositions.js';

export class UIManager {
    constructor(game) {
        this.game = game;
        this.notificationTimeout = null;
    }

    showNotification(message, duration = 3000) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        
        notification.classList.toggle('with-button', message.includes('view-map-button'));
        notificationText.innerHTML = message;
        notification.classList.remove('hidden');
        
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('with-button');
        }, duration);
    }

    showBattleNotification(travelTime) {
        this.showNotification(`
            ⚔️ Troops are marching to battle! ETA: ${Math.ceil(travelTime / 1000)} seconds
            <button class="view-map-button" onclick="window.game.viewBattleOnMap()">View on Map</button>
        `, travelTime + 2000);
    }

    showCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        document.body.appendChild(celebration);
        
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 50%, 50%)`;
            celebration.appendChild(confetti);
        }

        setTimeout(() => celebration.remove(), 3000);
    }

    showAccountSelection() {
        // Show welcome section
        document.getElementById('welcome-guide').classList.remove('hidden');
        
        // Show account selection
        const accountSelection = document.getElementById('account-selection');
        accountSelection.classList.remove('hidden');
        
        // Hide other sections
        document.getElementById('khanate-creation').classList.add('hidden');
        document.getElementById('khanate-info').classList.add('hidden');
        document.getElementById('batyrs').classList.add('hidden');
        document.getElementById('actions').classList.add('hidden');

        // Clear account markers and render new ones
        document.getElementById('account-markers').innerHTML = '';
        this.renderAccountMarkers();
    }

    hideMainSections() {
        document.getElementById('welcome-guide').classList.add('hidden');
        document.getElementById('khanate-creation').classList.add('hidden');
        document.getElementById('khanate-info').classList.add('hidden');
        document.getElementById('batyrs').classList.add('hidden');
        document.getElementById('actions').classList.add('hidden');
    }

    async renderAccountMarkers() {
        const markersContainer = document.getElementById('account-markers');
        markersContainer.innerHTML = '';

        // Create a map of claimed positions
        const claimedPositions = new Map();
        
        // First, check all accounts for claimed positions
        for (const account of this.game.web3Service.accounts) {
            try {
                const khanateInfo = await this.game.web3Service.contract.methods.getKhanateStats(account).call();
                if (khanateInfo.name) {
                    // Store the claimed position info
                    claimedPositions.set(account, {
                        name: khanateInfo.name,
                        power: parseInt(khanateInfo.archers) * 10 + parseInt(khanateInfo.cavalry) * 20,
                        level: khanateInfo.level
                    });
                }
            } catch (error) {
                if (!error.message.includes('Khanate not initialized')) {
                    console.error(`Error checking account ${account}:`, error);
                }
            }
        }

        // Render all positions
        for (const position of mapPositions) {
            const account = this.game.web3Service.accounts[position.id - 1];
            const isClaimed = account && claimedPositions.has(account);
            const khanateInfo = isClaimed ? claimedPositions.get(account) : null;

            this.createMapMarker(position, account, khanateInfo);
        }
    }

    createMapMarker(position, account, khanateInfo) {
        const markerContainer = document.createElement('div');
        markerContainer.className = 'map-marker-container';
        markerContainer.style.left = `${position.x}%`;
        markerContainer.style.top = `${position.y}%`;

        // Create marker
        const marker = document.createElement('div');
        marker.className = 'map-marker';
        
        if (khanateInfo) {
            // Claimed territory
            marker.classList.add('claimed');
            marker.style.backgroundColor = '#4CAF50'; // Green for claimed
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'khanate-name-label';
            nameLabel.innerHTML = `
                <strong>${khanateInfo.name}</strong><br>
                Level: ${khanateInfo.level}<br>
                Power: ${khanateInfo.power}
            `;
            markerContainer.appendChild(nameLabel);
        } else {
            // Unclaimed territory
            marker.classList.add('unclaimed');
            marker.style.backgroundColor = position.defaultColor;
            
            const nameLabel = document.createElement('div');
            nameLabel.className = 'territory-name-label';
            nameLabel.textContent = position.name;
            markerContainer.appendChild(nameLabel);
        }

        // Add hover effects
        markerContainer.addEventListener('mouseover', (e) => this.showPositionTooltip(e, position, khanateInfo));
        markerContainer.addEventListener('mouseout', () => this.hideTooltip());

        // Add click handler only if there's an account and it's not claimed
        if (account && !khanateInfo) {
            markerContainer.style.cursor = 'pointer';
            markerContainer.addEventListener('click', () => this.selectAccount(account));
        }

        markerContainer.appendChild(marker);
        document.getElementById('account-markers').appendChild(markerContainer);
    }

    showPositionTooltip(event, position, khanateInfo) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        
        if (khanateInfo) {
            tooltip.innerHTML = `
                <strong>${khanateInfo.name}</strong><br>
                Territory: ${position.name}<br>
                Level: ${khanateInfo.level}<br>
                Power: ${khanateInfo.power}<br>
                <em>${position.description}</em>
            `;
        } else {
            tooltip.innerHTML = `
                <strong>${position.name}</strong><br>
                Status: Unclaimed<br>
                <em>${position.description}</em><br>
                ${this.game.web3Service.accounts[position.id - 1] ? '<span class="click-hint">Click to claim this territory!</span>' : ''}
            `;
        }
        
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        document.body.appendChild(tooltip);
    }

    hideTooltip() {
        document.querySelectorAll('.tooltip').forEach(tooltip => tooltip.remove());
    }

    async selectAccount(account) {
        try {
            await this.game.initializeWithAccount(account);
            
            // Update account display
            document.getElementById('account-address').textContent = 
                `${account.substring(0, 6)}...${account.substring(38)}`;
            
            // Hide account selection
            document.getElementById('account-selection').classList.add('hidden');
            document.getElementById('welcome-guide').classList.add('hidden');
            
            // Try to get Khanate info
            try {
                const khanateInfo = await this.game.web3Service.contract.methods.getKhanateStats(account).call();
                if (khanateInfo.name) {
                    this.showGameInterface(khanateInfo);
                } else {
                    this.showKhanateCreation();
                }
            } catch (error) {
                if (error.message.includes('Khanate not initialized')) {
                    this.showKhanateCreation();
                } else {
                    console.error('Error checking Khanate:', error);
                    this.showNotification('❌ Error checking Khanate status');
                }
            }
        } catch (error) {
            console.error('Error selecting account:', error);
            this.showNotification('❌ Failed to select account');
        }
    }

    showKhanateCreation() {
        // Hide all other sections
        this.hideMainSections();
        
        // Show creation section
        const creationSection = document.getElementById('khanate-creation');
        creationSection.classList.remove('hidden');
        
        // Clear and focus the input
        const nameInput = document.getElementById('khanate-name');
        nameInput.value = '';
        nameInput.focus();
        
        // Show guide message
        const welcomeGuide = document.getElementById('welcome-guide');
        welcomeGuide.classList.remove('hidden');
        
        // Update guide message
        welcomeGuide.querySelector('h2').textContent = 'Create Your Khanate';
        welcomeGuide.querySelector('p').textContent = 
            'Choose a name for your Khanate and begin your journey to conquer the steppes!';
    }

    showGameInterface(khanateInfo) {
        this.hideMainSections();
        document.getElementById('khanate-info').classList.remove('hidden');
        document.getElementById('batyrs').classList.remove('hidden');
        document.getElementById('actions').classList.remove('hidden');

        this.updateKhanateInfo(khanateInfo);
        this.updateExperienceBar(khanateInfo);
    }

    updateKhanateInfo(khanateInfo) {
        document.getElementById('player-name').textContent = khanateInfo.name;
        document.getElementById('player-level').textContent = khanateInfo.level;
        document.getElementById('archer-count').textContent = khanateInfo.archers;
        document.getElementById('cavalry-count').textContent = khanateInfo.cavalry;
    }

    updateExperienceBar(khanateInfo) {
        const oldExpDisplay = document.querySelector('.experience-bar');
        if (oldExpDisplay) {
            oldExpDisplay.remove();
        }

        const expToNextLevel = khanateInfo.level * 100;
        const currentExp = khanateInfo.experience;
        const expProgress = (currentExp / expToNextLevel) * 100;
        
        const expDisplay = document.createElement('div');
        expDisplay.className = 'experience-bar';
        expDisplay.innerHTML = `
            <div class="exp-progress" style="width: ${expProgress}%"></div>
            <span class="exp-text">EXP: ${currentExp}/${expToNextLevel}</span>
        `;
        
        const levelElement = document.getElementById('player-level').parentElement;
        levelElement.insertAdjacentElement('afterend', expDisplay);
    }

    updateAchievementDisplay(achievements) {
        const badges = {
            FIRST_BLOOD: { name: "First Blood", description: "Win your first battle" },
            VETERAN: { name: "Veteran", description: "Win 10 battles" },
            WARLORD: { name: "Warlord", description: "Win 50 battles" },
            DEFENDER: { name: "Stalwart Defender", description: "Successfully defend 5 times" },
            COLLECTOR: { name: "Batyr Collector", description: "Collect all Batyrs" }
        };

        let achievementsSection = document.getElementById('achievements-section');
        if (!achievementsSection) {
            achievementsSection = document.createElement('section');
            achievementsSection.id = 'achievements-section';
            achievementsSection.innerHTML = '<h2>Achievements</h2><div id="achievements" class="achievements-grid"></div>';
            document.getElementById('khanate-info').insertAdjacentElement('afterend', achievementsSection);
        }

        const achievementsContainer = document.getElementById('achievements');
        achievementsContainer.innerHTML = '';

        Object.entries(badges).forEach(([key, badge]) => {
            const isUnlocked = achievements.get(key);
            const badgeElement = document.createElement('div');
            badgeElement.className = `achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}`;
            badgeElement.innerHTML = `
                <div class="badge-icon">${isUnlocked ? '🏆' : '🔒'}</div>
                <h4>${badge.name}</h4>
                <p>${badge.description}</p>
            `;
            achievementsContainer.appendChild(badgeElement);
        });
    }

    showAchievementBadge(achievement) {
        const badges = {
            FIRST_BLOOD: { name: "First Blood", description: "Win your first battle" },
            VETERAN: { name: "Veteran", description: "Win 10 battles" },
            WARLORD: { name: "Warlord", description: "Win 50 battles" },
            DEFENDER: { name: "Stalwart Defender", description: "Successfully defend 5 times" },
            COLLECTOR: { name: "Batyr Collector", description: "Collect all Batyrs" }
        };

        const badge = badges[achievement];
        if (!badge) return;

        const badgeElement = document.createElement('div');
        badgeElement.className = 'achievement-badge';
        badgeElement.innerHTML = `
            <h4>🏆 Achievement Unlocked!</h4>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-description">${badge.description}</div>
        `;

        document.body.appendChild(badgeElement);
        setTimeout(() => badgeElement.remove(), 5000);
    }

    async updateBatyrList(ownedBatyrs) {
        const batyrList = document.querySelector('.batyr-list');
        batyrList.innerHTML = '';

        for (let id = 1; id <= 5; id++) {
            try {
                const batyrStats = await this.game.web3Service.contract.methods.getBatyrStats(id).call();
                const batyrCard = document.createElement('div');
                batyrCard.className = `batyr-card ${ownedBatyrs.includes(id) ? '' : 'locked'}`;
                
                if (ownedBatyrs.includes(id)) {
                    const archerBonus = ((batyrStats.archerBonus - 100) / 100) * 100;
                    const cavalryBonus = ((batyrStats.cavalryBonus - 100) / 100) * 100;
                    
                    batyrCard.innerHTML = this.createOwnedBatyrHTML(batyrStats, id, archerBonus, cavalryBonus);
                } else {
                    batyrCard.innerHTML = this.createLockedBatyrHTML(batyrStats, id);
                }
                
                batyrList.appendChild(batyrCard);
            } catch (error) {
                console.error(`Error loading Batyr ${id}:`, error);
            }
        }
    }

    createOwnedBatyrHTML(batyrStats, id, archerBonus, cavalryBonus) {
        return `
            <img src="images/batyrs/batyr${id}.png" alt="${batyrStats.name}">
            <h3>${batyrStats.name}</h3>
            <div class="batyr-ability">
                <h4>${batyrStats.ability}</h4>
                <p>${batyrStats.description}</p>
            </div>
            <div class="batyr-stats">
                <p>Power: ${batyrStats.power}</p>
                ${archerBonus > 0 ? `<p>Archer Bonus: +${archerBonus}%</p>` : ''}
                ${cavalryBonus > 0 ? `<p>Cavalry Bonus: +${cavalryBonus}%</p>` : ''}
                ${batyrStats.canBattle ? '<p class="battle-ready">🗡️ Battle Ready</p>' : '<p class="defensive">🛡️ Defensive Only</p>'}
            </div>
        `;
    }

    createLockedBatyrHTML(batyrStats, id) {
        return `
            <img src="images/batyrs/batyr${id}.png" alt="Unknown Batyr">
            <div class="batyr-preview">
                <h4>${batyrStats.name}</h4>
                <p>${batyrStats.ability}</p>
            </div>
        `;
    }

    showLuckyBoxAnimation() {
        const overlay = document.createElement('div');
        overlay.className = 'lucky-box-overlay';
        overlay.id = 'luckyBoxOverlay';
        
        overlay.innerHTML = `
            <div class="lucky-box-animation" style="transition: opacity 0.5s ease">
                <img src="images/lucky-box.gif" alt="Opening Lucky Box" class="lucky-box-gif">
            </div>
            <div class="lucky-box-result"></div>
        `;
        
        document.body.appendChild(overlay);
    }

    showBatyrReveal(batyrId, batyrStats) {
        const overlay = document.getElementById('luckyBoxOverlay');
        const animation = overlay.querySelector('.lucky-box-animation');
        const resultDiv = overlay.querySelector('.lucky-box-result');
        
        animation.style.opacity = '0';
        
        setTimeout(() => {
            animation.style.display = 'none';
            resultDiv.innerHTML = `
                <img src="images/batyrs/batyr${batyrId}.png" alt="${batyrStats.name}" class="batyr-reveal">
                <h3>${batyrStats.name}</h3>
                <p>${batyrStats.ability}</p>
            `;
            resultDiv.classList.add('show');
            
            this.showCelebration();
            this.showNotification(`
                🎉 Congratulations! You acquired ${batyrStats.name}!
                ${batyrStats.ability}: ${batyrStats.description}
            `, 6000);
            
            setTimeout(() => this.removeLuckyBoxAnimation(), 4000);
        }, 500);
    }

    showEmptyBoxResult() {
        const overlay = document.getElementById('luckyBoxOverlay');
        const animation = overlay.querySelector('.lucky-box-animation');
        const resultDiv = overlay.querySelector('.lucky-box-result');
        
        animation.style.opacity = '0';
        
        setTimeout(() => {
            animation.style.display = 'none';
            resultDiv.innerHTML = `
                <h3>Better luck next time!</h3>
                <p>No Batyr this time...</p>
            `;
            resultDiv.classList.add('show');
            
            setTimeout(() => {
                this.removeLuckyBoxAnimation();
                this.showNotification('📦 No Batyr this time. Try again!');
            }, 2000);
        }, 500);
    }

    removeLuckyBoxAnimation() {
        const overlay = document.getElementById('luckyBoxOverlay');
        if (overlay) {
            overlay.remove();
        }
    }

    renderTroopMovement(movement) {
        const movementsContainer = document.getElementById('troop-movements');
        const existingPath = document.getElementById(`path-${movement.movementId}`);
        if (existingPath) {
            existingPath.remove();
        }

        const elapsed = Date.now() - movement.startTime;
        const remaining = Math.max(0, movement.duration - elapsed);
        
        if (remaining <= 0) {
            this.game.battleSystem.globalMovements.delete(movement.movementId);
            return;
        }

        const pathContainer = this.createMovementPathContainer(movement, remaining);
        movementsContainer.appendChild(pathContainer);
        
        setTimeout(() => {
            pathContainer.remove();
            this.game.battleSystem.globalMovements.delete(movement.movementId);
            this.showBattleAnimation(movement.end.x, movement.end.y);
        }, remaining);
    }

    createMovementPathContainer(movement, remaining) {
        const pathContainer = document.createElement('div');
        pathContainer.className = 'troop-path-container';
        pathContainer.id = `path-${movement.movementId}`;
        
        const speedUpButton = this.createSpeedUpButton(movement.movementId);
        pathContainer.appendChild(speedUpButton);
        
        const { path, troops } = this.createPathAndTroops(movement, remaining);
        path.appendChild(troops);
        pathContainer.appendChild(path);
        
        pathContainer.style.left = `${movement.start.x}%`;
        pathContainer.style.top = `${movement.start.y}%`;
        
        return pathContainer;
    }

    createSpeedUpButton(movementId) {
        const speedUpButton = document.createElement('button');
        speedUpButton.className = 'speed-up-button';
        speedUpButton.innerHTML = `
            ⚡ Speed Up
            <span class="cost">(0.3 ETH)</span>
        `;
        speedUpButton.onclick = () => this.game.battleSystem.speedUpTroops(movementId);
        return speedUpButton;
    }

    createPathAndTroops(movement, remaining) {
        const dx = movement.end.x - movement.start.x;
        const dy = movement.end.y - movement.start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const path = document.createElement('div');
        path.className = 'troop-path';
        path.style.width = `${distance}%`;
        path.style.transform = `rotate(${angle}deg)`;
        
        const troops = document.createElement('div');
        troops.className = 'moving-troops';
        troops.style.animation = `moveAlongPath ${remaining}ms linear`;
        troops.style.left = `${((movement.duration - remaining) / movement.duration) * 100}%`;
        
        const timer = this.createMovementTimer(movement.movementId, movement.startTime, movement.duration);
        
        const troopsImg = document.createElement('img');
        troopsImg.src = 'images/troops/troops.png';
        troopsImg.alt = 'Moving Troops';
        troopsImg.onerror = () => {
            troops.innerHTML = '⚔️';
            troops.style.fontSize = '20px';
        };
        
        troops.appendChild(troopsImg);
        troops.appendChild(timer);
        
        return { path, troops };
    }

    createMovementTimer(movementId, startTime, duration) {
        const timer = document.createElement('div');
        timer.className = 'travel-timer';
        timer.id = `timer-${movementId}`;
        
        const updateTimer = () => {
            const newElapsed = Date.now() - startTime;
            const newRemaining = Math.max(0, Math.ceil((duration - newElapsed) / 1000));
            timer.textContent = `${newRemaining}s`;
            
            if (newRemaining > 0) {
                requestAnimationFrame(updateTimer);
            }
        };
        requestAnimationFrame(updateTimer);
        
        return timer;
    }

    showBattleAnimation(x, y) {
        const animation = document.createElement('div');
        animation.className = 'battle-animation';
        animation.style.left = `${x}%`;
        animation.style.top = `${y}%`;
        animation.innerHTML = `
            <img src="images/battle-animation.gif" alt="Battle">
        `;
        document.getElementById('troop-movements').appendChild(animation);
        
        setTimeout(() => animation.remove(), 3000);
    }

    removeTroopMovement(movementId) {
        const path = document.getElementById(`path-${movementId}`);
        if (path) path.remove();
    }

    hideBattleElements() {
        const achievementsSection = document.getElementById('achievements-section');
        if (achievementsSection) {
            achievementsSection.classList.add('hidden');
        }
        
        const detailsModal = document.querySelector('.khanate-details-modal');
        if (detailsModal) {
            detailsModal.remove();
        }

        document.getElementById('battle-modal').classList.add('hidden');
    }

    resetUI() {
        this.hideMainSections();
        document.getElementById('battle-modal').classList.add('hidden');
        document.getElementById('purchase-modal').classList.add('hidden');
        
        const achievementsSection = document.getElementById('achievements-section');
        if (achievementsSection) {
            achievementsSection.remove();
        }
        
        const expDisplay = document.querySelector('.experience-bar');
        if (expDisplay) {
            expDisplay.remove();
        }
        
        document.getElementById('troop-movements').innerHTML = '';
    }

    getAccountPosition(account) {
        // Define fixed positions for accounts on the map
        const positions = [
            { x: 25, y: 30 },  // Aktobe region
            { x: 45, y: 25 },  // Kostanay region
            { x: 65, y: 35 },  // Pavlodar region
            { x: 35, y: 45 },  // Kyzylorda region
            { x: 55, y: 55 },  // Almaty region
            { x: 75, y: 45 },  // East Kazakhstan
            { x: 15, y: 55 },  // Mangystau region
            { x: 85, y: 25 },  // North Kazakhstan
            { x: 45, y: 65 },  // Shymkent region
            { x: 25, y: 75 }   // Turkistan region
        ];

        // Use account's index in the accounts array to determine position
        const index = this.game.web3Service.accounts.indexOf(account);
        // Use modulo to cycle through positions if there are more accounts than positions
        return positions[index % positions.length];
    }
} 