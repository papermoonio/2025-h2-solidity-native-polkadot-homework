import { expect } from "chai";
import { ethers } from "hardhat";

describe("Delegatecall example", function () {
  let logic: any;
  let proxy: any;
  let owner: any, addr1: any;

  beforeEach(async function () {
    [owner, addr1] = await ethers.getSigners();

    const LogicFactory = await ethers.getContractFactory("LogicCounter");
    const ProxyFactory = await ethers.getContractFactory("ProxyCounter");

    logic = await LogicFactory.deploy();
    await logic.waitForDeployment();

    proxy = await ProxyFactory.deploy(await logic.getAddress());
    await proxy.waitForDeployment();
  });

  it("proxy should update its own storage via delegatecall", async function () {
    expect(await proxy.count()).to.equal(0);

    await proxy.incrementViaDelegate();

    expect(await proxy.count()).to.equal(1);
    expect(await logic.count()).to.equal(0);
  });
});