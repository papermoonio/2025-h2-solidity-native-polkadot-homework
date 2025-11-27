const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("重入攻击测试", function () {
    let vulnerableBank;
    let attacker;
    let owner, user1;

    beforeEach(async function () {
        [owner, user1] = await ethers.getSigners();

        // 部署有漏洞的银行合约
        const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
        vulnerableBank = await VulnerableBank.deploy();
        await vulnerableBank.waitForDeployment(); // 使用 waitForDeployment 而不是 deployed()

        // 部署攻击者合约
        const Attacker = await ethers.getContractFactory("Attacker");
        attacker = await Attacker.deploy(await vulnerableBank.getAddress());
        await attacker.waitForDeployment();
    });

    it("应该成功执行重入攻击", async function () {
        // 首先，让其他用户存款到银行
        await vulnerableBank.connect(user1).deposit({ value: ethers.parseEther("5") });

        // 检查初始银行余额
        const initialBankBalance = await ethers.provider.getBalance(vulnerableBank.getAddress());
        console.log("攻击前银行余额:", ethers.formatEther(initialBankBalance), "ETH");

        // 执行攻击
        await attacker.attack({ value: ethers.parseEther("1") });

        // 检查攻击后的银行余额
        const finalBankBalance = await ethers.provider.getBalance(vulnerableBank.getAddress());
        console.log("攻击后银行余额:", ethers.formatEther(finalBankBalance), "ETH");

        // 检查攻击者合约的余额
        const attackerBalance = await attacker.getBalance();
        console.log("攻击者盗取金额:", ethers.formatEther(attackerBalance), "ETH");

        // 验证攻击成功（攻击者盗取了远多于1 ETH的资金）
        expect(parseFloat(ethers.formatEther(attackerBalance))).to.be.greaterThan(1);
    });

    it("应该显示重入漏洞的存在", async function () {
        // 存款1 ETH
        await vulnerableBank.deposit({ value: ethers.parseEther("1") });

        // 取款前余额
        const balanceBefore = await vulnerableBank.getUserBalance(owner.address);
        expect(balanceBefore).to.equal(ethers.parseEther("1"));

        // 正常取款后余额应为0
        await vulnerableBank.withdraw();
        const balanceAfter = await vulnerableBank.getUserBalance(owner.address);
        expect(balanceAfter).to.equal(0);
    });
});