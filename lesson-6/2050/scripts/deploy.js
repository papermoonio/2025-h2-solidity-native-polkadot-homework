const hre = require("hardhat");

async function main() {
  console.log("开始部署到 Polkadot Asset Hub 测试网...\n");

  // 获取部署者账户
  const [deployer] = await hre.ethers.getSigners();
  console.log("部署账户:", deployer.address);
  console.log("账户余额:", hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)), "ETH\n");

  // 部署 VulnerableBank
  console.log("部署 VulnerableBank...");
  const VulnerableBank = await hre.ethers.getContractFactory("VulnerableBank");
  const vulnerableBank = await VulnerableBank.deploy();
  await vulnerableBank.waitForDeployment();
  const vulnerableBankAddress = await vulnerableBank.getAddress();
  console.log("✅ VulnerableBank 部署成功:", vulnerableBankAddress);

  // 等待几秒，让网络处理
  console.log("\n等待网络确认...");
  await new Promise(resolve => setTimeout(resolve, 5000));

  // 部署 SecureBank
  console.log("\n部署 SecureBank...");
  const SecureBank = await hre.ethers.getContractFactory("SecureBank");
  const secureBank = await SecureBank.deploy();
  await secureBank.waitForDeployment();
  const secureBankAddress = await secureBank.getAddress();
  console.log("✅ SecureBank 部署成功:", secureBankAddress);

  // 等待几秒
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
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
