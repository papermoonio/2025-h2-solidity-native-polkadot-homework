const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Demo", function () {
  let vulnerableBank;
  let attacker;
  let owner, attackerAccount, victim1, victim2;

  beforeEach(async function () {
    // 获取测试账户
    [owner, attackerAccount, victim1, victim2] = await ethers.getSigners();

    // 1. 部署有漏洞的银行合约
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await VulnerableBank.deploy();
    await vulnerableBank.waitForDeployment();

    console.log("\n=== 初始部署 ===");
    console.log("VulnerableBank 部署地址:", await vulnerableBank.getAddress());

    // 2. 受害者存款（模拟银行有钱）
    await vulnerableBank.connect(victim1).deposit({ value: ethers.parseEther("3") });
    await vulnerableBank.connect(victim2).deposit({ value: ethers.parseEther("3") });

    console.log("\n=== 受害者存款 ===");
    console.log("Victim1 存入: 3 ETH");
    console.log("Victim2 存入: 3 ETH");
    console.log("银行总余额:", ethers.formatEther(await vulnerableBank.getBalance()), "ETH");

    // 3. 部署攻击合约
    const Attacker = await ethers.getContractFactory("Attacker");
    attacker = await Attacker.deploy(await vulnerableBank.getAddress());
    await attacker.waitForDeployment();

    console.log("\n=== 部署攻击合约 ===");
    console.log("Attacker 部署地址:", await attacker.getAddress());
  });

  it("应该演示重入攻击成功", async function () {
    // 攻击前的状态
    const bankBalanceBefore = await vulnerableBank.getBalance();
    const attackerBalanceBefore = await attacker.getBalance();

    console.log("\n=== 攻击前状态 ===");
    console.log("银行余额:", ethers.formatEther(bankBalanceBefore), "ETH");
    console.log("攻击者余额:", ethers.formatEther(attackerBalanceBefore), "ETH");

    // 🚨 发起攻击！攻击者只投入 1 ETH
    console.log("\n=== 🚨 发起攻击！ ===");
    console.log("攻击者投入: 1 ETH");
    
    // 执行攻击
    const tx = await attacker.connect(attackerAccount).attack({ 
      value: ethers.parseEther("1")
    });
    await tx.wait();

    // 攻击后的状态
    const bankBalanceAfter = await vulnerableBank.getBalance();
    const attackerBalanceAfter = await attacker.getBalance();
    const attackCount = await attacker.attackCount();

    console.log("\n=== 攻击后状态 ===");
    console.log("银行余额:", ethers.formatEther(bankBalanceAfter), "ETH");
    console.log("攻击者余额:", ethers.formatEther(attackerBalanceAfter), "ETH");
    console.log("重入次数:", attackCount.toString(), "次");
    console.log("攻击者获利:", ethers.formatEther(attackerBalanceAfter - ethers.parseEther("1")), "ETH");

    // 验证攻击成功
    console.log("\n=== ✅ 攻击成功验证 ===");
    
    // 关键验证：重入攻击确实发生了！
    expect(attackCount).to.be.greaterThan(1);
    console.log("✅ 重入攻击发生了", attackCount.toString(), "次！");
    
    // 验证攻击者盗取了 ETH
    expect(attackerBalanceAfter).to.be.greaterThan(ethers.parseEther("1"));
    console.log("✅ 攻击者用 1 ETH 盗取了", ethers.formatEther(attackerBalanceAfter - ethers.parseEther("1")), "ETH！");
    console.log("✅ 银行剩余:", ethers.formatEther(bankBalanceAfter), "ETH");
  });

  it("应该显示受害者的损失", async function () {
    // 攻击前受害者的余额
    const victim1BalanceBefore = await vulnerableBank.getUserBalance(victim1.address);
    const victim2BalanceBefore = await vulnerableBank.getUserBalance(victim2.address);

    console.log("\n=== 攻击前受害者余额 ===");
    console.log("Victim1 余额:", ethers.formatEther(victim1BalanceBefore), "ETH");
    console.log("Victim2 余额:", ethers.formatEther(victim2BalanceBefore), "ETH");

    // 发起攻击
    await attacker.connect(attackerAccount).attack({ 
      value: ethers.parseEther("1")
    });

    const bankBalanceAfter = await vulnerableBank.getBalance();
    console.log("\n=== 攻击后银行余额 ===");
    console.log("银行剩余:", ethers.formatEther(bankBalanceAfter), "ETH");

    console.log("\n=== 攻击后受害者尝试取款 ===");

    // 攻击后，受害者尝试取款
    try {
      await vulnerableBank.connect(victim1).withdraw(ethers.parseEther("3"));
      console.log("❌ Victim1 取款不应该成功");
    } catch (error) {
      console.log("✅ Victim1 无法取款（银行余额不足）");
    }

    console.log("😭 受害者的钱被盗了!");
  });
});