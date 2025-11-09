import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", ethers.formatEther(balance), "tokens");

  const MintableERC20 = await ethers.getContractFactory("MintableERC20");
  
  // Get token name and symbol from environment variables or use defaults
  // Usage: TOKEN_NAME=Gamma TOKEN_SYMBOL=GAMMA npx hardhat run scripts/deploy.ts --network passetHub
  const tokenName = process.env.TOKEN_NAME || "Beta";
  const tokenSymbol = process.env.TOKEN_SYMBOL || "BETA";
  
  console.log(`Deploying ${tokenName} (${tokenSymbol})...`);
  
  // Try deploying without explicit gas limit - let the adapter handle it
  // If that fails, we'll try with a reasonable gas limit
  let token;
  try {
    token = await MintableERC20.deploy(tokenName, tokenSymbol);
  } catch (error: any) {
    console.log("First attempt failed, trying with gas limit...");
    // Try with a large but reasonable gas limit
    token = await MintableERC20.deploy(tokenName, tokenSymbol, {
      gasLimit: 500_000_000, // 500 million gas units (matches Ignition config)
    });
  }

  await token.waitForDeployment();
  const address = await token.getAddress();
  
  console.log(`✅ ${tokenName} (${tokenSymbol}) deployed to:`, address);
  console.log(`\n📝 Add this address to mintableERC20-interface/ethereum/addresses.json:`);
  console.log(`   "${tokenName.toLowerCase()}": "${address}"`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

