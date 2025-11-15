const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Delegatecall Proxy", function () {
  it("updates proxy storage via logic increment", async function () {
    const Logic = await ethers.getContractFactory("Logic");
    const logic = await Logic.deploy();
    await logic.waitForDeployment();

    const Proxy = await ethers.getContractFactory("Proxy");
    const proxy = await Proxy.deploy(await logic.getAddress());
    await proxy.waitForDeployment();

    expect(await proxy.count()).to.equal(0n);
    expect(await logic.count()).to.equal(0n);

    await (await proxy.increment()).wait();
    await (await proxy.increment()).wait();
    await (await proxy.increment()).wait();

    expect(await proxy.count()).to.equal(3n);
    expect(await logic.count()).to.equal(0n);
  });
});