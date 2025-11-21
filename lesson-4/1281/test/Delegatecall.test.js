const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Delegatecall 示例", function () {
  let logic;
  let proxy;
  let proxyAsLogic; // 使用逻辑合约的 ABI 与代理合约交互
  let owner;
  let addr1;

  beforeEach(async function () {
    // 获取签名者
    [owner, addr1] = await ethers.getSigners();

    // 部署逻辑合约
    const Logic = await ethers.getContractFactory("Logic");
    logic = await Logic.deploy();
    await logic.waitForDeployment();

    // 部署代理合约，传入逻辑合约地址
    const Proxy = await ethers.getContractFactory("Proxy");
    proxy = await Proxy.deploy(await logic.getAddress());
    await proxy.waitForDeployment();

    // 创建一个使用逻辑合约 ABI 但指向代理合约地址的实例
    proxyAsLogic = Logic.attach(await proxy.getAddress());
  });

  describe("部署", function () {
    it("应该正确设置逻辑合约地址", async function () {
      expect(await proxy.logicContract()).to.equal(await logic.getAddress());
    });

    it("初始计数器应该为 0", async function () {
      expect(await proxyAsLogic.getCounter()).to.equal(0);
    });
  });

  describe("Fallback 代理功能", function () {
    it("通过代理合约调用 increment 应该增加代理合约的计数器", async function () {
      // 通过 fallback 调用代理合约的 increment
      await proxyAsLogic.increment();
      
      // 验证代理合约的计数器增加了
      expect(await proxyAsLogic.getCounter()).to.equal(1);
      
      // 验证逻辑合约的计数器没有变化
      expect(await logic.getCounter()).to.equal(0);
    });

    it("多次调用应该正确累加", async function () {
      await proxyAsLogic.increment();
      await proxyAsLogic.increment();
      await proxyAsLogic.increment();
      
      expect(await proxyAsLogic.getCounter()).to.equal(3);
      expect(await logic.getCounter()).to.equal(0);
    });

    it("应该能够代理 incrementBy 函数", async function () {
      await proxyAsLogic.incrementBy(5);
      expect(await proxyAsLogic.getCounter()).to.equal(5);
      
      await proxyAsLogic.incrementBy(10);
      expect(await proxyAsLogic.getCounter()).to.equal(15);
      
      // 逻辑合约状态不变
      expect(await logic.getCounter()).to.equal(0);
    });

    it("应该能够代理 setCounter 函数", async function () {
      await proxyAsLogic.setCounter(100);
      expect(await proxyAsLogic.getCounter()).to.equal(100);
      
      // 逻辑合约状态不变
      expect(await logic.getCounter()).to.equal(0);
    });

    it("不同账户调用应该修改同一个代理合约状态", async function () {
      // owner 调用
      await proxyAsLogic.connect(owner).increment();
      expect(await proxyAsLogic.getCounter()).to.equal(1);
      
      // addr1 调用
      await proxyAsLogic.connect(addr1).incrementBy(9);
      expect(await proxyAsLogic.getCounter()).to.equal(10);
    });

    it("直接调用逻辑合约应该修改逻辑合约自己的状态", async function () {
      // 直接调用逻辑合约
      await logic.increment();
      
      // 逻辑合约的计数器增加
      expect(await logic.getCounter()).to.equal(1);
      
      // 代理合约的计数器不变
      expect(await proxyAsLogic.getCounter()).to.equal(0);
    });
  });

  describe("状态隔离验证", function () {
    it("代理合约和逻辑合约的状态应该完全独立", async function () {
      // 通过代理调用
      await proxyAsLogic.increment();
      await proxyAsLogic.incrementBy(5);
      
      // 直接调用逻辑合约
      await logic.increment();
      await logic.setCounter(100);
      
      // 验证状态独立
      expect(await proxyAsLogic.getCounter()).to.equal(6);
      expect(await logic.getCounter()).to.equal(100);
    });
  });

  describe("Fallback 错误处理", function () {
    it("调用不存在的函数应该失败", async function () {
      // 尝试调用一个不存在的函数
      const proxyInterface = new ethers.Interface(["function nonExistentFunction()"]);
      const data = proxyInterface.encodeFunctionData("nonExistentFunction");
      
      await expect(
        owner.sendTransaction({
          to: await proxy.getAddress(),
          data: data
        })
      ).to.be.reverted;
    });
  });
});
