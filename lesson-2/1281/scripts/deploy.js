const hre = require("hardhat");

async function main() {
  const name = process.env.TOKEN_NAME || "MyToken";
  const symbol = process.env.TOKEN_SYMBOL || "MTK";
  const decimals = process.env.TOKEN_DECIMALS ? Number(process.env.TOKEN_DECIMALS) : 18;
  // Default initial supply: 1,000,000 tokens with decimals
  const initial = process.env.TOKEN_INITIAL_SUPPLY
    ? BigInt(process.env.TOKEN_INITIAL_SUPPLY)
    : 1_000_000n * 10n ** BigInt(decimals);

  const [deployer] = await hre.ethers.getSigners();
  console.log(`Deploying with: ${deployer.address}`);

  const MyERC20 = await hre.ethers.getContractFactory("MyERC20");
  const token = await MyERC20.deploy(name, symbol, decimals, initial);
  await token.waitForDeployment();

  console.log(`MyERC20 deployed to: ${await token.getAddress()}`);
  console.log(`Name: ${await token.name()}`);
  console.log(`Symbol: ${await token.symbol()}`);
  console.log(`Decimals: ${await token.decimals()}`);
  console.log(`TotalSupply: ${(await token.totalSupply()).toString()}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
