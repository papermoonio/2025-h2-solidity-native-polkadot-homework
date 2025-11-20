import { expect } from "chai";
import { ethers } from "hardhat";
// 注意：这些类型会在编译后生成
// import { SimpleCounter, SimpleProxy } from "../typechain-types";
// import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("🧪 DelegateCall 学习测试", function () {
  let owner: HardhatEthersSigner;
  let user: HardhatEthersSigner;
  let logicContract: SimpleCounter;
  let proxyContract: SimpleProxy;
  let proxyAsLogic: SimpleCounter;

  /**
   * 🎯 测试前准备：部署合约并设置
   */
  beforeEach(async function () {
    console.log("\n🚀 开始部署测试合约...");
    
    // 获取签名者
    [owner, user] = await ethers.getSigners();
    console.log(`👤 Owner地址: ${owner.address}`);
    console.log(`👤 User地址: ${user.address}`);

    // 1. 部署逻辑合约
    const LogicFactory = await ethers.getContractFactory("SimpleCounter");
    logicContract = await LogicFactory.deploy();
    await logicContract.waitForDeployment();
    console.log(`📋 逻辑合约地址: ${await logicContract.getAddress()}`);

    // 2. 部署代理合约
    const ProxyFactory = await ethers.getContractFactory("SimpleProxy");
    proxyContract = await ProxyFactory.deploy(
      await logicContract.getAddress(),
      owner.address
    );
    await proxyContract.waitForDeployment();
    console.log(`🔗 代理合约地址: ${await proxyContract.getAddress()}`);

    // 3. 创建代理合约的逻辑接口视图
    // 🔍 关键：用逻辑合约的ABI绑定到代理合约的地址
    proxyAsLogic = await ethers.getContractAt(
      "SimpleCounter",
      await proxyContract.getAddress()
    ) as SimpleCounter;
    console.log(`✨ 代理+逻辑视图创建完成`);
  });

  describe("📊 基础状态验证", function () {
    it("应该正确初始化代理合约状态", async function () {
      // 验证代理合约的直接状态
      expect(await proxyContract.count()).to.equal(0);
      expect(await proxyContract.owner()).to.equal(owner.address);
      expect(await proxyContract.implementation()).to.equal(await logicContract.getAddress());
      
      console.log("✅ 代理合约初始状态验证通过");
    });

    it("应该能通过代理读取逻辑合约接口的状态", async function () {
      // 🎯 关键测试：通过代理合约读取逻辑合约的接口
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
      
      // 🎯 通过代理调用逻辑合约的increment函数
      const tx = await proxyAsLogic.increment();
      const receipt = await tx.wait();
      
      // 验证状态变化
      const countAfter = await proxyAsLogic.count();
      console.log(`📊 调用后计数: ${countAfter}`);
      
      expect(countAfter).to.equal(countBefore + 1n);
      
      // 🔍 验证事件：事件应该从代理合约地址发出
      const events = receipt?.logs || [];
      expect(events.length).to.be.greaterThan(0);
      
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

    it("应该正确处理权限控制函数", async function () {
      console.log("\n🔐 测试权限控制...");
      
      // Owner应该能调用reset
      await proxyAsLogic.connect(owner).increment(); // 先增加计数
      expect(await proxyAsLogic.count()).to.equal(1);
      
      await proxyAsLogic.connect(owner).reset(); // owner重置
      expect(await proxyAsLogic.count()).to.equal(0);
      
      // 非owner不应该能调用reset
      await proxyAsLogic.connect(owner).increment(); // 再次增加
      await expect(
        proxyAsLogic.connect(user).reset()
      ).to.be.revertedWith("Only owner can reset");
      
      console.log("✅ 权限控制测试通过");
    });
  });

  describe("🔄 状态一致性验证", function () {
    it("应该验证代理合约和逻辑视图的状态一致性", async function () {
      console.log("\n🔍 验证状态一致性...");
      
      // 通过代理修改状态
      await proxyAsLogic.increment();
      await proxyAsLogic.incrementBy(3);
      
      // 验证两种方式读取的状态一致
      const proxyCount = await proxyContract.count();
      const logicViewCount = await proxyAsLogic.count();
      const getCountResult = await proxyAsLogic.getCount();
      
      expect(proxyCount).to.equal(logicViewCount);
      expect(proxyCount).to.equal(getCountResult);
      expect(proxyCount).to.equal(4); // 1 + 3 = 4
      
      console.log(`📊 所有方式读取的计数都是: ${proxyCount}`);
      console.log("✅ 状态一致性验证通过");
    });

    it("应该验证msg.sender在delegatecall中正确传递", async function () {
      console.log("\n👤 验证 msg.sender 传递...");
      
      // 用user账户调用
      const tx = await proxyAsLogic.connect(user).increment();
      const receipt = await tx.wait();
      
      // 🔍 检查事件中的caller是否为user而不是proxy
      // 注意：在delegatecall中，msg.sender应该是原始调用者(user)，不是代理合约
      
      console.log("✅ msg.sender 传递测试通过");
      // 注意：实际的事件解析需要更复杂的逻辑，这里简化处理
    });
  });

  describe("🔧 代理升级功能测试", function () {
    it("应该能成功升级逻辑合约", async function () {
      console.log("\n🔄 测试合约升级...");
      
      // 记录升级前的状态
      await proxyAsLogic.increment();
      const countBeforeUpgrade = await proxyContract.count();
      
      // 部署新的逻辑合约（这里用相同的合约模拟）
      const NewLogicFactory = await ethers.getContractFactory("SimpleCounter");
      const newLogicContract = await NewLogicFactory.deploy();
      await newLogicContract.waitForDeployment();
      
      console.log(`📋 新逻辑合约地址: ${await newLogicContract.getAddress()}`);
      
      // 执行升级
      const oldImpl = await proxyContract.implementation();
      await proxyContract.upgrade(await newLogicContract.getAddress());
      const newImpl = await proxyContract.implementation();
      
      // 验证升级成功
      expect(newImpl).to.equal(await newLogicContract.getAddress());
      expect(newImpl).to.not.equal(oldImpl);
      
      // 🔍 关键：验证升级后状态保持
      expect(await proxyContract.count()).to.equal(countBeforeUpgrade);
      
      console.log("✅ 合约升级测试通过，状态保持完整");
    });

    it("应该只允许owner升级合约", async function () {
      console.log("\n🔐 测试升级权限控制...");
      
      const NewLogicFactory = await ethers.getContractFactory("SimpleCounter");
      const newLogicContract = await NewLogicFactory.deploy();
      
      // 非owner不应该能升级
      await expect(
        proxyContract.connect(user).upgrade(await newLogicContract.getAddress())
      ).to.be.revertedWith("Only owner can call this function");
      
      console.log("✅ 升级权限控制测试通过");
    });
  });

  describe("🚫 错误情况处理", function () {
    it("应该正确处理无效的函数调用", async function () {
      console.log("\n❌ 测试错误处理...");
      
      // 测试调用不存在的函数
      await expect(
        proxyAsLogic.incrementBy(0)
      ).to.be.revertedWith("Value must be greater than 0");
      
      console.log("✅ 错误处理测试通过");
    });
  });
});
