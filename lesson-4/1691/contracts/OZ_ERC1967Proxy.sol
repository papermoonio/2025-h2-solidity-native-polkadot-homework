// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Thin wrapper to ensure Hardhat compiles OZ's ERC1967Proxy
contract OZ_ERC1967Proxy is ERC1967Proxy {
  constructor(address _logic, bytes memory _data)
    ERC1967Proxy(_logic, _data)
  {}
}

