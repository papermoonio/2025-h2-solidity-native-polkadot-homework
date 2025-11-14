const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("DelegateCall", function () {
  let LogicContract;
  let ProxyContract;
  let logic;
  let proxy;
  let owner;

  beforeEach(async function () {
    LogicContract = await ethers.getContractFactory("LogicContract");
    ProxyContract = await ethers.getContractFactory("ProxyContract");
    [owner] = await ethers.getSigners();

    logic = await LogicContract.deploy();
    await logic.deployed();

    proxy = await ProxyContract.deploy(logic.address);
    await proxy.deployed();
  });

  describe("Deployment", function () {
    it("Should set the logic contract address", async function () {
      expect(await proxy.logicContract()).to.equal(logic.address);
    });

    it("Should initialize counters to 0", async function () {
      expect(await proxy.counter()).to.equal(0);
      expect(await logic.counter()).to.equal(0);
    });
  });

  describe("DelegateCall", function () {
    it("Should increment proxy counter via delegatecall", async function () {
      await proxy.callIncrement();
      expect(await proxy.counter()).to.equal(1);
    });

    it("Should not change logic contract counter", async function () {
      await proxy.callIncrement();
      expect(await logic.counter()).to.equal(0);
    });

    it("Should increment multiple times", async function () {
      await proxy.callIncrement();
      await proxy.callIncrement();
      await proxy.callIncrement();
      expect(await proxy.counter()).to.equal(3);
      expect(await logic.counter()).to.equal(0);
    });
  });
});
