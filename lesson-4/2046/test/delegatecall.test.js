const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Delegatecall demo", function () {
  it("Proxy should update its own storage via delegatecall to Logic", async function () {
    const Logic = await ethers.getContractFactory("Logic");
    const logic = await Logic.deploy();
    await logic.deployed();

    const Proxy = await ethers.getContractFactory("Proxy");
    const proxy = await Proxy.deploy(logic.address);
    await proxy.deployed();

    // 初始值均为 0
    expect(await logic.count()).to.equal(0);
    expect(await proxy.count()).to.equal(0);

    // 通过代理调用 increment（代理使用 delegatecall 调用逻辑合约）
    await proxy.increment();

    // 代理的 count 应该增加，而逻辑合约本身的 count 保持不变
    expect(await proxy.count()).to.equal(1);
    expect(await logic.count()).to.equal(0);

    // 再调用一次
    await proxy.increment();
    expect(await proxy.count()).to.equal(2);
    expect(await logic.count()).to.equal(0);
  });
});