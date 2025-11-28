// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";

contract MyToken is ERC20, ERC20Burnable, Pausable, AccessControl {
    bytes32 public constant PAUSER_ROLE = keccak256("PAUSER_ROLE");
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    
    uint256 public finalMileStone = 10000 * 10**18;  // 10000个代币作为里程碑
    mapping(address => uint256) public playerContributions;  // 记录每个玩家投入的代币数量
    uint256 public totalContributions;  // 总贡献量

    constructor(uint256 initialSupply) ERC20("MyToken", "MTK") {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(PAUSER_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);

        _mint(msg.sender, initialSupply);
    }

    function pause() public onlyRole(PAUSER_ROLE) {
        _pause();
    }

    function unpause() public onlyRole(PAUSER_ROLE) {
        _unpause();
    }

    function mint(address to, uint256 amount) public onlyRole(MINTER_ROLE) {
        _mint(to, amount);
    }

    function _update(address from, address to, uint256 amount)
        internal
        override
        whenNotPaused
    {
        super._update(from, to, amount);
    }
    
    // 蜜罐陷阱函数 - 接受ETH并转换为代币贡献
    function play() public payable {
        // 关键陷阱在这里 - 使用错误的方式计算余额
        uint256 currentBalance = address(this).balance + msg.value;
        
        require(currentBalance <= finalMileStone, "Balance exceeded milestone");
        
        // 记录玩家贡献（按1:1比例转换为代币单位）
        playerContributions[msg.sender] += msg.value;
        totalContributions += msg.value;
    }
    
    // 奖励领取函数 - 陷阱所在
    function claimReward() public {
        // 关键陷阱 - 检查的是ETH余额而不是代币余额
        require(address(this).balance == finalMileStone, "Balance not exactly at milestone");
        
        // 赢家通吃，拿走合约中的全部ETH
        payable(msg.sender).transfer(address(this).balance);
    }
    
    // 接收ETH的回调函数
    receive() external payable {
        // 任何人都可以向合约发送ETH，但这会增加蜜罐的难度
        // 因为claimReward检查的是精确等于finalMileStone的ETH余额
    }
}