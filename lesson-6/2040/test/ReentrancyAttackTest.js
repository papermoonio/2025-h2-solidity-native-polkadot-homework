const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Demonstration", function () {
  let owner, attacker, user1, user2;
  let vulnerableBank, attackContract;

  beforeEach(async function () {
    // 获取测试账户
    [owner, attacker, user1, user2] = await ethers.getSigners();

    // 部署脆弱的银行合约
    const VulnerableBank = await ethers.getContractFactory("ReentrancyVulnerableBank");
    vulnerableBank = await VulnerableBank.deploy();

    // 部署攻击合约
    const Attacker = await ethers.getContractFactory("ReentrancyAttacker");
    attackContract = await Attacker.deploy(await vulnerableBank.getAddress());
  });

  describe("正常功能测试", function () {
    it("应该允许用户正常存款和取款", async function () {
      // 用户1存款 5 ETH
      await vulnerableBank.connect(user1).deposit({ value: ethers.parseEther("5") });
      expect(await vulnerableBank.connect(user1).getBalance()).to.equal(ethers.parseEther("5"));

      // 用户1取款 2 ETH
      await vulnerableBank.connect(user1).withdraw(ethers.parseEther("2"));
      expect(await vulnerableBank.connect(user1).getBalance()).to.equal(ethers.parseEther("3"));

      // 合约余额应该是 3 ETH
      expect(await vulnerableBank.getContractBalance()).to.equal(ethers.parseEther("3"));
    });

    it("应该允许多个用户存款", async function () {
      // 用户1存款 3 ETH
      await vulnerableBank.connect(user1).deposit({ value: ethers.parseEther("3") });
      // 用户2存款 2 ETH
      await vulnerableBank.connect(user2).deposit({ value: ethers.parseEther("2") });

      expect(await vulnerableBank.connect(user1).getBalance()).to.equal(ethers.parseEther("3"));
      expect(await vulnerableBank.connect(user2).getBalance()).to.equal(ethers.parseEther("2"));
      expect(await vulnerableBank.getContractBalance()).to.equal(ethers.parseEther("5"));
    });
  });

  describe("重入攻击演示", function () {
    beforeEach(async function () {
      // 为银行合约准备一些初始资金
      // 模拟多个用户存款
      await vulnerableBank.connect(user1).deposit({ value: ethers.parseEther("50") });
      await vulnerableBank.connect(user2).deposit({ value: ethers.parseEther("50") });
      // 银行合约现在有 100 ETH
      expect(await vulnerableBank.getContractBalance()).to.equal(ethers.parseEther("100"));
    });

    it("应该演示重入攻击能多次执行withdraw", async function () {
      // 记录攻击前的状态
      const bankBalanceBefore = await vulnerableBank.getContractBalance();
      const attackerBalanceBefore = await attackContract.getBalance();
      console.log("Bank balance before attack:", ethers.formatEther(bankBalanceBefore));
      console.log("Attacker balance before attack:", ethers.formatEther(attackerBalanceBefore));

      // 攻击者用 1 ETH 发起攻击 - 捕获可能的错误
      try {
        const attackTx = await attackContract.connect(attacker).attack(ethers.parseEther("1"), {
          value: ethers.parseEther("1")
        });
        await attackTx.wait();
        console.log("Attack completed successfully");
      } catch (error) {
        console.log("Attack failed due to gas limits (expected):", error.message.substring(0, 100) + "...");
      }

      // 检查结果 - 即使攻击失败，攻击者也可能获得了资金
      const bankBalanceAfter = await vulnerableBank.getContractBalance();
      const attackerBalanceAfter = await attackContract.getBalance();

      console.log("Bank balance after attack:", ethers.formatEther(bankBalanceAfter));
      console.log("Attacker balance after attack:", ethers.formatEther(attackerBalanceAfter));

      const attackerGained = attackerBalanceAfter - attackerBalanceBefore;
      const bankLost = bankBalanceBefore - bankBalanceAfter;

      console.log("Attacker gained:", ethers.formatEther(attackerGained.toString()));
      console.log("Bank lost:", ethers.formatEther(bankLost.toString()));

      // 银行合约应该被削弱（即使攻击因gas限制失败）
      expect(bankBalanceAfter).to.be.lt(bankBalanceBefore);

      // 攻击者应该获得一些资金
      expect(attackerBalanceAfter).to.be.gt(attackerBalanceBefore);
    });

    it("攻击后银行合约的余额应该减少", async function () {
      const bankBalanceBefore = await vulnerableBank.getContractBalance();

      // 执行攻击
      await attackContract.connect(attacker).attack(ethers.parseEther("1"), {
        value: ethers.parseEther("1")
      });

      // 检查银行余额
      const bankBalanceAfter = await vulnerableBank.getContractBalance();

      // 银行应该被削弱
      expect(bankBalanceAfter).to.be.lt(bankBalanceBefore);
    });
  });
});
