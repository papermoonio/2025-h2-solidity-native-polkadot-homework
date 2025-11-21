// 测试脚本：测试代理合约和逻辑合约的交互

const { expect } = require("chai");

describe("代理合约测试", function() {
  let logicContract;
  let proxyContract;
  let owner;
  
  beforeEach(async function() {
    console.log("\n===========================================");
    console.log("开始测试前的准备工作...");
    // 获取部署账户
    [owner] = await ethers.getSigners();
    console.log("1. 获取部署账户：", owner.address);
    
    // 部署逻辑合约
    const LogicContract = await ethers.getContractFactory("LogicContract");
    console.log("2. 部署逻辑合约...");
    logicContract = await LogicContract.deploy();
    await logicContract.waitForDeployment(); // 等待部署确认
    const logicAddress = await logicContract.getAddress(); // 获取部署地址
    console.log("3. 逻辑合约部署成功，地址：", logicAddress);
    
    // 部署代理合约，传入逻辑合约地址
    const ProxyContract = await ethers.getContractFactory("ProxyContract");
    console.log("4. 部署代理合约，关联到逻辑合约...");
    proxyContract = await ProxyContract.deploy(logicAddress);
    await proxyContract.waitForDeployment(); // 等待部署确认
    const proxyAddress = await proxyContract.getAddress();
    console.log("5. 代理合约部署成功，地址：", proxyAddress);
    
    // 检查代理合约是否正确关联到逻辑合约
    const linkedLogicAddress = await proxyContract.logicContractAddress();
    console.log("6. 代理合约关联的逻辑合约地址：", linkedLogicAddress);
    expect(linkedLogicAddress).to.equal(logicAddress);
    
    // 初始状态检查
    const initialCounter = await proxyContract.getCounter();
    console.log("7. 代理合约初始计数器值：", initialCounter.toString());
    const logicCounter = await logicContract.getCounter();
    console.log("8. 逻辑合约初始计数器值：", logicCounter.toString());
    console.log("准备工作完成！");
  });
  
  it("应该通过代理合约增加计数器并保留状态", async function() {
    console.log("\n=== 测试场景1：通过代理合约增加计数器并保留状态 ===");
    
    // 初始状态下，计数器应该为0
    let proxyCounter = await proxyContract.getCounter();
    console.log("- 初始计数值：", proxyCounter.toString());
    expect(proxyCounter.toString()).to.equal("0");
    
    // 通过代理合约调用increment函数
    console.log("- 调用代理合约的increment函数...");
    const tx1 = await proxyContract.increment();
    console.log("- 交易哈希：", tx1.hash);
    await tx1.wait(); // 等待交易确认
    console.log("- 交易已确认");
    
    // 检查代理合约的计数器是否增加
    proxyCounter = await proxyContract.getCounter();
    console.log("- 第一次调用后计数值：", proxyCounter.toString());
    expect(proxyCounter.toString()).to.equal("1");
    
    // 再次调用increment函数
    console.log("- 再次调用代理合约的increment函数...");
    const tx2 = await proxyContract.increment();
    console.log("- 交易哈希：", tx2.hash);
    await tx2.wait(); // 等待交易确认
    console.log("- 交易已确认");
    
    // 检查计数器是否再次增加
    proxyCounter = await proxyContract.getCounter();
    console.log("- 第二次调用后计数值：", proxyCounter.toString());
    expect(proxyCounter.toString()).to.equal("2");
    console.log("✅ 测试场景1通过：计数器状态正确保留");
  });
  
  it("应该验证代理合约和逻辑合约的状态是分离的", async function() {
    console.log("\n=== 测试场景2：验证代理合约和逻辑合约的状态是分离的 ===");
    
    // 首先通过代理合约调用increment函数
    console.log("- 通过代理合约调用increment函数...");
    const tx = await proxyContract.increment();
    console.log("- 交易哈希：", tx.hash);
    await tx.wait(); // 等待交易确认
    
    // 检查代理合约的计数器值
    const proxyCounter = await proxyContract.getCounter();
    console.log("- 代理合约计数值：", proxyCounter.toString());
    expect(proxyCounter.toString()).to.equal("1");
    
    // 检查逻辑合约的计数器是否仍然为0（状态分离）
    const logicCounter = await logicContract.getCounter();
    console.log("- 逻辑合约计数值：", logicCounter.toString());
    expect(logicCounter.toString()).to.equal("0");
    console.log("✅ 测试场景2通过：代理合约和逻辑合约状态成功分离");
    console.log("   这证明了delegatecall的特性：执行逻辑合约的代码，但操作代理合约的存储");
  });
  
  it("应该能够更新逻辑合约地址", async function() {
    console.log("\n=== 测试场景3：更新逻辑合约地址（合约升级演示） ===");
    
    // 创建一个新的逻辑合约实例
    console.log("- 部署新的逻辑合约实例（模拟合约升级）...");
    const NewLogicContract = await ethers.getContractFactory("LogicContract");
    const newLogicContract = await NewLogicContract.deploy();
    await newLogicContract.waitForDeployment(); // 等待部署确认
    const newLogicAddress = await newLogicContract.getAddress(); // 获取部署地址
    console.log("- 新逻辑合约部署成功，地址：", newLogicAddress);
    
    // 查看当前逻辑合约地址
    const oldLogicAddress = await proxyContract.logicContractAddress();
    console.log("- 当前代理合约使用的逻辑合约地址：", oldLogicAddress);
    
    // 更新代理合约的逻辑合约地址
    console.log("- 更新代理合约的逻辑合约地址...");
    const tx = await proxyContract.setLogicContract(newLogicAddress);
    console.log("- 交易哈希：", tx.hash);
    await tx.wait(); // 等待交易确认
    
    // 验证新的逻辑合约地址已设置
    const updatedLogicAddress = await proxyContract.logicContractAddress();
    console.log("- 更新后的逻辑合约地址：", updatedLogicAddress);
    expect(updatedLogicAddress).to.equal(newLogicAddress);
    
    // 确保通过新逻辑合约仍然可以正常工作
    console.log("- 通过新逻辑合约调用increment函数...");
    await proxyContract.increment();
    const proxyCounter = await proxyContract.getCounter();
    console.log("- 调用后计数值：", proxyCounter.toString());
    expect(proxyCounter.toString()).to.equal("1");
    console.log("✅ 测试场景3通过：成功更新逻辑合约地址并正常工作");
    console.log("   这演示了代理模式如何实现合约的可升级性");
  });
});