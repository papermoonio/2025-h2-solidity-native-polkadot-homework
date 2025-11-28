const { ethers } = require("hardhat");

async function main() {
  console.log("🚀 连接到 Sepolia 网络上的已部署合约...\n");

  // 已部署的合约地址
  const VULNERABLE_BANK_ADDRESS = "0x2Aa72A8263Ab3a064d707785a1b79691f646f368";
  const ATTACKER_ADDRESS = "0x72AC971945c904B645CB522019627bbe6050A6f9";

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log("🔑 使用账户:", signer.address);

  // 连接到已部署的合约
  const vulnerableBank = await ethers.getContractAt("VulnerableBank", VULNERABLE_BANK_ADDRESS);
  const attacker = await ethers.getContractAt("Attacker", ATTACKER_ADDRESS);

  // 查看当前状态
  console.log("\n📊 当前状态:");
  const bankBalance = await ethers.provider.getBalance(VULNERABLE_BANK_ADDRESS);
  const attackerBalance = await ethers.provider.getBalance(ATTACKER_ADDRESS);
  const userBankBalance = await vulnerableBank.getUserBalance(signer.address);
  
  console.log("银行合约余额:", ethers.formatEther(bankBalance), "ETH");
  console.log("攻击合约余额:", ethers.formatEther(attackerBalance), "ETH");
  console.log("你在银行的余额:", ethers.formatEther(userBankBalance), "ETH");

  // 选择操作
  console.log("\n⚡ 可执行操作:");
  console.log("1. 向银行存款");
  console.log("2. 从银行取款");
  console.log("3. 执行重入攻击（需要是攻击合约的所有者）");
  console.log("4. 查看攻击次数");

  // 示例：向银行存款
  const depositAmount = "0.01"; // ETH
  console.log(`\n💰 示例：存入 ${depositAmount} ETH 到银行...`);
  
  try {
    const tx = await vulnerableBank.deposit({ 
      value: ethers.parseEther(depositAmount),
      gasLimit: 100000 
    });
    console.log("📝 交易哈希:", tx.hash);
    console.log("⏳ 等待确认...");
    await tx.wait();
    console.log("✅ 存款成功！");
    
    const newBalance = await vulnerableBank.getUserBalance(signer.address);
    console.log("你的新余额:", ethers.formatEther(newBalance), "ETH");
  } catch (error) {
    console.log("❌ 操作失败:", error.message);
    console.log("\n💡 提示：");
    console.log("- 确保账户有足够的 ETH");
    console.log("- 检查网络连接");
  }

  // 查看交易
  console.log("\n🔍 在 Etherscan 查看:");
  console.log(`银行合约: https://sepolia.etherscan.io/address/${VULNERABLE_BANK_ADDRESS}`);
  console.log(`攻击合约: https://sepolia.etherscan.io/address/${ATTACKER_ADDRESS}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
