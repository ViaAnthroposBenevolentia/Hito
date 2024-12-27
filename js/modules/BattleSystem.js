export class BattleSystem {
    constructor(game) {
        this.game = game;
        this.activeMovements = new Map();
        this.globalMovements = new Map();
        this.activeBattles = [];
    }

    async battle(opponent) {
        try {
            const activeBattles = await this.checkActiveBattles();
            if (activeBattles.length > 0) {
                throw new Error('You already have an active battle. Wait for it to finish.');
            }

            // Hide UI elements
            this.game.uiManager.hideBattleElements();

            // Verify opponent's Khanate and troops
            const opponentStats = await this.game.web3Service.contract.methods.getKhanateStats(opponent).call();
            const myStats = await this.game.web3Service.contract.methods.getKhanateStats(this.game.web3Service.account).call();
            
            if (myStats.archers === '0' && myStats.cavalry === '0') {
                throw new Error('You have no troops to battle with');
            }

            // Get positions
            const sourcePos = this.game.accountLocations[this.game.web3Service.account];
            const targetPos = this.game.accountLocations[opponent];
            
            // Initiate battle transaction
            const result = await this.game.web3Service.contract.methods.initiateBattle(opponent)
                .send({ 
                    from: this.game.web3Service.account,
                    gas: 300000
                });
            
            const battleId = result.events.BattleInitiated.returnValues.battleId;
            const battle = await this.game.web3Service.contract.methods.activeBattles(battleId).call();
            const travelTime = parseInt(battle.travelTime) * 1000;
            
            // Create movement animation
            const movementId = Date.now();
            this.createTroopMovement(sourcePos, targetPos, travelTime, movementId);
            
            // Store battle data
            const battleData = { opponent, startTime: Date.now(), travelTime, movementId, battleId };
            this.activeMovements.set(movementId, battleData);
            
            this.game.uiManager.showBattleNotification(travelTime);
            
        } catch (error) {
            console.error('🐞 Battle error:', error);
            this.game.uiManager.showNotification('❌ Battle failed: ' + error.message);
        }
    }

    async checkActiveBattles() {
        if (Date.now() - this.game.lastBattleCheck < 5000) {
            return this.activeBattles;
        }

        try {
            const activeBattles = [];
            const events = await this.game.web3Service.contract.getPastEvents('BattleInitiated', {
                fromBlock: 0,
                toBlock: 'latest'
            });
            
            for (const event of events) {
                const battleId = event.returnValues.battleId;
                const battle = await this.game.web3Service.contract.methods.activeBattles(battleId).call();
                
                if (this.isBattleActive(battle, this.game.web3Service.account)) {
                    await this.processBattle(battle, battleId, activeBattles);
                }
            }
            
            this.activeBattles = activeBattles;
            this.game.lastBattleCheck = Date.now();
            return activeBattles;
        } catch (error) {
            console.error('Error checking active battles:', error);
            return [];
        }
    }

    isBattleActive(battle, account) {
        return battle.attacker !== '0x0000000000000000000000000000000000000000' && 
               !battle.resolved && 
               (battle.attacker.toLowerCase() === account.toLowerCase() || 
                battle.defender.toLowerCase() === account.toLowerCase());
    }

    async processBattle(battle, battleId, activeBattles) {
        const currentTime = Math.floor(Date.now() / 1000);
        const battleStartTime = parseInt(battle.startTime);
        const travelTime = parseInt(battle.travelTime);
        
        if (currentTime < battleStartTime + travelTime) {
            activeBattles.push({...battle, battleId});
        } else {
            try {
                const canExecute = await this.game.web3Service.contract.methods.activeBattles(battleId).call();
                if (!canExecute.resolved) {
                    await this.executeBattle(battleId);
                }
            } catch (error) {
                if (!error.message.includes('Troops still traveling')) {
                    console.error('Error executing ready battle:', error);
                }
                activeBattles.push({...battle, battleId});
            }
        }
    }

    async executeBattle(battleId) {
        try {
            const result = await this.game.web3Service.contract.methods.executeBattle(battleId)
                .send({ 
                    from: this.game.web3Service.account,
                    gas: 300000
                });
            
            await this.processBattleResults(battleId, result);
            
        } catch (error) {
            let errorMessage = error.message;
            if (error.message.includes('execution reverted')) {
                try {
                    errorMessage = error.message.match(/reason string "(.+?)"/)[1];
                } catch (e) {
                    errorMessage = 'Battle execution failed. The battle may have already been resolved or troops are still traveling.';
                }
            }
            this.game.uiManager.showNotification('❌ Battle failed: ' + errorMessage);
        }
    }

    async processBattleResults(battleId, result) {
        if (!result.events.BattleResult) {
            console.error('No battle result event found');
            return;
        }

        const { winner, loser, experienceGained } = result.events.BattleResult.returnValues;
        const isWinner = winner.toLowerCase() === this.game.web3Service.account.toLowerCase();
        
        // Update UI and show results
        if (isWinner) {
            this.game.uiManager.showCelebration();
            this.game.uiManager.showNotification(`🎉 Victory! Gained ${experienceGained} experience!`, 6000);
        } else {
            this.game.uiManager.showNotification(`💔 Defeat!`, 6000);
        }
        
        // Update game state
        await this.game.checkKhanateStatus();
        await this.game.web3Service.updateBalance();
        await this.game.batyrManager.loadAchievements();
    }

    async refreshActiveBattles() {
        const activeBattles = await this.checkActiveBattles();
        
        // Clear old movements
        this.globalMovements.clear();
        document.getElementById('troop-movements').innerHTML = '';
        
        // Recreate movements for active battles
        for (const battle of activeBattles) {
            if (!battle.resolved) {
                const sourcePos = this.game.accountLocations[battle.attacker];
                const targetPos = this.game.accountLocations[battle.defender];
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

    createTroopMovement(start, end, duration, movementId) {
        const movement = {
            start,
            end,
            startTime: Date.now(),
            duration,
            movementId
        };
        this.globalMovements.set(movementId, movement);
        this.game.uiManager.renderTroopMovement(movement);
    }

    async speedUpTroops(movementId) {
        const movement = this.globalMovements.get(movementId);
        if (!movement) return;
        
        try {
            const activeBattles = await this.checkActiveBattles();
            const battle = activeBattles.find(b => 
                Date.now() - (parseInt(b.startTime) * 1000) < parseInt(b.travelTime) * 1000
            );
            
            if (!battle) {
                throw new Error('No active battle found to speed up');
            }
            
            await this.game.web3Service.contract.methods.speedUpBattle(battle.battleId)
                .send({
                    from: this.game.web3Service.account,
                    value: this.game.web3Service.web3.utils.toWei('0.3', 'ether'),
                    gas: 300000
                });
            
            this.game.uiManager.removeTroopMovement(movementId);
            this.globalMovements.delete(movementId);
            this.game.uiManager.showNotification('⚡ Battle speed up successful!');
            
            await this.executeBattle(battle.battleId);
            
        } catch (error) {
            console.error('Speed up error:', error);
            this.game.uiManager.showNotification('❌ Failed to speed up battle: ' + error.message);
        }
    }
} 