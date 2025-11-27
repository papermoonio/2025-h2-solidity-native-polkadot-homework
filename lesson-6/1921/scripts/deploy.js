const { ethers } = require("hardhat");

async function main() {
  // 获取当前网络信息
  const network = await ethers.provider.getNetwork();
  const networkName = network.chainId === 420420422n ? "Polkadot Asset Hub" : 
                     network.chainId === 11155111n ? "Sepolia" : 
                     `Network (Chain ID: ${network.chainId})`;
  
  console.log(`🚀 开始部署到 ${networkName} 测试网...\n`);

  // 获取部署者账户
  const signers = await ethers.getSigners();
  
  if (signers.length === 0) {
    console.log("❌ 没有找到可用的签名者账户！");
    console.log("💡 请检查以下配置：");
    console.log("1. 确保已创建 .env 文件：cp .env.example .env");
    console.log("2. 在 .env 文件中设置 PRIVATE_KEY（不包含 0x 前缀）");
    console.log("3. 私钥格式：PRIVATE_KEY=5fb92d6e98884f76de468fa3f6278f8807c48bebc13595d45af5bdc4da702133");
    console.log("4. 从水龙头获取测试代币：https://faucet.polkadot.io/");
    return;
  }

  const [deployer] = signers;
  console.log("📝 部署账户:", deployer.address);
  
  // 检查账户余额
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("💰 账户余额:", ethers.formatEther(balance), "POL\n");

  if (balance === 0n) {
    console.log("❌ 账户余额不足！请先从水龙头获取测试代币：");
    if (network.chainId === 420420422n) {
      console.log("🚰 Polkadot Faucet: https://faucet.polkadot.io/");
    } else if (network.chainId === 11155111n) {
      console.log("🚰 Sepolia Faucet: https://sepoliafaucet.com/");
      console.log("🚰 Alchemy Sepolia Faucet: https://www.alchemy.com/faucets/ethereum-sepolia");
    }
    return;
  }

  try {
    // 1. 部署漏洞银行合约
    console.log("📦 部署 VulnerableBank 合约...");
    const VulnerableBank = await ethers.getContractFactory("VulnerableBank");
    const vulnerableBank = await VulnerableBank.deploy();
    await vulnerableBank.waitForDeployment();
    const vulnerableBankAddress = await vulnerableBank.getAddress();
    console.log("✅ VulnerableBank 部署成功:", vulnerableBankAddress);

    // 2. 部署攻击合约
    console.log("\n📦 部署 Attacker 合约...");
    const Attacker = await ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(vulnerableBankAddress);
    await attacker.waitForDeployment();
    const attackerAddress = await attacker.getAddress();
    console.log("✅ Attacker 部署成功:", attackerAddress);

    // 3. 部署安全银行合约（如果存在）
    try {
      console.log("\n📦 部署 SecureBank 合约...");
      const SecureBank = await ethers.getContractFactory("SecureBank");
      const secureBank = await SecureBank.deploy();
      await secureBank.waitForDeployment();
      const secureBankAddress = await secureBank.getAddress();
      console.log("✅ SecureBank 部署成功:", secureBankAddress);
    } catch (error) {
      console.log("⚠️  SecureBank 合约不存在，跳过部署");
    }

    // 显示部署摘要
    console.log("\n" + "=".repeat(60));
    console.log("🎉 部署完成！合约地址汇总：");
    console.log("=".repeat(60));
    console.log("🏦 VulnerableBank:", vulnerableBankAddress);
    console.log("⚔️  Attacker:", attackerAddress);
    console.log("\n🌐 网络信息：");
    console.log("📍 网络: Polkadot Asset Hub 测试网");
    console.log("🔗 RPC: https://testnet-passet-hub-eth-rpc.polkadot.io");
    console.log("🆔 Chain ID: 420420422");
    console.log("🔍 区块浏览器: https://assethub-polkadot-testnet.subscan.io/");
    console.log("\n💡 提示：");
    console.log("- 可以使用这些地址在区块浏览器中查看合约");
    console.log("- 运行测试验证合约功能：npx hardhat test --network passetHub");

  } catch (error) {
    console.error("\n❌ 部署失败:", error.message);
    console.error("📋 完整错误信息:", error);
    
    if (error.message.includes("insufficient funds")) {
      console.log("\n💡 解决方案：");
      console.log("1. 检查账户余额是否足够");
      console.log("2. 从水龙头获取测试代币：https://faucet.polkadot.io/");
    } else if (error.message.includes("nonce")) {
      console.log("\n💡 解决方案：");
      console.log("1. 等待几秒后重试");
      console.log("2. 检查网络连接");
    } else if (error.message.includes("Invalid Transaction")) {
      console.log("\n💡 可能的解决方案：");
      console.log("1. 网络可能不支持 EVM 或配置有误");
      console.log("2. 尝试使用其他 Polkadot EVM 兼容网络");
      console.log("3. 检查合约代码是否兼容目标网络");
      console.log("4. 当前网络可能处于维护状态");
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("💥 部署脚本执行失败:", error);
    process.exit(1);
  });
