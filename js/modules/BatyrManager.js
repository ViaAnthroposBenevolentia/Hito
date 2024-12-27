export class BatyrManager {
    constructor(game) {
        this.game = game;
        this.achievements = new Map();
    }

    async loadAchievements() {
        if (!this.game.web3Service.contract || !this.game.web3Service.account) return;
        
        try {
            const stats = await this.game.web3Service.contract.methods.getPlayerStats(this.game.web3Service.account).call();
            this.achievements = new Map(Object.entries(stats));
            this.game.uiManager.updateAchievementDisplay(this.achievements);
        } catch (error) {
            if (!error.message.includes('Khanate not initialized')) {
                console.error('Error loading achievements:', error);
            }
        }
    }

    async updateBatyrList() {
        const ownedBatyrs = await this.getCurrentBatyrs();
        await this.game.uiManager.updateBatyrList(ownedBatyrs);
    }

    async getCurrentBatyrs() {
        const batyrs = [];
        for (let i = 1; i <= 5; i++) {
            const hasBatyr = await this.game.web3Service.contract.methods.hasBatyr(this.game.web3Service.account, i).call();
            if (hasBatyr) {
                batyrs.push(i);
            }
        }
        return batyrs;
    }

    async purchaseLuckyBox() {
        try {
            console.log('🎲 Purchasing lucky box...');
            const boxPrice = this.game.web3Service.web3.utils.toWei('0.1', 'ether');
            
            this.game.uiManager.showLuckyBoxAnimation();
            
            const currentBatyrs = await this.getCurrentBatyrs();
            
            const result = await this.game.web3Service.contract.methods.purchaseLuckyBox()
                .send({ from: this.game.web3Service.account, value: boxPrice });
            
            console.log('📦 Lucky box purchase result:', result);
            
            const batyrEvent = result.events.BatyrAcquired;
            if (batyrEvent) {
                const { batyrId, name } = batyrEvent.returnValues;
                const batyrStats = await this.game.web3Service.contract.methods.getBatyrStats(batyrId).call();
                
                this.game.uiManager.showBatyrReveal(batyrId, batyrStats);
                
                setTimeout(async () => {
                    await this.game.web3Service.updateBalance();
                    await this.updateBatyrList();
                }, 4000);
            } else {
                setTimeout(() => {
                    this.game.uiManager.showEmptyBoxResult();
                }, 2000);
            }
        } catch (error) {
            console.error('🐞 Lucky box purchase error:', error);
            this.game.uiManager.showNotification('❌ Failed to purchase lucky box');
            this.game.uiManager.removeLuckyBoxAnimation();
        }
    }

    async getBatyrBonuses(account) {
        let archerBonus = 0;
        let cavalryBonus = 0;
        
        for (let i = 1; i <= 5; i++) {
            const hasBatyr = await this.game.web3Service.contract.methods.hasBatyr(account, i).call();
            if (hasBatyr) {
                const batyr = await this.game.web3Service.contract.methods.getBatyrStats(i).call();
                archerBonus += parseInt(batyr.archerBonus) - 100;
                cavalryBonus += parseInt(batyr.cavalryBonus) - 100;
            }
        }
        
        return { archerBonus, cavalryBonus };
    }
} 