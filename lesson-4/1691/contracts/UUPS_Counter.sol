// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";

// UUPS 可升级版本的 Counter，实现未来可添加新函数/变量
contract UUPS_Counter is Initializable, UUPSUpgradeable, OwnableUpgradeable {
  uint256 public x;

  event Increment(uint256 by);

  constructor() {// 禁用实现合约的初始化函数，防止被攻击者初始化
    _disableInitializers();
  }

  // 初始化函数（替代构造函数），通过代理调用
  // 注意：通过 ERC1967Proxy 构造器进行初始化时，msg.sender 是代理地址。
  // 为避免将所有权错误地设置为代理本身，这里显式传入 initialOwner。
  function initialize(uint256 initialX, address initialOwner) public initializer {
    __Ownable_init(initialOwner);
    __UUPSUpgradeable_init();
    x = initialX;
  }

  function inc() public virtual {
    unchecked {
      x += 1;
    }
    emit Increment(1);
  }

  function incBy(uint256 by) public {
    require(by > 0, "incBy: increment should be positive");
    unchecked {
      x += by;
    }
    emit Increment(by);
  }

  // 仅所有者可授权升级
  function _authorizeUpgrade(address newImplementation)
    internal
    override
    onlyOwner
  {}

  // 预留存储槽，便于将来新增状态变量
  uint256[49] private __gap;
}
