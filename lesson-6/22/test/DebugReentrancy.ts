import { expect } from "chai";
import { network } from "hardhat";

const { ethers } = await network.connect();

describe("Debug Reentrancy", function () {
  it("Test 1: Simple attack without reentrancy attempts", async function () {
    const signers = await ethers.getSigners();
    const [deployer, attacker] = signers;

    const bankFactory = await ethers.getContractFactory("VulnerableBank");
    const bank = await bankFactory.connect(deployer).deploy();

    const attackerFactory = await ethers.getContractFactory("ReentrancyAttacker");
    const bankAddr = (await bank.getAddress()) as string;
    const attackerContract = await attackerFactory.connect(attacker).deploy(bankAddr);
    const attackerAddr = await attackerContract.getAddress();

    // Deployer deposits 10 ETH
    await bank.connect(deployer).deposit({ value: ethers.parseEther("10") });
    console.log("Deployer deposited 10 ETH");

    // Attacker calls attack() with 1 ETH
    const tx = await attackerContract.connect(attacker).attack({
      value: ethers.parseEther("1")
    });
    
    console.log("Attack transaction executed");
    
    // Check balances
    const attackerContractBalance = await ethers.provider.getBalance(attackerAddr);
    const bankBalance = await ethers.provider.getBalance(bankAddr);
    const bankBalanceForAttacker = await bank.balances(attackerAddr);
    const reentryCount = await attackerContract.reentryCount();

    console.log("Attacker contract ETH balance:", ethers.formatEther(attackerContractBalance));
    console.log("Bank ETH balance:", ethers.formatEther(bankBalance));
    console.log("Bank.balances[attacker]:", ethers.formatEther(bankBalanceForAttacker));
    console.log("Reentry count:", reentryCount.toString());

    // With reentrancy, attacker should have stolen more than 1 ETH
    console.log("\nExpected: Attacker has > 1 ETH (due to reentrancy)");
    console.log("Expected: Bank has < 10 ETH");
    console.log("Expected: reentry count > 0");
  });
});

