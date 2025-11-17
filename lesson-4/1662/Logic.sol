// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;


contract Logic {
// 注意：storage layout 与 Proxy 合约需要对齐（counter 在 slot0）
uint256 public counter; // slot 0


// 每次调用将代理合约中的 counter +1（当通过 delegatecall 调用时）
function increment() external {
counter += 1;
}
}