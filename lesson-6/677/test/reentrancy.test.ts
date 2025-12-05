import { expect } from "chai";
import { ethers } from "hardhat";

describe("Reentrancy Attack Demo", function () {
  let vulnerableBank: any;
  let safeBank: any;
  let attackContract: any;
  let owner: any;
  let attacker: any;
  let user1: any;
  
  beforeEach(async function () {
    // 獲取帳戶
    [owner, attacker, user1] = await ethers.getSigners();
    
    // 部署有漏洞的銀行合約
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    vulnerableBank = await VulnerableBank.deploy();
    
    // 部署安全的銀行合約
    const SafeBank = await ethers.getContractFactory("SafeBank");
    safeBank = await SafeBank.deploy();
  });
  
  describe("VulnerableBank - 重入攻擊測試", function () {
    it("應該被重入攻擊盜取資金", async function () {
      // 部署攻擊合約
      const AttackContract = await ethers.getContractFactory("AttackContract");
      attackContract = await AttackContract.connect(attacker).deploy(await vulnerableBank.getAddress());
      
      console.log("部署完成:");
      console.log("VulnerableBank 地址:", await vulnerableBank.getAddress());
      console.log("AttackContract 地址:", await attackContract.getAddress());
      console.log("攻擊者地址:", attacker.address);
      
      // 步驟 1: 先讓銀行有資金
      console.log("\n步驟 1: 為銀行存入資金");
      const depositAmount = ethers.parseEther("2.0");
      await vulnerableBank.connect(owner).deposit({ value: depositAmount });
      
      let bankBalance = await vulnerableBank.getContractBalance();
      console.log("銀行初始餘額:", ethers.formatEther(bankBalance), "ETH");
      
      // 步驟 2: 攻擊者開始攻擊
      console.log("\n步驟 2: 攻擊者發起攻擊");
      const attackDeposit = ethers.parseEther("0.1");
      await attackContract.connect(attacker).startAttack({ value: attackDeposit });
      
      // 等待攻擊完成
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // 步驟 3: 檢查攻擊結果
      console.log("\n步驟 3: 檢查攻擊結果");
      
      const attackCount = await attackContract.attackCount();
      const stolenAmount = await attackContract.getBalance();
      const finalBankBalance = await vulnerableBank.getContractBalance();
      
      console.log("攻擊次數:", attackCount.toString());
      console.log("盜取金額:", ethers.formatEther(stolenAmount), "ETH");
      console.log("銀行剩餘餘額:", ethers.formatEther(finalBankBalance), "ETH");
      
      // 步驟 4: 提取盜取的資金
      console.log("\n步驟 4: 提取盜取的資金");
      await attackContract.connect(attacker).withdrawStolenFunds();
      
      // 驗證攻擊成功
      expect(attackCount).to.be.greaterThan(1);
      expect(stolenAmount).to.be.greaterThan(attackDeposit);
    });
    
    it("應該允許正常存款和提款", async function () {
      // 存款
      const depositAmount = ethers.parseEther("1.0");
      await vulnerableBank.connect(user1).deposit({ value: depositAmount });
      
      // 檢查餘額
      const userBalance = await vulnerableBank.getBalance(user1.address);
      expect(userBalance).to.equal(depositAmount);
      
      // 提款
      await vulnerableBank.connect(user1).withdraw();
      
      // 檢查餘額為0
      const finalBalance = await vulnerableBank.getBalance(user1.address);
      expect(finalBalance).to.equal(0);
    });
  });
  
  describe("SafeBank - 安全測試", function () {
    it("應該防止重入攻擊", async function () {
      // 部署攻擊合約指向 SafeBank
      const AttackContract = await ethers.getContractFactory("AttackContract");
      const attackContract2 = await AttackContract.connect(attacker).deploy(await safeBank.getAddress());
      
      // 為 SafeBank 存款
      await safeBank.connect(owner).deposit({ value: ethers.parseEther("2.0") });
      
      const initialBankBalance = await safeBank.getContractBalance();
      console.log("SafeBank 初始餘額:", ethers.formatEther(initialBankBalance), "ETH");
      
      // 嘗試攻擊
      console.log("\n嘗試攻擊 SafeBank...");
      try {
        await attackContract2.connect(attacker).startAttack({ 
          value: ethers.parseEther("0.1") 
        });
        
        // 如果沒有拋出錯誤，攻擊可能被阻止但合約可能會損失初始存款
        const finalBankBalance = await safeBank.getContractBalance();
        console.log("SafeBank 最終餘額:", ethers.formatEther(finalBankBalance), "ETH");
        
        // 安全銀行應該只損失攻擊者的初始存款
        expect(finalBankBalance).to.equal(initialBankBalance - ethers.parseEther("0.1"));
      } catch (error: any) {
        console.log("攻擊失敗:", error.message);
        // 攻擊應該失敗
        expect(error.message).to.include("revert");
      }
    });
    
    it("應該允許正常操作", async function () {
      // 存款
      await safeBank.connect(user1).deposit({ value: ethers.parseEther("1.0") });
      
      // 提款
      await safeBank.connect(user1).withdraw();
      
      // 檢查餘額為0
      const userBalance = await safeBank.getBalance(user1.address);
      expect(userBalance).to.equal(0);
    });
  });
});