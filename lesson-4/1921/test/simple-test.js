import { expect } from "chai";
import hre from "hardhat";

describe("🧪 DelegateCall 简单测试", function () {
  let owner, user;
  let logicContract, proxyContract, proxyAsLogic;

  beforeEach(async function () {
    console.log("\n🚀 开始部署测试合约...");
    
    // 获取签名者
    [owner, user] = await hre.ethers.getSigners();
    console.log(`👤 Owner地址: ${owner.address}`);

    // 1. 部署逻辑合约
    const LogicFactory = await hre.ethers.getContractFactory("SimpleCounter");
    logicContract = await LogicFactory.deploy();
    await logicContract.waitForDeployment();
    console.log(`📋 逻辑合约地址: ${await logicContract.getAddress()}`);

    // 2. 部署代理合约
    const ProxyFactory = await hre.ethers.getContractFactory("SimpleProxy");
    proxyContract = await ProxyFactory.deploy(
      await logicContract.getAddress(),
      owner.address
    );
    await proxyContract.waitForDeployment();
    console.log(`🔗 代理合约地址: ${await proxyContract.getAddress()}`);

    // 3. 创建代理合约的逻辑接口视图
    proxyAsLogic = await hre.ethers.getContractAt(
      "SimpleCounter",
      await proxyContract.getAddress()
    );
    console.log(`✨ 代理+逻辑视图创建完成`);
  });

  describe("📊 基础状态验证", function () {
    it("应该正确初始化代理合约状态", async function () {
      expect(await proxyContract.count()).to.equal(0);
      expect(await proxyContract.owner()).to.equal(owner.address);
      expect(await proxyContract.implementation()).to.equal(await logicContract.getAddress());
      
      console.log("✅ 代理合约初始状态验证通过");
    });

    it("应该能通过代理读取逻辑合约接口的状态", async function () {
      expect(await proxyAsLogic.count()).to.equal(0);
      expect(await proxyAsLogic.owner()).to.equal(owner.address);
      expect(await proxyAsLogic.getCount()).to.equal(0);
      
      console.log("✅ 通过代理读取逻辑接口验证通过");
    });
  });

  describe("🚀 DelegateCall 核心功能测试", function () {
    it("应该通过代理成功调用increment函数", async function () {
      console.log("\n🔥 测试 increment() 函数...");
      
      // 调用前的状态
      const countBefore = await proxyAsLogic.count();
      console.log(`📊 调用前计数: ${countBefore}`);
      
      // 通过代理调用逻辑合约的increment函数
      await proxyAsLogic.increment();
      
      // 验证状态变化
      const countAfter = await proxyAsLogic.count();
      console.log(`📊 调用后计数: ${countAfter}`);
      
      expect(countAfter).to.equal(countBefore + 1n);
      
      console.log("✅ DelegateCall increment 测试通过");
    });

    it("应该通过代理成功调用incrementBy函数", async function () {
      console.log("\n🔥 测试 incrementBy(5) 函数...");
      
      const incrementValue = 5n;
      const countBefore = await proxyAsLogic.count();
      
      // 通过代理调用
      await proxyAsLogic.incrementBy(incrementValue);
      
      const countAfter = await proxyAsLogic.count();
      expect(countAfter).to.equal(countBefore + incrementValue);
      
      console.log(`📊 增加了 ${incrementValue}，最终计数: ${countAfter}`);
      console.log("✅ DelegateCall incrementBy 测试通过");
    });

    it("🔍 关键验证：状态存储位置", async function () {
      console.log("\n🎯 验证状态存储在哪个合约...");
      
      // 通过代理调用increment
      await proxyAsLogic.increment();
      await proxyAsLogic.incrementBy(2);
      
      // 检查两个合约的状态
      const logicCount = await logicContract.count();
      const proxyCount = await proxyContract.count();
      const proxyAsLogicCount = await proxyAsLogic.count();
      
      console.log(`📋 逻辑合约 count: ${logicCount}`);
      console.log(`🔗 代理合约 count: ${proxyCount}`);  
      console.log(`✨ 代理+逻辑视图 count: ${proxyAsLogicCount}`);
      
      // 🎯 关键验证：逻辑合约状态不变，代理合约状态改变
      expect(logicCount).to.equal(0n, "逻辑合约的状态不应该改变");
      expect(proxyCount).to.equal(3n, "代理合约状态应该是3");
      expect(proxyAsLogicCount).to.equal(3n, "通过代理读取应该也是3");
      
      console.log("✅ 状态存储验证通过：状态确实存储在代理合约中！");
    });
  });

  describe("🔧 代理升级功能测试", function () {
    it("应该能成功升级逻辑合约", async function () {
      console.log("\n🔄 测试合约升级...");
      
      // 先修改一些状态
      await proxyAsLogic.increment();
      const countBeforeUpgrade = await proxyContract.count();
      console.log(`📊 升级前计数: ${countBeforeUpgrade}`);
      
      // 部署新的逻辑合约
      const NewLogicFactory = await hre.ethers.getContractFactory("SimpleCounter");
      const newLogicContract = await NewLogicFactory.deploy();
      await newLogicContract.waitForDeployment();
      
      const newLogicAddress = await newLogicContract.getAddress();
      console.log(`📋 新逻辑合约地址: ${newLogicAddress}`);
      
      // 执行升级
      const oldImpl = await proxyContract.implementation();
      await proxyContract.upgrade(newLogicAddress);
      const newImpl = await proxyContract.implementation();
      
      // 验证升级成功
      expect(newImpl).to.equal(newLogicAddress);
      expect(newImpl).to.not.equal(oldImpl);
      
      // 🔍 关键：验证升级后状态保持
      const countAfterUpgrade = await proxyContract.count();
      expect(countAfterUpgrade).to.equal(countBeforeUpgrade);
      
      console.log(`📊 升级后计数: ${countAfterUpgrade}`);
      console.log("✅ 合约升级测试通过，状态完美保持！");
    });
  });

  describe("🚫 错误处理测试", function () {
    it("应该正确处理无效参数", async function () {
      await expect(
        proxyAsLogic.incrementBy(0)
      ).to.be.revertedWith("Value must be greater than 0");
      
      console.log("✅ 错误处理测试通过");
    });

    it("应该只允许owner升级合约", async function () {
      const NewLogicFactory = await hre.ethers.getContractFactory("SimpleCounter");
      const newLogicContract = await NewLogicFactory.deploy();
      
      await expect(
        proxyContract.connect(user).upgrade(await newLogicContract.getAddress())
      ).to.be.revertedWith("Only owner can call this function");
      
      console.log("✅ 升级权限控制测试通过");
    });
  });
});
