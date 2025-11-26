const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Demo", function () {
  it("应该成功执行重入攻击，将银行合约抽干", async function () {
    const [owner, attacker] = await ethers.getSigners();

    // 部署漏洞合约
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    const bank = await VulnerableBank.deploy();
    await bank.waitForDeployment();

    // 部署攻击合约
    const Attack = await ethers.getContractFactory("Attack");
    const attack = await Attack.connect(attacker).deploy(bank.target);
    await attack.waitForDeployment();

    // 给银行合约存入 10 ETH
    await owner.sendTransaction({ to: bank.target, value: ethers.parseEther("10") });
    await bank.deposit({ value: ethers.parseEther("10") });

    console.log("Bank initial balance:", ethers.formatEther(await bank.getBalance()), "ETH");

    // 攻击者先存 1 ETH
    await attack.depositToBank({ value: ethers.parseEther("1") });

    // 发起攻击（尝试每次提 1 ETH）
    await attack.attack(ethers.parseEther("1"));

    console.log("Bank balance after attack:", ethers.formatEther(await bank.getBalance()), "ETH");
    console.log("Attacker balance:", ethers.formatEther(await ethers.provider.getBalance(attack.target)), "ETH");
  });
});