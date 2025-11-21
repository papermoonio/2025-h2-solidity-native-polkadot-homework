const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("重入攻击演示 - PolkaPOL Asset Hub", function () {
  let vulnerableBank, secureBank, attacker;
  let owner, user1, user2, attacker1;
  
  beforeEach(async function () {
    // 获取签名者
    [owner, user1, user2, attacker1] = await ethers.getSigners();
    
    // 部署漏洞银行
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await VulnerableBank.deploy();
    await vulnerableBank.waitForDeployment();
    
    // 部署安全银行
    const SecureBank = await ethers.getContractFactory("SecureBank");
    secureBank = await SecureBank.deploy();
    await secureBank.waitForDeployment();
    
    // 部署攻击合约
    const Attacker = await ethers.getContractFactory("Attacker");
    attacker = await Attacker.connect(attacker1).deploy(await vulnerableBank.getAddress());
    await attacker.waitForDeployment();
  });
  
  describe("1. 漏洞银行 - 正常功能测试", function () {
    it("应该允许用户存款", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      await vulnerableBank.connect(user1).deposit({ value: depositAmount });
      
      const balance = await vulnerableBank.getBalance(user1.address);
      expect(balance).to.equal(depositAmount);
    });
    
    it("应该允许用户取款", async function () {
      const depositAmount = ethers.parseEther("1.0");
      
      // 存款
      await vulnerableBank.connect(user1).deposit({ value: depositAmount });
      
      // 取款
      await vulnerableBank.connect(user1).withdraw(depositAmount);
      
      const balance = await vulnerableBank.getBalance(user1.address);
      expect(balance).to.equal(0);
    });
  });
  
  describe("2. 重入攻击演示 - 攻击漏洞银行", function () {
    it("🚨 应该成功执行重入攻击，窃取部分资金", async function () {
      // 准备：让其他用户先存入一些代币（在 PolkaPOL Asset Hub 上是测试 POL）
      const depositAmount = ethers.parseEther("2.0");
      await vulnerableBank.connect(user1).deposit({ value: depositAmount });
      await vulnerableBank.connect(user2).deposit({ value: depositAmount });
      
      console.log("\n=== 攻击前状态 ===");
      const bankBalanceBefore = await vulnerableBank.getContractBalance();
      console.log("银行总余额:", ethers.formatEther(bankBalanceBefore), "POL (显示为 ETH)");
      console.log("User1 余额:", ethers.formatEther(await vulnerableBank.getBalance(user1.address)), "POL");
      console.log("User2 余额:", ethers.formatEther(await vulnerableBank.getBalance(user2.address)), "POL");
      
      // 攻击：攻击者用 1 POL 窃取额外资金
      const attackAmount = ethers.parseEther("1.0");
      
      console.log("\n=== 发起攻击 ===");
      console.log("攻击金额:", ethers.formatEther(attackAmount), "POL");
      console.log("注意：由于 Hardhat 限制，重入次数限制为 2 次");
      
      // 执行攻击
      await attacker.connect(attacker1).attack({ value: attackAmount });
      
      console.log("\n=== 攻击后状态 ===");
      const bankBalanceAfter = await vulnerableBank.getContractBalance();
      const attackerContractBalance = await attacker.getBalance();
      
      console.log("银行总余额:", ethers.formatEther(bankBalanceAfter), "POL");
      console.log("攻击合约余额:", ethers.formatEther(attackerContractBalance), "POL");
      console.log("被盗金额:", ethers.formatEther(attackerContractBalance - attackAmount), "POL");
      
      // 验证攻击成功（窃取了额外资金）
      expect(attackerContractBalance).to.be.gt(attackAmount); // 攻击者获得额外资金
      console.log("\n✅ 重入攻击成功！攻击者通过重入窃取了额外资金");
    });
    
    it("应该显示重入攻击的详细过程", async function () {
      // 准备
      await vulnerableBank.connect(user1).deposit({ value: ethers.parseEther("3.0") });
      
      const attackAmount = ethers.parseEther("1.0");
      
      console.log("\n=== 重入攻击流程 ===");
      console.log("1. 攻击者存入 1 POL");
      console.log("2. 攻击者调用 withdraw(1 POL)");
      console.log("3. 银行转账 1 POL 给攻击合约");
      console.log("4. 攻击合约的 receive() 被触发");
      console.log("5. receive() 中再次调用 withdraw(1 POL)");
      console.log("6. 银行再次转账 1 POL（余额还未更新！）");
      console.log("7. 重复步骤 4-6，最多 2 次重入（Hardhat 限制）");
      
      // 执行攻击
      await attacker.connect(attacker1).attack({ value: attackAmount });
      
      const finalBalance = await vulnerableBank.getContractBalance();
      const attackerBalance = await attacker.getBalance();
      console.log("\n最终银行余额:", ethers.formatEther(finalBalance), "POL");
      console.log("攻击者余额:", ethers.formatEther(attackerBalance), "POL");
      
      // 验证攻击成功（窃取了额外资金）
      expect(attackerBalance).to.be.gt(attackAmount);
    });
  });
  
  describe("3. 安全银行 - 防御重入攻击", function () {
    it("✅ 安全银行应该防御重入攻击", async function () {
      // 准备：让用户存入一些 ETH
      const depositAmount = ethers.parseEther("5.0");
      await secureBank.connect(user1).deposit({ value: depositAmount });
      await secureBank.connect(user2).deposit({ value: depositAmount });
      
      console.log("\n=== 尝试攻击安全银行 ===");
      const bankBalanceBefore = await secureBank.getContractBalance();
      console.log("银行总余额:", ethers.formatEther(bankBalanceBefore), "POL");
      
      // 部署针对安全银行的攻击合约
      const Attacker = await ethers.getContractFactory("Attacker");
      const secureAttacker = await Attacker.connect(attacker1).deploy(await secureBank.getAddress());
      await secureAttacker.waitForDeployment();
      
      const attackAmount = ethers.parseEther("1.0");
      
      // 尝试攻击 - 应该失败或只能取出自己的钱
      await expect(
        secureAttacker.connect(attacker1).attack({ value: attackAmount })
      ).to.be.reverted; // 攻击会失败
      
      console.log("攻击被阻止！");
      console.log("原因：余额在转账前已更新，重入时余额为 0");
      
      const bankBalanceAfter = await secureBank.getContractBalance();
      console.log("银行余额保持:", ethers.formatEther(bankBalanceAfter), "POL");
      
      // 验证银行资金安全
      expect(bankBalanceAfter).to.equal(bankBalanceBefore);
    });
  });
  
  describe("4. 对比分析", function () {
    it("应该展示漏洞代码和安全代码的区别", async function () {
      console.log("\n=== 漏洞代码 (VulnerableBank) ===");
      console.log("function withdraw(uint256 _amount) public {");
      console.log("    require(balances[msg.sender] >= _amount);");
      console.log("    ");
      console.log("    // 🚨 先转账");
      console.log("    msg.sender.call{value: _amount}(\"\");");
      console.log("    ");
      console.log("    // 🚨 后更新余额（太晚了！）");
      console.log("    balances[msg.sender] -= _amount;");
      console.log("}");
      
      console.log("\n=== 安全代码 (SecureBank) ===");
      console.log("function withdraw(uint256 _amount) public {");
      console.log("    require(balances[msg.sender] >= _amount);");
      console.log("    ");
      console.log("    // ✅ 先更新余额");
      console.log("    balances[msg.sender] -= _amount;");
      console.log("    ");
      console.log("    // ✅ 后转账");
      console.log("    msg.sender.call{value: _amount}(\"\");");
      console.log("}");
      
      console.log("\n=== 关键区别 ===");
      console.log("✅ 遵循 Checks-Effects-Interactions 模式");
      console.log("✅ 状态更新在外部调用之前");
      console.log("✅ 即使重入，余额已经是 0，无法再次取款");
    });
  });
});
