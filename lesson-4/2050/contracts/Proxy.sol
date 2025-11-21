// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Proxy using delegatecall
 * @dev Holds state and delegates increment logic to Logic contract.
 * Storage layout must match the expected layout in Logic (slot0: count).
 */
contract Proxy {
	// slot 0: must match Logic's expected slot for count
	uint256 public count;

	address public implementation;
	address public owner;

	event ImplementationUpdated(address indexed newImpl);
	event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);

	modifier onlyOwner() {
		require(msg.sender == owner, "Proxy: not owner");
		_;
	}

	constructor(address _implementation) {
		owner = msg.sender;
		emit OwnershipTransferred(address(0), msg.sender);
		implementation = _implementation;
		emit ImplementationUpdated(_implementation);
	}

	function setImplementation(address _implementation) external onlyOwner {
		require(_implementation != address(0), "Proxy: impl zero");
		implementation = _implementation;
		emit ImplementationUpdated(_implementation);
	}

	function transferOwnership(address newOwner) external onlyOwner {
		require(newOwner != address(0), "Proxy: new owner zero");
		address prev = owner;
		owner = newOwner;
		emit OwnershipTransferred(prev, newOwner);
	}

	function incrementViaDelegatecall() external returns (bytes memory) {
		// delegatecall to Logic.increment()
		(bool ok, bytes memory data) = implementation.delegatecall(
			abi.encodeWithSignature("increment()")
		);
		require(ok, "Proxy: delegatecall failed");
		return data; // returns encoded new value
	}
}


