import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { hardhat } from "viem/chains";
import hre from "hardhat";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function main() {
  // 创建客户端
  const publicClient = createPublicClient({
    chain: hardhat,
    transport: http(),
  });

  const walletClient = createWalletClient({
    chain: hardhat,
    transport: http(),
  });

  // 获取部署账户
  const [deployer] = await walletClient.getAddresses();
  console.log("Deploying contracts with account:", deployer);

  // 部署合约参数
  console.log("Deploying MintableERC20 contract...");
  const tokenName = "Alpha";
  const tokenSymbol = "ALPHA";

  // 获取合约 artifacts
  const artifacts = await hre.artifacts.readArtifact("MintableERC20");

  // 部署合约
  const hash = await walletClient.deployContract({
    abi: artifacts.abi,
    bytecode: artifacts.bytecode as `0x${string}`,
    args: [tokenName, tokenSymbol],
    account: deployer,
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const contractAddress = receipt.contractAddress;
  console.log("MintableERC20 deployed to:", contractAddress);

  // 确保部署目录存在
  const deploymentDir = path.join(__dirname, "..", "ignition", "deployments", "chain-31337");
  if (!fs.existsSync(deploymentDir)) {
    fs.mkdirSync(deploymentDir, { recursive: true });
  }

  // 保存部署信息到文件
  const deploymentData = {
    "MintableERC20Module#MintableERC20": contractAddress
  };

  const deploymentFilePath = path.join(deploymentDir, "deployed_addresses.json");
  fs.writeFileSync(deploymentFilePath, JSON.stringify(deploymentData, null, 2));
  console.log("Deployment information saved to:", deploymentFilePath);
}

// 执行部署脚本
main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
