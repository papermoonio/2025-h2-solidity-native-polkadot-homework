import { ethers } from "hardhat";

async function main() {
  const tokenAddress = process.env.TOKEN_ADDRESS;
  const to = process.env.TO;
  const amountHuman = process.env.AMOUNT || "1";
  const decimals = BigInt(process.env.TOKEN_DECIMALS || "18");

  if (!tokenAddress || !to) {
    throw new Error("Please set TOKEN_ADDRESS and TO env vars");
  }

  const token = await ethers.getContractAt("MintableERC20", tokenAddress);
  const amount = ethers.parseUnits(amountHuman, decimals);

  console.log(`Transferring ${amountHuman} tokens to ${to}...`);
  const tx = await token.transfer(to, amount);
  console.log("tx hash:", tx.hash);
  await tx.wait();
  console.log("Transfer complete.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});


