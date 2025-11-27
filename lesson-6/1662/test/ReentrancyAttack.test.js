const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Test", function () {
  let vault;
  let attacker;
  let owner;

  beforeEach(async function () {
    // 获取签名者
    [owner] = await ethers.getSigners();

    // 部署 VulnerableVault
    const VulnerableVault = await ethers.getContractFactory("VulnerableVault");
    vault = await VulnerableVault.deploy();

    // 部署 ReentrancyAttack，并传入 vault 地址
    const ReentrancyAttack = await ethers.getContractFactory("ReentrancyAttack");
    attacker = await ReentrancyAttack.deploy(await vault.getAddress());
  });

  it("should drain the vault via reentrancy attack", async function () {
    // 步骤1: 向 vault 存入一些 ETH（模拟正常用户存款）
    const depositAmount = ethers.parseEther("10");
    await vault.deposit({ value: depositAmount });

    // 检查初始余额
    expect(await vault.balances(owner.address)).to.equal(depositAmount);
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.equal(depositAmount);

    // 步骤2: 攻击者存入少量 ETH 并发起攻击
    const attackAmount = ethers.parseEther("1");
    await attacker.connect(owner).attack({ value: attackAmount });

    // 步骤3: 检查攻击后结果
    // vault 应该被抽干（余额低于初始攻击金额）
    expect(await ethers.provider.getBalance(await vault.getAddress())).to.be.lt(attackAmount);

    // 攻击者提取资金
    await attacker.connect(owner).withdrawFunds();

    // 检查攻击者余额（应获得 vault 的所有资金，加上初始攻击金额）
    expect(await ethers.provider.getBalance(attacker.getAddress())).to.be.gt(depositAmount);
  });
});