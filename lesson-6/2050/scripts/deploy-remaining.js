const hre = require("hardhat");

async function main() {
  console.log("部署剩余合约到 Polkadot Asset Hub 测试网...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // VulnerableBank 已部署
  const vulnerableBankAddress = "0xabe67D3d894295C863Eef4CD7D351146c1DE1812";
  console.log("VulnerableBank (已部署):", vulnerableBankAddress);

  // 部署 SecureBank
  console.log("\n部署 SecureBank...");
  try {
    const SecureBank = await hre.ethers.getContractFactory("SecureBank");
    const secureBank = await SecureBank.deploy();
    await secureBank.waitForDeployment();
    const secureBankAddress = await secureBank.getAddress();
    console.log("✅ SecureBank 部署成功:", secureBankAddress);

    // 等待确认
    console.log("\n等待网络确认...");
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 部署 Attacker
    console.log("\n部署 Attacker...");
    const Attacker = await hre.ethers.getContractFactory("Attacker");
    const attacker = await Attacker.deploy(vulnerableBankAddress);
    await attacker.waitForDeployment();
    const attackerAddress = await attacker.getAddress();
    console.log("✅ Attacker 部署成功:", attackerAddress);

    console.log("\n=== 部署完成 ===");
    console.log("VulnerableBank:", vulnerableBankAddress);
    console.log("SecureBank:", secureBankAddress);
    console.log("Attacker:", attackerAddress);
    
    console.log("\n可以在区块浏览器查看:");
    console.log(`https://assethub-polkadot-testnet.subscan.io/account/${vulnerableBankAddress}`);
  } catch (error) {
    console.error("\n部署失败:", error.message);
    console.log("\n可能的原因:");
    console.log("1. Gas 不足");
    console.log("2. 网络拥堵");
    console.log("3. Nonce 冲突");
    console.log("\n建议：等待几分钟后重试");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
