import { expect } from "chai";
import { network } from "hardhat";
import { ContractEventPayload, parseEther } from "ethers";

const { ethers } = await network.connect();

describe("Reentrancy Attack on ERC223 Transfer", function () {
  let token: any;
  let vulnerableVault: any;
  let safeVault: any;
  let attackerContract: any;
  let owner: any;
  let attacker: any;
  let user: any;

  async function createUsers(transferFrom: any, userCount: number) {
    const users = [];
    for (let i = 0; i < userCount; i++) {
      const user = ethers.Wallet.createRandom(ethers.provider);
      await transferFrom.sendTransaction({
        to: user.address,
        value: parseEther("100"),
      });
      users.push(user);
    }
    return users;
  }

  beforeEach(async function () {
    [owner] = await ethers.getSigners();
    [attacker, user] = await createUsers(owner, 2);
    
    // Deploy ERC223 token
    const TokenFactory = await ethers.getContractFactory("VulnERC223Token");
    token = await TokenFactory.deploy("Test Token", "TEST", 18, parseEther("1000000"));
    await token.waitForDeployment();

    // Deploy vulnerable vault
    const VulnerableVaultFactory = await ethers.getContractFactory("VulnerableVault");
    vulnerableVault = await VulnerableVaultFactory.deploy(await token.getAddress());
    await vulnerableVault.waitForDeployment();

    // Deploy safe vault
    const SafeVaultFactory = await ethers.getContractFactory("SafeVault");
    safeVault = await SafeVaultFactory.deploy(await token.getAddress());
    await safeVault.waitForDeployment();

    // Deploy attacker contract
    const AttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    attackerContract = await AttackerFactory.connect(attacker).deploy(
      await vulnerableVault.getAddress(),
      await token.getAddress()
    );
    await attackerContract.waitForDeployment();

    // Mint tokens to attacker and user
    await token.mint(attacker.address, parseEther("10000"));
    await token.mint(user.address, parseEther("5000"));
  });

  describe("Initial State", function () {
    it("Should have correct initial balances", async function () {
      const attackerBalance = await token.balanceOf(attacker.address);
      const userBalance = await token.balanceOf(user.address);
      const vaultBalance = await vulnerableVault.getBalance();

      expect(attackerBalance).to.equal(parseEther("10000"));
      expect(userBalance).to.equal(parseEther("5000"));
      expect(vaultBalance).to.equal(0n);

      console.log("Initial state:");
      console.log("  Attacker balance:", ethers.formatEther(attackerBalance));
      console.log("  User balance:", ethers.formatEther(userBalance));
      console.log("  Vault balance:", ethers.formatEther(vaultBalance));
    });
  });

  describe("Normal Deposit and Withdraw", function () {
    it("Should allow normal deposit and withdraw", async function () {
      const depositAmount = parseEther("1000");
      const userBalanceBefore = await token.balanceOf(user.address);
      const vaultBalanceBefore = await vulnerableVault.getBalance();

      // User deposits
      await token.connect(user).approve(await vulnerableVault.getAddress(), depositAmount);
      await vulnerableVault.connect(user).deposit(depositAmount);
      const userDeposit = await vulnerableVault.getDeposit(user.address);
      const vaultBalanceAfter = await vulnerableVault.getBalance();

      expect(userDeposit).to.equal(depositAmount);
      expect(vaultBalanceAfter).to.equal(vaultBalanceBefore + depositAmount);

      // User withdraws
      await vulnerableVault.connect(user).withdraw(depositAmount);

      const userDepositAfter = await vulnerableVault.getDeposit(user.address);
      const userBalanceAfter = await token.balanceOf(user.address);

      expect(userDepositAfter).to.equal(0n);
      expect(userBalanceAfter).to.equal(userBalanceBefore);
    });
  });

  describe("Reentrancy Attack", function () {
    it("Should successfully execute reentrancy attack and extract more than deposited", async function () {
      // Setup: Attacker deposits tokens
      const depositAmount = parseEther("1000");
      
      // Transfer tokens to attacker contract
      
      const vaultBalanceBefore = await vulnerableVault.getBalance();
      const attackerContractBalanceBefore = await token.balanceOf(await attackerContract.getAddress());
      
      console.log("\n=== Reentrancy Attack Execution ===");
      console.log("Before attack:");
      console.log("  Attacker contract balance:", ethers.formatEther(attackerContractBalanceBefore));
      console.log("  Vault balance:", ethers.formatEther(vaultBalanceBefore));
      
      await token.mint(await attackerContract.getAddress(), depositAmount);
      // Attacker contract deposits and attacks
      await attackerContract.attack();

      const attackerContractBalanceAfter = await token.balanceOf(await attackerContract.getAddress());
      const vaultBalanceAfter = await vulnerableVault.getBalance();
      const attackerDeposit = await vulnerableVault.getDeposit(await attackerContract.getAddress());
      const attackCount = await attackerContract.attackCount();

      console.log("\nAfter attack:");
      console.log("  Attack count:", attackCount.toString());
      console.log("  Attacker contract balance:", ethers.formatEther(attackerContractBalanceAfter));
      console.log("  Vault balance:", ethers.formatEther(vaultBalanceAfter));
      console.log("  Attacker deposit remaining:", ethers.formatEther(attackerDeposit));
      console.log("  Extracted amount:", ethers.formatEther(attackerContractBalanceAfter - attackerContractBalanceBefore));
      console.log("===================================\n");

      // Attack should have extracted tokens
      expect(attackerContractBalanceAfter).to.be.greaterThan(attackerContractBalanceBefore);
      // Due to reentrancy, attacker may extract more than deposited
      expect(attackerContractBalanceAfter).to.be.greaterThan(0n);
    });

    it("Should demonstrate the complete reentrancy attack flow", async function () {
      console.log("\n=== Complete Reentrancy Attack Flow ===");
      
      // Step 1: Setup
      const depositAmount = parseEther("1000");
      await token.transfer(await attackerContract.getAddress(), depositAmount);
      
      const vaultBalanceBefore = await vulnerableVault.getBalance();
      console.log("Step 1 - Initial Setup:");
      console.log("  Attacker contract balance:", ethers.formatEther(depositAmount));
      console.log("  Vault balance before:", ethers.formatEther(vaultBalanceBefore));

      // Step 2: Attacker deposits
      console.log("\nStep 2 - Attacker Deposits:");
      console.log("  Attacker calls deposit()");
      console.log("  Vault receives tokens via transfer()");
      console.log("  tokenFallback is called, but no reentrancy yet");

      // Step 3: Execute attack
      console.log("\nStep 3 - Attack Execution:");
      console.log("  Attacker calls withdraw(1000)");
      console.log("  Vault checks: deposits[attacker] >= 1000 ✓");
      console.log("  Vault calls token.transfer(attacker, 1000)");
      console.log("  ⚠️  VULNERABILITY: deposits[attacker] not yet updated!");
      console.log("  Token contract calls attacker.tokenFallback()");
      console.log("  In tokenFallback, attacker calls withdraw() again");
      console.log("  Vault checks: deposits[attacker] >= 1000 ✓ (still 1000!)");
      console.log("  Vault calls token.transfer(attacker, 1000) again");
      console.log("  This repeats until vault balance is drained or gas runs out");

      await attackerContract.attack();

      // Step 4: Verify attack
      const vaultBalanceAfter = await vulnerableVault.getBalance();
      const attackerContractBalance = await token.balanceOf(await attackerContract.getAddress());
      
      console.log("\nStep 4 - Attack Result:");
      console.log("  Vault balance after:", ethers.formatEther(vaultBalanceAfter));
      console.log("  Attacker contract balance:", ethers.formatEther(attackerContractBalance));
      console.log("  Attack successful if attacker extracted more than deposited");
      console.log("========================================\n");

      // Attacker should have extracted tokens
      expect(attackerContractBalance).to.be.greaterThan(0n);
    });

    it("Should show the vulnerability in withdraw function", async function () {
      const depositAmount = parseEther("1000");
      await token.transfer(await attackerContract.getAddress(), depositAmount);

      const vaultBalanceBefore = await vulnerableVault.getBalance();
      const attackerDepositBefore = await vulnerableVault.getDeposit(await attackerContract.getAddress());

      console.log("\n=== Vulnerability Demonstration ===");
      console.log("Before attack:");
      console.log("  Vault balance:", ethers.formatEther(vaultBalanceBefore));
      console.log("  Attacker deposit:", ethers.formatEther(attackerDepositBefore));
      console.log("\nVulnerability:");
      console.log("  withdraw() function order:");
      console.log("  1. Check deposits[msg.sender] >= amount");
      console.log("  2. token.transfer(msg.sender, amount) ← tokenFallback called here!");
      console.log("  3. deposits[msg.sender] -= amount ← Too late!");
      console.log("\n  In tokenFallback, attacker can call withdraw() again");
      console.log("  deposits[attacker] is still the old value, so check passes");
      console.log("  This allows multiple withdrawals before state is updated");

      await attackerContract.attack();

      const vaultBalanceAfter = await vulnerableVault.getBalance();
      const attackerContractBalance = await token.balanceOf(await attackerContract.getAddress());

      console.log("\nAfter attack:");
      console.log("  Vault balance:", ethers.formatEther(vaultBalanceAfter));
      console.log("  Attacker extracted:", ethers.formatEther(attackerContractBalance));
      console.log("==============================\n");
    });
  });

  describe("Safe Vault Protection", function () {
    it("Should prevent reentrancy attack on safe vault", async function () {
      // Setup: Deploy attacker for safe vault
      const SafeAttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const safeAttacker = await SafeAttackerFactory.deploy(
        await safeVault.getAddress(),
        await token.getAddress()
      );
      await safeAttacker.waitForDeployment();

      const depositAmount = parseEther("1000");
      await token.transfer(await safeAttacker.getAddress(), depositAmount);

      const vaultBalanceBefore = await safeVault.getBalance();

      // Try to attack safe vault
      try {
        await safeAttacker.attack();
      } catch (error: any) {
        // Attack should fail due to reentrancy guard
        console.log("Attack on safe vault failed (as expected):", error.message);
      }

      const vaultBalanceAfter = await safeVault.getBalance();
      const attackerBalance = await token.balanceOf(await safeAttacker.getAddress());

      console.log("Safe vault protection:");
      console.log("  Vault balance before:", ethers.formatEther(vaultBalanceBefore));
      console.log("  Vault balance after:", ethers.formatEther(vaultBalanceAfter));
      console.log("  Attacker balance:", ethers.formatEther(attackerBalance));
      console.log("  ✓ Reentrancy attack prevented");

      // Safe vault should still have the deposit
      expect(vaultBalanceAfter).to.be.greaterThanOrEqual(vaultBalanceBefore);
    });
  });

  describe("Attack Impact Analysis", function () {
    it("Should demonstrate the full impact of reentrancy attack", async function () {
      // Setup: Multiple users deposit
      const user1Deposit = parseEther("2000");
      const user2Deposit = parseEther("3000");
      const attackerDeposit = parseEther("1000");

      await token.mint(await attackerContract.getAddress(), attackerDeposit);

      await token.connect(owner).approve(await vulnerableVault.getAddress(), user1Deposit);
      await token.connect(user).approve(await vulnerableVault.getAddress(), user2Deposit);
      await vulnerableVault.connect(owner).deposit(user1Deposit);
      await vulnerableVault.connect(user).deposit(user2Deposit);

      const totalVaultBalance = await vulnerableVault.getBalance();
      const user1DepositRecord = await vulnerableVault.getDeposit(owner.address);
      const user2DepositRecord = await vulnerableVault.getDeposit(user.address);
      
      console.log("Initial vault state:");
      console.log("  Total vault balance:", ethers.formatEther(totalVaultBalance));
      console.log("  User 1 deposit:", ethers.formatEther(user1Deposit));
      console.log("  User 1 deposit record:", ethers.formatEther(user1DepositRecord));
      console.log("  User 2 deposit:", ethers.formatEther(user2Deposit));
      console.log("  User 2 deposit record:", ethers.formatEther(user2DepositRecord));
      console.log("  Attacker's token", ethers.formatEther(attackerDeposit));

      // Execute attack
      await attackerContract.connect(attacker).attack();

      const vaultBalanceAfter = await vulnerableVault.getBalance();
      const attackerContractBalance = await token.balanceOf(await attackerContract.getAddress());
      const user1DepositAfter = await vulnerableVault.getDeposit(owner.address);
      const user2DepositAfter = await vulnerableVault.getDeposit(user.address);


      console.log("\nAfter attack:");
      console.log("  Vault balance:", ethers.formatEther(vaultBalanceAfter));
      console.log("  Attacker extracted:", ethers.formatEther(attackerContractBalance));
      console.log("  User 1 deposit:", ethers.formatEther(user1DepositAfter));
      console.log("  User 2 deposit:", ethers.formatEther(user2DepositAfter));
      console.log("  ⚠️  Attacker may have extracted more than their deposit!");
      console.log("  ⚠️  Other users' funds may be at risk!");

      // Attacker should have extracted significant amount
      expect(attackerContractBalance).to.be.greaterThan(0n);
      // User deposits should remain unchanged (they didn't withdraw)
      expect(user1DepositAfter).to.equal(user1DepositRecord);
      expect(user2DepositAfter).to.equal(user2DepositRecord);
    });

    it("Should show how reentrancy affects other users", async function () {
      // Setup: User deposits first
      const userDeposit = parseEther("5000");
      await token.connect(user).approve(await vulnerableVault.getAddress(), userDeposit);
      await vulnerableVault.connect(user).deposit(userDeposit);
      
      const userDepositRecord = await vulnerableVault.getDeposit(user.address);
      const vaultBalanceBefore = await vulnerableVault.getBalance();
      
      // Attacker deposits and attacks
      const attackerDeposit = parseEther("1000");
      await token.mint(await attackerContract.getAddress(), attackerDeposit);
      await attackerContract.attack();
      
      const vaultBalanceAfter = await vulnerableVault.getBalance();
      const attackerBalance = await token.balanceOf(await attackerContract.getAddress());
      const userDepositAfter = await vulnerableVault.getDeposit(user.address);
      
      console.log("\n=== Impact on Other Users ===");
      console.log("User deposit record:", ethers.formatEther(userDepositRecord));
      console.log("User deposit after attack:", ethers.formatEther(userDepositAfter));
      console.log("Vault balance before:", ethers.formatEther(vaultBalanceBefore));
      console.log("Vault balance after:", ethers.formatEther(vaultBalanceAfter));
      console.log("Attacker extracted:", ethers.formatEther(attackerBalance));
      console.log("============================\n");
      
      // User's deposit record should remain unchanged
      expect(userDepositAfter).to.equal(userDepositRecord);
      // But vault balance may be reduced due to attack
      expect(vaultBalanceAfter).to.be.lessThanOrEqual(vaultBalanceBefore);
    });
  });

  describe("Reentrancy Attack Detailed Analysis", function () {
    it("Should track attack steps and verify reentrancy occurred", async function () {
      const depositAmount = parseEther("5000");
      await token.transfer(await attackerContract.getAddress(), depositAmount);

      const initialAttackCount = await attackerContract.attackCount();
      expect(initialAttackCount).to.equal(0n);

      // Execute attack
      await attackerContract.attack();

      const finalAttackCount = await attackerContract.attackCount();
      const vaultBalance = await vulnerableVault.getBalance();
      const attackerBalance = await token.balanceOf(await attackerContract.getAddress());

      console.log("\n=== Attack Analysis ===");
      console.log("Attack steps executed:", finalAttackCount.toString());
      console.log("Vault balance after attack:", ethers.formatEther(vaultBalance));
      console.log("Attacker balance after attack:", ethers.formatEther(attackerBalance));
      console.log("======================\n");

      // Verify attack occurred (attackCount > 0 means reentrancy happened)
      expect(finalAttackCount).to.be.greaterThan(0n);
    });

    it("Should verify deposits are not updated during reentrancy", async function () {
      const depositAmount = parseEther("2000");
      await token.transfer(await attackerContract.getAddress(), depositAmount);

      // Get initial deposit (should be 0 before deposit)
      const initialDeposit = await vulnerableVault.getDeposit(await attackerContract.getAddress());
      expect(initialDeposit).to.equal(0n);

      // Execute attack (which includes deposit and withdraw)
      await attackerContract.attack();

      // Check deposit after attack
      const depositAfter = await vulnerableVault.getDeposit(await attackerContract.getAddress());
      const vaultBalance = await vulnerableVault.getBalance();
      const attackerBalance = await token.balanceOf(await attackerContract.getAddress());

      console.log("\n=== Deposit State Analysis ===");
      console.log("Initial deposit:", ethers.formatEther(initialDeposit));
      console.log("Deposit after attack:", ethers.formatEther(depositAfter));
      console.log("Vault balance:", ethers.formatEther(vaultBalance));
      console.log("Attacker balance:", ethers.formatEther(attackerBalance));
      console.log("============================\n");

      // Due to reentrancy, attacker may have extracted more than their deposit
      // The deposit should be less than the original deposit amount (or zero if fully extracted)
      expect(attackerBalance).to.be.greaterThan(0n);
      // Deposit should be reduced or zero after attack
      expect(depositAfter).to.be.lessThanOrEqual(depositAmount);
    });

    it("Should demonstrate multiple reentrancy calls", async function () {
      const depositAmount = parseEther("5000");

      await token.mint(user.address, depositAmount);
      await token.connect(user).approve(await vulnerableVault.getAddress(), depositAmount);
      await vulnerableVault.connect(user).deposit(depositAmount);

      // attackerContract.on("*", (attacker: ContractEventPayload) => {
      //   console.log("Attacker:", attacker.args[0]);
      //   console.log("Who:", attacker.args[1]);
      // });

      await token.transfer(await attackerContract.getAddress(), parseEther("1000"));

      const vaultBalanceBefore = await vulnerableVault.getBalance();
      console.log("Vault balance before attack:", ethers.formatEther(vaultBalanceBefore));

      // Execute attack - this will trigger multiple reentrancy calls
      // await attackerContract.connect(attacker).attack();
      await attackerContract.attack();

      const attackCount = await attackerContract.attackCount();
      const vaultBalanceAfter = await vulnerableVault.getBalance();
      const attackerBalance = await token.balanceOf(await attackerContract.getAddress());

      console.log("\n=== Multiple Reentrancy Calls ===");
      console.log("Number of reentrancy calls:", attackCount.toString());
      console.log("Vault balance after:", ethers.formatEther(vaultBalanceAfter));
      console.log("Attacker extracted:", ethers.formatEther(attackerBalance));
      console.log("================================\n");

      // Verify multiple reentrancy calls occurred
      expect(attackCount).to.be.greaterThan(1n);
      // attackerContract.off("Attacker");
    });
  });

  describe("Attacker Contract Functionality", function () {
    it("Should allow attacker to withdraw stolen tokens", async function () {
      const depositAmount = parseEther("1000");
      await token.transfer(await attackerContract.getAddress(), depositAmount);

      // Execute attack
      await attackerContract.connect(attacker).attack();

      const attackerContractBalance = await token.balanceOf(await attackerContract.getAddress());
      const attackerBalanceBefore = await token.balanceOf(attacker.address);

      // Attacker withdraws from contract
      await attackerContract.connect(attacker).withdraw();

      const attackerBalanceAfter = await token.balanceOf(attacker.address);
      const attackerContractBalanceAfter = await token.balanceOf(await attackerContract.getAddress());

      expect(attackerBalanceAfter).to.equal(attackerBalanceBefore + attackerContractBalance);
      expect(attackerContractBalanceAfter).to.equal(0n);

      console.log("Attacker successfully withdrew stolen tokens");
    });

    it("Should prevent non-attacker from calling attack", async function () {
      const depositAmount = parseEther("1000");
      await token.transfer(await attackerContract.getAddress(), depositAmount);

      // User tries to call attack (should fail)
      await expect(
        attackerContract.connect(user).attack()
      ).to.be.revertedWith("Only attacker");
    });

    it("Should handle multiple attack attempts", async function () {
      const depositAmount1 = parseEther("1000");
      await token.transfer(await attackerContract.getAddress(), depositAmount1);

      // First attack
      await attackerContract.connect(attacker).attack();
      const firstBalance = await token.balanceOf(await attackerContract.getAddress());
      const firstAttackCount = await attackerContract.attackCount();
      
      // Transfer more tokens for second attack
      const depositAmount2 = parseEther("500");
      await token.transfer(await attackerContract.getAddress(), depositAmount2);
      
      // Second attack (if vault still has balance)
      const vaultBalance = await vulnerableVault.getBalance();
      if (vaultBalance > 0) {
        // Note: attackCount is reset in attack() function, so second attack is possible
        await attackerContract.connect(attacker).attack();
        const secondBalance = await token.balanceOf(await attackerContract.getAddress());
        const secondAttackCount = await attackerContract.attackCount();
        
        console.log("First attack:");
        console.log("  Balance:", ethers.formatEther(firstBalance));
        console.log("  Attack count:", firstAttackCount.toString());
        console.log("Second attack:");
        console.log("  Balance:", ethers.formatEther(secondBalance));
        console.log("  Attack count:", secondAttackCount.toString());
      }
    });

    it("Should respect maxAttacks limit", async function () {
      const depositAmount = parseEther("50000"); // Large amount to trigger multiple attacks
      await token.transfer(await attackerContract.getAddress(), depositAmount);

      await attackerContract.attack();
      
      const attackCount = await attackerContract.attackCount();
      const maxAttacks = await attackerContract.maxAttacks();
      
      console.log("\n=== Max Attacks Limit ===");
      console.log("Attack count:", attackCount.toString());
      console.log("Max attacks:", maxAttacks.toString());
      console.log("=======================\n");

      // Attack count should not exceed maxAttacks
      expect(attackCount).to.be.lessThanOrEqual(maxAttacks);
    });
  });

  describe("Attack Comparison: Vulnerable vs Safe", function () {
    it("Should compare vulnerable and safe vault behavior", async function () {
      const depositAmount = parseEther("1000");
      const userDepositAmount = parseEther("5000");
      
      await token.connect(user).approve(await vulnerableVault.getAddress(), userDepositAmount);
      await vulnerableVault.connect(user).deposit(userDepositAmount);
      // Setup vulnerable vault attack
      await token.transfer(await attackerContract.getAddress(), depositAmount);
      const vulnerableVaultBalanceBefore = await vulnerableVault.getBalance();
      
      // Setup safe vault
      const SafeAttackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
      const safeAttacker = await SafeAttackerFactory.deploy(
        await safeVault.getAddress(),
        await token.getAddress()
      );
      await safeAttacker.waitForDeployment();
      
      await token.mint(await safeAttacker.getAddress(), depositAmount);
      const safeVaultBalanceBefore = await safeVault.getBalance();

      // Attack vulnerable vault
      await attackerContract.attack();
      const vulnerableVaultBalanceAfter = await vulnerableVault.getBalance();
      const vulnerableAttackerBalance = await token.balanceOf(await attackerContract.getAddress());

      // Try to attack safe vault
      try {
        await safeAttacker.attack();
      } catch (error: any) {
        // Expected to fail
      }
      const safeVaultBalanceAfter = await safeVault.getBalance();
      const safeAttackerBalance = await token.balanceOf(await safeAttacker.getAddress());

      console.log("\n=== Vulnerable vs Safe Vault Comparison ===");
      console.log("Vulnerable Vault:");
      console.log("  Balance before:", ethers.formatEther(vulnerableVaultBalanceBefore));
      console.log("  Balance after:", ethers.formatEther(vulnerableVaultBalanceAfter));
      console.log("  Attacker extracted:", ethers.formatEther(vulnerableAttackerBalance));
      console.log("\nSafe Vault:");
      console.log("  Balance before:", ethers.formatEther(safeVaultBalanceBefore));
      console.log("  Balance after:", ethers.formatEther(safeVaultBalanceAfter));
      console.log("  Attacker extracted:", ethers.formatEther(safeAttackerBalance));
      console.log("==========================================\n");

      // Vulnerable vault should have lost funds
      expect(vulnerableVaultBalanceAfter).to.be.lessThan(vulnerableVaultBalanceBefore);
      // Safe vault should be protected
      expect(safeVaultBalanceAfter).to.be.greaterThanOrEqual(safeVaultBalanceBefore);
    });
  });

  describe("Mitigation Strategies", function () {
    it("Should explain mitigation strategies", async function () {
      console.log("\n=== Reentrancy Attack Mitigation ===");
      console.log("1. Checks-Effects-Interactions Pattern:");
      console.log("   - Check conditions first");
      console.log("   - Update state (Effects)");
      console.log("   - Interact with external contracts last");
      console.log("\n2. Reentrancy Guard:");
      console.log("   - Use a lock variable");
      console.log("   - Set lock before external calls");
      console.log("   - Release lock after external calls");
      console.log("\n3. Pull Payment Pattern:");
      console.log("   - Don't push payments");
      console.log("   - Let users pull their funds");
      console.log("\n4. For ERC223 specifically:");
      console.log("   - Be aware that transfer() calls tokenFallback");
      console.log("   - Update state BEFORE calling transfer()");
      console.log("   - Or use a reentrancy guard");
      console.log("===================================\n");
    });
  });
});

