// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract KazakhKhanate is Ownable, ReentrancyGuard {
    struct Khanate {
        string name;
        uint256 level;
        uint256 archers;
        uint256 cavalry;
        mapping(uint256 => bool) batyrs; // Batyr ID to ownership
        bool isInitialized;
    }

    struct BatyrStats {
        string name;
        uint256 power;
        string ability;
    }

    mapping(address => Khanate) public khanates;
    mapping(uint256 => BatyrStats) public batyrStats;
    uint256 public constant LUCKY_BOX_PRICE = 0.1 ether;
    uint256 public constant ARCHER_PRICE = 0.01 ether;
    uint256 public constant CAVALRY_PRICE = 0.02 ether;

    event KhanateCreated(address indexed owner, string name);
    event TroopsPurchased(address indexed owner, uint256 archers, uint256 cavalry);
    event BatyrAcquired(address indexed owner, uint256 batyrId);
    event BattleResult(address indexed attacker, address indexed defender, bool victory);

    constructor() {
        // Initialize Batyr stats
        batyrStats[1] = BatyrStats("Kabanbay Batyr", 30, "Very high damage");
        batyrStats[2] = BatyrStats("Kobylandy Batyr", 25, "High speed and defense");
        batyrStats[3] = BatyrStats("Abylai Khan", 20, "Leadership bonus");
        batyrStats[4] = BatyrStats("Raimgazy Batyr", 22, "Cavalry counter");
        batyrStats[5] = BatyrStats("Srym Datov", 21, "Archer specialist");
    }

    function createKhanate(string memory _name) external {
        require(!khanates[msg.sender].isInitialized, "Khanate already exists");
        
        Khanate storage newKhanate = khanates[msg.sender];
        newKhanate.name = _name;
        newKhanate.level = 1;
        newKhanate.archers = 10; // Starting troops
        newKhanate.cavalry = 5;
        newKhanate.isInitialized = true;

        emit KhanateCreated(msg.sender, _name);
    }

    function purchaseTroops(uint256 _archers, uint256 _cavalry) external payable nonReentrant {
        require(khanates[msg.sender].isInitialized, "Khanate not initialized");
        uint256 totalCost = (_archers * ARCHER_PRICE) + (_cavalry * CAVALRY_PRICE);
        require(msg.value >= totalCost, "Insufficient payment");

        khanates[msg.sender].archers += _archers;
        khanates[msg.sender].cavalry += _cavalry;

        emit TroopsPurchased(msg.sender, _archers, _cavalry);

        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }

    function purchaseLuckyBox() external payable nonReentrant {
        require(msg.value >= LUCKY_BOX_PRICE, "Insufficient payment");
        require(khanates[msg.sender].isInitialized, "Khanate not initialized");

        // Using block difficulty and timestamp for randomness (Note: not secure for production)
        uint256 randomNumber = uint256(keccak256(abi.encodePacked(block.prevrandao, block.timestamp, msg.sender)));
        uint256 chance = randomNumber % 100;

        if (chance < 10) { // 10% chance
            uint256 batyrId = (randomNumber % 5) + 1;
            khanates[msg.sender].batyrs[batyrId] = true;
            emit BatyrAcquired(msg.sender, batyrId);
        }

        if (msg.value > LUCKY_BOX_PRICE) {
            payable(msg.sender).transfer(msg.value - LUCKY_BOX_PRICE);
        }
    }

    function battle(address _opponent) external {
        require(khanates[msg.sender].isInitialized && khanates[_opponent].isInitialized, "Invalid khanates");
        require(_opponent != msg.sender, "Cannot battle yourself");

        uint256 attackerPower = calculateBattlePower(msg.sender);
        uint256 defenderPower = calculateBattlePower(_opponent);

        bool victory = attackerPower > defenderPower;
        
        if (victory) {
            khanates[msg.sender].level += 1;
            // Lose some troops in battle
            khanates[msg.sender].archers = (khanates[msg.sender].archers * 8) / 10;
            khanates[msg.sender].cavalry = (khanates[msg.sender].cavalry * 8) / 10;
        } else {
            // Lose more troops in defeat
            khanates[msg.sender].archers = (khanates[msg.sender].archers * 6) / 10;
            khanates[msg.sender].cavalry = (khanates[msg.sender].cavalry * 6) / 10;
        }

        emit BattleResult(msg.sender, _opponent, victory);
    }

    function calculateBattlePower(address _player) internal view returns (uint256) {
        uint256 power = (khanates[_player].archers * 1) + (khanates[_player].cavalry * 2);
        
        // Add Batyr bonuses
        for (uint256 i = 1; i <= 5; i++) {
            if (khanates[_player].batyrs[i]) {
                power += batyrStats[i].power;
            }
        }
        
        return power;
    }

    function getKhanateStats(address _player) external view returns (
        string memory name,
        uint256 level,
        uint256 archers,
        uint256 cavalry
    ) {
        require(khanates[_player].isInitialized, "Khanate not initialized");
        Khanate storage khanate = khanates[_player];
        return (khanate.name, khanate.level, khanate.archers, khanate.cavalry);
    }

    function hasBatyr(address _player, uint256 _batyrId) external view returns (bool) {
        require(_batyrId > 0 && _batyrId <= 5, "Invalid Batyr ID");
        return khanates[_player].batyrs[_batyrId];
    }
} 