// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Logic contract
 * @dev Contains logic to increment a counter. When called via delegatecall,
 *      it will modify the storage of the caller (proxy) instead of its own.
 *
 * Storage layout expectation:
 *   slot0: uint256 count;
 */
contract Logic {
	function increment() external returns (uint256 newValue) {
		assembly {
			// slot 0 stores the uint256 count
			let slot := 0
			let v := sload(slot)
			v := add(v, 1)
			sstore(slot, v)
			newValue := v
		}
	}
}


