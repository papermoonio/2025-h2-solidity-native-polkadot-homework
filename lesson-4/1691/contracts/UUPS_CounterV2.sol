// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./UUPS_Counter.sol";

// UUPS 版本 V2：在保持存储兼容的前提下新增变量与功能
// 注意：父合约 UUPS_Counter 中已有 __gap[49] 用于未来扩展；
// 子合约新增的状态会追加在父合约之后，不会覆盖既有数据。
contract UUPS_CounterV2 is UUPS_Counter {
  // 新增变量
  uint256 public y;

  // 升级到 V2 后的初始化，仅可调用一次（版本号 2）
  function initializeV2(uint256 initialY) public reinitializer(2) {
    y = initialY;
  }

  // 覆写 inc：同时递增 x 与 y
  function inc() public override {
    unchecked {
      x += 1;
      y += 1;
    }
    emit Increment(1);
  }

  // 新增：安全减少 x
  function decrease(uint256 by) public {
    require(by > 0, "decrease: decrement should be positive");
    require(x >= by, "decrease: insufficient");
    unchecked {
      x -= by;
    }
  }

  //（可选）为后续版本预留扩展槽位
  uint256[49] private __gapV2;
}
