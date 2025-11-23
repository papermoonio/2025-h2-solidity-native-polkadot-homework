# My work lsit


- short address
- denial of service
- delegate call
- atn

## Dos
攻击原理:攻击者通过 DoSAttackerFactory 创建大量攻击者合约并注册，使 registeredUsers 数组变大。当调用 distributeRewards() 时，需要遍历所有用户，gas消耗随用户数线性增长，可能超过区块gas限制，导致函数无法执行，形成拒绝服务。

相关文件：DenialOfService.sol ERC20Mock.sol DenialOfService.ts

实现内容: 
1. DenialOfService.sol - 包含三个合约：
- VulnerableRewardDistributor: 存在DoS漏洞的合约, 允许用户注册
- distributeRewards() 遍历所有注册用户分发奖励
    - 漏洞：无界循环，攻击者可通过注册大量地址导致gas耗尽
- DoSAttacker: 单个攻击者合约，用于注册自己
- DoSAttackerFactory: 攻击者工厂合约，可批量创建攻击者合约并注册

2. ERC20Mock.sol - 测试用的 ERC20 模拟代币

3. DenialOfService.ts - 测试用例，包括：
- 正常操作测试：用户注册、奖励分发等
- DoS 攻击测试：攻击者注册大量地址、gas消耗测试
- 攻击影响测试：展示攻击对正常用户的影响

## Short Adress Attack.
攻击原理: 短地址攻击利用 EVM 的参数编码机制：
攻击者创建一个末尾字节为 0x00 的地址（19 字节）
在交易编码时，如果地址被省略最后一个字节，EVM 会自动填充 0x00
这导致 amount 参数左移 8 位（乘以 256）
例如：用户想转 100 个代币，实际转了 25,600 个代币

防护措施: 在合约层面：检查地址是否以 0x00 结尾并拒绝
在应用层面：现代钱包和库（如 ethers.js）已在编码层面防止此类攻击

实现内容
1. ShortAddressAttack.sol - 包含三个合约：
VulnerableToken: 存在短地址攻击漏洞的 ERC20 代币
使用标准的 transfer 和 transferFrom 函数
漏洞：未验证地址长度，短地址（19 字节）会导致金额参数左移 8 位（乘以 256）
SafeToken: 防护版本的 ERC20 代币
检查地址是否以 0x00 结尾
拒绝可能被利用的短地址
ShortAddressAttacker: 辅助合约
createShortAddress(): 创建短地址（末尾字节为 0）
isShortAddress(): 检查地址是否为短地址
2. ShortAddressAttack.ts - 测试用例，包括：
理解短地址攻击：演示如何创建短地址
漏洞代币攻击：展示攻击原理和影响
安全代币防护：验证防护措施是否有效
手动交易构造：演示攻击者如何构造恶意交易
真实攻击场景：模拟完整的攻击流程
缓解策略：展示如何防止此类攻击