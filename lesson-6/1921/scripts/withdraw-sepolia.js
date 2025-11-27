const { ethers } = require("hardhat");

async function main() {
  console.log("💸 准备从 Sepolia 网络的银行取款...\n");

  // 已部署的合约地址
  const VULNERABLE_BANK_ADDRESS = "0x2Aa72A8263Ab3a064d707785a1b79691f646f368";

  // 获取签名者
  const [signer] = await ethers.getSigners();
  console.log("🔑 使用账户:", signer.address);

  // 连接到已部署的合约
  const vulnerableBank = await ethers.getContractAt("VulnerableBank", VULNERABLE_BANK_ADDRESS);

  // 查看取款前的状态
  console.log("\n📊 取款前状态:");
  const userBalanceBefore = await vulnerableBank.getUserBalance(signer.address);
  const bankBalanceBefore = await ethers.provider.getBalance(VULNERABLE_BANK_ADDRESS);
  const accountBalanceBefore = await ethers.provider.getBalance(signer.address);
  
  console.log("你在银行的余额:", ethers.formatEther(userBalanceBefore), "ETH");
  console.log("银行合约总余额:", ethers.formatEther(bankBalanceBefore), "ETH");
  console.log("你的钱包余额:", ethers.formatEther(accountBalanceBefore), "ETH");

  // 执行取款
  const withdrawAmount = userBalanceBefore; // 取出全部余额
  
  if (withdrawAmount === 0n) {
    console.log("\n❌ 你在银行没有余额可以取出！");
    return;
  }

  console.log(`\n💰 开始取款: ${ethers.formatEther(withdrawAmount)} ETH...`);
  
  try {
    const tx = await vulnerableBank.withdraw(withdrawAmount, {
      gasLimit: 300000 // 设置足够的 gas
    });
    console.log("📝 交易哈希:", tx.hash);
    console.log("⏳ 等待交易确认...");
    
    const receipt = await tx.wait();
    console.log("✅ 取款成功！");
    console.log("⛽ Gas 使用:", receipt.gasUsed.toString());
    
    // 查看取款后的状态
    console.log("\n📊 取款后状态:");
    const userBalanceAfter = await vulnerableBank.getUserBalance(signer.address);
    const bankBalanceAfter = await ethers.provider.getBalance(VULNERABLE_BANK_ADDRESS);
    const accountBalanceAfter = await ethers.provider.getBalance(signer.address);
    
    console.log("你在银行的余额:", ethers.formatEther(userBalanceAfter), "ETH");
    console.log("银行合约总余额:", ethers.formatEther(bankBalanceAfter), "ETH");
    console.log("你的钱包余额:", ethers.formatEther(accountBalanceAfter), "ETH");
    
    const actualReceived = accountBalanceAfter - accountBalanceBefore + receipt.gasUsed * receipt.gasPrice;
    console.log("\n💵 实际收到:", ethers.formatEther(actualReceived), "ETH");
    
    // 查看交易
    console.log("\n🔍 在 Etherscan 查看交易:");
    console.log(`https://sepolia.etherscan.io/tx/${tx.hash}`);
    
  } catch (error) {
    console.log("\n❌ 取款失败:", error.message);
    
    if (error.message.includes("insufficient")) {
      console.log("\n💡 可能的原因：");
      console.log("- 银行合约余额不足");
      console.log("- 重入攻击已经耗尽了银行资金");
    } else if (error.message.includes("revert")) {
      console.log("\n💡 可能的原因：");
      console.log("- 你的余额为 0");
      console.log("- 合约逻辑拒绝了取款请求");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
