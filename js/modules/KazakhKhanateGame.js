import { Web3Service } from '../services/Web3Service.js';
import { BattleSystem } from './BattleSystem.js';
import { BatyrManager } from './BatyrManager.js';
import { UIManager } from '../components/UIManager.js';
import { EventManager } from '../utils/EventManager.js';
import { quotes } from '../utils/quotes.js';

export class KazakhKhanateGame {
    constructor() {
        this.web3Service = new Web3Service();
        this.battleSystem = new BattleSystem(this);
        this.batyrManager = new BatyrManager(this);
        this.uiManager = new UIManager(this);
        this.eventManager = new EventManager(this);
        this.quotes = quotes;
        
        this.accountLocations = {};
        this.achievements = new Map();
        this.lastBattleCheck = 0;
        
        this.initialize();
    }

    async initialize() {
        try {
            await this.web3Service.initialize();
            if (this.web3Service.accounts.length > 0) {
                if (!this.web3Service.account) {
                    this.uiManager.showAccountSelection();
                } else {
                    await this.initializeWithAccount(this.web3Service.account);
                }
            } else {
                this.uiManager.showNotification('❌ No accounts found in Ganache');
            }
        } catch (error) {
            console.error('🐞 Initialization error:', error);
            this.uiManager.showNotification('❌ Failed to connect to Ganache. Make sure it is running on port 7545');
        }
    }

    async initializeWithAccount(account) {
        await this.web3Service.setAccount(account);
        await this.checkKhanateStatus();
        await this.batyrManager.loadAchievements();
        await this.battleSystem.refreshActiveBattles();
        this.uiManager.showNotification('✅ Connected to account successfully!');
    }

    async checkKhanateStatus() {
        if (!this.web3Service.contract || !this.web3Service.account) {
            this.uiManager.showKhanateCreation();
            return;
        }

        try {
            const khanateInfo = await this.web3Service.contract.methods.getKhanateStats(this.web3Service.account).call();
            this.uiManager.showGameInterface(khanateInfo);
        } catch (error) {
            if (!error.message.includes('Khanate not initialized')) {
                console.error('Khanate status check error:', error);
            }
            this.uiManager.showKhanateCreation();
        }
    }

    async createKhanate(name) {
        try {
            await this.web3Service.createKhanate(name);
            this.uiManager.showNotification('✅ Khanate created successfully!');
            await this.checkKhanateStatus();
        } catch (error) {
            console.error('🐞 Khanate creation error:', error);
            if (error.message.includes('Khanate already exists')) {
                this.uiManager.showNotification('❌ You already have a Khanate!');
            } else {
                this.uiManager.showNotification('❌ Failed to create Khanate: ' + error.message);
            }
        }
    }

    logout() {
        this.web3Service.clearAccount();
        this.uiManager.resetUI();
        this.uiManager.showAccountSelection();
        this.uiManager.showNotification('✅ Logged out successfully');
    }

    getRandomQuote(context = 'general') {
        const quoteList = context === 'kazakh' ? this.quotes.kazakhQuotes : this.quotes.strategicQuotes;
        const randomIndex = Math.floor(Math.random() * quoteList.length);
        return quoteList[randomIndex];
    }
}

// Initialize the game when the page loads
window.addEventListener('load', () => {
    window.game = new KazakhKhanateGame();
}); 