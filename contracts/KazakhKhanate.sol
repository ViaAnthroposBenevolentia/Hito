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
        string description;
        bool canBattle;
        bool defenseBonus;
        uint256 archerBonus;  // Multiplier in basis points (100 = 1x, 150 = 1.5x)
        uint256 cavalryBonus; // Multiplier in basis points
    }

    mapping(address => Khanate) public khanates;
    mapping(uint256 => BatyrStats) public batyrStats;
    uint256 public constant LUCKY_BOX_PRICE = 0.1 ether;
    uint256 public constant ARCHER_PRICE = 0.01 ether;
    uint256 public constant CAVALRY_PRICE = 0.02 ether;

    event KhanateCreated(address indexed owner, string name);
    event TroopsPurchased(address indexed owner, uint256 archers, uint256 cavalry);
    event BatyrAcquired(address indexed owner, uint256 batyrId, string name);
    event BattleResult(address indexed attacker, address indexed defender, bool victory, uint256 powerUsed);

    constructor() {
        // Initialize Batyr stats with unique abilities
        batyrStats[1] = BatyrStats(
            "Kabanbay Batyr",
            30,
            "Cavalry Commander",
            "A legendary warrior known for his cavalry tactics. Increases cavalry effectiveness by 50%",
            true,   // Can battle
            false,  // No defense bonus
            100,    // Normal archer bonus
            150     // 1.5x cavalry bonus
        );
        
        batyrStats[2] = BatyrStats(
            "Kobylandy Batyr",
            25,
            "Master Defender",
            "A stalwart defender of the Kazakh lands. Provides strong defensive bonuses but cannot participate in attacks",
            false,  // Cannot battle
            true,   // Has defense bonus
            100,    // Normal archer bonus
            100     // Normal cavalry bonus
        );
        
        batyrStats[3] = BatyrStats(
            "Abylai Khan",
            20,
            "Strategic Leader",
            "A brilliant strategist who enhances all troops' effectiveness by 20%",
            true,   // Can battle
            true,   // Has defense bonus
            120,    // 1.2x archer bonus
            120     // 1.2x cavalry bonus
        );
        
        batyrStats[4] = BatyrStats(
            "Raimgazy Batyr",
            22,
            "Archer Commander",
            "Master of archery tactics. Increases archer effectiveness by 50%",
            true,   // Can battle
            false,  // No defense bonus
            150,    // 1.5x archer bonus
            100     // Normal cavalry bonus
        );
        
        batyrStats[5] = BatyrStats(
            "Srym Datov",
            21,
            "Tactical Genius",
            "A master of combined arms tactics. Provides balanced bonuses to all units",
            true,   // Can battle
            true,   // Has defense bonus
            130,    // 1.3x archer bonus
            130     // 1.3x cavalry bonus
        );
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
        uint256 chance = randomNumber % 1000; // Using 1000 for more granular probability

        // Check if player has any Batyrs
        bool hasExistingBatyr = false;
        for (uint256 i = 1; i <= 5; i++) {
            if (khanates[msg.sender].batyrs[i]) {
                hasExistingBatyr = true;
                break;
            }
        }

        // 10% chance if no Batyr, 0.1% chance if has Batyr
        uint256 threshold = hasExistingBatyr ? 1 : 100;
        
        if (chance < threshold) {
            uint256 batyrId = (randomNumber % 5) + 1;
            khanates[msg.sender].batyrs[batyrId] = true;
            emit BatyrAcquired(msg.sender, batyrId, batyrStats[batyrId].name);
        }

        if (msg.value > LUCKY_BOX_PRICE) {
            payable(msg.sender).transfer(msg.value - LUCKY_BOX_PRICE);
        }
    }

    function battle(address _opponent) external {
        require(khanates[msg.sender].isInitialized && khanates[_opponent].isInitialized, "Invalid khanates");
        require(_opponent != msg.sender, "Cannot battle yourself");

        uint256 attackerPower = calculateBattlePower(msg.sender, false);
        uint256 defenderPower = calculateBattlePower(_opponent, true);

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

        emit BattleResult(msg.sender, _opponent, victory, attackerPower);
    }

    function calculateBattlePower(address _player, bool isDefending) internal view returns (uint256) {
        uint256 archerBonus = 100;  // Base 1x multiplier
        uint256 cavalryBonus = 100; // Base 1x multiplier
        uint256 defenseBonus = 0;
        
        // Calculate bonuses from Batyrs
        for (uint256 i = 1; i <= 5; i++) {
            if (khanates[_player].batyrs[i]) {
                BatyrStats memory batyr = batyrStats[i];
                
                // Only apply battle power if the Batyr can battle and we're attacking
                if (!isDefending && batyr.canBattle) {
                    defenseBonus += batyr.power;
                }
                
                // Apply defense bonus if the Batyr has one and we're defending
                if (isDefending && batyr.defenseBonus) {
                    defenseBonus += batyr.power;
                }
                
                // Apply unit bonuses (take the highest bonus for each unit type)
                if (batyr.archerBonus > archerBonus) archerBonus = batyr.archerBonus;
                if (batyr.cavalryBonus > cavalryBonus) cavalryBonus = batyr.cavalryBonus;
            }
        }
        
        // Calculate total power with bonuses
        uint256 archerPower = (khanates[_player].archers * archerBonus) / 100;
        uint256 cavalryPower = (khanates[_player].cavalry * 2 * cavalryBonus) / 100;
        
        return archerPower + cavalryPower + defenseBonus;
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

    function getBatyrStats(uint256 _batyrId) external view returns (
        string memory name,
        uint256 power,
        string memory ability,
        string memory description,
        bool canBattle,
        bool defenseBonus,
        uint256 archerBonus,
        uint256 cavalryBonus
    ) {
        BatyrStats memory batyr = batyrStats[_batyrId];
        return (
            batyr.name,
            batyr.power,
            batyr.ability,
            batyr.description,
            batyr.canBattle,
            batyr.defenseBonus,
            batyr.archerBonus,
            batyr.cavalryBonus
        );
    }
} 