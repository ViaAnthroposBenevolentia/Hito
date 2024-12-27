# Kazakh Khanate Blockchain Game

A blockchain-based strategy game where players manage their Khanates, battle other players, and collect historical Batyrs using Ethereum smart contracts.

## Features

- Create and manage your own Khanate
- Purchase and command troops (archers and cavalry)
- Collect powerful Batyrs through lucky boxes
- Battle other players with strategic troop combinations
- Blockchain-based ownership and transactions
- Historical Kazakh theme and characters

## Prerequisites

- Node.js (v14 or higher)
- Ganache for local blockchain development

## Setup

1. Clone the repository:
```bash
git clone <repository-url>
cd kazakh-khanate-game
```

2. Install dependencies:
```bash
npm install
```

3. Start Ganache:
```bash
npm install -g ganache
npx ganache --port 7545
```

4. Deploy the smart contract to Ganache for testing:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network ganache
```
Or to deploy to Binance Smart Chain Testnet:
```bash
npx hardhat run scripts/deploy.js --network bscTestnet
```

5. Update the contract address:
- Copy the deployed contract address
- Update the `contractAddress` in `js/app.js`

6. Add images:
- Place Batyr images in `images/batyrs/` (batyr1.png to batyr5.png)
- Place troop images in `images/troops/` (archer.png, cavalry.png, troops.png)
- Place flag image in `images/flags/` (kazakhstan_flag.png)
- Place map image in `images/map/` (kazakhstan_map.png)
- Place lucky box animation in `images/` (lucky_box.gif)

7. Start a local web server:
```bash
npx http-server
```

8. Open the game:
- Navigate to `http://localhost:8080` in your browser
- Start playing!

## Development

### Project Structure
```
├── contracts/
│   └── KazakhKhanate.sol
├── images/
│   ├── batyrs/
│   ├── troops/
│   └── flags/
├── css/
│   └── style.css
├── js/
│   └── app.js
├── index.html
└── hardhat.config.js
```

### Smart Contract
The game uses a Solidity smart contract for:
- Khanate management
- Troop purchases
- Lucky box mechanics
- Battle resolution
- Batyr ownership

### Frontend
- HTML5 for structure
- CSS3 for styling
- JavaScript for game logic and blockchain interaction
- Web3.js for Ethereum integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Inspired by the rich history of the Kazakh Khanate
- Built with Hardhat and Web3.js
- Uses OpenZeppelin contracts for security 