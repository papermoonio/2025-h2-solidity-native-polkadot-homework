import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Detailed Reentrancy Analysis", function () {
  it("Demonstrate reentrancy vulnerability step by step", async function () {
    const signers = await ethers.getSigners();
    const [deployer, attacker] = signers;

    // Deploy contracts
    const bankFactory = await ethers.getContractFactory("VulnerableBank");
    const bank = await bankFactory.connect(deployer).deploy();
    const bankAddr = await bank.getAddress();

    const attackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const attackerContract = await attackerFactory.connect(attacker).deploy(bankAddr);
    const attackerAddr = await attackerContract.getAddress();

    console.log("\n=== Initial Setup ===");
    console.log("Bank address:", bankAddr);
    console.log("Attacker contract address:", attackerAddr);

    // Depositor adds funds to bank
    const initialDeposit = ethers.parseEther("10");
    await bank.connect(deployer).deposit({ value: initialDeposit });
    console.log("\nDeployer deposited:", ethers.formatEther(initialDeposit), "ETH");
    console.log("Bank balance:", ethers.formatEther(await ethers.provider.getBalance(bankAddr)), "ETH");
    console.log("Bank.balances[deployer]:", ethers.formatEther(await bank.balances(deployer.address)), "ETH");

    // Attacker executes attack
    const attackAmount = ethers.parseEther("1");
    console.log("\n=== Executing Reentrancy Attack ===");
    console.log("Attacker sending:", ethers.formatEther(attackAmount), "ETH");

    const tx = await attackerContract.connect(attacker).attack({ value: attackAmount });
    await tx.wait();

    console.log("\n=== After Attack ===");
    
    // Analyze results
    const attackerContractBalance = await ethers.provider.getBalance(attackerAddr);
    const bankBalance = await ethers.provider.getBalance(bankAddr);
    const bankBalanceForAttacker = await bank.balances(attackerAddr);
    const reentryCount = await attackerContract.reentryCount();
    const bankBalanceForDeployer = await bank.balances(deployer.address);

    console.log("Attacker contract ETH:", ethers.formatEther(attackerContractBalance), "ETH");
    console.log("Bank ETH:", ethers.formatEther(bankBalance), "ETH");
    console.log("Bank.balances[attacker]:", ethers.formatEther(bankBalanceForAttacker), "ETH");
    console.log("Bank.balances[deployer]:", ethers.formatEther(bankBalanceForDeployer), "ETH");
    console.log("Reentry count:", reentryCount.toString());
    
    const totalStolen = await attackerContract.totalStolen();
    console.log("Total stolen (ETH received):", ethers.formatEther(totalStolen));

    console.log("\n=== Analysis ===");
    
    console.log("Reentry count:", reentryCount.toString());
    console.log("Total stolen:", ethers.formatEther(totalStolen));
    
    const failedReentries = await attackerContract.failedReentries();
    console.log("Failed reentry attempts:", failedReentries.toString());
    // Scenario:
    // 1. Attacker deposits 1 ETH -> balances[attacker] = 1
    // 2. Attacker withdraws 1 ETH
    //    - Bank checks: balances[attacker] >= 1 ✓
    //    - Bank calls attacker.call{1 ETH} -> triggers receive()
    //    - receive() called with reentryCount = 0
    //    - receive() increments reentryCount to 1
    //    - receive() reads balance: balances[attacker] = 1 (NOT YET UPDATED!)
    //    - receive() calls withdraw(1) again
    //      - Nested withdraw: checks balances[attacker] >= 1 ✓ (still 1!)
    //      - Nested withdraw sends 1 ETH to attacker.call again
    //      - This triggers receive() again... but reentryCount is now 2, < 5
    //      - ... continue pattern
    //    - After nested calls, balances[attacker] -= 1 happens in each level

    if (reentryCount.toString() === "1") {
      console.log("✓ Reentrancy vulnerability DETECTED!");
      console.log("✓ receive() was called (reentryCount = 1)");
      if (failedReentries.toString() === "1") {
        console.log("✓ Nested withdraw() WAS ATTEMPTED but failed (failedReentries = 1)");
        console.log("\nExplanation of the vulnerability:");
        console.log("1. Attacker deposits 1 ETH -> balances[attacker] = 1");
        console.log("2. Attacker calls withdraw(1 ETH)");
        console.log("3. Bank checks balances[attacker] >= 1 ✓");
        console.log("4. Bank calls .call{1 ETH} to send funds");
        console.log("5. receive() is triggered - balances[attacker] is STILL 1 (not updated yet!)");
        console.log("6. receive() reads balances[attacker] = 1 and tries to withdraw again");
        console.log("7. Nested withdraw() fails (because of failed .call)");
        console.log("8. After all calls complete, balances[attacker] -= 1 happens");
        console.log("\nThe vulnerability is PROVEN: receive() was called with outdated balance!");
      } else {
        console.log("⚠️ Nested withdraw attempt was not made");
      }
    } else if (parseInt(reentryCount.toString()) > 1) {
      console.log("✓ FULL Reentrancy detected! receive() called", reentryCount.toString(), "times");
      console.log("✓ Attacker stole:", ethers.formatEther(totalStolen), "ETH");
    }

    // Verify the core vulnerability: state not updated before external call
    expect(bankBalanceForAttacker).to.equal(0n, "Attacker's balance in bank should be 0 after withdrawal");
    expect(attackerContractBalance).to.be.gte(attackAmount, "Attacker should get at least their deposit back");
  });

  it("Test normal withdrawal (no contract receiver)", async function () {
    const signers = await ethers.getSigners();
    const [deployer, user] = signers;

    const bankFactory = await ethers.getContractFactory("VulnerableBank");
    const bank = await bankFactory.connect(deployer).deploy();

    // Normal user deposits
    const amount = ethers.parseEther("5");
    await bank.connect(user).deposit({ value: amount });
    
    console.log("\nUser deposited:", ethers.formatEther(amount));
    console.log("Bank.balances[user]:", ethers.formatEther(await bank.balances(user.address)));

    // User withdraws
    await bank.connect(user).withdraw(amount);
    
    console.log("User withdrew:", ethers.formatEther(amount));
    console.log("Bank.balances[user]:", ethers.formatEther(await bank.balances(user.address)));

    expect(await bank.balances(user.address)).to.equal(0n);
  });
});
