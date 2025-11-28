const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Reentrancy Attack Demonstration", function() {
    let vulnerableBank;
    let secureBank;
    let attacker;
    let owner;
    let user;

    beforeEach(async function() {
        [owner, user] = await ethers.getSigners();

        // 部署易受攻击的银行
        const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
        vulnerableBank = await VulnerableBank.deploy();
        await vulnerableBank.deployed();

        // 部署安全的银行
        const SecureBank = await ethers.getContractFactory("SecureBank");
        secureBank = await SecureBank.deploy();
        await secureBank.deployed();

        // 部署攻击者合约
        const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
        attacker = await ReentrancyAttacker.deploy(vulnerableBank.address);
        await attacker.deployed();
    });

    describe("Vulnerable Bank - Normal Operations", function() {
        it("Should allow deposit", async function() {
            const depositAmount = ethers.utils.parseEther("1");
            await vulnerableBank.deposit({ value: depositAmount });

            expect(await vulnerableBank.getUserBalance(owner.address)).to.equal(depositAmount);
            expect(await vulnerableBank.getContractBalance()).to.equal(depositAmount);
        });

        it("Should allow withdrawal", async function() {
            const depositAmount = ethers.utils.parseEther("1");
            await vulnerableBank.deposit({ value: depositAmount });

            const initialBalance = await ethers.provider.getBalance(owner.address);

            const tx = await vulnerableBank.withdraw(depositAmount);
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);

            const finalBalance = await ethers.provider.getBalance(owner.address);
            expect(finalBalance).to.equal(initialBalance.add(depositAmount).sub(gasUsed));
            expect(await vulnerableBank.getUserBalance(owner.address)).to.equal(0);
        });

        it("Should prevent overdraft", async function() {
            const depositAmount = ethers.utils.parseEther("1");
            const withdrawAmount = ethers.utils.parseEther("2");

            await vulnerableBank.deposit({ value: depositAmount });

            await expect(
                vulnerableBank.withdraw(withdrawAmount)
            ).to.be.revertedWith("Insufficient balance");
        });

        it("Should track multiple users", async function() {
            const amount1 = ethers.utils.parseEther("1");
            const amount2 = ethers.utils.parseEther("2");

            await vulnerableBank.deposit({ value: amount1 });
            await vulnerableBank.connect(user).deposit({ value: amount2 });

            expect(await vulnerableBank.getUserBalance(owner.address)).to.equal(amount1);
            expect(await vulnerableBank.getUserBalance(user.address)).to.equal(amount2);
            expect(await vulnerableBank.getContractBalance()).to.equal(amount1.add(amount2));
        });
    });

    describe("Reentrancy Attack - Vulnerable Bank", function() {
        it("Should demonstrate reentrancy vulnerability", async function() {
            const initialDeposit = ethers.utils.parseEther("1");

            // 给攻击者合约发送初始资金
            await owner.sendTransaction({
                to: attacker.address,
                value: initialDeposit
            });

            // 记录银行初始余额
            const bankInitialBalance = await ethers.provider.getBalance(vulnerableBank.address);

            // 执行攻击
            await attacker.attack(initialDeposit);

            // 检查银行余额是否被耗尽
            const bankFinalBalance = await ethers.provider.getBalance(vulnerableBank.address);
            const attackerBalance = await attacker.getBalance();

            console.log("Bank initial balance:", ethers.utils.formatEther(bankInitialBalance));
            console.log("Bank final balance:", ethers.utils.formatEther(bankFinalBalance));
            console.log("Attacker balance:", ethers.utils.formatEther(attackerBalance));

            // 攻击成功：攻击者获得了比初始存款更多的资金
            expect(attackerBalance).to.be.gt(initialDeposit);
            expect(bankFinalBalance).to.be.lt(bankInitialBalance);
        });

        it("Should show balance mismatch after attack", async function() {
            const initialDeposit = ethers.utils.parseEther("1");

            // 给攻击者合约发送初始资金
            await owner.sendTransaction({
                to: attacker.address,
                value: initialDeposit
            });

            // 在攻击前，银行中的记录余额应该等于实际余额
            const bankBalanceBefore = await ethers.provider.getBalance(vulnerableBank.address);
            const recordedBalanceBefore = await vulnerableBank.getUserBalance(attacker.address);

            // 执行攻击
            await attacker.attack(initialDeposit);

            // 在攻击后，记录的余额可能为负（在Solidity中会下溢）
            // 或者银行的实际余额小于记录的总余额
            const bankBalanceAfter = await ethers.provider.getBalance(vulnerableBank.address);
            const recordedBalanceAfter = await vulnerableBank.getUserBalance(attacker.address);

            console.log("Recorded balance after attack:", ethers.utils.formatEther(recordedBalanceAfter));
            console.log("Actual bank balance after attack:", ethers.utils.formatEther(bankBalanceAfter));
        });
    });

    describe("Secure Bank - Protection Against Reentrancy", function() {
        it("Should allow normal deposit and withdrawal", async function() {
            const depositAmount = ethers.utils.parseEther("1");
            await secureBank.deposit({ value: depositAmount });

            expect(await secureBank.getUserBalance(owner.address)).to.equal(depositAmount);

            await secureBank.withdraw(depositAmount);
            expect(await secureBank.getUserBalance(owner.address)).to.equal(0);
        });

        it("Should prevent reentrancy attack", async function() {
            // 创建一个针对安全银行的攻击者
            const SecureReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
            const secureAttacker = await SecureReentrancyAttacker.deploy(secureBank.address);
            await secureAttacker.deployed();

            const initialDeposit = ethers.utils.parseEther("1");

            // 给攻击者合约发送初始资金
            await owner.sendTransaction({
                to: secureAttacker.address,
                value: initialDeposit
            });

            // 尝试攻击安全银行
            // 由于nonReentrant修饰符，第二次调用应该失败
            await expect(
                secureAttacker.attack(initialDeposit)
            ).to.be.revertedWith("No reentrancy");
        });

        it("Should maintain balance consistency", async function() {
            const amount1 = ethers.utils.parseEther("1");
            const amount2 = ethers.utils.parseEther("2");

            await secureBank.deposit({ value: amount1 });
            await secureBank.connect(user).deposit({ value: amount2 });

            const totalRecorded = (await secureBank.getUserBalance(owner.address))
                .add(await secureBank.getUserBalance(user.address));
            const actualBalance = await ethers.provider.getBalance(secureBank.address);

            expect(totalRecorded).to.equal(actualBalance);
        });
    });

    describe("Comparison - Vulnerable vs Secure", function() {
        it("Should show the difference in behavior", async function() {
            const depositAmount = ethers.utils.parseEther("1");

            // 向两个银行都存入相同金额
            await vulnerableBank.deposit({ value: depositAmount });
            await secureBank.deposit({ value: depositAmount });

            expect(await vulnerableBank.getContractBalance()).to.equal(depositAmount);
            expect(await secureBank.getContractBalance()).to.equal(depositAmount);

            // 从两个银行都提取
            await vulnerableBank.withdraw(depositAmount);
            await secureBank.withdraw(depositAmount);

            expect(await vulnerableBank.getContractBalance()).to.equal(0);
            expect(await secureBank.getContractBalance()).to.equal(0);
        });
    });

    describe("Attack Mechanics", function() {
        it("Should show how reentrancy works step by step", async function() {
            const initialDeposit = ethers.utils.parseEther("0.5");

            // 给攻击者合约发送初始资金
            await owner.sendTransaction({
                to: attacker.address,
                value: initialDeposit
            });

            // 记录初始状态
            const bankBalanceBefore = await ethers.provider.getBalance(vulnerableBank.address);

            // 执行攻击
            await attacker.attack(initialDeposit);

            // 记录最终状态
            const bankBalanceAfter = await ethers.provider.getBalance(vulnerableBank.address);
            const attackerFinalBalance = await attacker.getBalance();

            // 验证攻击结果
            console.log("\n=== Reentrancy Attack Results ===");
            console.log("Initial deposit:", ethers.utils.formatEther(initialDeposit));
            console.log("Bank balance before:", ethers.utils.formatEther(bankBalanceBefore));
            console.log("Bank balance after:", ethers.utils.formatEther(bankBalanceAfter));
            console.log("Attacker balance after:", ethers.utils.formatEther(attackerFinalBalance));
            console.log("Stolen amount:", ethers.utils.formatEther(attackerFinalBalance.sub(initialDeposit)));

            // 攻击者获得了额外的资金
            expect(attackerFinalBalance).to.be.gt(initialDeposit);
        });
    });
});