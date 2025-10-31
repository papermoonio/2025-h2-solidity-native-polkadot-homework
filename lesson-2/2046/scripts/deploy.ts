import { ethers } from "hardhat";

async function main() {
    // 获取部署者
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with:", deployer.address);

    // 我们的 ERC20 构造函数签名为 (name, symbol, decimals, initialSupply)
    // initialSupply 以“整数”传入，合约内部会乘以 10**decimals
    const Token = await ethers.getContractFactory("ERC20");
    const token = await Token.deploy("MyToken", "MTK", 18, 1000);
    await token.waitForDeployment();

    console.log("ERC20 deployed to:", await token.getAddress());
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });