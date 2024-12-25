// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract KazakhKhanate is ReentrancyGuard {
    using Counters for Counters.Counter;

    struct Khanate {
        string name;
        uint256 level;
        uint256 archers;
        uint256 cavalry;
        uint256 experience;
        uint256 wins;
        uint256 losses;
        uint256 successfulDefenses;
        bool initialized;
    }

    struct BatyrStats {
        string name;
        string ability;
        string description;
        uint256 power;
        uint256 archerBonus;
        uint256 cavalryBonus;
        bool canBattle;
    }

    struct Battle {
        address attacker;
        address defender;
        uint256 startTime;
        bool resolved;
        uint256 travelTime;
    }

    mapping(address => Khanate) public khanates;
    mapping(address => mapping(uint256 => bool)) public ownedBatyrs;
    mapping(address => mapping(string => bool)) public achievements;
    mapping(uint256 => Battle) public activeBattles;
    Counters.Counter private battleIds;

    uint256 public constant ARCHER_PRICE = 0.01 ether;
    uint256 public constant CAVALRY_PRICE = 0.02 ether;
    uint256 public constant LUCKY_BOX_PRICE = 0.1 ether;
    uint256 public constant SPEED_UP_PRICE = 0.3 ether;

    event KhanateCreated(address indexed owner, string name);
    event TroopsPurchased(address indexed owner, uint256 archers, uint256 cavalry);
    event BatyrAcquired(address indexed owner, uint256 batyrId, string name);
    event BattleInitiated(uint256 battleId, address attacker, address defender, uint256 travelTime);
    event BattleResult(address indexed winner, address indexed loser, uint256 experienceGained);
    event AchievementUnlocked(address indexed player, string achievement);
    event BattleSpedUp(uint256 battleId, address attacker);

    constructor() {
        // Initialize Batyr stats
        batyrs[1] = BatyrStats({
            name: "Kabanbay Batyr",
            ability: "Master Strategist",
            description: "Enhances both archer and cavalry effectiveness",
            power: 100,
            archerBonus: 120,
            cavalryBonus: 120,
            canBattle: true
        });

        batyrs[2] = BatyrStats({
            name: "Bogenbai Batyr",
            ability: "Archer Commander",
            description: "Significantly boosts archer power",
            power: 80,
            archerBonus: 150,
            cavalryBonus: 100,
            canBattle: true
        });

        batyrs[3] = BatyrStats({
            name: "Nauryzbai Batyr",
            ability: "Cavalry Master",
            description: "Significantly boosts cavalry power",
            power: 80,
            archerBonus: 100,
            cavalryBonus: 150,
            canBattle: true
        });

        batyrs[4] = BatyrStats({
            name: "Karasai Batyr",
            ability: "Defensive Expert",
            description: "Provides strong defensive bonuses",
            power: 120,
            archerBonus: 110,
            cavalryBonus: 110,
            canBattle: false
        });

        batyrs[5] = BatyrStats({
            name: "Zhanibek Batyr",
            ability: "Elite Guardian",
            description: "Supreme defensive capabilities",
            power: 150,
            archerBonus: 100,
            cavalryBonus: 100,
            canBattle: false
        });
    }

    mapping(uint256 => BatyrStats) public batyrs;

    modifier onlyInitialized() {
        require(khanates[msg.sender].initialized, "Khanate not initialized");
        _;
    }

    function createKhanate(string memory name) external {
        require(!khanates[msg.sender].initialized, "Khanate already exists");
        require(bytes(name).length > 0, "Name cannot be empty");

        khanates[msg.sender] = Khanate({
            name: name,
            level: 1,
            archers: 10,
            cavalry: 5,
            experience: 0,
            wins: 0,
            losses: 0,
            successfulDefenses: 0,
            initialized: true
        });

        emit KhanateCreated(msg.sender, name);
    }

    function purchaseTroops(uint256 archerAmount, uint256 cavalryAmount) external payable onlyInitialized {
        uint256 totalCost = (archerAmount * ARCHER_PRICE) + (cavalryAmount * CAVALRY_PRICE);
        require(msg.value >= totalCost, "Insufficient payment");

        khanates[msg.sender].archers += archerAmount;
        khanates[msg.sender].cavalry += cavalryAmount;

        emit TroopsPurchased(msg.sender, archerAmount, cavalryAmount);

        // Refund excess payment
        if (msg.value > totalCost) {
            payable(msg.sender).transfer(msg.value - totalCost);
        }
    }

    function purchaseLuckyBox() external payable onlyInitialized {
        require(msg.value >= LUCKY_BOX_PRICE, "Insufficient payment");

        // Random number between 1 and 100
        uint256 chance = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender))) % 100;
        
        // 20% chance to get a Batyr
        if (chance < 20) {
            // Random Batyr ID between 1 and 5
            uint256 batyrId = (uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender, chance))) % 5) + 1;
            
            if (!ownedBatyrs[msg.sender][batyrId]) {
                ownedBatyrs[msg.sender][batyrId] = true;
                emit BatyrAcquired(msg.sender, batyrId, batyrs[batyrId].name);

                // Check if player has collected all Batyrs
                bool hasAllBatyrs = true;
                for (uint256 i = 1; i <= 5; i++) {
                    if (!ownedBatyrs[msg.sender][i]) {
                        hasAllBatyrs = false;
                        break;
                    }
                }
                if (hasAllBatyrs) {
                    unlockAchievement(msg.sender, "COLLECTOR");
                }
            }
        }

        // Refund excess payment
        if (msg.value > LUCKY_BOX_PRICE) {
            payable(msg.sender).transfer(msg.value - LUCKY_BOX_PRICE);
        }
    }

    function initiateBattle(address defender) external onlyInitialized {
        require(defender != msg.sender, "Cannot battle yourself");
        require(khanates[defender].initialized, "Defender's Khanate not initialized");
        require(khanates[msg.sender].archers > 0 || khanates[msg.sender].cavalry > 0, "No troops to battle with");

        uint256 battleId = battleIds.current();
        battleIds.increment();

        // Calculate travel time based on block timestamp difference
        uint256 travelTime = calculateTravelTime(msg.sender, defender);

        activeBattles[battleId] = Battle({
            attacker: msg.sender,
            defender: defender,
            startTime: block.timestamp,
            resolved: false,
            travelTime: travelTime
        });

        emit BattleInitiated(battleId, msg.sender, defender, travelTime);
    }

    function speedUpBattle(uint256 battleId) external payable {
        Battle storage battle = activeBattles[battleId];
        require(msg.value >= SPEED_UP_PRICE, "Insufficient payment for speed up");
        require(battle.attacker == msg.sender, "Not your battle");
        require(!battle.resolved, "Battle already resolved");

        emit BattleSpedUp(battleId, msg.sender);
        executeBattle(battleId);

        // Refund excess payment
        if (msg.value > SPEED_UP_PRICE) {
            payable(msg.sender).transfer(msg.value - SPEED_UP_PRICE);
        }
    }

    function executeBattle(uint256 battleId) public {
        Battle storage battle = activeBattles[battleId];
        require(!battle.resolved, "Battle already resolved");
        require(block.timestamp >= battle.startTime + battle.travelTime, "Troops still traveling");

        address attacker = battle.attacker;
        address defender = battle.defender;

        uint256 attackerPower = calculateTotalPower(attacker);
        uint256 defenderPower = calculateTotalPower(defender);

        // Random factor (±10%)
        uint256 randomFactor = (uint256(keccak256(abi.encodePacked(block.timestamp, attacker, defender))) % 20) + 90;
        attackerPower = (attackerPower * randomFactor) / 100;

        battle.resolved = true;

        if (attackerPower > defenderPower) {
            // Attacker wins
            handleVictory(attacker, defender);
        } else {
            // Defender wins
            handleVictory(defender, attacker);
            khanates[defender].successfulDefenses++;
            if (khanates[defender].successfulDefenses >= 5) {
                unlockAchievement(defender, "DEFENDER");
            }
        }
    }

    function handleVictory(address winner, address loser) private {
        uint256 experienceGained = 100;
        khanates[winner].experience += experienceGained;
        khanates[winner].wins++;
        khanates[loser].losses++;

        // Calculate and apply troop losses
        uint256 winnerArcherLosses;
        uint256 winnerCavalryLosses;
        uint256 loserArcherLosses;
        uint256 loserCavalryLosses;

        // Winner loses fewer troops (5-15%)
        winnerArcherLosses = (khanates[winner].archers * 15) / 100;  // 15% max loss
        winnerCavalryLosses = (khanates[winner].cavalry * 15) / 100;

        // Loser loses more troops (30-50%)
        loserArcherLosses = (khanates[loser].archers * 50) / 100;    // 50% max loss
        loserCavalryLosses = (khanates[loser].cavalry * 50) / 100;

        // Update winner's troops
        khanates[winner].archers = khanates[winner].archers > winnerArcherLosses ? 
            khanates[winner].archers - winnerArcherLosses : 0;
        khanates[winner].cavalry = khanates[winner].cavalry > winnerCavalryLosses ? 
            khanates[winner].cavalry - winnerCavalryLosses : 0;

        // Update loser's troops
        khanates[loser].archers = khanates[loser].archers > loserArcherLosses ? 
            khanates[loser].archers - loserArcherLosses : 0;
        khanates[loser].cavalry = khanates[loser].cavalry > loserCavalryLosses ? 
            khanates[loser].cavalry - loserCavalryLosses : 0;

        // Level up if enough experience
        while (khanates[winner].experience >= khanates[winner].level * 100) {
            khanates[winner].experience -= khanates[winner].level * 100;
            khanates[winner].level++;
        }

        // Check for achievements
        if (khanates[winner].wins == 1) {
            unlockAchievement(winner, "FIRST_BLOOD");
        }
        if (khanates[winner].wins == 10) {
            unlockAchievement(winner, "VETERAN");
        }
        if (khanates[winner].wins == 50) {
            unlockAchievement(winner, "WARLORD");
        }

        emit BattleResult(winner, loser, experienceGained);
    }

    function calculateTotalPower(address player) private view returns (uint256) {
        uint256 archerPower = khanates[player].archers * 10;
        uint256 cavalryPower = khanates[player].cavalry * 20;
        uint256 totalPower = archerPower + cavalryPower;

        // Apply Batyr bonuses
        for (uint256 i = 1; i <= 5; i++) {
            if (ownedBatyrs[player][i]) {
                BatyrStats memory batyr = batyrs[i];
                if (batyr.canBattle) {
                    archerPower = (archerPower * batyr.archerBonus) / 100;
                    cavalryPower = (cavalryPower * batyr.cavalryBonus) / 100;
                    totalPower = archerPower + cavalryPower;
                }
            }
        }

        return totalPower;
    }

    function calculateTravelTime(address attacker, address defender) private pure returns (uint256) {
        // Simplified distance calculation based on addresses
        uint256 distance = uint256(uint160(attacker)) ^ uint256(uint160(defender));
        distance = distance % 100; // Scale to 0-99
        
        // Base travel time: 30 seconds + distance factor
        return 30 seconds + (distance * 1 seconds);
    }

    function unlockAchievement(address player, string memory achievementId) private {
        if (!achievements[player][achievementId]) {
            achievements[player][achievementId] = true;
            emit AchievementUnlocked(player, achievementId);
        }
    }

    function getKhanateStats(address player) external view returns (
        string memory name,
        uint256 level,
        uint256 archers,
        uint256 cavalry,
        uint256 experience,
        uint256 wins,
        uint256 losses
    ) {
        require(khanates[player].initialized, "Khanate not initialized");
        Khanate memory k = khanates[player];
        return (k.name, k.level, k.archers, k.cavalry, k.experience, k.wins, k.losses);
    }

    function getBatyrStats(uint256 batyrId) external view returns (
        string memory name,
        string memory ability,
        string memory description,
        uint256 power,
        uint256 archerBonus,
        uint256 cavalryBonus,
        bool canBattle
    ) {
        require(batyrId > 0 && batyrId <= 5, "Invalid Batyr ID");
        BatyrStats memory b = batyrs[batyrId];
        return (b.name, b.ability, b.description, b.power, b.archerBonus, b.cavalryBonus, b.canBattle);
    }

    function hasBatyr(address player, uint256 batyrId) external view returns (bool) {
        return ownedBatyrs[player][batyrId];
    }

    function getPlayerStats(address player) external view returns (
        bool FIRST_BLOOD,
        bool VETERAN,
        bool WARLORD,
        bool DEFENDER,
        bool COLLECTOR
    ) {
        return (
            achievements[player]["FIRST_BLOOD"],
            achievements[player]["VETERAN"],
            achievements[player]["WARLORD"],
            achievements[player]["DEFENDER"],
            achievements[player]["COLLECTOR"]
        );
    }
} 