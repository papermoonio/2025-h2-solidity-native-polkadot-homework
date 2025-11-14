# Lesson4 笔记
## Transparent Proxy

代理合约里的状态变量顺序是对应槽位，假设情况如以下代码，当Proxy调用Logic中increment函数，但最终效果是owner + 1，这是因为Logic合约中的x位置是在槽0，恰好在Proxy合约里owner的位置也是槽0。原因在于使用delegatecall，因为读写都是代理自身的存储。
``` solidity
// Proxy合约
contract Proxy{
    address private owner
    address public logicAddress
    ...
    
    fallback() external payable {
        address impl = logicContract;
        assembly {
            // 复制 msg.data
            calldatacopy(0, 0, calldatasize())
            // 委托调用逻辑合约
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            // 复制返回数据
            returndatacopy(0, 0, returndatasize())
            // 根据调用结果返回数据或错误
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
    receive() external payable {}
}

// Logic合约
contract Logic{
    uint256 x
    uint256 y
    
    function increment public{
        x += 1;
    }
}
```

### 整体流程

**部署与初始化**
1. 部署版本V1的逻辑合约，无构造参数
2. 部署代理合约，把逻辑地址写入实现槽位（bytes）
3. 用V1的ABI绑定到代理地址，通过`fallback`走`delegatecall`调用逻辑函数

``` solidity
const LogicV1 = await ethers.getContractFactory("Basic_Logic_Counter");
const logicV1 = await LogicV1.deploy();
await logicV1.waitForDeployment();

const Proxy = await ethers.getContractFactory("Basic_Proxy_Counter");
const proxy = await Proxy.deploy(await logicV1.getAddress());
await proxy.waitForDeployment();

const proxyAsV1 = new ethers.Contract(
  await proxy.getAddress(),
  LogicV1.interface,
  owner
);
```

**调用与状态**
1. 直接使用proxyAsV1调用函数（`proxyAsV1.increment()`）
2. 状态（`proxyAsV1.x`）

**升级合约**
1. 升级权限由onlyOwner控制
2. 部署好了V2后，把V2的合约地址丢给proxy合约里的升级函数
```solidity
const LogicV2 = await ethers.getContractFactory("Basic_Logic_Counter_V2");
const logicV2 = await LogicV2.deploy();
await logicV2.waitForDeployment();

proxy.upgradeTo(await logicV2.getAddress(), "0x")
```

## UUPS Proxy
### 整体流程（合约）
**实现合约V1**
1. 使用`Initializable/UUPSUpgradeable/OwnableUpgradeable`
2. 构造函数中使用`_disableInitializers()`，关闭构造函数窗口（强制抵制初始化）
3. 初始化使用`initializer`实现
4. 预留槽位保证存储布局可扩展（__gaps）

**实现合约V2**
1. 继承V1，减少变量或方法错误
2. 可以新增变量或新增修改函数（事件...），但不能重新定义变量类型或把函数的结构修改（只能改逻辑）。中心思想在于不修改原有合约的ABI，因此能够去修改函数内部逻辑
3. 初始化使用`reinitializer`实现

**代理合约**
1. 部署`EIP-1967`代理，这个是必须要的
```solidity
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/proxy/ERC1967/ERC1967Proxy.sol";

// Thin wrapper to ensure Hardhat compiles OZ's ERC1967Proxy
contract OZ_ERC1967Proxy is ERC1967Proxy {
  constructor(address _logic, bytes memory _data)
    ERC1967Proxy(_logic, _data)
  {}
}
```

### 整体流程（TS调用）
```solidity
const [owner, other] = await ethers.getSigners();

// Deploy implementation (UUPS_Counter)
const V1 = await ethers.getContractFactory("UUPS_Counter");
const impl = await V1.deploy();
await impl.waitForDeployment();

// Prepare init calldata for proxy: initialize(uint256,address)
const initData = V1.interface.encodeFunctionData("initialize", [
  initialX,
  owner.address,
]);

// Deploy ERC1967Proxy pointing to V1 implementation, calling initialize
const Proxy = await ethers.getContractFactory("OZ_ERC1967Proxy");
const proxy = await Proxy.deploy(await impl.getAddress(), initData);
await proxy.waitForDeployment();

// Bind proxy address with V1 ABI (ensures UUPS functions present)
const proxyAsV1 = await ethers.getContractAt(
  "UUPS_Counter",
  await proxy.getAddress(),
  owner
);

// Deploy implementation (UUPS_CounterV2)
const V2 = await ethers.getContractFactory("UUPS_CounterV2");
const implV2 = await V2.deploy();
await implV2.waitForDeployment();

// Upgrade to the V2 contract
proxyAsV1.upgradeToAndCall(await implV2.getAddress())

const proxyAsV2 = await ethers.getContractAt(
  "UUPS_CounterV2",
  await proxy.getAddress(),
  owner
);
```