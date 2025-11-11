import { ethers } from "hardhat";

async function main() {
  const name = process.env.TOKEN_NAME || "Mintable Token";
  const symbol = process.env.TOKEN_SYMBOL || "MINT";
  const decimals = BigInt(process.env.TOKEN_DECIMALS || "18");
  const initialSupplyHuman = process.env.INIT_SUPPLY || "1000";
  const initialReceiver = process.env.INIT_RECEIVER || (await ethers.getSigners())[0].address;

  const initialSupply = ethers.parseUnits(initialSupplyHuman, decimals);

  console.log("Deploying MintableERC20 with params:", {
    name,
    symbol,
    decimals: decimals.toString(),
    initialSupply: initialSupplyHuman,
    initialReceiver
  });

  const Factory = await ethers.getContractFactory("MintableERC20");
  const token = await Factory.deploy(name, symbol, initialSupply, initialReceiver);
  await token.waitForDeployment();
  const address = await token.getAddress();
  console.log("MintableERC20 deployed at:", address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


