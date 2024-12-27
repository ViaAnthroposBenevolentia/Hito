export class EventManager {
    constructor(game) {
        this.game = game;
        this.setupEventListeners();
    }

    setupEventListeners() {
        this.setupKhanateCreation();
        this.setupTroopPurchase();
        this.setupLuckyBox();
        this.setupAccountManagement();
        this.setupBattle();
        this.setupModalHandling();
        this.setupTroopPurchaseCalculation();
    }

    setupKhanateCreation() {
        document.getElementById('create-khanate').addEventListener('click', () => {
            const name = document.getElementById('khanate-name').value;
            if (name) {
                this.game.createKhanate(name);
            } else {
                this.game.uiManager.showNotification('❌ Please enter a Khanate name');
            }
        });
    }

    setupTroopPurchase() {
        document.getElementById('purchase-troops').addEventListener('click', () => {
            document.getElementById('purchase-modal').classList.remove('hidden');
        });

        document.getElementById('confirm-purchase').addEventListener('click', () => {
            const archers = parseInt(document.getElementById('archer-amount').value) || 0;
            const cavalry = parseInt(document.getElementById('cavalry-amount').value) || 0;
            if (archers > 0 || cavalry > 0) {
                this.game.web3Service.purchaseTroops(archers, cavalry);
                document.getElementById('purchase-modal').classList.add('hidden');
            } else {
                this.game.uiManager.showNotification('❌ Please enter troop amounts');
            }
        });

        document.getElementById('cancel-purchase').addEventListener('click', () => {
            document.getElementById('purchase-modal').classList.add('hidden');
        });
    }

    setupLuckyBox() {
        document.getElementById('purchase-lucky-box').addEventListener('click', () => {
            this.game.batyrManager.purchaseLuckyBox();
        });
    }

    setupAccountManagement() {
        document.getElementById('logout').addEventListener('click', () => {
            this.game.logout();
        });

        document.getElementById('switch-account').addEventListener('click', () => {
            this.game.uiManager.showAccountSelection();
        });
    }

    setupBattle() {
        document.getElementById('battle').addEventListener('click', async () => {
            try {
                await this.game.uiManager.showBattleMap();
            } catch (error) {
                console.error('Error loading battle map:', error);
                this.game.uiManager.showNotification('❌ Failed to load opponents');
            }
        });

        document.getElementById('cancel-battle').addEventListener('click', () => {
            document.getElementById('battle-modal').classList.add('hidden');
        });
    }

    setupModalHandling() {
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

    setupTroopPurchaseCalculation() {
        const updateTotalCost = () => {
            const archers = parseInt(document.getElementById('archer-amount').value) || 0;
            const cavalry = parseInt(document.getElementById('cavalry-amount').value) || 0;
            const totalCost = (archers * 0.01) + (cavalry * 0.02);
            document.getElementById('purchase-cost').textContent = totalCost.toFixed(3);
        };

        document.getElementById('archer-amount').addEventListener('input', updateTotalCost);
        document.getElementById('cavalry-amount').addEventListener('input', updateTotalCost);
    }
} 