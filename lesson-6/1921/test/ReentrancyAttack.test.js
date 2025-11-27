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
    await vulnerableBank.connect(victim1).deposit({ value: ethers.parseEther("300") });
    await vulnerableBank.connect(victim2).deposit({ value: ethers.parseEther("3") });

    console.log("\n=== 受害者存款 ===");
    console.log("Victim1 存入: 300 ETH");
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
    const bankBalanceBefore = await vulnerableBank.getBalance();

    console.log("\n=== 攻击前状态 ===");
    console.log("Victim1 账户余额:", ethers.formatEther(victim1BalanceBefore), "ETH");
    console.log("Victim2 账户余额:", ethers.formatEther(victim2BalanceBefore), "ETH");
    console.log("银行总余额:", ethers.formatEther(bankBalanceBefore), "ETH");

    // 发起攻击
    await attacker.connect(attackerAccount).attack({ 
      value: ethers.parseEther("1")
    });

    const bankBalanceAfter = await vulnerableBank.getBalance();
    const victim1BalanceAfter = await vulnerableBank.getUserBalance(victim1.address);
    const victim2BalanceAfter = await vulnerableBank.getUserBalance(victim2.address);
    
    console.log("\n=== 攻击后状态 ===");
    console.log("Victim1 账户余额:", ethers.formatEther(victim1BalanceAfter), "ETH");
    console.log("Victim2 账户余额:", ethers.formatEther(victim2BalanceAfter), "ETH");
    console.log("银行剩余余额:", ethers.formatEther(bankBalanceAfter), "ETH");

    // 计算损失
    const totalStolen = bankBalanceBefore - bankBalanceAfter - ethers.parseEther("1"); // 减去攻击者投入的1ETH
    console.log("\n=== 💸 受害者损失统计 ===");
    console.log("被盗总额:", ethers.formatEther(totalStolen), "ETH");
    console.log("Victim1 可能损失:", ethers.formatEther(victim1BalanceBefore), "ETH (无法完全取回)");
    console.log("Victim2 可能损失:", ethers.formatEther(victim2BalanceBefore), "ETH (无法完全取回)");

    console.log("\n=== 攻击后受害者尝试取款 ===");

    // 攻击后，Victim1 尝试取出部分余额
    const bankBalanceBeforeWithdraw = await vulnerableBank.getBalance();
    console.log("银行实际剩余:", ethers.formatEther(bankBalanceBeforeWithdraw), "ETH");
    console.log("Victim1 存款记录: 300.0 ETH");
    console.log("Victim1 尝试取出: 185.0 ETH (银行剩余的全部)");
    
    const victim1EthBefore = await ethers.provider.getBalance(victim1.address);
    const tx = await vulnerableBank.connect(victim1).withdraw(ethers.parseEther("185"));
    const receipt = await tx.wait();
    const gasUsed = receipt.gasUsed * receipt.gasPrice;
    
    const victim1EthAfter = await ethers.provider.getBalance(victim1.address);
    const victim1ActualReceived = victim1EthAfter - victim1EthBefore + gasUsed;
    
    console.log("Victim1 实际收到:", ethers.formatEther(victim1ActualReceived), "ETH");
    
    const victim1Loss = ethers.parseEther("300") - ethers.parseEther("185");
    console.log("⚠️  Victim1 损失了:", ethers.formatEther(victim1Loss), "ETH（无法取回）");
    
    const victim1BalanceFinal = await vulnerableBank.getUserBalance(victim1.address);
    const bankBalanceFinal = await vulnerableBank.getBalance();
    
    console.log("\n=== 💔 最终状态 ===");
    console.log("Victim1 在银行的存款记录:", ethers.formatEther(victim1BalanceFinal), "ETH (账面余额)");
    console.log("银行实际剩余 ETH:", ethers.formatEther(bankBalanceFinal), "ETH");
    console.log("❌ Victim1 的账面余额 " + ethers.formatEther(victim1BalanceFinal) + " ETH 永远无法取出（银行已空）");
    console.log("😭 Victim2 的 3 ETH 也完全无法取回！");

    console.log("\n😭 由于重入攻击，受害者遭受实际损失！");
  });
});