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
- Open Ganache
- Create a new workspace
- Configure the workspace to use port 7545

4. Deploy the smart contract:
```bash
npx hardhat compile
npx hardhat run scripts/deploy.js --network ganache
```

5. Update the contract address:
- Copy the deployed contract address
- Update the `contractAddress` in `js/app.js`

6. Add images:
- Place Batyr images in `images/batyrs/` (batyr1.png to batyr5.png)
- Place troop images in `images/troops/` (archer.png, cavalry.png)
- Place flag image in `images/flags/` (kazakhstan_flag.png)

7. Start a local web server:
```bash
npx http-server
```

8. Open the game:
- Navigate to `http://localhost:8080` in your browser
- Start playing!

## Game Mechanics

### Troops
- Archers: Cost 0.01 ETH each, medium damage
- Cavalry: Cost 0.02 ETH each, high damage

### Batyrs
1. Kabanbay Batyr: Very high damage (30 cavalry equivalent)
2. Kobylandy Batyr: High speed and defense (25 cavalry equivalent)
3. Abylai Khan: Leadership bonus (+10% troop effectiveness)
4. Raimgazy Batyr: Cavalry counter specialist
5. Srym Datov: Archer specialist

### Lucky Boxes
- Cost: 0.1 ETH
- 10% chance to receive a Batyr
- Probability drops to 0.1% if you already own a Batyr

### Battles
- Success depends on:
  - Troop numbers and types
  - Batyr bonuses
  - Strategic combinations

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