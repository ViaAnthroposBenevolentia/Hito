export class Web3Service {
    constructor() {
        this.web3 = null;
        this.contract = null;
        this.account = null;
        this.contractAddress = '0x8D8e70143c2403Ad5FCe09abB4759cE4164D5EbE';
        this.accounts = [];
    }

    async initialize() {
        try {
            // Connect to local Ganache
            this.web3 = new Web3('http://127.0.0.1:7545');
            
            // Get accounts
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
                
                // Update account display
                document.getElementById('account-address').textContent = 'Select an account to begin';
                document.getElementById('account-balance').textContent = '0.000';
                
                return true;
            } else {
                throw new Error('No accounts found in Ganache');
            }
        } catch (error) {
            console.error('Web3 initialization error:', error);
            throw error;
        }
    }

    async loadContract() {
        try {
            let response;
            try {
                response = await fetch('src/artifacts/contracts/KazakhKhanate.sol/KazakhKhanate.json');
            } catch (e) {
                response = await fetch('artifacts/contracts/KazakhKhanate.sol/KazakhKhanate.json');
            }
            
            if (!response.ok) {
                throw new Error(`Failed to load contract JSON: ${response.statusText}`);
            }
            
            const contractJson = await response.json();
            console.log('📝 Contract ABI loaded');
            
            this.contract = new this.web3.eth.Contract(contractJson.abi, this.contractAddress);
            console.log('✅ Contract instance created');
            
            console.log('📝 Available contract methods:', Object.keys(this.contract.methods));
        } catch (error) {
            console.error('Contract loading error:', error);
            throw error;
        }
    }

    async setAccount(account) {
        this.account = account;
        await this.updateBalance();
    }

    clearAccount() {
        this.account = null;
    }

    async updateBalance() {
        try {
            const balance = await this.web3.eth.getBalance(this.account);
            const ethBalance = this.web3.utils.fromWei(balance, 'ether');
            return parseFloat(ethBalance).toFixed(4);
        } catch (error) {
            console.error('Balance update error:', error);
            throw error;
        }
    }

    async createKhanate(name) {
        try {
            // Check if Khanate already exists
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
            
            const gasEstimate = await this.contract.methods.createKhanate(name)
                .estimateGas({ 
                    from: this.account,
                    gas: 500000
                });
            
            return await this.contract.methods.createKhanate(name)
                .send({ 
                    from: this.account,
                    gas: Math.floor(gasEstimate * 1.5)
                });
        } catch (error) {
            console.error('Khanate creation error:', error);
            throw error;
        }
    }

    async purchaseTroops(archers, cavalry) {
        try {
            const archerCost = this.web3.utils.toWei('0.01', 'ether');
            const cavalryCost = this.web3.utils.toWei('0.02', 'ether');
            const totalCost = (archers * archerCost) + (cavalry * cavalryCost);

            return await this.contract.methods.purchaseTroops(archers, cavalry)
                .send({ from: this.account, value: totalCost });
        } catch (error) {
            console.error('Troop purchase error:', error);
            throw error;
        }
    }
} 