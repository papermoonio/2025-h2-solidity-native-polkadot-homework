import hre from "hardhat";

async function main() {
  const { ethers } = hre;
  
  console.log("Starting deployment test...");
  
  const [deployer, attacker] = await ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log("Attacker:", attacker.address);

  console.log("Deploying VulnerableBank...");
  const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
  const bank = await VulnerableBank.deploy();
  const bankAddr = await bank.getAddress();
  console.log("VulnerableBank deployed at:", bankAddr);

  console.log("Deploying ReentrancyAttacker...");
  const ReentrancyAttacker = await ethers.getContractFactory("ReentrancyAttacker");
  const attackerContract = await ReentrancyAttacker.deploy(bankAddr);
  const attackerAddr = await attackerContract.getAddress();
  console.log("ReentrancyAttacker deployed at:", attackerAddr);

  console.log("Depositing 10 ETH to bank...");
  await bank.deposit({ value: ethers.parseEther("10") });
  console.log("Deposit successful!");

  console.log("Attacking...");
  const tx = await attackerContract.connect(attacker).attack({
    value: ethers.parseEther("1"),
  });
  console.log("Attack transaction:", tx.hash);
  await tx.wait();
  console.log("Attack completed!");

  const attackerBalance = await ethers.provider.getBalance(attackerAddr);
  const bankBalance = await ethers.provider.getBalance(bankAddr);
  console.log("Attacker balance:", ethers.formatEther(attackerBalance), "ETH");
  console.log("Bank balance:", ethers.formatEther(bankBalance), "ETH");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
