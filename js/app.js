class KazakhKhanateGame {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = '0x11E64FE401bD7cE975cbF56e5EeA8152d0254062';
        this.accounts = [];
        this.activeMovements = new Map();
        this.achievements = new Map();
        this.globalMovements = new Map();
        this.lastBattleCheck = 0;
        
        // Initialize accountLocations from localStorage or as empty object
        try {
            this.accountLocations = JSON.parse(localStorage.getItem('khanateLocations')) || {};
        } catch (error) {
            console.warn('Failed to load account locations from localStorage');
            this.accountLocations = {};
        }
        
        // Define available locations with names and coordinates
        this.availableLocations = [
            { name: "Aktobe Region", x: 25, y: 30 },
            { name: "Kostanay Region", x: 45, y: 25 },
            { name: "Pavlodar Region", x: 65, y: 35 },
            { name: "Kyzylorda Region", x: 35, y: 45 },
            { name: "Almaty Region", x: 55, y: 55 },
            { name: "East Kazakhstan", x: 75, y: 45 },
            { name: "Mangystau Region", x: 15, y: 55 },
            { name: "North Kazakhstan", x: 85, y: 25 },
            { name: "Shymkent Region", x: 45, y: 65 },
            { name: "Turkistan Region", x: 25, y: 75 }
        ];

        this.strategicQuotes = [
            {
                text: "The supreme art of war is to subdue the enemy without fighting.",
                author: "Sun Tzu"
            },
            {
                text: "In battle, numbers alone confer no advantage. Do not advance relying on sheer military power.",
                author: "Sun Tzu"
            },
            {
                text: "The strong warrior is not aggressive, the effective fighter is not angry.",
                author: "Lao Tzu"
            },
            {
                text: "Unity is strength... when there is teamwork and collaboration, wonderful things can be achieved.",
                author: "Mattie Stepanek"
            },
            {
                text: "The art of war is simple enough. Find out where your enemy is. Get at him as soon as you can.",
                author: "Ulysses S. Grant"
            }
        ];
        this.kazakhQuotes = [
            {
                text: "A warrior's honor is his most precious possession.",
                author: "Kazakh Proverb"
            },
            {
                text: "The steppe knows no boundaries, but the warrior knows his homeland.",
                author: "Kazakh Proverb"
            },
            {
                text: "Victory comes not to the swift, but to the wise.",
                author: "Kazakh Proverb"
            }
        ];
        this.setupEventListeners();
        this.initialize();
    }

    getRandomQuote(context = 'general') {
        const quotes = context === 'kazakh' ? this.kazakhQuotes : this.strategicQuotes;
        const randomIndex = Math.floor(Math.random() * quotes.length);
        return quotes[randomIndex];
    }

    async loadAchievements() {
        if (!this.contract || !this.account) return;
        
        try {
            const stats = await this.contract.methods.getPlayerStats(this.account).call();
            this.achievements = new Map(Object.entries(stats));
            this.updateAchievementDisplay();
        } catch (error) {
            // Only log error if it's not due to uninitialized Khanate
            if (!error.message.includes('Khanate not initialized')) {
                console.error('Error loading achievements:', error);
            }
        }
    }

    updateAchievementDisplay() {
        const badges = {
            FIRST_BLOOD: { name: "First Blood", description: "Win your first battle" },
            VETERAN: { name: "Veteran", description: "Win 10 battles" },
            WARLORD: { name: "Warlord", description: "Win 50 battles" },
            DEFENDER: { name: "Stalwart Defender", description: "Successfully defend 5 times" },
            COLLECTOR: { name: "Batyr Collector", description: "Collect all Batyrs" }
        };

        // Create achievements section if it doesn't exist
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
            const isUnlocked = this.achievements.get(key);
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

    async initialize() {
        try {
            // Check if MetaMask is installed
            if (!window.ethereum) {
                throw new Error('MetaMask is not installed. Please install MetaMask to use this dApp.');
            }

            // Check if MetaMask is locked
            const isLocked = !(await window.ethereum._metamask?.isUnlocked());
            if (isLocked) {
                throw new Error('Please unlock your MetaMask wallet to continue.');
            }

            try {
                // Request account access
                this.accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
                
                if (!this.accounts || this.accounts.length === 0) {
                    throw new Error('Please create an account in MetaMask to use this dApp.');
                }

                // Set the current account
                this.account = this.accounts[0];
                console.log('📝 Set current account:', this.account);
            } catch (error) {
                if (error.code === 4001) {
                    throw new Error('Please connect your MetaMask wallet to continue. Click the MetaMask icon and connect your account.');
                }
                throw error;
            }
            
            // Create Web3 instance using MetaMask's provider
            this.web3 = new Web3(window.ethereum);
            
            // Check if we're on BSC Testnet
            const chainId = await this.web3.eth.getChainId();
            console.log('Current Chain ID:', chainId);
            if (chainId !== 97) {
                console.log('Wrong network, switching to BSC Testnet...');
                // Show network switch prompt
                await this.switchToBSCTestnet();
            }
            
            if (this.account) {
                await this.loadContract();
                
                // Verify contract
                const code = await this.web3.eth.getCode(this.contractAddress);
                console.log('Contract code length:', code.length);
                if (code === '0x' || code === '0x0') {
                    throw new Error('No contract code at specified address');
                }
                
                // Try to call a view function to verify contract interface
                try {
                    const activeKhanates = await this.contract.methods.getActiveKhanates().call();
                    console.log('Active Khanates count:', activeKhanates.length);
                } catch (error) {
                    console.error('Contract interface verification failed:', error);
                    throw new Error('Contract interface verification failed. Please check contract address.');
                }
                
                console.log('✅ Contract verified at address:', this.contractAddress);

                // Show account selection
                this.showAccountSelection();
            }

            // Listen for account changes
            window.ethereum.on('accountsChanged', async (accounts) => {
                if (accounts.length === 0) {
                    // User disconnected all accounts
                    this.account = null;
                    this.showNotification('❌ Please connect your MetaMask wallet to continue');
                } else {
                    // Update current account
                    this.account = accounts[0];
                    console.log('Account changed to:', this.account);
                    this.showAccountSelection();
                }
            });

            // Listen for chain changes
            window.ethereum.on('chainChanged', (chainId) => {
                window.location.reload();
            });

        } catch (error) {
            console.error('🐞 Initialization error:', error);
            this.showNotification('❌ ' + error.message);
        }
    }

    async initializeWithAccount(account) {
        this.account = account;
        document.getElementById('account-address').textContent = `${this.account.substring(0, 6)}...${this.account.substring(38)}`;
        await this.updateBalance();
        await this.checkKhanateStatus();
        await this.loadAchievements();
        await this.refreshActiveBattles();
        this.showNotification('✅ Connected to account successfully!');
    }

    async getAllKhanates() {
        const khanates = new Map();
        
        try {
            console.log('Fetching active Khanates...');
            // Get total number of active Khanates
            const activeKhanates = await this.contract.methods.getActiveKhanates().call();
            console.log('Raw active Khanates:', activeKhanates);
            
            // Process each Khanate address
            for (const address of activeKhanates) {
                try {
                    const khanateInfo = await this.contract.methods.getKhanateStats(address).call();
                    if (khanateInfo && khanateInfo.name) {
                        console.log(`Found Khanate: ${address} - ${khanateInfo.name}`);
                        khanates.set(address.toLowerCase(), khanateInfo);
                    }
                } catch (error) {
                    console.error(`Error fetching Khanate info for ${address}:`, error);
                }
            }
            
            console.log('Final Khanates map:', Object.fromEntries(khanates));
            
        } catch (error) {
            console.error('Error in getAllKhanates:', error);
            this.showNotification('⚠️ Error loading Khanates. Please try again.');
        }
        
        return khanates;
    }

    async getAccountPosition(account) {
        // Ensure account is lowercase for consistent comparison
        const normalizedAccount = account.toLowerCase();
        
        try {
            const khanateInfo = await this.contract.methods.getKhanateStats(normalizedAccount).call();
            return {
                x: parseInt(khanateInfo.locationX),
                y: parseInt(khanateInfo.locationY)
            };
        } catch (error) {
            console.error('Error getting account position:', error);
            return null;
        }
    }

    async createKhanate(name, location) {
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
            const gasEstimate = await this.contract.methods.createKhanate(name, location.x, location.y)
                .estimateGas({ 
                    from: this.account,
                    gas: 500000 // Start with a higher gas limit for estimation
                });
            
            console.log('⛽ Estimated gas:', gasEstimate);
            
            // Send transaction with increased gas limit
            const result = await this.contract.methods.createKhanate(name, location.x, location.y)
                .send({ 
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.5) // 50% buffer
                });
            
            console.log('✅ Khanate creation transaction:', result);
            this.showNotification('✅ Khanate created successfully!');
            
            // Hide khanate creation section
            document.getElementById('khanate-creation').classList.add('hidden');
            
            // Initialize game interface after successful creation
            await this.initializeWithAccount(this.account);
            
            // Clear the input field
            document.getElementById('khanate-name').value = '';
            
            // Refresh the UI components
            await this.checkKhanateStatus();
            await this.updateBalance();
            await this.loadAchievements();
            await this.updateBatyrList();
            
        } catch (error) {
            console.error('🐞 Khanate creation error:', error);
            if (error.message.includes('Khanate already exists')) {
                this.showNotification('❌ You already have a Khanate!');
            } else {
                this.showNotification('❌ Failed to create Khanate: ' + error.message);
            }
        }
    }

    showKhanateCreationModal(location) {
        // Create modal for Khanate creation
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h2>Create Your Khanate in ${location.name}</h2>
                <div class="modal-body">
                    <input type="text" id="new-khanate-name" placeholder="Enter Khanate name" class="input-field">
                    <div class="button-group">
                        <button id="confirm-khanate" class="action-button">Create Khanate</button>
                        <button id="cancel-khanate" class="cancel-button">Cancel</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Add event listeners
        document.getElementById('confirm-khanate').addEventListener('click', async () => {
            const name = document.getElementById('new-khanate-name').value;
            if (name) {
                await this.createKhanate(name, location);
                modal.remove();
            } else {
                this.showNotification('❌ Please enter a Khanate name');
            }
        });

        document.getElementById('cancel-khanate').addEventListener('click', () => {
            modal.remove();
        });

        // Close on outside click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
    }

    async showAccountSelection() {
        if (!this.account) {
            this.showNotification('❌ Please connect your MetaMask wallet first');
            return;
        }

        try {
            // First check if current account has a Khanate
            try {
                const khanateInfo = await this.contract.methods.getKhanateStats(this.account).call();
                if (khanateInfo.name) {
                    // If Khanate exists, initialize game interface directly
                    await this.initializeWithAccount(this.account);
                    return;
                }
            } catch (error) {
                // If error is not about initialization, log it
                if (!error.message.includes('Khanate not initialized')) {
                    console.error('Error checking Khanate status:', error);
                }
            }

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

            // Get all active Khanates
            const allKhanates = await this.getAllKhanates();
            console.log('Existing Khanates:', allKhanates);

            // Create markers for all available locations
            this.availableLocations.forEach((location, index) => {
                // Create marker container
                const markerContainer = document.createElement('div');
                markerContainer.className = 'map-marker-container';
                markerContainer.style.left = `${location.x}%`;
                markerContainer.style.top = `${location.y}%`;

                // Find if this location is taken
                const existingKhanate = Array.from(allKhanates.entries()).find(([address]) => {
                    // Ensure address is lowercase for comparison
                    const normalizedAddress = address.toLowerCase();
                    
                    // Check if location is already assigned
                    if (this.accountLocations[normalizedAddress]) {
                        const savedLocation = this.accountLocations[normalizedAddress];
                        return savedLocation.x === location.x && savedLocation.y === location.y;
                    }
                    return false;
                });

                // Create marker
                const marker = document.createElement('div');
                marker.className = 'map-marker';
                
                if (existingKhanate) {
                    // Location is taken
                    const [owner, khanate] = existingKhanate;
                    marker.classList.add(owner.toLowerCase() === this.account.toLowerCase() ? 'current' : 'taken');
                    markerContainer.title = `${khanate.name} (${location.name})`;
                    
                    // Store location for this Khanate if not already stored
                    if (!this.accountLocations[owner.toLowerCase()]) {
                        this.accountLocations[owner.toLowerCase()] = { x: location.x, y: location.y };
                        localStorage.setItem('khanateLocations', JSON.stringify(this.accountLocations));
                    }
                    
                    // Create name label
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'khanate-name-label';
                    nameLabel.textContent = khanate.name;
                    markerContainer.appendChild(nameLabel);

                    if (owner.toLowerCase() === this.account.toLowerCase()) {
                        markerContainer.addEventListener('click', () => this.initializeWithAccount(owner));
                    }
                } else {
                    // Location is available
                    marker.classList.add('available');
                    markerContainer.title = `Available: ${location.name}`;
                    
                    // Create name label
                    const nameLabel = document.createElement('div');
                    nameLabel.className = 'khanate-name-label';
                    nameLabel.textContent = location.name;
                    markerContainer.appendChild(nameLabel);

                    // Add click handler for creating new Khanate
                    markerContainer.addEventListener('click', () => {
                        this.showKhanateCreationModal(location);
                    });
                }

                markerContainer.appendChild(marker);
                document.getElementById('account-markers').appendChild(markerContainer);
            });

        } catch (error) {
            console.error('Error setting up location selection:', error);
            this.showNotification('❌ Error loading available locations');
        }
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
        // Clean up UI elements
        document.getElementById('khanate-creation').classList.add('hidden');
        document.getElementById('khanate-info').classList.add('hidden');
        document.getElementById('batyrs').classList.add('hidden');
        document.getElementById('actions').classList.add('hidden');
        document.getElementById('battle-modal').classList.add('hidden');
        document.getElementById('purchase-modal').classList.add('hidden');
        
        // Remove achievements section if it exists
        const achievementsSection = document.getElementById('achievements-section');
        if (achievementsSection) {
            achievementsSection.remove();
        }
        
        // Remove experience bar if it exists
        const expDisplay = document.querySelector('.experience-bar');
        if (expDisplay) {
            expDisplay.remove();
        }
        
        // Clear any active movements or battles
        this.activeMovements.clear();
        this.globalMovements.clear();
        document.getElementById('troop-movements').innerHTML = '';
        
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
            console.log('Fetching balance for account:', this.account);
            const balance = await this.web3.eth.getBalance(this.account);
            console.log('Raw balance:', balance);
            const ethBalance = this.web3.utils.fromWei(balance, 'ether');
            console.log('Converted balance:', ethBalance);
            document.getElementById('account-balance').textContent = parseFloat(ethBalance).toFixed(4);
        } catch (error) {
            console.error('🐞 Balance update error:', error);
            this.showNotification('❌ Failed to update balance');
        }
    }

    async checkKhanateStatus() {
        if (!this.contract || !this.account) {
            this.showKhanateCreation();
            return;
        }

        try {
            const khanateInfo = await this.contract.methods.getKhanateStats(this.account).call();
            this.showGameInterface(khanateInfo);
        } catch (error) {
            // Only show Khanate creation if the error is not about initialization
            if (!error.message.includes('Khanate not initialized')) {
                console.error('Khanate status check error:', error);
            }
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

        // Remove old experience bar if it exists
        const oldExpDisplay = document.querySelector('.experience-bar');
        if (oldExpDisplay) {
            oldExpDisplay.remove();
        }

        // Add experience display
        const expToNextLevel = khanateInfo.level * 100;
        const currentExp = khanateInfo.experience;
        const expProgress = (currentExp / expToNextLevel) * 100;
        
        const expDisplay = document.createElement('div');
        expDisplay.className = 'experience-bar';
        expDisplay.innerHTML = `
            <div class="exp-progress" style="width: ${expProgress}%"></div>
            <span class="exp-text">EXP: ${currentExp}/${expToNextLevel}</span>
        `;
        
        // Insert after level display
        const levelElement = document.getElementById('player-level').parentElement;
        levelElement.insertAdjacentElement('afterend', expDisplay);

        // Remove old achievements section if it exists
        const oldAchievementsSection = document.getElementById('achievements-section');
        if (oldAchievementsSection) {
            oldAchievementsSection.remove();
        }

        this.updateBatyrList();
        this.updateAchievementDisplay();
    }

    showKhanateCreation() {
        document.getElementById('khanate-creation').classList.remove('hidden');
        document.getElementById('khanate-info').classList.add('hidden');
        document.getElementById('batyrs').classList.add('hidden');
        document.getElementById('actions').classList.add('hidden');
        document.getElementById('battle-modal').classList.add('hidden');
        document.getElementById('purchase-modal').classList.add('hidden');
    }

    async purchaseTroops(archers, cavalry) {
        try {
            const archerCost = this.web3.utils.toWei('0.01', 'ether');
            const cavalryCost = this.web3.utils.toWei('0.02', 'ether');
            const totalCost = (archers * archerCost) + (cavalry * cavalryCost);

            await this.contract.methods.purchaseTroops(archers, cavalry)
                .send({ from: this.account, value: totalCost });
            
            this.showNotification(' Troops purchased successfully!');
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
            
            // Show lucky box animation
            this.showLuckyBoxAnimation();
            
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
                
                // Show Batyr reveal animation
                this.showBatyrReveal(batyrId, batyrStats);
                
                // Update UI after animation
                setTimeout(async () => {
                    await this.updateBalance();
                    await this.updateBatyrList();
                }, 4000);
            } else {
                // Show empty box after animation
                setTimeout(() => {
                    this.showEmptyBoxResult();
                }, 2000);
            }
        } catch (error) {
            console.error('🐞 Lucky box purchase error:', error);
            this.showNotification('❌ Failed to purchase lucky box');
            this.removeLuckyBoxAnimation();
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
        
        // Add CSS class for notifications with buttons
        if (message.includes('view-map-button')) {
            notification.classList.add('with-button');
        } else {
            notification.classList.remove('with-button');
        }
        
        notificationText.innerHTML = message; // Allow HTML in notifications
        notification.classList.remove('hidden');
        
        // Clear any existing timeout
        if (this.notificationTimeout) {
            clearTimeout(this.notificationTimeout);
        }
        
        // Set new timeout
        this.notificationTimeout = setTimeout(() => {
            notification.classList.add('hidden');
            notification.classList.remove('with-button');
        }, duration);
    }

    async battle(opponent) {
        try {
            // Check if player is already in battle
            const activeBattles = await this.checkActiveBattles();
            if (activeBattles.length > 0) {
                throw new Error('You already have an active battle. Wait for it to finish.');
            }

            console.log('⚔️ Initiating battle with opponent:', opponent);
            
            // Hide achievements section and details modal
            const achievementsSection = document.getElementById('achievements-section');
            if (achievementsSection) {
                achievementsSection.classList.add('hidden');
            }
            
            // Remove any existing Khanate details modal
            const detailsModal = document.querySelector('.khanate-details-modal');
            if (detailsModal) {
                detailsModal.remove();
            }

            // Hide battle modal
            document.getElementById('battle-modal').classList.add('hidden');

            // Verify opponent's Khanate exists and has troops
            try {
                const opponentStats = await this.contract.methods.getKhanateStats(opponent).call();
                console.log('Opponent stats:', opponentStats);
            } catch (error) {
                throw new Error('Invalid opponent or opponent has no Khanate');
            }

            // Verify own troops
            const myStats = await this.contract.methods.getKhanateStats(this.account).call();
            if (myStats.archers === '0' && myStats.cavalry === '0') {
                throw new Error('You have no troops to battle with');
            }

            // Get positions from blockchain
            const sourcePos = await this.getAccountPosition(this.account);
            const targetPos = await this.getAccountPosition(opponent);
            
            if (!sourcePos || !targetPos) {
                throw new Error('Could not determine battle positions');
            }

            // Initiate battle transaction
            console.log('Initiating battle transaction...');
            const result = await this.contract.methods.initiateBattle(opponent)
                .send({ 
                    from: this.account,
                    gas: 300000
                });
            
            console.log('Battle initiated successfully:', result);
            
            // Get battle info
            const battleId = result.events.BattleInitiated.returnValues.battleId;
            const battle = await this.contract.methods.activeBattles(battleId).call();
            const travelTime = parseInt(battle.travelTime) * 1000; // Convert to milliseconds
            
            // Create troop movement animation
            const movementId = Date.now();
            this.createTroopMovement(sourcePos, targetPos, travelTime, movementId);
            
            // Store battle data
            const battleData = {
                opponent,
                startTime: Date.now(),
                travelTime,
                movementId,
                battleId,
                sourcePos,
                targetPos
            };
            
            // Add to active movements
            this.activeMovements.set(movementId, battleData);
            
            // Show notification
            this.showNotification(`
                ⚔️ Troops are marching to battle! ETA: ${Math.ceil(travelTime / 1000)} seconds
                <button class="view-map-button" onclick="window.game.viewBattleOnMap()">View on Map</button>
            `, travelTime + 2000);
            
        } catch (error) {
            console.error('🐞 Battle error:', error);
            this.showNotification('❌ Battle failed: ' + error.message);
        }
    }

    viewBattleOnMap() {
        // Hide the notification
        const notification = document.getElementById('notification');
        notification.classList.add('hidden');
        
        // Show the battle map
        this.showBattleMap();
    }

    calculateDistance(pos1, pos2) {
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    calculateTravelTime(distance) {
        // Base time: 1 second per 10 units of distance
        return (distance * 100) + 2000; // Minimum 2 seconds
    }

    createTroopMovement(start, end, duration, movementId) {
        if (!start || !end || !start.x || !start.y || !end.x || !end.y) {
            console.error('Invalid positions for troop movement:', { start, end });
            return;
        }

        const movement = {
            start,
            end,
            startTime: Date.now(),
            duration,
            movementId
        };
        
        this.globalMovements.set(movementId, movement);
        this.renderTroopMovement(movement);
    }

    renderTroopMovement(movement) {
        const movementsContainer = document.getElementById('troop-movements');
        const existingPath = document.getElementById(`path-${movement.movementId}`);
        if (existingPath) {
            existingPath.remove();
        }

        // Calculate path
        const dx = movement.end.x - movement.start.x;
        const dy = movement.end.y - movement.start.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;

        // Create path container
        const pathContainer = document.createElement('div');
        pathContainer.className = 'troop-path-container';
        pathContainer.id = `path-${movement.movementId}`;
        pathContainer.style.left = `${movement.start.x}%`;
        pathContainer.style.top = `${movement.start.y}%`;

        // Create path
        const path = document.createElement('div');
        path.className = 'troop-path';
        path.style.width = `${distance}%`;
        path.style.transform = `rotate(${angle}deg)`;
        
        // Create troops
        const troops = document.createElement('div');
        troops.className = 'moving-troops';
        troops.style.animation = `moveAlongPath ${movement.duration}ms linear`;

        // Add troops image
        const troopsImg = document.createElement('img');
        troopsImg.src = 'images/troops/troops.png';
        troopsImg.alt = 'Moving Troops';
        troopsImg.onerror = () => {
            troops.innerHTML = '⚔️';
            troops.style.fontSize = '20px';
        };
        troops.appendChild(troopsImg);

        // Add timer
        const timer = document.createElement('div');
        timer.className = 'travel-timer';
        timer.id = `timer-${movement.movementId}`;
        troops.appendChild(timer);
        
        // Update timer
        const updateTimer = () => {
            const elapsed = Date.now() - movement.startTime;
            const remaining = Math.max(0, Math.ceil((movement.duration - elapsed) / 1000));
            if (timer) timer.textContent = `${remaining}s`;
            if (remaining > 0) {
                requestAnimationFrame(updateTimer);
            }
        };
        requestAnimationFrame(updateTimer);
        
        // Assemble and add to DOM
        path.appendChild(troops);
        pathContainer.appendChild(path);
        movementsContainer.appendChild(pathContainer);
        
        // Clean up after animation
        setTimeout(() => {
            pathContainer.remove();
            this.globalMovements.delete(movement.movementId);
        }, movement.duration);
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
        
        setTimeout(() => {
            animation.remove();
        }, 3000);
    }

    async executeBattle(battleId) {
        try {
            console.log('Executing battle with ID:', battleId);
            
            // Check if battle exists and is ready
            const battle = await this.contract.methods.activeBattles(battleId).call();
            console.log('Battle status:', battle);
            
            const currentTime = Math.floor(Date.now() / 1000);
            const battleStartTime = parseInt(battle.startTime);
            const travelTime = parseInt(battle.travelTime);
            
            if (currentTime < battleStartTime + travelTime) {
                throw new Error(`Troops still traveling. Please wait ${battleStartTime + travelTime - currentTime} seconds.`);
            }
            
            // Execute battle with proper gas limit
            const result = await this.contract.methods.executeBattle(battleId)
                .send({ 
                    from: this.account,
                    gas: 300000
                });
            
            console.log('Battle execution result:', result);
            
            // Process battle results
            await this.processBattleResults(battleId, result);
            
        } catch (error) {
            console.error('Battle execution error:', error);
            
            // Extract the revert reason if available
            let errorMessage = error.message;
            if (error.message.includes('execution reverted')) {
                try {
                    const revertReason = error.message.match(/reason string "(.+?)"/)[1];
                    errorMessage = revertReason;
                } catch (e) {
                    // If we can't extract the reason, use a more user-friendly message
                    errorMessage = 'Battle execution failed. The battle may have already been resolved or troops are still traveling.';
                }
            }
            
            this.showNotification('❌ Battle failed: ' + errorMessage);
        }
    }

    removeTroopMovement(movementId) {
        const path = document.getElementById(`path-${movementId}`);
        if (path) path.remove();
    }

    async speedUpTroops(movementId) {
        const movement = this.globalMovements.get(movementId);
        if (!movement) return;
        
        try {
            // Get battle ID from active battles
            const activeBattles = await this.checkActiveBattles();
            const battle = activeBattles.find(b => 
                Date.now() - (parseInt(b.startTime) * 1000) < parseInt(b.travelTime) * 1000
            );
            
            if (!battle) {
                throw new Error('No active battle found to speed up');
            }
            
            // Call the speed up function
            await this.contract.methods.speedUpBattle(battle.battleId)
                .send({
                    from: this.account,
                    value: this.web3.utils.toWei('0.3', 'ether'),
                    gas: 300000
                });
            
            // Remove the movement animation
            const pathContainer = document.getElementById(`path-${movementId}`);
            if (pathContainer) {
                pathContainer.remove();
            }
            
            this.globalMovements.delete(movementId);
            this.showNotification('⚡ Battle speed up successful!');
            
            // Execute battle immediately
            await this.executeBattle(battle.battleId);
            
        } catch (error) {
            console.error('Speed up error:', error);
            this.showNotification('❌ Failed to speed up battle: ' + error.message);
        }
    }

    async processBattleResults(battleId, result) {
        if (!result.events.BattleResult) {
            console.error('No battle result event found');
            return;
        }

        const { winner, loser, experienceGained } = result.events.BattleResult.returnValues;
        const isWinner = winner.toLowerCase() === this.account.toLowerCase();
        
        // Get updated stats after the battle
        const myStats = await this.contract.methods.getKhanateStats(this.account).call();
        
        // Show battle results with celebration for victory
        if (isWinner) {
            this.showCelebration();
            this.showNotification(`🎉 Victory! Gained ${experienceGained} experience!`, 6000);
        } else {
            this.showNotification(`💔 Defeat!`, 6000);
        }
        
        // Update UI
        await this.checkKhanateStatus();
        await this.updateBalance();
        await this.loadAchievements();
        
        // Show achievement badges if any were earned
        const newAchievements = await this.contract.methods.getPlayerStats(this.account).call();
        Object.entries(newAchievements).forEach(([achievement, earned]) => {
            if (earned && !this.achievements.get(achievement)) {
                this.showAchievementBadge(achievement);
            }
        });
        this.achievements = new Map(Object.entries(newAchievements));
    }

    async calculatePowerRatio(stronger, weaker) {
        const strongerPower = await this.calculateTotalPower(stronger);
        const weakerPower = await this.calculateTotalPower(weaker);
        return strongerPower / weakerPower;
    }

    async updateBatyrList() {
        const batyrList = document.querySelector('.batyr-list');
        batyrList.innerHTML = '';

        // Get current Batyr ownership
        const ownedBatyrs = new Set();
        for (let i = 1; i <= 5; i++) {
            try {
                const hasBatyr = await this.contract.methods.hasBatyr(this.account, i).call();
                if (hasBatyr) {
                    ownedBatyrs.add(i);
                }
            } catch (error) {
                console.error(`Error checking Batyr ${i}:`, error);
            }
        }

        // Display all Batyrs (owned and unowned)
        for (let id = 1; id <= 5; id++) {
            try {
                const batyrStats = await this.contract.methods.getBatyrStats(id).call();
                const batyrCard = document.createElement('div');
                batyrCard.className = `batyr-card ${ownedBatyrs.has(id) ? '' : 'locked'}`;
                
                if (ownedBatyrs.has(id)) {
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
                } else {
                    batyrCard.innerHTML = `
                        <img src="images/batyrs/batyr${id}.png" alt="Unknown Batyr">
                        <div class="batyr-preview">
                            <h4>${batyrStats.name}</h4>
                            <p>${batyrStats.ability}</p>
                        </div>
                    `;
                }
                
                batyrList.appendChild(batyrCard);
            } catch (error) {
                console.error(`Error loading Batyr ${id}:`, error);
            }
        }
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
        
        // First, fade out the GIF
        animation.style.opacity = '0';
        
        // After GIF fades out, show the Batyr
        setTimeout(() => {
            animation.style.display = 'none';
            resultDiv.innerHTML = `
                <img src="images/batyrs/batyr${batyrId}.png" alt="${batyrStats.name}" class="batyr-reveal">
                <h3>${batyrStats.name}</h3>
                <p>${batyrStats.ability}</p>
            `;
            resultDiv.classList.add('show');
            
            // Play celebration effect
            this.showCelebration();
            
            // Show notification
            this.showNotification(`
                🎉 Congratulations! You acquired ${batyrStats.name}!
                ${batyrStats.ability}: ${batyrStats.description}
            `, 6000);
            
            // Remove animation after delay
            setTimeout(() => {
                this.removeLuckyBoxAnimation();
            }, 4000);
        }, 500);
    }

    showEmptyBoxResult() {
        const overlay = document.getElementById('luckyBoxOverlay');
        const animation = overlay.querySelector('.lucky-box-animation');
        const resultDiv = overlay.querySelector('.lucky-box-result');
        
        // First, fade out the GIF
        animation.style.opacity = '0';
        animation.style.transition = 'opacity 0.5s ease';
        
        // After GIF fades out, show the result
        setTimeout(() => {
            animation.style.display = 'none';
            resultDiv.innerHTML = `
                <h3>Better luck next time!</h3>
                <p>No Batyr this time...</p>
            `;
            resultDiv.classList.add('show');
            
            // Remove everything after showing the result
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

        // Add event listener for battle modal close button
        document.getElementById('cancel-battle').addEventListener('click', () => {
            document.getElementById('battle-modal').classList.add('hidden');
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

    async showOpponentDetails(account, khanateInfo) {
        const opponentList = document.getElementById('opponent-list');
        
        // Get own stats
        const myStats = await this.contract.methods.getKhanateStats(this.account).call();
        
        // Calculate army powers
        const myPower = await this.calculateTotalPower(this.account);
        const opponentPower = await this.calculateTotalPower(account);
        
        // Calculate win chance (simplified version)
        const totalPower = myPower + opponentPower;
        const winChance = Math.min(90, Math.max(10, (myPower / totalPower) * 100));
        
        // Get Batyr bonuses
        const myBonuses = await this.getBatyrBonuses(this.account);
        const opponentBonuses = await this.getBatyrBonuses(account);
        
        opponentList.innerHTML = `
            <div class="battle-comparison">
                <div class="army-comparison">
                    <div class="my-army">
                        <h3>Your Army</h3>
                        <div class="army-stats">
                            <div class="troop-stat">
                                <img src="images/troops/archer.png" alt="Archers">
                                <span>${myStats.archers} Archers</span>
                            </div>
                            <div class="troop-stat">
                                <img src="images/troops/cavalry.png" alt="Cavalry">
                                <span>${myStats.cavalry} Cavalry</span>
                            </div>
                        </div>
                        <div class="bonuses">
                            ${myBonuses.archerBonus > 0 ? `<div class="bonus">+${myBonuses.archerBonus}% Archer Bonus</div>` : ''}
                            ${myBonuses.cavalryBonus > 0 ? `<div class="bonus">+${myBonuses.cavalryBonus}% Cavalry Bonus</div>` : ''}
                        </div>
                    </div>
                    
                    <div class="battle-prediction">
                        <div class="win-chance" style="--chance: ${winChance}%">
                            <div class="chance-bar"></div>
                            <span>${Math.round(winChance)}% Win Chance</span>
                        </div>
                        <div class="power-comparison">
                            <div>Power: ${myPower}</div>
                            <div>vs</div>
                            <div>Power: ${opponentPower}</div>
                        </div>
                    </div>
                    
                    <div class="opponent-army">
                        <h3>${khanateInfo.name}'s Army</h3>
                        <div class="army-stats">
                            <div class="troop-stat">
                                <img src="images/troops/archer.png" alt="Archers">
                                <span>${khanateInfo.archers} Archers</span>
                            </div>
                            <div class="troop-stat">
                                <img src="images/troops/cavalry.png" alt="Cavalry">
                                <span>${khanateInfo.cavalry} Cavalry</span>
                            </div>
                        </div>
                        <div class="bonuses">
                            ${opponentBonuses.archerBonus > 0 ? `<div class="bonus">+${opponentBonuses.archerBonus}% Archer Bonus</div>` : ''}
                            ${opponentBonuses.cavalryBonus > 0 ? `<div class="bonus">+${opponentBonuses.cavalryBonus}% Cavalry Bonus</div>` : ''}
                        </div>
                    </div>
                </div>
                
                <div class="battle-tips">
                    <h4>Battle Tips</h4>
                    ${this.getBattleTips(winChance, myPower, opponentPower)}
                </div>
                
                <button class="action-button battle-button" onclick="window.game.battle('${account}')">
                    <span class="button-icon">⚔️</span>
                    Start Battle
                </button>
            </div>
        `;
    }

    getBattleTips(winChance, myPower, opponentPower) {
        const tips = [];
        
        if (winChance < 40) {
            tips.push("⚠️ This battle is risky! Consider recruiting more troops first.");
            if (myPower < opponentPower * 0.5) {
                tips.push("❌ High risk of heavy losses. Not recommended!");
            }
        } else if (winChance > 70) {
            tips.push("✅ You have a strong advantage in this battle!");
            if (myPower > opponentPower * 2) {
                tips.push("💪 Overwhelming force! Expect minimal losses.");
            }
        } else {
            tips.push("️ This is an even match. Prepare for some losses.");
        }
        
        return tips.map(tip => `<div class="battle-tip">${tip}</div>`).join('');
    }

    async getBatyrBonuses(account) {
        let archerBonus = 0;
        let cavalryBonus = 0;
        
        for (let i = 1; i <= 5; i++) {
            const hasBatyr = await this.contract.methods.hasBatyr(account, i).call();
            if (hasBatyr) {
                const batyr = await this.contract.methods.getBatyrStats(i).call();
                archerBonus += parseInt(batyr.archerBonus) - 100;
                cavalryBonus += parseInt(batyr.cavalryBonus) - 100;
            }
        }
        
        return { archerBonus, cavalryBonus };
    }

    async calculateTotalPower(account) {
        try {
            const stats = await this.contract.methods.getKhanateStats(account).call();
            const archerPower = parseInt(stats.archers) * 10;
            const cavalryPower = parseInt(stats.cavalry) * 20;
            let totalPower = archerPower + cavalryPower;
            
            // Apply Batyr bonuses
            const bonuses = await this.getBatyrBonuses(account);
            totalPower *= (1 + (bonuses.archerBonus + bonuses.cavalryBonus) / 200);
            
            return Math.round(totalPower);
        } catch (error) {
            console.error('Error calculating power:', error);
            return 0;
        }
    }

    async showBattleMap() {
        try {
            const battleModal = document.getElementById('battle-modal');
            battleModal.classList.remove('hidden');
            
            // Clear existing markers
            const battleMarkers = document.getElementById('battle-markers');
            battleMarkers.innerHTML = '';
            
            // Get all Khanates
            const allKhanates = await this.getAllKhanates();
            console.log('All Khanates for battle:', allKhanates);
            
            // Get current player's Khanate
            const currentKhanate = await this.contract.methods.getKhanateStats(this.account).call();
            if (!currentKhanate || !currentKhanate.name) {
                battleModal.querySelector('#battle-message').textContent = 'You need to create a Khanate first!';
                return;
            }
            
            // Filter out the current account's Khanate for opponents list
            const opponents = Array.from(allKhanates.entries())
                .filter(([address]) => address.toLowerCase() !== this.account.toLowerCase());
            
            console.log('Current account:', this.account);
            console.log('Available opponents:', opponents);
            
            const battleMessage = battleModal.querySelector('#battle-message');
            if (opponents.length === 0) {
                battleMessage.textContent = 'No other players in the game yet. You are the first Khan!';
            } else {
                battleMessage.textContent = `Found ${opponents.length} opponent(s). Click on a Khanate to view battle details:`;
            }
            
            // Show current player's Khanate (in green)
            const currentPosition = await this.getAccountPosition(this.account);
            console.log('Current player position:', currentPosition);
            
            const currentMarker = document.createElement('div');
            currentMarker.className = 'map-marker-container';
            currentMarker.style.left = `${currentPosition.x}%`;
            currentMarker.style.top = `${currentPosition.y}%`;
            
            const currentDot = document.createElement('div');
            currentDot.className = 'map-marker current';
            
            const currentLabel = document.createElement('div');
            currentLabel.className = 'khanate-name-label';
            currentLabel.textContent = currentKhanate.name + ' (You)';
            
            currentMarker.appendChild(currentDot);
            currentMarker.appendChild(currentLabel);
            battleMarkers.appendChild(currentMarker);
            
            // Create markers for each opponent
            for (const [address, khanate] of opponents) {
                console.log(`Creating marker for opponent: ${address} - ${khanate.name}`);
                const position = await this.getAccountPosition(address);
                console.log('Opponent position:', position);
                
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
                nameLabel.textContent = khanate.name;
                
                // Add click handler for battle
                markerContainer.addEventListener('click', () => this.showKhanateDetails(address, khanate));
                
                // Add hover effect
                markerContainer.addEventListener('mouseenter', (e) => this.showTooltip(e, address));
                markerContainer.addEventListener('mouseleave', () => this.hideTooltip());
                
                markerContainer.appendChild(marker);
                markerContainer.appendChild(nameLabel);
                battleMarkers.appendChild(markerContainer);
            }
            
        } catch (error) {
            console.error('Error showing battle map:', error);
            this.showNotification('❌ Error loading battle map');
        }
    }

    async checkActiveBattles() {
        // Cache check for 5 seconds to avoid too many calls
        if (Date.now() - this.lastBattleCheck < 5000) {
            return this.activeBattles || [];
        }

        try {
            // Get battle count from contract events instead
            const activeBattles = [];
            const events = await this.contract.getPastEvents('BattleInitiated', {
                fromBlock: 0,
                toBlock: 'latest'
            });
            
            for (const event of events) {
                const battleId = event.returnValues.battleId;
                const battle = await this.contract.methods.activeBattles(battleId).call();
                
                // Check if battle is valid, not resolved, and involves the current account
                if (battle.attacker !== '0x0000000000000000000000000000000000000000' && // Valid battle
                    !battle.resolved && 
                    (battle.attacker.toLowerCase() === this.account.toLowerCase() || 
                     battle.defender.toLowerCase() === this.account.toLowerCase())) {
                    
                    // Check if battle should be completed based on time
                    const currentTime = Math.floor(Date.now() / 1000);
                    const battleStartTime = parseInt(battle.startTime);
                    const travelTime = parseInt(battle.travelTime);
                    
                    if (currentTime < battleStartTime + travelTime) {
                        // Battle is still in progress
                        activeBattles.push({...battle, battleId});
                    } else {
                        try {
                            // Check if battle can be executed
                            const canExecute = await this.contract.methods.activeBattles(battleId).call();
                            if (!canExecute.resolved) {
                                await this.contract.methods.executeBattle(battleId).send({
                                    from: this.account,
                                    gas: 300000
                                });
                            }
                        } catch (error) {
                            // Only log error if it's not about troops still traveling
                            if (!error.message.includes('Troops still traveling')) {
                                console.error('Error executing ready battle:', error);
                            }
                            // If battle can't be executed yet, add it to active battles
                            activeBattles.push({...battle, battleId});
                        }
                    }
                }
            }
            
            this.activeBattles = activeBattles;
            this.lastBattleCheck = Date.now();
            return activeBattles;
        } catch (error) {
            console.error('Error checking active battles:', error);
            return [];
        }
    }

    async refreshActiveBattles() {
        const activeBattles = await this.checkActiveBattles();
        
        // Clear old movements
        this.globalMovements.clear();
        document.getElementById('troop-movements').innerHTML = '';
        
        // Recreate movements for active battles
        for (const battle of activeBattles) {
            if (!battle.resolved) {
                const sourcePos = this.accountLocations[battle.attacker];
                const targetPos = this.accountLocations[battle.defender];
                const elapsed = (Date.now() / 1000) - parseInt(battle.startTime);
                const totalTime = parseInt(battle.travelTime) * 1000;
                const remaining = Math.max(0, totalTime - (elapsed * 1000));
                
                if (remaining > 0) {
                    const movementId = Date.now() + Math.random();
                    this.createTroopMovement(sourcePos, targetPos, totalTime, movementId);
                }
            }
        }
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
        setTimeout(() => {
            badgeElement.remove();
        }, 5000);
    }

    async showKhanateDetails(account, khanateInfo) {
        // Hide achievements section if it exists
        const achievementsSection = document.getElementById('achievements-section');
        if (achievementsSection) {
            achievementsSection.style.display = 'none';
        }

        // Create details modal
        const detailsModal = document.createElement('div');
        detailsModal.className = 'modal khanate-details-modal large-battle-window';
        
        // Add cleanup function to restore achievements when modal is closed
        const cleanup = () => {
            if (achievementsSection) {
                achievementsSection.style.display = '';
            }
            detailsModal.remove();
        };

        // Get battle comparison data
        const myStats = await this.contract.methods.getKhanateStats(this.account).call();
        const myPower = await this.calculateTotalPower(this.account);
        const opponentPower = await this.calculateTotalPower(account);
        const totalPower = myPower + opponentPower;
        const winChance = Math.min(90, Math.max(10, (myPower / totalPower) * 100));
        const myBonuses = await this.getBatyrBonuses(this.account);
        const opponentBonuses = await this.getBatyrBonuses(account);
        
        // Get random strategic quote
        const quote = this.getRandomQuote('kazakh');
        
        detailsModal.innerHTML = `
            <div class="modal-content khanate-details-content">
                <div class="modal-header">
                    <h2>Battle Details</h2>
                    <button class="close-button">×</button>
                </div>
                
                <div class="strategic-quote">
                    <p>${quote.text}</p>
                    <cite>- ${quote.author}</cite>
                </div>
                
                <div class="battle-comparison">
                    <div class="army-comparison">
                        <div class="my-army">
                            <h3>Your Army</h3>
                            <div class="army-stats">
                                <div class="troop-stat">
                                    <img src="images/troops/archer.png" alt="Archers">
                                    <span>${myStats.archers} Archers</span>
                                </div>
                                <div class="troop-stat">
                                    <img src="images/troops/cavalry.png" alt="Cavalry">
                                    <span>${myStats.cavalry} Cavalry</span>
                                </div>
                            </div>
                            <div class="bonuses">
                                ${myBonuses.archerBonus > 0 ? `<div class="bonus">+${myBonuses.archerBonus}% Archer Bonus</div>` : ''}
                                ${myBonuses.cavalryBonus > 0 ? `<div class="bonus">+${myBonuses.cavalryBonus}% Cavalry Bonus</div>` : ''}
                            </div>
                        </div>
                        
                        <div class="battle-prediction">
                            <div class="win-chance" style="--chance: ${winChance}%">
                                <div class="chance-bar"></div>
                                <span>${Math.round(winChance)}% Win Chance</span>
                            </div>
                            <div class="power-comparison">
                                <div>Power: ${myPower}</div>
                                <div>vs</div>
                                <div>Power: ${opponentPower}</div>
                            </div>
                        </div>
                        
                        <div class="opponent-army">
                            <h3>${khanateInfo.name}'s Army</h3>
                            <div class="army-stats">
                                <div class="troop-stat">
                                    <img src="images/troops/archer.png" alt="Archers">
                                    <span>${khanateInfo.archers} Archers</span>
                                </div>
                                <div class="troop-stat">
                                    <img src="images/troops/cavalry.png" alt="Cavalry">
                                    <span>${khanateInfo.cavalry} Cavalry</span>
                                </div>
                            </div>
                            <div class="bonuses">
                                ${opponentBonuses.archerBonus > 0 ? `<div class="bonus">+${opponentBonuses.archerBonus}% Archer Bonus</div>` : ''}
                                ${opponentBonuses.cavalryBonus > 0 ? `<div class="bonus">+${opponentBonuses.cavalryBonus}% Cavalry Bonus</div>` : ''}
                            </div>
                        </div>
                    </div>
                    
                    <div class="battle-tips">
                        <h4>Battle Tips</h4>
                        ${this.getBattleTips(winChance, myPower, opponentPower)}
                    </div>
                    
                    <div class="troop-loss-preview">
                        <h4>Potential Losses</h4>
                        <div class="loss-scenarios">
                            <div class="loss-scenario">
                                <h5>If You Win</h5>
                                <p>Archers: 5-15%</p>
                                <p>Cavalry: 5-15%</p>
                            </div>
                            <div class="loss-scenario">
                                <h5>If You Lose</h5>
                                <p>Archers: 30-50%</p>
                                <p>Cavalry: 30-50%</p>
                            </div>
                        </div>
                    </div>
                    
                    <button class="action-button battle-button" onclick="window.game.battle('${account}')">
                        <span class="button-icon">⚔️</span>
                        Start Battle
                    </button>
                </div>
            </div>
        `;
        
        // Add close button functionality
        const closeButton = detailsModal.querySelector('.close-button');
        closeButton.addEventListener('click', cleanup);
        
        // Close on outside click
        detailsModal.addEventListener('click', (e) => {
            if (e.target === detailsModal) {
                cleanup();
            }
        });
        
        document.body.appendChild(detailsModal);
    }

    // Add new method to handle network switching
    async switchToBSCTestnet() {
        try {
            await window.ethereum.request({
                method: 'wallet_switchEthereumChain',
                params: [{ chainId: '0x61' }], // 97 in hex
            });
        } catch (switchError) {
            // This error code indicates that the chain has not been added to MetaMask
            if (switchError.code === 4902) {
                try {
                    await window.ethereum.request({
                        method: 'wallet_addEthereumChain',
                        params: [{
                            chainId: '0x61',
                            chainName: 'BSC Testnet',
                            nativeCurrency: {
                                name: 'tBNB',
                                symbol: 'tBNB',
                                decimals: 18
                            },
                            rpcUrls: ['https://data-seed-prebsc-1-s1.binance.org:8545'],
                            blockExplorerUrls: ['https://testnet.bscscan.com']
                        }]
                    });
                } catch (addError) {
                    throw new Error('Failed to add BSC Testnet to MetaMask');
                }
            } else {
                throw new Error('Failed to switch to BSC Testnet');
            }
        }
    }

    // Add a reconnect method
    async reconnectWallet() {
        try {
            await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{
                    eth_accounts: {}
                }]
            });
            window.location.reload();
        } catch (error) {
            console.error('Reconnection error:', error);
            this.showNotification('❌ Failed to reconnect wallet. Please try again.');
        }
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new KazakhKhanateGame();
}); 