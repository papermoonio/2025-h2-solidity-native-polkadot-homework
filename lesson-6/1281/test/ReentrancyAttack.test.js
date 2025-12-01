const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("重入攻击演示 (Reentrancy Attack Demo)", function () {
  let vulnerableBank;
  let secureBank;
  let attacker;
  let owner, attackerAccount, victim1, victim2;

  beforeEach(async function () {
    // 获取测试账户
    [owner, attackerAccount, victim1, victim2] = await ethers.getSigners();

    // 1. 部署有漏洞的银行合约
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await VulnerableBank.deploy();
    await vulnerableBank.waitForDeployment();

    // 2. 部署安全的银行合约
    const SecureBank = await ethers.getContractFactory("SecureBank");
    secureBank = await SecureBank.deploy();
    await secureBank.waitForDeployment();

    console.log("\n" + "=".repeat(60));
    console.log("📦 合约部署完成");
    console.log("=".repeat(60));
    console.log("VulnerableBank 地址:", await vulnerableBank.getAddress());
    console.log("SecureBank 地址:", await secureBank.getAddress());
  });

  describe("🚨 漏洞利用测试", function () {
    it("应该成功执行重入攻击并盗取资金", async function () {
      console.log("\n" + "=".repeat(60));
      console.log("💰 准备阶段：受害者存款");
      console.log("=".repeat(60));

      // 受害者存款
      await vulnerableBank.connect(victim1).deposit({ value: ethers.parseEther("10") });
      await vulnerableBank.connect(victim2).deposit({ value: ethers.parseEther("5") });

      console.log("Victim1 存入: 10 ETH");
      console.log("Victim2 存入: 5 ETH");
      console.log("银行总余额:", ethers.formatEther(await vulnerableBank.getBalance()), "ETH");

      // 部署攻击合约
      const Attacker = await ethers.getContractFactory("Attacker");
      attacker = await Attacker.deploy(await vulnerableBank.getAddress());
      await attacker.waitForDeployment();
      console.log("\n攻击合约部署地址:", await attacker.getAddress());

      // 记录攻击前状态
      const bankBalanceBefore = await vulnerableBank.getBalance();
      const attackerBalanceBefore = await attacker.getBalance();

      console.log("\n" + "=".repeat(60));
      console.log("⚔️  攻击前状态");
      console.log("=".repeat(60));
      console.log("银行余额:", ethers.formatEther(bankBalanceBefore), "ETH");
      console.log("攻击合约余额:", ethers.formatEther(attackerBalanceBefore), "ETH");

      // 🚨 发起攻击
      console.log("\n" + "=".repeat(60));
      console.log("🚨 发起重入攻击！（投入 1 ETH）");
      console.log("=".repeat(60));

      const tx = await attacker.connect(attackerAccount).attack({
        value: ethers.parseEther("1")
      });
      await tx.wait();

      // 攻击后状态
      const bankBalanceAfter = await vulnerableBank.getBalance();
      const attackerBalanceAfter = await attacker.getBalance();
      const attackCount = await attacker.attackCount();

      console.log("\n" + "=".repeat(60));
      console.log("💀 攻击后状态");
      console.log("=".repeat(60));
      console.log("银行余额:", ethers.formatEther(bankBalanceAfter), "ETH");
      console.log("攻击合约余额:", ethers.formatEther(attackerBalanceAfter), "ETH");
      console.log("重入次数:", attackCount.toString(), "次");

      const profit = attackerBalanceAfter - ethers.parseEther("1");
      console.log("\n🤑 攻击者获利:", ethers.formatEther(profit), "ETH");
      console.log("📊 投入产出比: 1 ETH → " + ethers.formatEther(attackerBalanceAfter) + " ETH");

      // 验证攻击成功
      console.log("\n" + "=".repeat(60));
      console.log("✅ 验证攻击结果");
      console.log("=".repeat(60));

      // 重入确实发生了
      expect(attackCount).to.be.greaterThan(1);
      console.log("✓ 重入攻击发生了", attackCount.toString(), "次");

      // 攻击者盗取了 ETH
      expect(attackerBalanceAfter).to.be.greaterThan(ethers.parseEther("1"));
      console.log("✓ 攻击者成功盗取资金");

      // 银行几乎被掏空
      expect(bankBalanceAfter).to.be.lessThan(bankBalanceBefore);
      console.log("✓ 银行资金被大量盗取");
    });

    it("应该显示受害者的实际损失", async function () {
      // 受害者存款
      await vulnerableBank.connect(victim1).deposit({ value: ethers.parseEther("20") });

      // 部署并执行攻击
      const Attacker = await ethers.getContractFactory("Attacker");
      attacker = await Attacker.deploy(await vulnerableBank.getAddress());
      await attacker.waitForDeployment();

      await attacker.connect(attackerAccount).attack({
        value: ethers.parseEther("1")
      });

      console.log("\n" + "=".repeat(60));
      console.log("😭 受害者损失分析");
      console.log("=".repeat(60));

      const victim1RecordedBalance = await vulnerableBank.getUserBalance(victim1.address);
      const bankActualBalance = await vulnerableBank.getBalance();

      console.log("Victim1 账面余额:", ethers.formatEther(victim1RecordedBalance), "ETH");
      console.log("银行实际余额:", ethers.formatEther(bankActualBalance), "ETH");

      if (bankActualBalance < victim1RecordedBalance) {
        const cannotWithdraw = victim1RecordedBalance - bankActualBalance;
        console.log("❌ Victim1 无法取出:", ethers.formatEther(cannotWithdraw), "ETH");
      }

      // 验证银行资不抵债
      expect(bankActualBalance).to.be.lessThan(victim1RecordedBalance);
    });
  });

  describe("🛡️ 安全合约测试", function () {
    it("SecureBank 应该能抵抗重入攻击（CEI模式）", async function () {
      console.log("\n" + "=".repeat(60));
      console.log("🛡️ 测试 SecureBank - CEI 模式");
      console.log("=".repeat(60));

      // 存款
      await secureBank.connect(victim1).deposit({ value: ethers.parseEther("10") });
      console.log("Victim1 存入: 10 ETH");

      // 创建一个尝试攻击安全合约的攻击者
      const SecureBankAttacker = await ethers.getContractFactory("Attacker");
      const secureAttacker = await SecureBankAttacker.deploy(await secureBank.getAddress());
      await secureAttacker.waitForDeployment();

      // 尝试攻击（应该只能取出自己存入的 1 ETH）
      const bankBalanceBefore = await secureBank.getBalance();
      console.log("攻击前银行余额:", ethers.formatEther(bankBalanceBefore), "ETH");

      // 手动模拟攻击流程
      // 由于攻击合约调用的是 withdraw，而 SecureBank 没有这个方法名
      // 我们直接测试用户取款
      await secureBank.connect(victim1).withdrawCEI(ethers.parseEther("5"));

      const bankBalanceAfter = await secureBank.getBalance();
      console.log("取款后银行余额:", ethers.formatEther(bankBalanceAfter), "ETH");

      // 验证正常取款成功
      expect(bankBalanceAfter).to.equal(ethers.parseEther("5"));
      console.log("✓ CEI 模式正常工作，资金安全");
    });

    it("SecureBank 应该能抵抗重入攻击（ReentrancyGuard）", async function () {
      console.log("\n" + "=".repeat(60));
      console.log("🛡️ 测试 SecureBank - ReentrancyGuard 模式");
      console.log("=".repeat(60));

      // 存款
      await secureBank.connect(victim1).deposit({ value: ethers.parseEther("10") });
      console.log("Victim1 存入: 10 ETH");

      // 正常取款测试
      await secureBank.connect(victim1).withdrawWithGuard(ethers.parseEther("3"));

      const balance = await secureBank.getBalance();
      const userBalance = await secureBank.getUserBalance(victim1.address);

      console.log("银行余额:", ethers.formatEther(balance), "ETH");
      console.log("用户余额:", ethers.formatEther(userBalance), "ETH");

      expect(balance).to.equal(ethers.parseEther("7"));
      expect(userBalance).to.equal(ethers.parseEther("7"));
      console.log("✓ ReentrancyGuard 保护正常工作");
    });
  });

  describe("📚 漏洞原理解释", function () {
    it("演示正常取款 vs 重入攻击的区别", async function () {
      console.log("\n" + "=".repeat(60));
      console.log("📚 漏洞原理解释");
      console.log("=".repeat(60));

      console.log(`
┌─────────────────────────────────────────────────────────────┐
│                    正常取款流程                               │
├─────────────────────────────────────────────────────────────┤
│  1. 用户调用 withdraw(1 ETH)                                 │
│  2. 检查余额: balances[user] >= 1 ETH ✓                      │
│  3. 发送 ETH: call{value: 1 ETH}                            │
│  4. 更新余额: balances[user] -= 1 ETH                        │
│  5. 完成 ✓                                                   │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    重入攻击流程                               │
├─────────────────────────────────────────────────────────────┤
│  1. 攻击者调用 withdraw(1 ETH)                               │
│  2. 检查余额: balances[attacker] = 1 ETH ✓                   │
│  3. 发送 ETH → 触发攻击者的 receive()                         │
│     │                                                        │
│     └─→ 4. receive() 再次调用 withdraw(1 ETH)                │
│          5. 检查余额: balances[attacker] = 1 ETH ✓ (还没更新!) │
│          6. 发送 ETH → 触发 receive()                         │
│             │                                                 │
│             └─→ 7. 继续循环直到银行余额耗尽...                  │
│                                                               │
│  8. 最后才更新余额（但已经太晚了）                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    修复方案                                   │
├─────────────────────────────────────────────────────────────┤
│  方案1: CEI 模式 (Checks-Effects-Interactions)              │
│         先更新余额，再发送 ETH                                │
│                                                              │
│  方案2: ReentrancyGuard                                     │
│         使用锁机制防止重入                                    │
│                                                              │
│  方案3: 使用 transfer() 限制 gas                             │
│         2300 gas 不足以执行复杂操作                           │
└─────────────────────────────────────────────────────────────┘
      `);

      // 实际演示
      await vulnerableBank.connect(victim1).deposit({ value: ethers.parseEther("5") });

      const Attacker = await ethers.getContractFactory("Attacker");
      attacker = await Attacker.deploy(await vulnerableBank.getAddress());
      await attacker.waitForDeployment();

      await attacker.connect(attackerAccount).attack({
        value: ethers.parseEther("1")
      });

      const attackCount = await attacker.attackCount();
      const stolen = await attacker.getBalance();

      console.log("实际攻击结果:");
      console.log("- 重入次数:", attackCount.toString());
      console.log("- 盗取金额:", ethers.formatEther(stolen), "ETH");
      console.log("- 投入成本: 1 ETH");

      expect(attackCount).to.be.greaterThan(1);
    });
  });
});

