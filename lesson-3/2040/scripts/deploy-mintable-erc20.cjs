const fs = require("fs");
const path = require("path");

async function main() {
  // 动态导入hardhat
  const { ethers } = await import("hardhat");

  // 获取合约工厂
  const MintableERC20 = await ethers.getContractFactory("MintableERC20");

  // 部署合约
  console.log("Deploying MintableERC20 contract...");
  const tokenName = "Alpha";
  const tokenSymbol = "ALPHA";
  
  const mintableERC20 = await MintableERC20.deploy(tokenName, tokenSymbol);
  await mintableERC20.waitForDeployment();
  
  const contractAddress = await mintableERC20.getAddress();
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