class KazakhKhanateGame {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = '0xbA5CB4AABB9D34Bc321946fd8D666B6Ff7A26c7a';
        this.accounts = [];
        this.accountLocations = {}; // Will store account locations on the map
        this.setupEventListeners();
        this.initialize();
    }

    async initialize() {
        try {
            // Connect directly to Ganache
            this.web3 = new Web3('http://127.0.0.1:7545');
            this.accounts = await this.web3.eth.getAccounts();
            console.log('📝 Available accounts:', this.accounts);
            
            if (this.accounts.length > 0) {
                await this.loadContract();
                
                // Verify contract
                const code = await this.web3.eth.getCode(this.contractAddress);
                if (code === '0x' || code === '0x0') {
                    throw new Error('No contract code at specified address');
                }
                console.log('✅ Contract verified at address:', this.contractAddress);

                // Show account selection if no account is selected
                if (!this.account) {
                    this.showAccountSelection();
                } else {
                    await this.initializeWithAccount(this.account);
                }
            } else {
                this.showNotification('❌ No accounts found in Ganache');
            }
        } catch (error) {
            console.error('🐞 Initialization error:', error);
            this.showNotification('❌ Failed to connect to Ganache. Make sure it is running on port 7545');
        }
    }

    async initializeWithAccount(account) {
        this.account = account;
        document.getElementById('account-address').textContent = `${this.account.substring(0, 6)}...${this.account.substring(38)}`;
        await this.updateBalance();
        await this.checkKhanateStatus();
        this.showNotification('✅ Connected to account successfully!');
    }

    async showAccountSelection() {
        // Hide other sections
        document.getElementById('khanate-creation').classList.add('hidden');
        document.getElementById('khanate-info').classList.add('hidden');
        document.getElementById('batyrs').classList.add('hidden');
        document.getElementById('actions').classList.add('hidden');

        // Show account selection
        const accountSelection = document.getElementById('account-selection');
        accountSelection.classList.remove('hidden');

        // Clear existing markers
        document.getElementById('account-markers').innerHTML = '';

        // Initialize map markers for each account
        for (const account of this.accounts) {
            try {
                // Try to get Khanate info
                let khanateName = '';
                try {
                    const khanateInfo = await this.contract.methods.getKhanateStats(account).call();
                    khanateName = khanateInfo.name || `Account ${account.substring(0, 6)}`;
                } catch (error) {
                    khanateName = `Account ${account.substring(0, 6)}`;
                }

                // Generate a position on the map
                const position = this.getAccountPosition(account, this.accounts.indexOf(account));
                this.accountLocations[account] = position;

                // Create marker container
                const markerContainer = document.createElement('div');
                markerContainer.className = 'map-marker-container';
                markerContainer.style.left = `${position.x}%`;
                markerContainer.style.top = `${position.y}%`;

                // Create marker
                const marker = document.createElement('div');
                marker.className = 'map-marker';
                if (account === this.account) {
                    marker.classList.add('current');
                }

                // Create name label
                const nameLabel = document.createElement('div');
                nameLabel.className = 'khanate-name-label';
                nameLabel.textContent = khanateName;

                // Add tooltip and click event
                markerContainer.addEventListener('mouseover', (e) => this.showTooltip(e, account));
                markerContainer.addEventListener('mouseout', () => this.hideTooltip());
                markerContainer.addEventListener('click', () => this.selectAccount(account));

                // Assemble marker
                markerContainer.appendChild(marker);
                markerContainer.appendChild(nameLabel);
                document.getElementById('account-markers').appendChild(markerContainer);

            } catch (error) {
                console.error(`Error creating marker for account ${account}:`, error);
            }
        }
    }

    getAccountPosition(account, index) {
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

        // Use modulo to cycle through positions if there are more accounts than positions
        return positions[index % positions.length];
    }

    showTooltip(event, account) {
        const tooltip = document.createElement('div');
        tooltip.className = 'tooltip';
        tooltip.textContent = `Account: ${account.substring(0, 6)}...${account.substring(38)}`;
        tooltip.style.left = `${event.pageX + 10}px`;
        tooltip.style.top = `${event.pageY + 10}px`;
        document.body.appendChild(tooltip);
    }

    hideTooltip() {
        const tooltips = document.querySelectorAll('.tooltip');
        tooltips.forEach(tooltip => tooltip.remove());
    }

    async selectAccount(account) {
        await this.initializeWithAccount(account);
        document.getElementById('account-selection').classList.add('hidden');
    }

    logout() {
        this.account = null;
        this.showAccountSelection();
        this.showNotification('✅ Logged out successfully');
    }

    async loadContract() {
        try {
            // First try the src/artifacts path
            let response;
            try {
                response = await fetch('src/artifacts/contracts/KazakhKhanate.sol/KazakhKhanate.json');
            } catch (e) {
                // If that fails, try the artifacts path
                response = await fetch('artifacts/contracts/KazakhKhanate.sol/KazakhKhanate.json');
            }
            
            if (!response.ok) {
                throw new Error(`Failed to load contract JSON: ${response.statusText}`);
            }
            
            const contractJson = await response.json();
            console.log('📝 Contract ABI loaded');
            
            this.contract = new this.web3.eth.Contract(contractJson.abi, this.contractAddress);
            console.log('✅ Contract instance created');
            
            // Verify contract methods
            console.log('📝 Available contract methods:', Object.keys(this.contract.methods));
        } catch (error) {
            console.error('🐞 Contract loading error:', error);
            this.showNotification('❌ Failed to load game contract');
            throw error;
        }
    }

    async updateBalance() {
        try {
            const balance = await this.web3.eth.getBalance(this.account);
            const ethBalance = this.web3.utils.fromWei(balance, 'ether');
            document.getElementById('account-balance').textContent = parseFloat(ethBalance).toFixed(4);
        } catch (error) {
            console.error('🐞 Balance update error:', error);
        }
    }

    async checkKhanateStatus() {
        try {
            const khanateInfo = await this.contract.methods.getKhanateStats(this.account).call();
            if (khanateInfo.name) {
                this.showGameInterface(khanateInfo);
            } else {
                this.showKhanateCreation();
            }
        } catch (error) {
            console.error('🐞 Khanate status check error:', error);
            this.showKhanateCreation();
        }
    }

    showGameInterface(khanateInfo) {
        document.getElementById('khanate-creation').classList.add('hidden');
        document.getElementById('khanate-info').classList.remove('hidden');
        document.getElementById('batyrs').classList.remove('hidden');
        document.getElementById('actions').classList.remove('hidden');

        // Update UI with khanate info
        document.getElementById('player-name').textContent = khanateInfo.name;
        document.getElementById('player-level').textContent = khanateInfo.level;
        document.getElementById('archer-count').textContent = khanateInfo.archers;
        document.getElementById('cavalry-count').textContent = khanateInfo.cavalry;

        this.updateBatyrList();
    }

    showKhanateCreation() {
        document.getElementById('khanate-creation').classList.remove('hidden');
        document.getElementById('khanate-info').classList.add('hidden');
        document.getElementById('batyrs').classList.add('hidden');
        document.getElementById('actions').classList.add('hidden');
        document.getElementById('battle-modal').classList.add('hidden');
        document.getElementById('purchase-modal').classList.add('hidden');
    }

    async createKhanate(name) {
        try {
            if (!this.contract || !this.contract.methods) {
                throw new Error('Contract not properly initialized');
            }
            
            console.log('📝 Creating Khanate with name:', name);
            console.log('📝 Using account:', this.account);
            
            // First check if a Khanate already exists
            try {
                const existingKhanate = await this.contract.methods.getKhanateStats(this.account).call();
                if (existingKhanate.name) {
                    throw new Error('Khanate already exists');
                }
            } catch (error) {
                if (!error.message.includes('Khanate not initialized')) {
                    throw error;
                }
            }
            
            // Estimate gas with a larger limit
            const gasEstimate = await this.contract.methods.createKhanate(name)
                .estimateGas({ 
                    from: this.account,
                    gas: 500000 // Start with a higher gas limit for estimation
                });
            
            console.log('⛽ Estimated gas:', gasEstimate);
            
            // Send transaction with increased gas limit
            const result = await this.contract.methods.createKhanate(name)
                .send({ 
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.5) // 50% buffer
                });
            
            console.log('✅ Khanate creation transaction:', result);
            this.showNotification('✅ Khanate created successfully!');
            await this.checkKhanateStatus();
        } catch (error) {
            console.error('🐞 Khanate creation error:', error);
            if (error.message.includes('Khanate already exists')) {
                this.showNotification('❌ You already have a Khanate!');
            } else {
                this.showNotification('❌ Failed to create Khanate: ' + error.message);
            }
        }
    }

    async purchaseTroops(archers, cavalry) {
        try {
            const archerCost = this.web3.utils.toWei('0.01', 'ether');
            const cavalryCost = this.web3.utils.toWei('0.02', 'ether');
            const totalCost = (archers * archerCost) + (cavalry * cavalryCost);

            await this.contract.methods.purchaseTroops(archers, cavalry)
                .send({ from: this.account, value: totalCost });
            
            this.showNotification('✅ Troops purchased successfully!');
            await this.checkKhanateStatus();
            await this.updateBalance();
        } catch (error) {
            console.error('🐞 Troop purchase error:', error);
            this.showNotification('❌ Failed to purchase troops');
        }
    }

    async purchaseLuckyBox() {
        try {
            console.log('🎲 Purchasing lucky box...');
            const boxPrice = this.web3.utils.toWei('0.1', 'ether');
            
            // Get current Batyr ownership for comparison
            const currentBatyrs = await this.getCurrentBatyrs();
            
            const result = await this.contract.methods.purchaseLuckyBox()
                .send({ from: this.account, value: boxPrice });
            
            console.log('📦 Lucky box purchase result:', result);
            
            // Check for BatyrAcquired event
            const batyrEvent = result.events.BatyrAcquired;
            if (batyrEvent) {
                const { batyrId, name } = batyrEvent.returnValues;
                const batyrStats = await this.contract.methods.getBatyrStats(batyrId).call();
                
                // Show elaborate notification
                this.showNotification(`
                    🎉 Congratulations! You acquired ${name}!
                    ${batyrStats.ability}: ${batyrStats.description}
                `, 6000);
                
                // Play celebration animation
                this.showCelebration();
            } else {
                this.showNotification('📦 No Batyr this time. Try again!');
            }
            
            await this.updateBalance();
            await this.updateBatyrList();
        } catch (error) {
            console.error('🐞 Lucky box purchase error:', error);
            this.showNotification('❌ Failed to purchase lucky box');
        }
    }

    async getCurrentBatyrs() {
        const batyrs = [];
        for (let i = 1; i <= 5; i++) {
            const hasBatyr = await this.contract.methods.hasBatyr(this.account, i).call();
            if (hasBatyr) {
                batyrs.push(i);
            }
        }
        return batyrs;
    }

    showCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'celebration';
        document.body.appendChild(celebration);
        
        // Add confetti effect
        for (let i = 0; i < 50; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + 'vw';
            confetti.style.animationDelay = Math.random() * 2 + 's';
            confetti.style.backgroundColor = `hsl(${Math.random() * 360}, 50%, 50%)`;
            celebration.appendChild(confetti);
        }

        // Remove celebration after animation
        setTimeout(() => {
            celebration.remove();
        }, 3000);
    }

    showNotification(message, duration = 3000) {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notification-text');
        notificationText.innerHTML = message; // Allow HTML in notifications
        notification.classList.remove('hidden');
        setTimeout(() => {
            notification.classList.add('hidden');
        }, duration);
    }

    async battle(opponent) {
        try {
            console.log('⚔️ Initiating battle with opponent:', opponent);
            
            // Get opponent's info
            const opponentInfo = await this.contract.methods.getKhanateStats(opponent).call();
            console.log('🎯 Opponent Khanate:', {
                name: opponentInfo.name,
                level: opponentInfo.level,
                archers: opponentInfo.archers,
                cavalry: opponentInfo.cavalry
            });

            // Get our info
            const ourInfo = await this.contract.methods.getKhanateStats(this.account).call();
            console.log('🛡️ Our Khanate:', {
                name: ourInfo.name,
                level: ourInfo.level,
                archers: ourInfo.archers,
                cavalry: ourInfo.cavalry
            });

            console.log('⚔️ Sending battle transaction...');
            const result = await this.contract.methods.battle(opponent)
                .send({ from: this.account });
            
            console.log('✨ Battle transaction result:', result);

            // Get updated stats after battle
            const updatedStats = await this.contract.methods.getKhanateStats(this.account).call();
            const losses = {
                archers: ourInfo.archers - updatedStats.archers,
                cavalry: ourInfo.cavalry - updatedStats.cavalry
            };

            console.log('📊 Battle results:', {
                levelBefore: ourInfo.level,
                levelAfter: updatedStats.level,
                losses: losses
            });

            // Determine battle outcome
            const victory = updatedStats.level > ourInfo.level;
            const outcome = victory ? '🎉 Victory!' : '💔 Defeat!';
            this.showNotification(`${outcome} Lost ${losses.archers} archers and ${losses.cavalry} cavalry.`);
            
            await this.checkKhanateStatus();
        } catch (error) {
            console.error('🐞 Battle error:', error);
            this.showNotification('❌ Battle failed: ' + error.message);
        }
    }

    async updateBatyrList() {
        const batyrList = document.querySelector('.batyr-list');
        batyrList.innerHTML = '';

        const batyrIds = [1, 2, 3, 4, 5];
        for (const id of batyrIds) {
            try {
                const hasBatyr = await this.contract.methods.hasBatyr(this.account, id).call();
                if (hasBatyr) {
                    const batyrStats = await this.contract.methods.getBatyrStats(id).call();
                    const batyrCard = document.createElement('div');
                    batyrCard.className = 'batyr-card';
                    
                    // Calculate bonus percentages
                    const archerBonus = ((batyrStats.archerBonus - 100) / 100) * 100;
                    const cavalryBonus = ((batyrStats.cavalryBonus - 100) / 100) * 100;
                    
                    batyrCard.innerHTML = `
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
                    batyrList.appendChild(batyrCard);
                }
            } catch (error) {
                console.error(`🐞 Error checking Batyr ${id}:`, error);
            }
        }
    }

    setupEventListeners() {
        document.getElementById('create-khanate').addEventListener('click', () => {
            const name = document.getElementById('khanate-name').value;
            if (name) {
                this.createKhanate(name);
            } else {
                this.showNotification('❌ Please enter a Khanate name');
            }
        });

        document.getElementById('purchase-troops').addEventListener('click', () => {
            document.getElementById('purchase-modal').classList.remove('hidden');
        });

        document.getElementById('confirm-purchase').addEventListener('click', () => {
            const archers = parseInt(document.getElementById('archer-amount').value) || 0;
            const cavalry = parseInt(document.getElementById('cavalry-amount').value) || 0;
            if (archers > 0 || cavalry > 0) {
                this.purchaseTroops(archers, cavalry);
                document.getElementById('purchase-modal').classList.add('hidden');
            } else {
                this.showNotification('❌ Please enter troop amounts');
            }
        });

        document.getElementById('cancel-purchase').addEventListener('click', () => {
            document.getElementById('purchase-modal').classList.add('hidden');
        });

        document.getElementById('purchase-lucky-box').addEventListener('click', () => {
            this.purchaseLuckyBox();
        });

        document.getElementById('logout').addEventListener('click', () => {
            this.logout();
        });

        document.getElementById('switch-account').addEventListener('click', () => {
            this.showAccountSelection();
        });

        document.getElementById('battle').addEventListener('click', async () => {
            try {
                await this.showBattleMap();
            } catch (error) {
                console.error('Error loading battle map:', error);
                this.showNotification('❌ Failed to load opponents');
            }
        });

        // Update total cost when troop amounts change
        const updateTotalCost = () => {
            const archers = parseInt(document.getElementById('archer-amount').value) || 0;
            const cavalry = parseInt(document.getElementById('cavalry-amount').value) || 0;
            const totalCost = (archers * 0.01) + (cavalry * 0.02);
            document.getElementById('purchase-cost').textContent = totalCost.toFixed(3);
        };

        document.getElementById('archer-amount').addEventListener('input', updateTotalCost);
        document.getElementById('cavalry-amount').addEventListener('input', updateTotalCost);

        // Close modals when clicking outside
        window.addEventListener('click', (event) => {
            const battleModal = document.getElementById('battle-modal');
            const purchaseModal = document.getElementById('purchase-modal');
            
            if (event.target === battleModal) {
                battleModal.classList.add('hidden');
            }
            if (event.target === purchaseModal) {
                purchaseModal.classList.add('hidden');
            }
        });
    }

    showOpponentDetails(account, khanateInfo) {
        const opponentList = document.getElementById('opponent-list');
        opponentList.innerHTML = `
            <div class="opponent-details">
                <div class="opponent-info">
                    <h4>${khanateInfo.name}</h4>
                    <p>Level ${khanateInfo.level}</p>
                </div>
                <div class="opponent-stats">
                    <div>Archers: ${khanateInfo.archers}</div>
                    <div>Cavalry: ${khanateInfo.cavalry}</div>
                </div>
            </div>
        `;
    }

    async showBattleMap() {
        const battleModal = document.getElementById('battle-modal');
        const battleMarkers = document.getElementById('battle-markers');
        const opponentList = document.getElementById('opponent-list');
        
        battleMarkers.innerHTML = '';
        opponentList.innerHTML = '';

        let hasOpponents = false;

        // Add markers for all accounts
        for (const account of this.accounts) {
            if (account !== this.account) {
                try {
                    const khanateInfo = await this.contract.methods.getKhanateStats(account).call();
                    if (khanateInfo.name) {
                        hasOpponents = true;
                        const position = this.accountLocations[account] || this.getAccountPosition(account, this.accounts.indexOf(account));
                        
                        // Create marker container
                        const markerContainer = document.createElement('div');
                        markerContainer.className = 'map-marker-container';
                        markerContainer.style.left = `${position.x}%`;
                        markerContainer.style.top = `${position.y}%`;

                        // Create marker
                        const marker = document.createElement('div');
                        marker.className = 'map-marker enemy';

                        // Create name label
                        const nameLabel = document.createElement('div');
                        nameLabel.className = 'khanate-name-label';
                        nameLabel.textContent = khanateInfo.name;
                        
                        markerContainer.addEventListener('mouseover', () => {
                            this.showOpponentDetails(account, khanateInfo);
                        });
                        
                        markerContainer.addEventListener('click', () => {
                            this.battle(account);
                            battleModal.classList.add('hidden');
                        });

                        markerContainer.appendChild(marker);
                        markerContainer.appendChild(nameLabel);
                        battleMarkers.appendChild(markerContainer);
                    }
                } catch (error) {
                    console.error('Error getting opponent info:', error);
                }
            }
        }

        // Add marker for current player
        const currentPosition = this.accountLocations[this.account];
        if (currentPosition) {
            const markerContainer = document.createElement('div');
            markerContainer.className = 'map-marker-container';
            markerContainer.style.left = `${currentPosition.x}%`;
            markerContainer.style.top = `${currentPosition.y}%`;

            const marker = document.createElement('div');
            marker.className = 'map-marker current';

            const nameLabel = document.createElement('div');
            nameLabel.className = 'khanate-name-label';
            const currentKhanate = await this.contract.methods.getKhanateStats(this.account).call();
            nameLabel.textContent = currentKhanate.name;

            markerContainer.appendChild(marker);
            markerContainer.appendChild(nameLabel);
            battleMarkers.appendChild(markerContainer);
        }

        if (!hasOpponents) {
            opponentList.innerHTML = '<div class="no-opponents">No other Khanates found. Wait for other players to join!</div>';
        }

        battleModal.classList.remove('hidden');
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new KazakhKhanateGame();
}); 