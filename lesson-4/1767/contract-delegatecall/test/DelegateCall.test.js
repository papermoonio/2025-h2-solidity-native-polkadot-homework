const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DelegateCall 示例", function () {
  let logicContract;
  let proxyContract;
  let owner;
  let addr1;

  beforeEach(async function () {
    // 获取签名者
    [owner, addr1] = await ethers.getSigners();

    // 部署逻辑合约
    const LogicContract = await ethers.getContractFactory("LogicContract");
    logicContract = await LogicContract.deploy();
    await logicContract.waitForDeployment();

    // 部署代理合约，传入逻辑合约地址
    const ProxyContract = await ethers.getContractFactory("ProxyContract");
    proxyContract = await ProxyContract.deploy(await logicContract.getAddress());
    await proxyContract.waitForDeployment();
  });

  describe("部署", function () {
    it("应该正确设置逻辑合约地址", async function () {
      expect(await proxyContract.logicContract()).to.equal(
        await logicContract.getAddress()
      );
    });

    it("应该正确设置所有者", async function () {
      expect(await proxyContract.owner()).to.equal(owner.address);
    });

    it("初始计数器应该为 0", async function () {
      expect(await proxyContract.counter()).to.equal(0);
    });
  });

  describe("Delegatecall 功能", function () {
    it("应该通过 delegatecall 增加代理合约的计数器", async function () {
      // 调用代理合约的 incrementViaDelegate
      await proxyContract.incrementViaDelegate();
      
      // 验证代理合约的计数器增加了
      expect(await proxyContract.counter()).to.equal(1);
      
      // 验证逻辑合约的计数器没有变化
      expect(await logicContract.counter()).to.equal(0);
    });

    it("应该能够多次增加计数器", async function () {
      await proxyContract.incrementViaDelegate();
      await proxyContract.incrementViaDelegate();
      await proxyContract.incrementViaDelegate();
      
      expect(await proxyContract.counter()).to.equal(3);
      expect(await logicContract.counter()).to.equal(0);
    });

    it("应该通过 delegatecall 设置代理合约的计数器", async function () {
      await proxyContract.setCounterViaDelegate(100);
      
      expect(await proxyContract.counter()).to.equal(100);
      expect(await logicContract.counter()).to.equal(0);
    });

    it("应该触发 DelegateCallExecuted 事件", async function () {
      await expect(proxyContract.incrementViaDelegate())
        .to.emit(proxyContract, "DelegateCallExecuted")
        .withArgs(await logicContract.getAddress(), true);
    });
  });

  describe("状态隔离", function () {
    it("代理合约和逻辑合约的状态应该是独立的", async function () {
      // 通过代理合约增加计数器
      await proxyContract.incrementViaDelegate();
      await proxyContract.incrementViaDelegate();
      
      // 直接调用逻辑合约增加计数器
      await logicContract.increment();
      
      // 验证两个合约的状态是独立的
      expect(await proxyContract.counter()).to.equal(2);
      expect(await logicContract.counter()).to.equal(1);
    });
  });

  describe("逻辑合约升级", function () {
    it("应该允许所有者更新逻辑合约地址", async function () {
      // 部署新的逻辑合约
      const NewLogicContract = await ethers.getContractFactory("LogicContract");
      const newLogicContract = await NewLogicContract.deploy();
      await newLogicContract.waitForDeployment();

      // 更新逻辑合约地址
      await proxyContract.updateLogicContract(await newLogicContract.getAddress());
      
      expect(await proxyContract.logicContract()).to.equal(
        await newLogicContract.getAddress()
      );
    });

    it("非所有者不应该能够更新逻辑合约地址", async function () {
      const NewLogicContract = await ethers.getContractFactory("LogicContract");
      const newLogicContract = await NewLogicContract.deploy();
      await newLogicContract.waitForDeployment();

      await expect(
        proxyContract.connect(addr1).updateLogicContract(await newLogicContract.getAddress())
      ).to.be.revertedWith("Only owner can update logic contract");
    });

    it("更新逻辑合约后状态应该保持", async function () {
      // 增加计数器
      await proxyContract.incrementViaDelegate();
      await proxyContract.incrementViaDelegate();
      expect(await proxyContract.counter()).to.equal(2);

      // 部署并更新到新的逻辑合约
      const NewLogicContract = await ethers.getContractFactory("LogicContract");
      const newLogicContract = await NewLogicContract.deploy();
      await newLogicContract.waitForDeployment();
      await proxyContract.updateLogicContract(await newLogicContract.getAddress());

      // 验证状态保持不变
      expect(await proxyContract.counter()).to.equal(2);
      
      // 继续增加计数器
      await proxyContract.incrementViaDelegate();
      expect(await proxyContract.counter()).to.equal(3);
    });
  });
});
