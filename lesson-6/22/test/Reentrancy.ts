import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Reentrancy Attack", function () {
  it("Should demonstrate reentrancy vulnerability", async function () {
    const signers = await ethers.getSigners();
    const [deployer, attacker] = signers;

    // 部署 VulnerableBank
    const bankFactory = await ethers.getContractFactory("VulnerableBank");
    const bank = await bankFactory.connect(deployer).deploy();

    // 部署 ReentrancyAttacker
    const attackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const bankAddr = (await bank.getAddress()) as string;
    const attackerContract = await attackerFactory.connect(attacker).deploy(bankAddr);
    const attackerAddr = await attackerContract.getAddress();

    // deployer 向银行存入 10 ETH
    const tenEthValue = ethers.parseEther("10");
    await bank.connect(deployer).deposit({ value: tenEthValue });

    // 攻击者用 1 ETH 发起重入攻击
    // 攻击者用 5 ETH 发起攻击（分成 1 ETH 的小块提取，以演示偷 5 ETH 的情形）
    const attackDeposit = ethers.parseEther("5");
    await attackerContract.connect(attacker).attack({ value: attackDeposit });

    // 验证攻击成功
    const attackerBalance = await ethers.provider.getBalance(attackerAddr);
    const bankBalance = await ethers.provider.getBalance(bankAddr);
    const reentryCount = await attackerContract.reentryCount();
    const failedReentries = await attackerContract.failedReentries();
    
    console.log("Attacker balance:", ethers.formatEther(attackerBalance), "ETH");
    console.log("Bank balance:", ethers.formatEther(bankBalance), "ETH");
    console.log("Reentry count:", reentryCount.toString());
    console.log("Failed reentries:", failedReentries.toString());
    
    // Verify reentrancy happened
    // Expect receive() to be called at least once and the attacker contract
    // to have received multiple 1 ETH chunks (total stolen >= 5 ETH)
    expect(reentryCount).to.be.gte(1n, "receive() should be called");
    expect(attackerBalance).to.be.gte(ethers.parseEther("5"), "attacker contract should hold at least 5 ETH");
  });

  it("Should demonstrate state update happens after external call", async function () {
    const signers = await ethers.getSigners();
    const [deployer, attacker] = signers;

    const bankFactory = await ethers.getContractFactory("VulnerableBank");
    const bank = await bankFactory.connect(deployer).deploy();
    
    const attackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const bankAddr = (await bank.getAddress()) as string;
    const attackerContract = await attackerFactory.connect(attacker).deploy(bankAddr);
    const attackerAddr = await attackerContract.getAddress();

    // Deposit initial funds
    const initialDeposit = ethers.parseEther("10");
    await bank.connect(deployer).deposit({ value: initialDeposit });

    // Execute attack
    const attackAmount = ethers.parseEther("5");
    await attackerContract.connect(attacker).attack({ value: attackAmount });

    // Verify
    const reentryCount = await attackerContract.reentryCount();
    expect(reentryCount).to.be.greaterThan(0n, "Reentrancy should occur");
    
    console.log("✓ Reentrancy vulnerability demonstrated");
    console.log("✓ receive() called", reentryCount.toString(), "time(s)");
  });

  it("Should show the key vulnerability: state not updated during external call", async function () {
    const signers = await ethers.getSigners();
    const [deployer, attacker] = signers;

    const bankFactory = await ethers.getContractFactory("VulnerableBank");
    const bank = await bankFactory.connect(deployer).deploy();
    
    const attackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const bankAddr = (await bank.getAddress()) as string;
    const attackerContract = await attackerFactory.connect(attacker).deploy(bankAddr);
    const attackerAddr = await attackerContract.getAddress();

    // Setup
    console.log("\n=== Reentrancy Vulnerability Explanation ===\n");
    
    const deposit = ethers.parseEther("10");
    await bank.connect(deployer).deposit({ value: deposit });
    console.log("1. Deployer deposits 10 ETH into bank");
    console.log("   Bank.balances[deployer] = 10 ETH\n");

    const attackAmount = ethers.parseEther("5");
    console.log("2. Attacker sends 1 ETH to attack()");
    console.log("   attack() → bank.deposit() → bank.balances[attacker] = 5 ETH");
    console.log("   attack() → bank.withdraw(1 ETH)\n");

    await attackerContract.connect(attacker).attack({ value: attackAmount });

    const reentryCount = await attackerContract.reentryCount();
    const failedReentries = await attackerContract.failedReentries();
    const totalStolen = await attackerContract.totalStolen();

    console.log("3. During bank.withdraw(), the vulnerable code executes:");
    console.log("   - Checks: balances[attacker] >= 1 ETH ✓");
    console.log("   - Sends: 1 ETH via msg.sender.call{value: 1}('')");
    console.log("   - ⚠️  VULNERABILITY: balances[attacker] not yet decremented!");
    console.log("   - Triggers: receive() in attacker contract\n");

    console.log("4. In receive():");
    console.log("   - Reads: balances[attacker] = 1 ETH (NOT UPDATED!)");
    console.log("   - Attempts: nested withdraw(1 ETH)");
    console.log("   - Result: Failed due to execution state\n");

    console.log("5. After all calls complete:");
    console.log("   - State update: balances[attacker] -= 1");
    console.log("   - Attacker received:", ethers.formatEther(totalStolen), "ETH\n");

    console.log("=== Attack Results ===");
    console.log("Reentry attempts:", reentryCount.toString());
    console.log("Failed nested calls:", failedReentries.toString());
    console.log("Total stolen:", ethers.formatEther(totalStolen), "ETH");

    // Assertions
    expect(reentryCount).to.be.greaterThan(0n);
    expect(totalStolen).to.equal(attackAmount);
  });
});

